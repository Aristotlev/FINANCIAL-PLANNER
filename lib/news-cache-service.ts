/**
 * News Cache Service
 * 
 * Handles caching of IPO Calendar, Earnings Calendar, and Twitter Feed data
 * to reduce API calls and improve performance.
 * 
 * Usage:
 *   - Frontend: Use getters to fetch from cache
 *   - Backend/Cron: Use refresh functions to update cache
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to safely create Supabase client (handles missing env vars during build)
function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    console.warn('Supabase environment variables not available - news cache service will be disabled');
    return null;
  }
  
  return createClient(url, anonKey);
}

function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (typeof window !== 'undefined' || !url || !serviceKey) {
    return null;
  }
  
  return createClient(url, serviceKey);
}

// Types
export interface IPOData {
  id?: string;
  symbol: string;
  company_name: string;
  exchange?: string;
  ipo_date?: string;
  price_range_low?: number;
  price_range_high?: number;
  offer_price?: number;
  shares_offered?: number;
  expected_ipo_date?: string;
  status?: 'upcoming' | 'priced' | 'withdrawn' | 'postponed';
  industry?: string;
  lead_underwriters?: string[];
  market_cap_estimate?: number;
  description?: string;
  filing_date?: string;
  raw_data?: any;
}

export interface EarningsData {
  id?: string;
  symbol: string;
  company_name: string;
  report_date: string;
  report_time?: 'bmo' | 'amc' | 'during';
  fiscal_quarter?: string;
  fiscal_year?: number;
  eps_estimate?: number;
  eps_actual?: number;
  revenue_estimate?: number;
  revenue_actual?: number;
  surprise_percent?: number;
  conference_call_time?: string;
  conference_call_url?: string;
  raw_data?: any;
}

export interface TweetData {
  id?: string;
  tweet_id: string;
  author_username: string;
  author_name?: string;
  author_profile_image?: string;
  author_verified?: boolean;
  author_followers?: number;
  content: string;
  content_html?: string;
  media_urls?: string[];
  hashtags?: string[];
  mentioned_symbols?: string[];
  mentioned_users?: string[];
  tweet_url?: string;
  likes_count?: number;
  retweets_count?: number;
  replies_count?: number;
  quote_count?: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  sentiment_score?: number;
  is_retweet?: boolean;
  original_tweet_id?: string;
  language?: string;
  source?: string;
  category?: 'market_news' | 'earnings' | 'ipo' | 'crypto' | 'general';
  published_at: string;
  raw_data?: any;
}

export interface CacheStatus {
  cache_name: string;
  last_refresh_at: string | null;
  next_refresh_at: string | null;
  needs_refresh: boolean;
  is_refreshing: boolean;
  items_count: number;
  status: string | null;
}

type CacheName = 'ipo_calendar' | 'earnings_calendar' | 'twitter_feed';

class NewsCacheService {
  private supabase: SupabaseClient | null;
  private supabaseAdmin: SupabaseClient | null;

  constructor() {
    // Client-side Supabase (for reading) - may be null during build
    this.supabase = createSupabaseClient();

    // Admin client for write operations (only on server)
    this.supabaseAdmin = createSupabaseAdminClient();
  }

  // Helper to get supabase client or throw
  private getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client not available - missing environment variables');
    }
    return this.supabase;
  }

  // Helper to get admin client or throw
  private getAdminClient(): SupabaseClient {
    if (!this.supabaseAdmin) {
      throw new Error('Admin client not available - this must be called from server with SUPABASE_SERVICE_ROLE_KEY');
    }
    return this.supabaseAdmin;
  }

  // ==================== CACHE STATUS ====================

  async getCacheStatus(): Promise<CacheStatus[]> {
    const client = this.getClient();
    const { data, error } = await client.rpc('get_cache_status');
    if (error) {
      console.error('Error getting cache status:', error);
      return [];
    }
    return data || [];
  }

  async needsRefresh(cacheName: CacheName): Promise<boolean> {
    const client = this.getClient();
    const { data, error } = await client.rpc('cache_needs_refresh', {
      p_cache_name: cacheName
    });
    if (error) {
      console.error('Error checking cache refresh:', error);
      return true; // Assume needs refresh on error
    }
    return data;
  }

  // ==================== IPO CALENDAR ====================

  async getUpcomingIPOs(limit = 20): Promise<IPOData[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('upcoming_ipos')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching IPOs:', error);
      return [];
    }
    return data || [];
  }

  async getAllIPOs(options?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<IPOData[]> {
    const client = this.getClient();
    let query = client
      .from('ipo_calendar_cache')
      .select('*')
      .order('ipo_date', { ascending: true });

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.fromDate) {
      query = query.gte('ipo_date', options.fromDate);
    }
    if (options?.toDate) {
      query = query.lte('ipo_date', options.toDate);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching IPOs:', error);
      return [];
    }
    return data || [];
  }

  async refreshIPOCalendar(ipoData: IPOData[]): Promise<{ success: boolean; count: number }> {
    const admin = this.getAdminClient();

    try {
      // Mark refresh started
      await admin.rpc('cache_refresh_started', { p_cache_name: 'ipo_calendar' });

      // Upsert IPO data
      const { error } = await admin
        .from('ipo_calendar_cache')
        .upsert(
          ipoData.map(ipo => ({
            ...ipo,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'symbol,ipo_date' }
        );

      if (error) throw error;

      // Mark refresh completed
      await admin.rpc('cache_refresh_completed', {
        p_cache_name: 'ipo_calendar',
        p_status: 'success',
        p_error: null,
        p_items_count: ipoData.length
      });

      return { success: true, count: ipoData.length };
    } catch (error: any) {
      // Mark refresh failed
      await admin.rpc('cache_refresh_completed', {
        p_cache_name: 'ipo_calendar',
        p_status: 'failed',
        p_error: error.message,
        p_items_count: 0
      });
      throw error;
    }
  }

  // ==================== EARNINGS CALENDAR ====================

  async getWeeklyEarnings(): Promise<EarningsData[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('weekly_earnings')
      .select('*');

    if (error) {
      console.error('Error fetching earnings:', error);
      return [];
    }
    return data || [];
  }

  async getEarnings(options?: {
    fromDate?: string;
    toDate?: string;
    symbol?: string;
    limit?: number;
  }): Promise<EarningsData[]> {
    const client = this.getClient();
    let query = client
      .from('earnings_calendar_cache')
      .select('*')
      .order('report_date', { ascending: true });

    if (options?.fromDate) {
      query = query.gte('report_date', options.fromDate);
    }
    if (options?.toDate) {
      query = query.lte('report_date', options.toDate);
    }
    if (options?.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching earnings:', error);
      return [];
    }
    return data || [];
  }

  async refreshEarningsCalendar(earningsData: EarningsData[]): Promise<{ success: boolean; count: number }> {
    const admin = this.getAdminClient();

    try {
      await admin.rpc('cache_refresh_started', { p_cache_name: 'earnings_calendar' });

      const { error } = await admin
        .from('earnings_calendar_cache')
        .upsert(
          earningsData.map(e => ({
            ...e,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'symbol,report_date' }
        );

      if (error) throw error;

      await admin.rpc('cache_refresh_completed', {
        p_cache_name: 'earnings_calendar',
        p_status: 'success',
        p_error: null,
        p_items_count: earningsData.length
      });

      return { success: true, count: earningsData.length };
    } catch (error: any) {
      await admin.rpc('cache_refresh_completed', {
        p_cache_name: 'earnings_calendar',
        p_status: 'failed',
        p_error: error.message,
        p_items_count: 0
      });
      throw error;
    }
  }

  // ==================== TWITTER FEED ====================

  async getRecentTweets(limit = 50): Promise<TweetData[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('recent_fintwit')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching tweets:', error);
      return [];
    }
    return data || [];
  }

  async getTweets(options?: {
    symbol?: string;
    category?: string;
    sentiment?: string;
    hashtag?: string;
    limit?: number;
    hoursAgo?: number;
  }): Promise<TweetData[]> {
    const client = this.getClient();
    let query = client
      .from('twitter_feed_cache')
      .select('*')
      .order('published_at', { ascending: false });

    if (options?.symbol) {
      query = query.contains('mentioned_symbols', [options.symbol]);
    }
    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.sentiment) {
      query = query.eq('sentiment', options.sentiment);
    }
    if (options?.hashtag) {
      query = query.contains('hashtags', [options.hashtag]);
    }
    if (options?.hoursAgo) {
      const since = new Date(Date.now() - options.hoursAgo * 60 * 60 * 1000).toISOString();
      query = query.gte('published_at', since);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching tweets:', error);
      return [];
    }
    return data || [];
  }

  async refreshTwitterFeed(tweets: TweetData[]): Promise<{ success: boolean; count: number }> {
    const admin = this.getAdminClient();

    try {
      await admin.rpc('cache_refresh_started', { p_cache_name: 'twitter_feed' });

      const { error } = await admin
        .from('twitter_feed_cache')
        .upsert(
          tweets.map(t => ({
            ...t,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'tweet_id' }
        );

      if (error) throw error;

      await admin.rpc('cache_refresh_completed', {
        p_cache_name: 'twitter_feed',
        p_status: 'success',
        p_error: null,
        p_items_count: tweets.length
      });

      return { success: true, count: tweets.length };
    } catch (error: any) {
      await admin.rpc('cache_refresh_completed', {
        p_cache_name: 'twitter_feed',
        p_status: 'failed',
        p_error: error.message,
        p_items_count: 0
      });
      throw error;
    }
  }

  // ==================== CLEANUP ====================

  async cleanOldData(daysToKeep = 30): Promise<{ table: string; deleted: number }[]> {
    const admin = this.getAdminClient();

    const { data, error } = await admin.rpc('clean_old_cache_data', {
      p_days_to_keep: daysToKeep
    });

    if (error) {
      console.error('Error cleaning old data:', error);
      return [];
    }
    return data || [];
  }
}

// Export singleton instance
export const newsCacheService = new NewsCacheService();
export default newsCacheService;
