"use client";

import { supabase, isSupabaseConfigured, waitForSupabase } from './client';
import { DataService } from '../data-service';
import { authClient } from '../auth-client';
import { fetchData, saveData, deleteData } from '../api/data-client';

/**
 * Enhanced Data Service with Supabase backend
 * Falls back to localStorage if Supabase is not configured
 * 
 * IMPORTANT: Uses Better Auth for user authentication, NOT Supabase Auth
 * 
 * NOTE: User preferences now use the secure API endpoint to work with
 * the new RLS policies that require service_role access.
 */
export class SupabaseDataService {
  // Remove static isConfigured to prevent race conditions with runtime env injection
  // private static isConfigured = isSupabaseConfigured();
  
  private static cachedUserId: string | null = null;
  private static lastUserIdCheck: number = 0;
  private static readonly USER_ID_CACHE_TTL = 30000; // 30 seconds

  // Cache for data to prevent rate limiting
  private static dataCache: Map<string, { data: any, timestamp: number }> = new Map();
  private static readonly DATA_CACHE_TTL = 20000; // 20 seconds

  // Request deduplication map
  private static pendingRequests: Map<string, Promise<any>> = new Map();

  private static getCachedData<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (cached && (Date.now() - cached.timestamp < this.DATA_CACHE_TTL)) {
      return cached.data as T;
    }
    return null;
  }

  private static setCachedData<T>(key: string, data: T): void {
    this.dataCache.set(key, { data, timestamp: Date.now() });
  }

  private static invalidateCache(key: string): void {
    this.dataCache.delete(key);
  }

  /**
   * Generic fetch with cache and request deduplication
   */
  private static async fetchWithDeduplication<T>(
    key: string,
    fetchFn: () => Promise<T>,
    fallbackFn: () => T
  ): Promise<T> {
    // Wait for Supabase to be configured (max 5 seconds)
    // This ensures we don't fall back to localStorage prematurely if env vars are loading
    await waitForSupabase();

    // Check configuration dynamically to handle runtime env injection
    if (!isSupabaseConfigured()) {
      console.warn(`Supabase not configured for ${key}, using fallback`);
      return fallbackFn();
    }

    // 1. Try cache first
    const cached = this.getCachedData<T>(key);
    if (cached) return cached;

    // 2. Check for pending request (deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // 3. Create new request
    const requestPromise = (async () => {
      try {
        const userId = await this.getUserId();
        if (!userId) {
          return fallbackFn();
        }

        const data = await fetchFn();
        this.setCachedData(key, data);
        return data;
      } catch (error) {
        if (!this.isAuthError(error)) {
          console.error(`Error loading ${key} from Supabase:`, error);
        }
        return fallbackFn();
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  // Helper to get current user ID from Better Auth (NOT Supabase Auth)
  private static async getUserId(): Promise<string | null> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) return null;
    
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
    return this.fetchWithDeduplication<any[]>(
      'cash_accounts',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('cash_accounts');
        // Return data as-is (even if empty) - no defaults
        return data || [];
      },
      () => DataService.loadCashAccounts(defaultAccounts)
    );
  }

  static async saveCashAccount(account: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbAccount: any = {
        id: account.id,
        user_id: userId,
        name: account.name || 'Unknown Account',
        bank: account.bank || 'Unknown Bank',
        balance: typeof account.balance === 'number' && !isNaN(account.balance) ? account.balance : 0,
        type: account.type || 'checking',
        apy: typeof account.apy === 'number' && !isNaN(account.apy) ? account.apy : 0,
        color: account.color || '#10b981',
      };

      // Use secure API endpoint
      const result = await saveData('cash_accounts', dbAccount);

      if (!result) throw new Error('Failed to save cash account via API');
      
      this.invalidateCache('cash_accounts');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const accounts = DataService.loadCashAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveCashAccounts(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('cash_accounts', accountId);

      if (!result) throw new Error('Failed to delete cash account via API');
      
      this.invalidateCache('cash_accounts');
      
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
    return this.fetchWithDeduplication<any[]>(
      'income_sources',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('income_sources');
        
        // Map database fields to application fields
        return (data || []).map((income: any) => ({
          ...income,
          connectedAccount: income.connected_account,
          isRecurring: income.is_recurring,
          nextPaymentDate: income.next_payment_date
        }));
      },
      () => {
        const stored = localStorage.getItem('incomeSources');
        return stored ? JSON.parse(stored) : defaultSources;
      }
    );
  }

  static async saveIncomeSource(income: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbIncome: any = {
        id: income.id,
        user_id: userId,
        name: income.name || 'Unknown Income',
        amount: typeof income.amount === 'number' && !isNaN(income.amount) ? income.amount : 0,
        frequency: income.frequency || 'monthly',
        category: income.category || 'other',
        connected_account: income.connectedAccount || null,
        is_recurring: income.isRecurring === true,
        next_payment_date: income.nextPaymentDate || null,
        notes: income.notes || null,
        color: income.color || '#10b981'
      };

      // Use secure API endpoint
      const result = await saveData('income_sources', dbIncome);

      if (!result) throw new Error('Failed to save income source via API');
      
      this.invalidateCache('income_sources');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const stored = localStorage.getItem('incomeSources');
      const sources = stored ? JSON.parse(stored) : [];
      const filtered = sources.filter((s: any) => s.id !== incomeId);
      localStorage.setItem('incomeSources', JSON.stringify(filtered));
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('income_sources', incomeId);

      if (!result) throw new Error('Failed to delete income source via API');
      
      this.invalidateCache('income_sources');
      
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
    return this.fetchWithDeduplication<any[]>(
      'crypto_holdings',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('crypto_holdings');

        // Map database fields to application fields
        return (data || []).map((holding: any) => ({
          ...holding,
          entryPoint: holding.purchase_price || 0,
          walletType: holding.wallet_type,
          walletName: holding.wallet_name,
          walletAddress: holding.wallet_address,
          iconUrl: holding.icon_url,
        }));
      },
      () => DataService.loadCryptoHoldings(defaultHoldings)
    );
  }

  static async saveCryptoHolding(holding: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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
      // Ensure numeric values are valid numbers
      const dbHolding: any = {
        id: holding.id,
        user_id: userId,
        symbol: holding.symbol || 'UNKNOWN',
        name: holding.name || 'Unknown',
        amount: typeof holding.amount === 'number' && !isNaN(holding.amount) ? holding.amount : 0,
        purchase_price: typeof holding.entryPoint === 'number' && !isNaN(holding.entryPoint) ? holding.entryPoint : 0,
        color: holding.color || '#f59e0b',
        wallet_type: holding.walletType || 'other',
        wallet_name: holding.walletName || null,
        wallet_address: holding.walletAddress || null,
        icon_url: holding.iconUrl || null,
      };
      
      // Use secure API endpoint
      console.log('Saving crypto holding via API:', dbHolding);
      const result = await saveData('crypto_holdings', dbHolding);

      if (!result) {
        console.error('saveData returned null for crypto_holdings');
        throw new Error('Failed to save crypto holding via API - check server logs');
      }
      
      this.invalidateCache('crypto_holdings');
    } catch (error: any) {
      console.error('Error saving crypto holding:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        try {
          console.error('Error object:', JSON.stringify(error, null, 2));
        } catch (e) {
          console.error('Error object (non-stringifiable):', error);
        }
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const holdings = DataService.loadCryptoHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveCryptoHoldings(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const success = await deleteData('crypto_holdings', holdingId);

      if (!success) throw new Error('Failed to delete crypto holding via API');
      
      this.invalidateCache('crypto_holdings');
      
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
    return this.fetchWithDeduplication<any[]>(
      'stock_holdings',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('stock_holdings');
        
        // Map database fields to application fields
        return (data || []).map((holding: any) => ({
          ...holding,
          entryPoint: holding.purchase_price || 0,
        }));
      },
      () => DataService.loadStockHoldings(defaultHoldings)
    );
  }

  static async saveStockHolding(holding: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbHolding: any = {
        id: holding.id,
        user_id: userId,
        symbol: holding.symbol || 'UNKNOWN',
        name: holding.name || 'Unknown',
        shares: typeof holding.shares === 'number' && !isNaN(holding.shares) ? holding.shares : 0,
        purchase_price: typeof holding.entryPoint === 'number' && !isNaN(holding.entryPoint) ? holding.entryPoint : 0,
        sector: holding.sector || null,
        color: holding.color || '#3b82f6',
      };

      // Use secure API endpoint
      const result = await saveData('stock_holdings', dbHolding);

      if (!result) throw new Error('Failed to save stock holding via API');
      
      this.invalidateCache('stock_holdings');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const holdings = DataService.loadStockHoldings([]);
      const filtered = holdings.filter(h => h.id !== holdingId);
      DataService.saveStockHoldings(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const success = await deleteData('stock_holdings', holdingId);

      if (!success) throw new Error('Failed to delete stock holding via API');
      
      this.invalidateCache('stock_holdings');
      
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
    return this.fetchWithDeduplication<any[]>(
      'trading_accounts',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('trading_accounts');
        
        // Map database fields to application fields
        // Handle both regular accounts and trading positions stored in this table
        return (data || []).map((item: any) => {
          // If it's a position stored in instruments column (as a single object)
          if (item.type === 'position' && item.instruments && !Array.isArray(item.instruments)) {
            return {
              ...item.instruments,
              id: item.id, // Ensure ID matches DB record
            };
          }
          
          // Regular account mapping
          return {
            ...item,
            instruments: item.instruments || []
          };
        });
      },
      () => DataService.loadTradingAccounts(defaultAccounts)
    );
  }

  static async saveTradingAccount(account: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Check if this is a TradingPosition (has symbol) or a TradingAccount
      const isPosition = !!account.symbol;

      // Map application fields to database fields
      // If it's a position, we store the full object in 'instruments' JSON column
      // and use generic values for required columns
      const dbAccount: any = {
        id: account.id,
        user_id: userId,
        name: isPosition ? account.symbol : (account.name || 'Unknown Account'),
        broker: isPosition ? 'Trading Position' : (account.broker || 'Unknown Broker'),
        balance: isPosition ? 0 : (typeof account.balance === 'number' && !isNaN(account.balance) ? account.balance : 0),
        type: isPosition ? 'position' : (account.type || 'other'),
        instruments: isPosition ? account : (account.instruments || []),
        color: account.color || '#10b981',
      };

      // Use secure API endpoint
      const result = await saveData('trading_accounts', dbAccount);

      if (!result) throw new Error('Failed to save trading account via API');
      
      this.invalidateCache('trading_accounts');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const accounts = DataService.loadTradingAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveTradingAccounts(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const success = await deleteData('trading_accounts', accountId);

      if (!success) throw new Error('Failed to delete trading account via API');
      
      this.invalidateCache('trading_accounts');
      
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
    return this.fetchWithDeduplication<any[]>(
      'real_estate',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('real_estate');
        
        // Map database fields to application fields
        return (data || []).map((property: any) => ({
          ...property,
          purchasePrice: property.purchase_price,
          currentValue: property.current_value,
          mortgageBalance: property.mortgage_balance,
          rentalIncome: property.rental_income,
          propertyType: property.property_type,
        }));
      },
      () => DataService.loadRealEstate(defaultProperties)
    );
  }

  static async saveRealEstate(property: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbProperty: any = {
        id: property.id,
        user_id: userId,
        name: property.name || 'Unknown Property',
        address: property.address || '',
        property_type: property.propertyType || property.property_type || 'residential',
        purchase_price: typeof property.purchasePrice === 'number' && !isNaN(property.purchasePrice) ? property.purchasePrice : (property.purchase_price || 0),
        current_value: typeof property.currentValue === 'number' && !isNaN(property.currentValue) ? property.currentValue : (property.current_value || 0),
        mortgage_balance: typeof property.mortgageBalance === 'number' && !isNaN(property.mortgageBalance) ? property.mortgageBalance : (property.mortgage_balance || 0),
        rental_income: typeof property.rentalIncome === 'number' && !isNaN(property.rentalIncome) ? property.rentalIncome : (property.rental_income || 0),
        expenses: typeof property.expenses === 'number' && !isNaN(property.expenses) ? property.expenses : 0,
        latitude: property.latitude || null,
        longitude: property.longitude || null,
        color: property.color || '#8b5cf6',
      };

      // Use secure API endpoint
      const result = await saveData('real_estate', dbProperty);

      if (!result) throw new Error('Failed to save real estate via API');
      
      this.invalidateCache('real_estate');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const properties = DataService.loadRealEstate([]);
      const filtered = properties.filter(p => p.id !== propertyId);
      DataService.saveRealEstate(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const success = await deleteData('real_estate', propertyId);

      if (!success) throw new Error('Failed to delete real estate via API');
      
      this.invalidateCache('real_estate');
      
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
    return this.fetchWithDeduplication<any[]>(
      'savings_accounts',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('savings_accounts');
        
        // Map database fields to application fields
        return (data || []).map((account: any) => ({
          ...account,
          goalAmount: account.goal_amount,
          goalDate: account.goal_date,
          current: account.balance, // Map balance to current for compatibility
        }));
      },
      () => DataService.loadSavingsAccounts(defaultAccounts)
    );
  }

  static async saveSavingsAccount(account: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbAccount: any = {
        id: account.id,
        user_id: userId,
        name: account.name || 'Unknown Savings',
        bank: account.bank || 'Unknown Bank',
        balance: typeof account.balance === 'number' && !isNaN(account.balance) ? account.balance : 0,
        apy: typeof account.apy === 'number' && !isNaN(account.apy) ? account.apy : 0,
        goal_amount: typeof account.goalAmount === 'number' && !isNaN(account.goalAmount) ? account.goalAmount : (account.goal_amount || 0),
        goal_date: account.goalDate || account.goal_date || null,
        color: account.color || '#3b82f6',
      };

      // Use secure API endpoint
      const result = await saveData('savings_accounts', dbAccount);

      if (!result) throw new Error('Failed to save savings account via API');
      
      this.invalidateCache('savings_accounts');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const accounts = DataService.loadSavingsAccounts([]);
      const filtered = accounts.filter(a => a.id !== accountId);
      DataService.saveSavingsAccounts(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('savings_accounts', accountId);

      if (!result) throw new Error('Failed to delete savings account via API');
      
      this.invalidateCache('savings_accounts');
      
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
    return this.fetchWithDeduplication<any[]>(
      'expense_categories',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('expense_categories');
        
        // Map database fields to application fields
        return (data || []).map((category: any) => ({
          ...category,
          description: category.frequency || '', // Map frequency to description if needed, or just keep it
        }));
      },
      () => DataService.loadExpenseCategories(defaultCategories)
    );
  }

  static async saveExpenseCategory(category: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbCategory: any = {
        id: category.id,
        user_id: userId,
        name: category.name || 'Unknown Category',
        amount: typeof category.amount === 'number' && !isNaN(category.amount) ? category.amount : 0,
        budget: typeof category.budget === 'number' && !isNaN(category.budget) ? category.budget : 0,
        icon: category.icon || null,
        color: category.color || '#ef4444',
        frequency: category.frequency || category.description || 'monthly', // Use description as frequency fallback or vice versa
      };

      // Use secure API endpoint
      const result = await saveData('expense_categories', dbCategory);

      if (!result) throw new Error('Failed to save expense category via API');
      
      this.invalidateCache('expense_categories');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const categories = DataService.loadExpenseCategories([]);
      const filtered = categories.filter(c => c.id !== categoryId);
      DataService.saveExpenseCategories(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('expense_categories', categoryId);

      if (!result) throw new Error('Failed to delete expense category via API');
      
      this.invalidateCache('expense_categories');
      
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
    return this.fetchWithDeduplication<any[]>(
      'subscriptions',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('subscriptions');
        return data || [];
      },
      () => DataService.loadSubscriptions(defaultSubscriptions)
    );
  }

  static async saveSubscription(subscription: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbSubscription: any = {
        id: subscription.id,
        user_id: userId,
        name: subscription.name || 'Unknown Subscription',
        amount: typeof subscription.amount === 'number' && !isNaN(subscription.amount) ? subscription.amount : 0,
        billing_cycle: subscription.billing_cycle || 'monthly',
        next_billing_date: subscription.next_billing_date || subscription.nextBillingDate || null,
        category: subscription.category || 'Other',
        description: subscription.description || ''
      };

      // Use secure API endpoint
      const result = await saveData('subscriptions', dbSubscription);

      if (!result) throw new Error('Failed to save subscription via API');
      
      this.invalidateCache('subscriptions');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const subscriptions = DataService.loadSubscriptions([]);
      const filtered = subscriptions.filter((s: any) => s.id !== subscriptionId);
      DataService.saveSubscriptions(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('subscriptions', subscriptionId);

      if (!result) throw new Error('Failed to delete subscription via API');
      
      this.invalidateCache('subscriptions');
      
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
    return this.fetchWithDeduplication<any[]>(
      'debt_accounts',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('debt_accounts');
        
        // Map database fields to application fields
        return (data || []).map((account: any) => ({
          ...account,
          minPayment: account.min_payment,
          interestRate: account.interest_rate,
          dueDate: account.due_date,
        }));
      },
      () => DataService.loadDebtAccounts?.(defaultAccounts) || []
    );
  }

  static async saveDebtAccount(account: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbAccount: any = {
        id: account.id,
        user_id: userId,
        name: account.name || 'Unknown Debt',
        type: account.type || 'other',
        balance: typeof account.balance === 'number' && !isNaN(account.balance) ? account.balance : 0,
        min_payment: typeof account.minPayment === 'number' && !isNaN(account.minPayment) ? account.minPayment : (account.min_payment || 0),
        interest_rate: typeof account.interestRate === 'number' && !isNaN(account.interestRate) ? account.interestRate : (account.interest_rate || 0),
        due_date: account.dueDate || account.due_date || null,
        description: account.description || '',
      };

      // Use secure API endpoint
      const result = await saveData('debt_accounts', dbAccount);

      if (!result) throw new Error('Failed to save debt account via API');
      
      this.invalidateCache('debt_accounts');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const accounts = DataService.loadDebtAccounts?.([]) || [];
      const filtered = accounts.filter((a: any) => a.id !== accountId);
      DataService.saveDebtAccounts?.(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('debt_accounts', accountId);

      if (!result) throw new Error('Failed to delete debt account via API');
      
      this.invalidateCache('debt_accounts');
      
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
    return this.fetchWithDeduplication<any[]>(
      'valuable_items',
      async () => {
        // Use secure API endpoint
        const data = await fetchData<any[]>('valuable_items');
        
        // Map database fields to application fields
        return (data || []).map((item: any) => ({
          ...item,
          purchasePrice: item.purchase_price,
          currentValue: item.current_value,
          purchaseDate: item.purchase_date,
        }));
      },
      () => DataService.loadValuableItems(defaultItems)
    );
  }

  static async saveValuableItem(item: any): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Map application fields to database fields
      const dbItem: any = {
        id: item.id,
        user_id: userId,
        name: item.name || 'Unknown Item',
        category: item.category || 'Other',
        purchase_price: typeof item.purchasePrice === 'number' && !isNaN(item.purchasePrice) ? item.purchasePrice : (item.purchase_price || 0),
        current_value: typeof item.currentValue === 'number' && !isNaN(item.currentValue) ? item.currentValue : (item.current_value || 0),
        purchase_date: item.purchaseDate || item.purchase_date || null,
        condition: item.condition || null,
        notes: item.notes || null,
        color: item.color || '#8b5cf6',
      };

      // Use secure API endpoint
      const result = await saveData('valuable_items', dbItem);

      if (!result) throw new Error('Failed to save valuable item via API');
      
      this.invalidateCache('valuable_items');
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
      const items = DataService.loadValuableItems([]);
      const filtered = items.filter(i => i.id !== itemId);
      DataService.saveValuableItems(filtered);
      return;
    }

    try {
      // Use secure API endpoint
      const result = await deleteData('valuable_items', itemId);

      if (!result) throw new Error('Failed to delete valuable item via API');
      
      this.invalidateCache('valuable_items');
      
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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
    
    // Check configuration dynamically
    if (!isSupabaseConfigured()) {
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

      // Fetch all data first to get IDs
      const [
        cash, crypto, stocks, trading, realEstate, 
        savings, expenses, debt, valuables, subscriptions, income
      ] = await Promise.all([
        this.getCashAccounts(),
        this.getCryptoHoldings(),
        this.getStockHoldings(),
        this.getTradingAccounts(),
        this.getRealEstate(),
        this.getSavingsAccounts(),
        this.getExpenseCategories(),
        this.getDebtAccounts(),
        this.getValuableItems(),
        this.getSubscriptions(),
        this.getIncomeSources()
      ]);

      // Delete all items using the secure API
      // We use Promise.all to run deletions in parallel for each category
      await Promise.all([
        ...cash.map(item => this.deleteCashAccount(item.id)),
        ...crypto.map(item => this.deleteCryptoHolding(item.id)),
        ...stocks.map(item => this.deleteStockHolding(item.id)),
        ...trading.map(item => this.deleteTradingAccount(item.id)),
        ...realEstate.map(item => this.deleteRealEstate(item.id)),
        ...savings.map(item => this.deleteSavingsAccount(item.id)),
        ...expenses.map(item => this.deleteExpenseCategory(item.id)),
        ...debt.map(item => this.deleteDebtAccount(item.id)),
        ...valuables.map(item => this.deleteValuableItem(item.id)),
        ...subscriptions.map(item => this.deleteSubscription(item.id)),
        ...income.map(item => this.deleteIncomeSource(item.id))
      ]);

      console.log('All Supabase data cleared successfully');
    } catch (error) {
      console.error('Error clearing Supabase data:', error);
      throw error;
    }
  }

  // ==================== TAX PROFILES ====================
  
  static async getTaxProfiles(defaultProfiles: any[] = []): Promise<any[]> {
    // Try cache first
    const cached = this.getCachedData<any[]>('tax_profiles');
    if (cached) return cached;

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

      // Use secure API route instead of direct Supabase call
      const data = await fetchData<any[]>('tax_profiles');

      if (!data) {
        return defaultProfiles;
      }

      // Transform database format to app format
      const result = (data || []).map((profile: any) => ({
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
      
      this.setCachedData('tax_profiles', result);
      return result;
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

      // Use secure API route instead of direct Supabase call
      const result = await saveData('tax_profiles', dbProfile);

      if (!result) {
        throw new Error('Failed to save tax profile');
      }
      
      this.invalidateCache('tax_profiles');
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

      // Use secure API route instead of direct Supabase call
      const success = await deleteData('tax_profiles', profileId);

      if (!success) {
        throw new Error('Failed to delete tax profile');
      }
      
      this.invalidateCache('tax_profiles');
    } catch (error) {
      console.error('Error in deleteTaxProfile:', error);
      throw error;
    }
  }

  // ==================== USER PREFERENCES (Card Order, Hidden Cards, etc.) ====================
  // NOTE: These methods now use the secure API endpoint to bypass RLS restrictions
  
  static async getUserPreferences(): Promise<{
    cardOrder?: string[];
    hiddenCards?: string[];
    theme?: string;
    currency?: string;
    [key: string]: any;
  } | null> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) return null;

    // Try cache first
    const cached = this.getCachedData<any>('user_preferences');
    if (cached) return cached;

    try {
      const userId = await this.getUserId();
      if (!userId) return null;

      // Use secure API endpoint instead of direct Supabase access
      const data = await fetchData<any>('user_preferences');
      
      if (!data) {
        return null;
      }

      // Merge the preferences JSON with top-level fields
      const result = {
        theme: data?.theme,
        currency: data?.currency,
        language: data?.language,
        notifications_enabled: data?.notifications_enabled,
        ...(data?.preferences as Record<string, any> || {})
      };
      
      this.setCachedData('user_preferences', result);
      return result;
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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) return;

    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // Separate top-level fields from the preferences JSON
      const { theme, currency, language, notifications_enabled, ...otherPrefs } = preferences;

      // Use secure API endpoint instead of direct Supabase access
      const result = await saveData('user_preferences', {
        theme: theme || 'system',
        currency: currency || 'USD',
        language: language || 'en',
        notifications_enabled: notifications_enabled ?? true,
        preferences: otherPrefs,
        updated_at: new Date().toISOString()
      });

      if (!result) {
        // Don't throw error, just log warning to avoid unhandled rejections in UI
        console.warn('Failed to save user preferences (API returned null)');
        return;
      }
      
      this.invalidateCache('user_preferences');
    } catch (error) {
      if (!this.isAuthError(error)) {
        console.error('Error in saveUserPreferences:', error);
      }
    }
  }

  static async updateCardOrder(cardOrder: string[]): Promise<void> {
    // Check configuration dynamically
    if (!isSupabaseConfigured()) return;

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
    // Check configuration dynamically
    if (!isSupabaseConfigured()) return;

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
