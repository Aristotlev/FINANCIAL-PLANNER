"use client";

import { supabase, isSupabaseConfigured } from './client';
import { DataService } from '../data-service';
import { authClient } from '../auth-client';

/**
 * Enhanced Data Service with Supabase backend
 * Falls back to localStorage if Supabase is not configured
 * 
 * IMPORTANT: Uses Better Auth for user authentication, NOT Supabase Auth
 */
export class SupabaseDataService {
  private static isConfigured = isSupabaseConfigured();
  private static cachedUserId: string | null = null;
  private static lastUserIdCheck: number = 0;
  private static readonly USER_ID_CACHE_TTL = 30000; // 30 seconds

  // Helper to get current user ID from Better Auth (NOT Supabase Auth)
  private static async getUserId(): Promise<string | null> {
    if (!this.isConfigured) return null;
    
    // Use cached user ID if still valid
    const now = Date.now();
    if (this.cachedUserId && (now - this.lastUserIdCheck) < this.USER_ID_CACHE_TTL) {
      return this.cachedUserId;
    }
    
    try {
      // Get user from Better Auth session
      const response = await authClient.getSession();
      
      if (response.data && 'user' in response.data && response.data.user) {
        this.cachedUserId = response.data.user.id;
        this.lastUserIdCheck = now;
        return this.cachedUserId;
      }
      
      // Clear cache if no user
      this.cachedUserId = null;
      this.lastUserIdCheck = now;
      return null;
    } catch (error) {
      // Silently fail if auth is not available (e.g. during SSR or initial load)
      // console.error('Error getting user ID from Better Auth:', error);
      return null;
    }
  }
  
  // Clear cached user ID (call on logout)
  static clearUserCache(): void {
    this.cachedUserId = null;
    this.lastUserIdCheck = 0;
  }

  // Helper to check if an error is an auth error that should be suppressed
  private static isAuthError(error: any): boolean {
    if (!error) return false;
    
    // Check for specific error codes and messages
    const code = error.code;
    const status = error.status;
    const message = error.message?.toLowerCase() || '';
    
    return (
      code === 'PGRST301' || // JWT expired
      status === 401 ||      // Unauthorized
      status === 403 ||      // Forbidden
      message.includes('jwt') ||
      message.includes('auth') ||
      message.includes('key') ||
      message.includes('token')
    );
  }

  // ==================== CASH ACCOUNTS ====================
  
  static async getCashAccounts(defaultAccounts: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadCashAccounts([]);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadCashAccounts([]);
      }

      const { data, error } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Return data as-is (even if empty) - no defaults
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading cash accounts from Supabase:', error);
      }
      return DataService.loadCashAccounts([]);
    }
  }

  static async saveCashAccount(account: any): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadCashAccounts([]);
      const existing = accounts.findIndex(a => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveCashAccounts(accounts);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const accounts = DataService.loadCashAccounts([]);
        const existing = accounts.findIndex(a => a.id === account.id);
        if (existing >= 0) {
          accounts[existing] = account;
        } else {
          accounts.push(account);
        }
        DataService.saveCashAccounts(accounts);
        return;
      }

      const { error } = await supabase
        .from('cash_accounts')
        .upsert({ ...account, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving cash account to Supabase:', error);
      // Fall back to localStorage on error
      const accounts = DataService.loadCashAccounts([]);
      const existing = accounts.findIndex(a => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveCashAccounts(accounts);
    }
  }

  static async deleteCashAccount(accountId: string): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadCashAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveCashAccounts(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('cash_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const accounts = DataService.loadCashAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveCashAccounts(filtered);
    } catch (error) {
      console.error('Error deleting cash account from Supabase:', error);
      // Fall back to localStorage on error
      const accounts = DataService.loadCashAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveCashAccounts(filtered);
    }
  }

  // ==================== INCOME SOURCES ====================
  
  static async getIncomeSources(defaultSources: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      const stored = localStorage.getItem('incomeSources');
      return stored ? JSON.parse(stored) : defaultSources;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        const stored = localStorage.getItem('incomeSources');
        return stored ? JSON.parse(stored) : defaultSources;
      }

      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading income sources from Supabase:', error);
      }
      const stored = localStorage.getItem('incomeSources');
      return stored ? JSON.parse(stored) : defaultSources;
    }
  }

  static async saveIncomeSource(income: any): Promise<void> {
    if (!this.isConfigured) {
      const stored = localStorage.getItem('incomeSources');
      const sources = stored ? JSON.parse(stored) : [];
      const existing = sources.findIndex((s: any) => s.id === income.id);
      if (existing >= 0) {
        sources[existing] = income;
      } else {
        sources.push(income);
      }
      localStorage.setItem('incomeSources', JSON.stringify(sources));
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        const stored = localStorage.getItem('incomeSources');
        const sources = stored ? JSON.parse(stored) : [];
        const existing = sources.findIndex((s: any) => s.id === income.id);
        if (existing >= 0) {
          sources[existing] = income;
        } else {
          sources.push(income);
        }
        localStorage.setItem('incomeSources', JSON.stringify(sources));
        return;
      }

      const { error } = await supabase
        .from('income_sources')
        .upsert({ 
          ...income, 
          user_id: userId,
          connected_account: income.connectedAccount,
          is_recurring: income.isRecurring,
          next_payment_date: income.nextPaymentDate
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving income source to Supabase:', error);
      const stored = localStorage.getItem('incomeSources');
      const sources = stored ? JSON.parse(stored) : [];
      const existing = sources.findIndex((s: any) => s.id === income.id);
      if (existing >= 0) {
        sources[existing] = income;
      } else {
        sources.push(income);
      }
      localStorage.setItem('incomeSources', JSON.stringify(sources));
    }
  }

  static async deleteIncomeSource(incomeId: string): Promise<void> {
    if (!this.isConfigured) {
      const stored = localStorage.getItem('incomeSources');
      const sources = stored ? JSON.parse(stored) : [];
      const filtered = sources.filter((s: any) => s.id !== incomeId);
      localStorage.setItem('incomeSources', JSON.stringify(filtered));
      return;
    }

    try {
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', incomeId);

      if (error) throw error;
      
      const stored = localStorage.getItem('incomeSources');
      const sources = stored ? JSON.parse(stored) : [];
      const filtered = sources.filter((s: any) => s.id !== incomeId);
      localStorage.setItem('incomeSources', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting income source from Supabase:', error);
      const stored = localStorage.getItem('incomeSources');
      const sources = stored ? JSON.parse(stored) : [];
      const filtered = sources.filter((s: any) => s.id !== incomeId);
      localStorage.setItem('incomeSources', JSON.stringify(filtered));
    }
  }

  // ==================== CRYPTO HOLDINGS ====================
  
  static async getCryptoHoldings(defaultHoldings: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadCryptoHoldings([]);
    }

    try {
      const userId = await this.getUserId();
      
      // If no user, fall back to localStorage instead of returning empty array
      if (!userId) {
        return DataService.loadCryptoHoldings([]);
      }

      const { data, error } = await supabase
        .from('crypto_holdings')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      // Map database fields to application fields
      const mappedData = (data || []).map((holding: any) => ({
        ...holding,
        entryPoint: holding.purchase_price || 0,
        walletType: holding.wallet_type,
        walletName: holding.wallet_name,
        walletAddress: holding.wallet_address,
      }));
      return mappedData;
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading crypto holdings:', error);
      }
      return DataService.loadCryptoHoldings([]);
    }
  }

  static async saveCryptoHolding(holding: any): Promise<void> {
    if (!this.isConfigured) {
      const holdings = DataService.loadCryptoHoldings([]);
      const existing = holdings.findIndex(h => h.id === holding.id);
      if (existing >= 0) {
        holdings[existing] = holding;
      } else {
        holdings.push(holding);
      }
      DataService.saveCryptoHoldings(holdings);
      return;
    }

    try {
      const userId = await this.getUserId();
      
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const holdings = DataService.loadCryptoHoldings([]);
        const existing = holdings.findIndex(h => h.id === holding.id);
        if (existing >= 0) {
          holdings[existing] = holding;
        } else {
          holdings.push(holding);
        }
        DataService.saveCryptoHoldings(holdings);
        return;
      }

      // Map application fields to database fields
      const dbHolding: any = {
        id: holding.id,
        user_id: userId,
        symbol: holding.symbol,
        name: holding.name,
        amount: holding.amount,
        purchase_price: holding.entryPoint || 0,
        color: holding.color || '#f59e0b',
        wallet_type: holding.walletType || 'other',
        wallet_name: holding.walletName || null,
        wallet_address: holding.walletAddress || null,
      };
      
      // console.log('Saving crypto holding to Supabase:', dbHolding);
      
      const { error } = await supabase
        .from('crypto_holdings')
        .upsert(dbHolding);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving crypto holding:', error);
      if (error && typeof error === 'object') {
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
      }
      
      // Fall back to localStorage on error
      const holdings = DataService.loadCryptoHoldings([]);
      const existing = holdings.findIndex(h => h.id === holding.id);
      if (existing >= 0) {
        holdings[existing] = holding;
      } else {
        holdings.push(holding);
      }
      DataService.saveCryptoHoldings(holdings);
    }
  }

  static async deleteCryptoHolding(holdingId: string): Promise<void> {
    if (!this.isConfigured) {
      const holdings = DataService.loadCryptoHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveCryptoHoldings(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('crypto_holdings')
        .delete()
        .eq('id', holdingId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const holdings = DataService.loadCryptoHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveCryptoHoldings(filtered);
    } catch (error) {
      console.error('Error deleting crypto holding from Supabase:', error);
      // Fall back to localStorage on error
      const holdings = DataService.loadCryptoHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveCryptoHoldings(filtered);
    }
  }

  // ==================== STOCK HOLDINGS ====================
  
  static async getStockHoldings(defaultHoldings: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadStockHoldings([]);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadStockHoldings([]);
      }

      const { data, error } = await supabase
        .from('stock_holdings')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      // Return data as-is (even if empty) - no defaults
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading stock holdings from Supabase:', error);
      }
      return DataService.loadStockHoldings([]);
    }
  }

  static async saveStockHolding(holding: any): Promise<void> {
    if (!this.isConfigured) {
      const holdings = DataService.loadStockHoldings([]);
      const existing = holdings.findIndex(h => h.id === holding.id);
      if (existing >= 0) {
        holdings[existing] = holding;
      } else {
        holdings.push(holding);
      }
      DataService.saveStockHoldings(holdings);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const holdings = DataService.loadStockHoldings([]);
        const existing = holdings.findIndex(h => h.id === holding.id);
        if (existing >= 0) {
          holdings[existing] = holding;
        } else {
          holdings.push(holding);
        }
        DataService.saveStockHoldings(holdings);
        return;
      }

      const { error } = await supabase
        .from('stock_holdings')
        .upsert({ ...holding, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving stock holding to Supabase:', error);
      // Fall back to localStorage on error
      const holdings = DataService.loadStockHoldings([]);
      const existing = holdings.findIndex(h => h.id === holding.id);
      if (existing >= 0) {
        holdings[existing] = holding;
      } else {
        holdings.push(holding);
      }
      DataService.saveStockHoldings(holdings);
    }
  }

  static async deleteStockHolding(holdingId: string): Promise<void> {
    if (!this.isConfigured) {
      const holdings = DataService.loadStockHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveStockHoldings(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_holdings')
        .delete()
        .eq('id', holdingId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const holdings = DataService.loadStockHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveStockHoldings(filtered);
    } catch (error) {
      console.error('Error deleting stock holding from Supabase:', error);
      // Fall back to localStorage on error
      const holdings = DataService.loadStockHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveStockHoldings(filtered);
    }
  }

  // ==================== TRADING ACCOUNTS ====================
  
  static async getTradingAccounts(defaultAccounts: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadTradingAccounts([]);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadTradingAccounts([]);
      }

      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      // Return data as-is (even if empty) - no defaults
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading trading accounts from Supabase:', error);
      }
      return DataService.loadTradingAccounts([]);
    }
  }

  static async saveTradingAccount(account: any): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadTradingAccounts([]);
      const existing = accounts.findIndex(a => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveTradingAccounts(accounts);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const accounts = DataService.loadTradingAccounts([]);
        const existing = accounts.findIndex(a => a.id === account.id);
        if (existing >= 0) {
          accounts[existing] = account;
        } else {
          accounts.push(account);
        }
        DataService.saveTradingAccounts(accounts);
        return;
      }

      const { error } = await supabase
        .from('trading_accounts')
        .upsert({ ...account, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving trading account to Supabase:', error);
      // Fall back to localStorage on error
      const accounts = DataService.loadTradingAccounts([]);
      const existing = accounts.findIndex(a => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveTradingAccounts(accounts);
    }
  }

  static async deleteTradingAccount(accountId: string): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadTradingAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveTradingAccounts(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('trading_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const accounts = DataService.loadTradingAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveTradingAccounts(filtered);
    } catch (error) {
      console.error('Error deleting trading account from Supabase:', error);
      // Fall back to localStorage on error
      const accounts = DataService.loadTradingAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveTradingAccounts(filtered);
    }
  }

  // ==================== REAL ESTATE ====================
  
  static async getRealEstate(defaultProperties: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadRealEstate(defaultProperties);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadRealEstate(defaultProperties);
      }

      const { data, error } = await supabase
        .from('real_estate')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      // Return data as-is (even if empty) - only use defaults on first load when no data exists
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading real estate from Supabase:', error);
      }
      return DataService.loadRealEstate(defaultProperties);
    }
  }

  static async saveRealEstate(property: any): Promise<void> {
    if (!this.isConfigured) {
      const properties = DataService.loadRealEstate([]);
      const existing = properties.findIndex(p => p.id === property.id);
      if (existing >= 0) {
        properties[existing] = property;
      } else {
        properties.push(property);
      }
      DataService.saveRealEstate(properties);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const properties = DataService.loadRealEstate([]);
        const existing = properties.findIndex(p => p.id === property.id);
        if (existing >= 0) {
          properties[existing] = property;
        } else {
          properties.push(property);
        }
        DataService.saveRealEstate(properties);
        return;
      }

      const { error } = await supabase
        .from('real_estate')
        .upsert({ ...property, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving real estate to Supabase:', error);
      // Fall back to localStorage on error
      const properties = DataService.loadRealEstate([]);
      const existing = properties.findIndex(p => p.id === property.id);
      if (existing >= 0) {
        properties[existing] = property;
      } else {
        properties.push(property);
      }
      DataService.saveRealEstate(properties);
    }
  }

  static async deleteRealEstate(propertyId: string): Promise<void> {
    if (!this.isConfigured) {
      const properties = DataService.loadRealEstate([]);
      const filtered = properties.filter(p => p.id !== propertyId);
      DataService.saveRealEstate(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('real_estate')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const properties = DataService.loadRealEstate([]);
      const filtered = properties.filter(p => p.id !== propertyId);
      DataService.saveRealEstate(filtered);
    } catch (error) {
      console.error('Error deleting real estate from Supabase:', error);
      // Fall back to localStorage on error
      const properties = DataService.loadRealEstate([]);
      const filtered = properties.filter(p => p.id !== propertyId);
      DataService.saveRealEstate(filtered);
    }
  }

  // ==================== SAVINGS ACCOUNTS ====================
  
  static async getSavingsAccounts(defaultAccounts: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadSavingsAccounts(defaultAccounts);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadSavingsAccounts(defaultAccounts);
      }

      const { data, error } = await supabase
        .from('savings_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Return data as-is (even if empty) - only use defaults on first load when no data exists
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading savings accounts from Supabase:', error);
      }
      return DataService.loadSavingsAccounts(defaultAccounts);
    }
  }

  static async saveSavingsAccount(account: any): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadSavingsAccounts([]);
      const existing = accounts.findIndex(a => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveSavingsAccounts(accounts);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const accounts = DataService.loadSavingsAccounts([]);
        const existing = accounts.findIndex(a => a.id === account.id);
        if (existing >= 0) {
          accounts[existing] = account;
        } else {
          accounts.push(account);
        }
        DataService.saveSavingsAccounts(accounts);
        return;
      }

      const { error } = await supabase
        .from('savings_accounts')
        .upsert({ ...account, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving savings account to Supabase:', error);
      // Fall back to localStorage on error
      const accounts = DataService.loadSavingsAccounts([]);
      const existing = accounts.findIndex(a => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveSavingsAccounts(accounts);
    }
  }

  static async deleteSavingsAccount(accountId: string): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadSavingsAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveSavingsAccounts(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('savings_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const accounts = DataService.loadSavingsAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveSavingsAccounts(filtered);
    } catch (error) {
      console.error('Error deleting savings account from Supabase:', error);
      // Fall back to localStorage on error
      const accounts = DataService.loadSavingsAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveSavingsAccounts(filtered);
    }
  }

  // ==================== EXPENSE CATEGORIES ====================
  
  static async getExpenseCategories(defaultCategories: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadExpenseCategories(defaultCategories);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadExpenseCategories(defaultCategories);
      }

      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Return data as-is (even if empty) - only use defaults on first load when no data exists
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading expense categories from Supabase:', error);
      }
      return DataService.loadExpenseCategories(defaultCategories);
    }
  }

  static async saveExpenseCategory(category: any): Promise<void> {
    if (!this.isConfigured) {
      const categories = DataService.loadExpenseCategories([]);
      const existing = categories.findIndex(c => c.id === category.id);
      if (existing >= 0) {
        categories[existing] = category;
      } else {
        categories.push(category);
      }
      DataService.saveExpenseCategories(categories);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const categories = DataService.loadExpenseCategories([]);
        const existing = categories.findIndex(c => c.id === category.id);
        if (existing >= 0) {
          categories[existing] = category;
        } else {
          categories.push(category);
        }
        DataService.saveExpenseCategories(categories);
        return;
      }

      const { error } = await supabase
        .from('expense_categories')
        .upsert({ ...category, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving expense category to Supabase:', error);
      // Fall back to localStorage on error
      const categories = DataService.loadExpenseCategories([]);
      const existing = categories.findIndex(c => c.id === category.id);
      if (existing >= 0) {
        categories[existing] = category;
      } else {
        categories.push(category);
      }
      DataService.saveExpenseCategories(categories);
    }
  }

  static async deleteExpenseCategory(categoryId: string): Promise<void> {
    if (!this.isConfigured) {
      const categories = DataService.loadExpenseCategories([]);
      const filtered = categories.filter(c => c.id !== categoryId);
      DataService.saveExpenseCategories(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const categories = DataService.loadExpenseCategories([]);
      const filtered = categories.filter(c => c.id !== categoryId);
      DataService.saveExpenseCategories(filtered);
    } catch (error) {
      console.error('Error deleting expense category from Supabase:', error);
      // Fall back to localStorage on error
      const categories = DataService.loadExpenseCategories([]);
      const filtered = categories.filter(c => c.id !== categoryId);
      DataService.saveExpenseCategories(filtered);
    }
  }

  // ==================== SUBSCRIPTIONS ====================
  
  static async getSubscriptions(defaultSubscriptions: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadSubscriptions(defaultSubscriptions);
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        return DataService.loadSubscriptions(defaultSubscriptions);
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading subscriptions from Supabase:', error);
      }
      return DataService.loadSubscriptions(defaultSubscriptions);
    }
  }

  static async saveSubscription(subscription: any): Promise<void> {
    if (!this.isConfigured) {
      const subscriptions = DataService.loadSubscriptions([]);
      const existing = subscriptions.findIndex((s: any) => s.id === subscription.id);
      if (existing >= 0) {
        subscriptions[existing] = subscription;
      } else {
        subscriptions.push(subscription);
      }
      DataService.saveSubscriptions(subscriptions);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        const subscriptions = DataService.loadSubscriptions([]);
        const existing = subscriptions.findIndex((s: any) => s.id === subscription.id);
        if (existing >= 0) {
          subscriptions[existing] = subscription;
        } else {
          subscriptions.push(subscription);
        }
        DataService.saveSubscriptions(subscriptions);
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .upsert({ ...subscription, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving subscription to Supabase:', error);
      const subscriptions = DataService.loadSubscriptions([]);
      const existing = subscriptions.findIndex((s: any) => s.id === subscription.id);
      if (existing >= 0) {
        subscriptions[existing] = subscription;
      } else {
        subscriptions.push(subscription);
      }
      DataService.saveSubscriptions(subscriptions);
    }
  }

  static async deleteSubscription(subscriptionId: string): Promise<void> {
    if (!this.isConfigured) {
      const subscriptions = DataService.loadSubscriptions([]);
      const filtered = subscriptions.filter((s: any) => s.id !== subscriptionId);
      DataService.saveSubscriptions(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
      
      const subscriptions = DataService.loadSubscriptions([]);
      const filtered = subscriptions.filter((s: any) => s.id !== subscriptionId);
      DataService.saveSubscriptions(filtered);
    } catch (error) {
      console.error('Error deleting subscription from Supabase:', error);
      const subscriptions = DataService.loadSubscriptions([]);
      const filtered = subscriptions.filter((s: any) => s.id !== subscriptionId);
      DataService.saveSubscriptions(filtered);
    }
  }

  // ==================== DEBT ACCOUNTS ====================
  
  static async getDebtAccounts(defaultAccounts: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadDebtAccounts?.(defaultAccounts) || [];
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        return DataService.loadDebtAccounts?.(defaultAccounts) || [];
      }

      const { data, error } = await supabase
        .from('debt_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading debt accounts from Supabase:', error);
      }
      return DataService.loadDebtAccounts?.(defaultAccounts) || [];
    }
  }

  static async saveDebtAccount(account: any): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadDebtAccounts?.([]) || [];
      const existing = accounts.findIndex((a: any) => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveDebtAccounts?.(accounts);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        const accounts = DataService.loadDebtAccounts?.([]) || [];
        const existing = accounts.findIndex((a: any) => a.id === account.id);
        if (existing >= 0) {
          accounts[existing] = account;
        } else {
          accounts.push(account);
        }
        DataService.saveDebtAccounts?.(accounts);
        return;
      }

      const { error } = await supabase
        .from('debt_accounts')
        .upsert({ ...account, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving debt account to Supabase:', error);
      const accounts = DataService.loadDebtAccounts?.([]) || [];
      const existing = accounts.findIndex((a: any) => a.id === account.id);
      if (existing >= 0) {
        accounts[existing] = account;
      } else {
        accounts.push(account);
      }
      DataService.saveDebtAccounts?.(accounts);
    }
  }

  static async deleteDebtAccount(accountId: string): Promise<void> {
    if (!this.isConfigured) {
      const accounts = DataService.loadDebtAccounts?.([]) || [];
      const filtered = accounts.filter((a: any) => a.id !== accountId);
      DataService.saveDebtAccounts?.(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('debt_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      const accounts = DataService.loadDebtAccounts?.([]) || [];
      const filtered = accounts.filter((a: any) => a.id !== accountId);
      DataService.saveDebtAccounts?.(filtered);
    } catch (error) {
      console.error('Error deleting debt account from Supabase:', error);
      const accounts = DataService.loadDebtAccounts?.([]) || [];
      const filtered = accounts.filter((a: any) => a.id !== accountId);
      DataService.saveDebtAccounts?.(filtered);
    }
  }

  // ==================== VALUABLE ITEMS ====================
  
  static async getValuableItems(defaultItems: any[] = []): Promise<any[]> {
    if (!this.isConfigured) {
      return DataService.loadValuableItems(defaultItems);
    }

    try {
      const userId = await this.getUserId();
      // If no user, fall back to localStorage
      if (!userId) {
        return DataService.loadValuableItems(defaultItems);
      }

      const { data, error } = await supabase
        .from('valuable_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Return data as-is (even if empty) - only use defaults on first load when no data exists
      return data || [];
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error loading valuable items from Supabase:', error);
      }
      return DataService.loadValuableItems(defaultItems);
    }
  }

  static async saveValuableItem(item: any): Promise<void> {
    if (!this.isConfigured) {
      const items = DataService.loadValuableItems([]);
      const existing = items.findIndex(i => i.id === item.id);
      if (existing >= 0) {
        items[existing] = item;
      } else {
        items.push(item);
      }
      DataService.saveValuableItems(items);
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fall back to localStorage if not authenticated
        const items = DataService.loadValuableItems([]);
        const existing = items.findIndex(i => i.id === item.id);
        if (existing >= 0) {
          items[existing] = item;
        } else {
          items.push(item);
        }
        DataService.saveValuableItems(items);
        return;
      }

      const { error } = await supabase
        .from('valuable_items')
        .upsert({ ...item, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving valuable item to Supabase:', error);
      // Fall back to localStorage on error
      const items = DataService.loadValuableItems([]);
      const existing = items.findIndex(i => i.id === item.id);
      if (existing >= 0) {
        items[existing] = item;
      } else {
        items.push(item);
      }
      DataService.saveValuableItems(items);
    }
  }

  static async deleteValuableItem(itemId: string): Promise<void> {
    if (!this.isConfigured) {
      const items = DataService.loadValuableItems([]);
      const filtered = items.filter(i => i.id !== itemId);
      DataService.saveValuableItems(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('valuable_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      // Also remove from localStorage to prevent stale data
      const items = DataService.loadValuableItems([]);
      const filtered = items.filter(i => i.id !== itemId);
      DataService.saveValuableItems(filtered);
    } catch (error) {
      console.error('Error deleting valuable item from Supabase:', error);
      // Fall back to localStorage on error
      const items = DataService.loadValuableItems([]);
      const filtered = items.filter(i => i.id !== itemId);
      DataService.saveValuableItems(filtered);
    }
  }

  // ==================== MIGRATION ====================
  
  /**
   * Migrate data from localStorage to Supabase
   * Call this once after user logs in for the first time
   */
  static async migrateFromLocalStorage(): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured, cannot migrate data');
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('User not authenticated, cannot migrate data');
        return;
      }

      // Check if migration already done
      const migrationKey = `moneyHub_migrated_${userId}`;
      if (localStorage.getItem(migrationKey)) {
        console.log('Data already migrated for this user');
        return;
      }

      console.log('Starting migration from localStorage to Supabase...');

      // Export all localStorage data
      const localData = DataService.exportAllData();

      // Migrate each data type
      if (localData.CASH_ACCOUNTS) {
        for (const account of localData.CASH_ACCOUNTS) {
          await this.saveCashAccount(account);
        }
      }

      if (localData.CRYPTO_HOLDINGS) {
        for (const holding of localData.CRYPTO_HOLDINGS) {
          await this.saveCryptoHolding(holding);
        }
      }

      if (localData.STOCK_HOLDINGS) {
        for (const holding of localData.STOCK_HOLDINGS) {
          await this.saveStockHolding(holding);
        }
      }

      if (localData.TRADING_ACCOUNTS) {
        for (const account of localData.TRADING_ACCOUNTS) {
          await this.saveTradingAccount(account);
        }
      }

      if (localData.REAL_ESTATE) {
        for (const property of localData.REAL_ESTATE) {
          await this.saveRealEstate(property);
        }
      }

      // Mark migration as complete
      localStorage.setItem(migrationKey, 'true');
      console.log('Migration completed successfully!');

      // Optionally clear localStorage after successful migration
      // DataService.clearAllData();
      
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }

  // ==================== CLEAR ALL DATA ====================
  
  /**
   * Clear all user data from Supabase and localStorage
   * This will delete all financial data for the current user
   */
  static async clearAllData(): Promise<void> {
    console.log('Clearing all financial data...');
    
    // Always clear localStorage first
    DataService.clearAllData();
    
    if (!this.isConfigured) {
      console.log('Supabase not configured, only cleared localStorage');
      return;
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.log('User not authenticated, only cleared localStorage');
        return;
      }

      console.log('Clearing Supabase data for user:', userId);

      // Delete from all tables in parallel
      await Promise.all([
        supabase.from('cash_accounts').delete().eq('user_id', userId),
        supabase.from('crypto_holdings').delete().eq('user_id', userId),
        supabase.from('stock_holdings').delete().eq('user_id', userId),
        supabase.from('trading_accounts').delete().eq('user_id', userId),
        supabase.from('real_estate').delete().eq('user_id', userId),
        supabase.from('savings_accounts').delete().eq('user_id', userId),
        supabase.from('expense_categories').delete().eq('user_id', userId),
        supabase.from('debt_accounts').delete().eq('user_id', userId),
        supabase.from('valuable_items').delete().eq('user_id', userId),
        supabase.from('tax_profiles').delete().eq('user_id', userId)
      ]);

      console.log('All Supabase data cleared successfully');
    } catch (error) {
      console.error('Error clearing Supabase data:', error);
      throw error;
    }
  }

  // ==================== TAX PROFILES ====================
  
  static async getTaxProfiles(defaultProfiles: any[] = []): Promise<any[]> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fallback to localStorage if not authenticated
        const stored = localStorage.getItem('moneyHub_taxProfiles');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (error) {
            console.error('Error parsing tax profiles:', error);
            return defaultProfiles;
          }
        }
        return defaultProfiles;
      }

      const { data, error } = await supabase
        .from('tax_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tax profiles:', error.message || error);
        if (Object.keys(error).length > 0) console.error('Error details:', error);
        return defaultProfiles;
      }

      // Transform database format to app format
      return (data || []).map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        country: profile.country,
        companyType: profile.company_type,
        salaryIncome: parseFloat(profile.salary_income) || 0,
        businessIncome: parseFloat(profile.business_income) || 0,
        capitalGains: {
          shortTerm: parseFloat(profile.capital_gains_short_term) || 0,
          longTerm: parseFloat(profile.capital_gains_long_term) || 0
        },
        dividends: parseFloat(profile.dividends) || 0,
        rentalIncome: parseFloat(profile.rental_income) || 0,
        cryptoGains: parseFloat(profile.crypto_gains) || 0,
        deductibleExpenses: parseFloat(profile.deductible_expenses) || 0,
        customIncomeSources: profile.custom_income_sources || [],
        notes: profile.notes || '',
        isActive: profile.is_active,
        user_id: profile.user_id,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }));
    } catch (error) {
      console.error('Error in getTaxProfiles:', error);
      return defaultProfiles;
    }
  }

  static async saveTaxProfile(profile: any): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fallback to localStorage if not authenticated
        const profiles = await this.getTaxProfiles([]);
        const existing = profiles.findIndex((p: any) => p.id === profile.id);
        if (existing >= 0) {
          profiles[existing] = profile;
        } else {
          profiles.push(profile);
        }
        localStorage.setItem('moneyHub_taxProfiles', JSON.stringify(profiles));
        return;
      }

      // Transform app format to database format
      const dbProfile: any = {
        id: profile.id,
        user_id: userId,
        name: profile.name,
        country: profile.country,
        company_type: profile.companyType,
        salary_income: profile.salaryIncome,
        business_income: profile.businessIncome,
        capital_gains_short_term: profile.capitalGains?.shortTerm || 0,
        capital_gains_long_term: profile.capitalGains?.longTerm || 0,
        dividends: profile.dividends,
        rental_income: profile.rentalIncome,
        crypto_gains: profile.cryptoGains,
        deductible_expenses: profile.deductibleExpenses,
        custom_income_sources: profile.customIncomeSources || [],
        notes: profile.notes || '',
        is_active: profile.isActive,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tax_profiles')
        .upsert(dbProfile);

      if (error) {
        console.error('Error saving tax profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveTaxProfile:', error);
      throw error;
    }
  }

  static async deleteTaxProfile(profileId: string): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        // Fallback to localStorage if not authenticated
        const profiles = await this.getTaxProfiles([]);
        const filtered = profiles.filter((p: any) => p.id !== profileId);
        localStorage.setItem('moneyHub_taxProfiles', JSON.stringify(filtered));
        return;
      }

      const { error } = await supabase
        .from('tax_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting tax profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteTaxProfile:', error);
      throw error;
    }
  }

  // ==================== USER PREFERENCES (Card Order, Hidden Cards, etc.) ====================
  
  static async getUserPreferences(): Promise<{
    cardOrder?: string[];
    hiddenCards?: string[];
    theme?: string;
    currency?: string;
    [key: string]: any;
  } | null> {
    if (!this.isConfigured) return null;

    try {
      const userId = await this.getUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // PGRST116 means no rows returned, which is fine for new users
        if (error.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', error);
        }
        return null;
      }

      // Type assertion for the data
      const prefData = data as any;
      
      // Merge the preferences JSON with top-level fields
      return {
        theme: prefData?.theme,
        currency: prefData?.currency,
        language: prefData?.language,
        notifications_enabled: prefData?.notifications_enabled,
        ...(prefData?.preferences as Record<string, any> || {})
      };
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error in getUserPreferences:', error);
      }
      return null;
    }
  }

  static async saveUserPreferences(preferences: {
    cardOrder?: string[];
    hiddenCards?: string[];
    theme?: string;
    currency?: string;
    [key: string]: any;
  }): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // Separate top-level fields from the preferences JSON
      const { theme, currency, language, notifications_enabled, ...otherPrefs } = preferences;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          theme: theme || 'system',
          currency: currency || 'USD',
          language: language || 'en',
          notifications_enabled: notifications_enabled ?? true,
          preferences: otherPrefs,
          updated_at: new Date().toISOString()
        } as any, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving user preferences:', error);
        throw error;
      }
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error in saveUserPreferences:', error);
      }
    }
  }

  static async updateCardOrder(cardOrder: string[]): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // First, get existing preferences
      const existing = await this.getUserPreferences();
      
      // Merge with new card order
      await this.saveUserPreferences({
        ...existing,
        cardOrder
      });
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error in updateCardOrder:', error);
      }
    }
  }

  static async updateHiddenCards(hiddenCards: string[]): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // First, get existing preferences
      const existing = await this.getUserPreferences();
      
      // Merge with new hidden cards
      await this.saveUserPreferences({
        ...existing,
        hiddenCards
      });
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error in updateHiddenCards:', error);
      }
    }
  }
}
