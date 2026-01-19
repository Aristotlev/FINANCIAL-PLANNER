/**
 * Tools Cache Service
 * 
 * Handles caching of Insider Transactions, Senate Lobbying, and USA Spending data
 * to reduce API calls and improve performance.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  FinnhubInsiderTransaction, 
  FinnhubLobbyingActivity, 
  FinnhubUSASpendingActivity 
} from './api/finnhub-api';

// Types derived from Finnhub API types
export type InsiderTransaction = FinnhubInsiderTransaction;
export type LobbyingActivity = FinnhubLobbyingActivity;
export type USASpendingActivity = FinnhubUSASpendingActivity;

export interface CacheStatus {
  cache_name: string;
  last_refresh_at: string | null;
  next_refresh_at: string | null;
  needs_refresh: boolean;
  is_refreshing: boolean;
  items_count: number;
  status: string | null;
}

type ToolCacheName = 'insider_transactions' | 'senate_lobbying' | 'usa_spending';

class ToolsCacheService {
  private _supabase: SupabaseClient | null = null;
  private _supabaseAdmin: SupabaseClient | null = null;

  // Lazy initialization of Supabase client to avoid build-time errors
  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        throw new Error('Supabase environment variables not configured');
      }
      
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  // Lazy initialization of admin client
  private get supabaseAdmin(): SupabaseClient | null {
    if (typeof window !== 'undefined') {
      return null;
    }
    
    if (!this._supabaseAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) {
        this._supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      }
    }
    return this._supabaseAdmin;
  }

  constructor() {
    // Lazy initialization - clients will be created on first use
  }

  // ==================== CACHE STATUS ====================

  async getCacheStatus(): Promise<CacheStatus[]> {
    const { data, error } = await this.supabase.rpc('get_cache_status');
    if (error) {
      console.error('Error getting cache status:', error);
      return [];
    }
    // Filter for only tools-related caches if needed, but for now returned by name
    return data || [];
  }

  async needsRefresh(cacheName: ToolCacheName): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('cache_needs_refresh', {
      p_cache_name: cacheName
    });
    if (error) {
      console.error('Error checking cache refresh:', error);
      return true; // Assume needs refresh on error
    }
    return data;
  }

  // ==================== INSIDER TRANSACTIONS ====================

  async getInsiderTransactions(options?: {
    symbol?: string;
    limit?: number;
    daysAgo?: number;
  }): Promise<InsiderTransaction[]> {
    let query = this.supabase
      .from('insider_transactions_cache')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (options?.symbol) {
      query = query.eq('symbol', options.symbol.toUpperCase());
    }
    if (options?.daysAgo) {
      const since = new Date();
      since.setDate(since.getDate() - options.daysAgo);
      query = query.gte('transaction_date', since.toISOString().split('T')[0]);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching insider transactions from cache:', error);
      return [];
    }
    
    // Map database columns back to API camelCase format
    return (data || []).map(d => ({
      symbol: d.symbol,
      name: d.name,
      share: d.share,
      change: d.change,
      filingDate: d.filing_date,
      transactionDate: d.transaction_date,
      transactionCode: d.transaction_code,
      transactionPrice: d.transaction_price,
    }));
  }

  async refreshInsiderTransactions(transactions: InsiderTransaction[], symbol: string): Promise<{ success: boolean; count: number }> {
    if (!this.supabaseAdmin) {
      throw new Error('Admin client not available - this must be called from server');
    }

    try {
      await this.supabaseAdmin.rpc('cache_refresh_started', { p_cache_name: 'insider_transactions' });

      // Map to table structure with sanitized dates
      const upsertData = transactions
        .filter(t => t.filingDate && t.transactionDate) // Must have valid dates for unique constraint
        .map(t => ({
          symbol: t.symbol || symbol,
          name: t.name || 'Unknown',
          share: t.share,
          change: t.change,
          filing_date: t.filingDate, // Already filtered for non-empty
          transaction_date: t.transactionDate, // Already filtered for non-empty
          transaction_code: t.transactionCode,
          transaction_price: t.transactionPrice,
          raw_data: t,
          updated_at: new Date().toISOString()
        }));

      // Deduplicate by unique constraint key before upserting
      const seen = new Set<string>();
      const dedupedData = upsertData.filter(d => {
        const key = `${d.symbol}|${d.name}|${d.filing_date}|${d.transaction_date}|${d.change}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (dedupedData.length === 0) {
        await this.supabaseAdmin.rpc('cache_refresh_completed', {
          p_cache_name: 'insider_transactions',
          p_status: 'success',
          p_error: null,
          p_items_count: 0
        });
        return { success: true, count: 0 };
      }

      const { error } = await this.supabaseAdmin
        .from('insider_transactions_cache')
        .upsert(dedupedData, { 
          onConflict: 'symbol,name,filing_date,transaction_date,change' 
        });

      if (error) throw error;

      await this.supabaseAdmin.rpc('cache_refresh_completed', {
        p_cache_name: 'insider_transactions',
        p_status: 'success',
        p_error: null,
        p_items_count: transactions.length
      });

      return { success: true, count: transactions.length };
    } catch (error: any) {
      await this.supabaseAdmin.rpc('cache_refresh_completed', {
        p_cache_name: 'insider_transactions',
        p_status: 'failed',
        p_error: error.message,
        p_items_count: 0
      });
      throw error;
    }
  }

  // ==================== SENATE LOBBYING ====================

  async getSenateLobbying(options?: {
    symbol?: string;
    limit?: number;
    year?: number;
  }): Promise<LobbyingActivity[]> {
    let query = this.supabase
      .from('senate_lobbying_cache')
      .select('*')
      .order('date', { ascending: false });

    if (options?.symbol) {
      query = query.eq('symbol', options.symbol.toUpperCase());
    }
    if (options?.year) {
      query = query.eq('year', options.year);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching senate lobbying from cache:', error);
      return [];
    }
    
    // Map back to API format
    return (data || []).map(d => d.raw_data);
  }

  async refreshSenateLobbying(activities: LobbyingActivity[], symbol: string): Promise<{ success: boolean; count: number }> {
    if (!this.supabaseAdmin) {
      throw new Error('Admin client not available - this must be called from server');
    }

    try {
      await this.supabaseAdmin.rpc('cache_refresh_started', { p_cache_name: 'senate_lobbying' });

      // Map to table structure with sanitized data
      const upsertData = activities.map(a => ({
        symbol: a.symbol || symbol,
        name: a.name || 'Unknown',
        client_id: a.clientId || null,
        registrant_id: a.registrantId || null,
        senate_id: a.senateId || '',  // NOT NULL DEFAULT '' in DB
        house_registrant_id: a.houseRegistrantId || '',  // NOT NULL DEFAULT '' in DB
        year: a.year,
        period: a.period || null,
        income: a.income,
        expenses: a.expenses,
        description: a.description || null,
        document_url: a.documentUrl || null,
        posted_name: a.postedName || null,
        // Date handling: undefined, empty string, or invalid -> null
        date: (a.date && a.date.trim() !== '') ? a.date : null,
        raw_data: a,
        updated_at: new Date().toISOString()
      }));

      // Deduplicate by unique constraint key (symbol, senate_id, house_registrant_id)
      const seen = new Set<string>();
      const dedupedData = upsertData.filter(d => {
        const key = `${d.symbol}|${d.senate_id}|${d.house_registrant_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (dedupedData.length === 0) {
        await this.supabaseAdmin.rpc('cache_refresh_completed', {
          p_cache_name: 'senate_lobbying',
          p_status: 'success',
          p_error: null,
          p_items_count: 0
        });
        return { success: true, count: 0 };
      }

      const { error } = await this.supabaseAdmin
        .from('senate_lobbying_cache')
        .upsert(dedupedData, { 
          onConflict: 'symbol,senate_id,house_registrant_id' 
        });

      if (error) throw error;

      await this.supabaseAdmin.rpc('cache_refresh_completed', {
        p_cache_name: 'senate_lobbying',
        p_status: 'success',
        p_error: null,
        p_items_count: activities.length
      });

      return { success: true, count: activities.length };
    } catch (error: any) {
      await this.supabaseAdmin.rpc('cache_refresh_completed', {
        p_cache_name: 'senate_lobbying',
        p_status: 'failed',
        p_error: error.message,
        p_items_count: 0
      });
      throw error;
    }
  }

  // ==================== USA SPENDING ====================

  async getUSASpending(options?: {
    symbol?: string;
    limit?: number;
  }): Promise<USASpendingActivity[]> {
    let query = this.supabase
      .from('usa_spending_cache')
      .select('*')
      .order('action_date', { ascending: false });

    if (options?.symbol) {
      query = query.eq('symbol', options.symbol.toUpperCase());
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching USA spending from cache:', error);
      return [];
    }
    
    // Map back to API format
    return (data || []).map(d => d.raw_data);
  }

  async refreshUSASpending(activities: USASpendingActivity[], symbol: string): Promise<{ success: boolean; count: number }> {
    if (!this.supabaseAdmin) {
      throw new Error('Admin client not available - this must be called from server');
    }

    try {
      await this.supabaseAdmin.rpc('cache_refresh_started', { p_cache_name: 'usa_spending' });

      // Map to table structure with sanitized data
      const upsertData = activities.map(a => ({
        symbol: a.symbol || symbol,
        recipient_name: a.recipientName || null,
        total_value: a.totalValue,
        // Date handling: undefined, empty string, or invalid -> null
        action_date: (a.actionDate && a.actionDate.trim() !== '') ? a.actionDate : null,
        performance_start_date: (a.performanceStartDate && a.performanceStartDate.trim() !== '') ? a.performanceStartDate : null,
        performance_end_date: (a.performanceEndDate && a.performanceEndDate.trim() !== '') ? a.performanceEndDate : null,
        awarding_agency_name: a.awardingAgencyName || null,
        award_description: a.awardDescription || null,
        permalink: a.permalink || '',  // NOT NULL DEFAULT '' in DB
        raw_data: a,
        updated_at: new Date().toISOString()
      }));

      // Deduplicate by unique constraint key (symbol, permalink) - CRITICAL to avoid ON CONFLICT error
      const seen = new Set<string>();
      const dedupedData = upsertData.filter(d => {
        const key = `${d.symbol}|${d.permalink}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (dedupedData.length === 0) {
        await this.supabaseAdmin.rpc('cache_refresh_completed', {
          p_cache_name: 'usa_spending',
          p_status: 'success',
          p_error: null,
          p_items_count: 0
        });
        return { success: true, count: 0 };
      }

      const { error } = await this.supabaseAdmin
        .from('usa_spending_cache')
        .upsert(dedupedData, { 
          onConflict: 'symbol,permalink' 
        });

      if (error) throw error;

      await this.supabaseAdmin.rpc('cache_refresh_completed', {
        p_cache_name: 'usa_spending',
        p_status: 'success',
        p_error: null,
        p_items_count: activities.length
      });

      return { success: true, count: activities.length };
    } catch (error: any) {
      await this.supabaseAdmin.rpc('cache_refresh_completed', {
        p_cache_name: 'usa_spending',
        p_status: 'failed',
        p_error: error.message,
        p_items_count: 0
      });
      throw error;
    }
  }
}

// Export singleton instance
export const toolsCacheService = new ToolsCacheService();
export default toolsCacheService;
