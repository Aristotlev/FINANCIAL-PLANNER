"use client";

import { debouncedDispatch } from './utils/debounce';

// Data service for persisting user financial data
export class DataService {
  private static readonly STORAGE_KEYS = {
    CASH_ACCOUNTS: 'moneyHub_cashAccounts',
    SAVINGS_ACCOUNTS: 'moneyHub_savingsAccounts', 
    CRYPTO_HOLDINGS: 'moneyHub_cryptoHoldings',
    STOCK_HOLDINGS: 'moneyHub_stockHoldings',
    EXPENSE_CATEGORIES: 'moneyHub_expenseCategories',
    DEBT_ACCOUNTS: 'moneyHub_debtAccounts',
    SUBSCRIPTIONS: 'moneyHub_subscriptions',
    VALUABLE_ITEMS: 'moneyHub_valuableItems',
    TRADING_ACCOUNTS: 'moneyHub_tradingAccounts',
    REAL_ESTATE: 'moneyHub_realEstate',
    USER_PREFERENCES: 'moneyHub_userPreferences'
  };

  // Generic save function
  static save<T>(key: string, data: T): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
        // Removed timestamp update and storage events to prevent console spam
        // Use Supabase events instead
      }
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }

  // Generic load function
  static load<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored) as T;
        }
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
    return defaultValue;
  }

  // Specific save functions for each data type
  static saveCashAccounts(accounts: any[]): void {
    this.save(this.STORAGE_KEYS.CASH_ACCOUNTS, accounts);
  }

  static loadCashAccounts(defaultAccounts: any[]): any[] {
    return this.load(this.STORAGE_KEYS.CASH_ACCOUNTS, defaultAccounts);
  }

  static saveSavingsAccounts(accounts: any[]): void {
    this.save(this.STORAGE_KEYS.SAVINGS_ACCOUNTS, accounts);
  }

  static loadSavingsAccounts(defaultAccounts: any[]): any[] {
    return this.load(this.STORAGE_KEYS.SAVINGS_ACCOUNTS, defaultAccounts);
  }

  static saveCryptoHoldings(holdings: any[]): void {
    this.save(this.STORAGE_KEYS.CRYPTO_HOLDINGS, holdings);
  }

  static loadCryptoHoldings(defaultHoldings: any[]): any[] {
    return this.load(this.STORAGE_KEYS.CRYPTO_HOLDINGS, defaultHoldings);
  }

  static saveStockHoldings(holdings: any[]): void {
    this.save(this.STORAGE_KEYS.STOCK_HOLDINGS, holdings);
  }

  static loadStockHoldings(defaultHoldings: any[]): any[] {
    return this.load(this.STORAGE_KEYS.STOCK_HOLDINGS, defaultHoldings);
  }

  static saveExpenseCategories(categories: any[]): void {
    this.save(this.STORAGE_KEYS.EXPENSE_CATEGORIES, categories);
  }

  static loadExpenseCategories(defaultCategories: any[]): any[] {
    return this.load(this.STORAGE_KEYS.EXPENSE_CATEGORIES, defaultCategories);
  }

  static saveDebtAccounts(accounts: any[]): void {
    this.save(this.STORAGE_KEYS.DEBT_ACCOUNTS, accounts);
  }

  static loadDebtAccounts(defaultAccounts: any[]): any[] {
    return this.load(this.STORAGE_KEYS.DEBT_ACCOUNTS, defaultAccounts);
  }

  static saveSubscriptions(subscriptions: any[]): void {
    this.save(this.STORAGE_KEYS.SUBSCRIPTIONS, subscriptions);
  }

  static loadSubscriptions(defaultSubscriptions: any[]): any[] {
    return this.load(this.STORAGE_KEYS.SUBSCRIPTIONS, defaultSubscriptions);
  }

  static saveValuableItems(items: any[]): void {
    this.save(this.STORAGE_KEYS.VALUABLE_ITEMS, items);
  }

  static loadValuableItems(defaultItems: any[]): any[] {
    return this.load(this.STORAGE_KEYS.VALUABLE_ITEMS, defaultItems);
  }

  static saveTradingAccounts(accounts: any[]): void {
    this.save(this.STORAGE_KEYS.TRADING_ACCOUNTS, accounts);
  }

  static loadTradingAccounts(defaultAccounts: any[]): any[] {
    return this.load(this.STORAGE_KEYS.TRADING_ACCOUNTS, defaultAccounts);
  }

  static saveRealEstate(properties: any[]): void {
    this.save(this.STORAGE_KEYS.REAL_ESTATE, properties);
  }

  static loadRealEstate(defaultProperties: any[]): any[] {
    return this.load(this.STORAGE_KEYS.REAL_ESTATE, defaultProperties);
  }

  static saveUserPreferences(preferences: any): void {
    this.save(this.STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  static loadUserPreferences(defaultPreferences: any): any {
    return this.load(this.STORAGE_KEYS.USER_PREFERENCES, defaultPreferences);
  }

  // Clear all user data and reset to default states
  static clearAllData(): void {
    try {
      if (typeof window !== 'undefined') {
        // Remove all storage keys so components fall back to initial default data
        Object.values(this.STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Clear last saved timestamp
        localStorage.removeItem('moneyHub_lastSaved');
        
        // Clear crypto transactions
        localStorage.removeItem('cryptoTransactions');
        
        // Note: zoom hint uses sessionStorage now, no need to clear
        
        // Dispatch storage events to notify components of the change
        Object.values(this.STORAGE_KEYS).forEach(key => {
          window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: null,
            storageArea: localStorage
          }));
        });
        
        // Dispatch custom events to trigger context updates (debounced to prevent spam)
        debouncedDispatch('financialDataChanged', 500);
        debouncedDispatch('cryptoDataChanged', 500);
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Export all data for backup
  static exportAllData(): any {
    const data: any = {};
    try {
      if (typeof window !== 'undefined') {
        Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
          const stored = localStorage.getItem(key);
          if (stored) {
            data[name] = JSON.parse(stored);
          }
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
    return data;
  }

  // Import data from backup
  static importAllData(data: any): void {
    try {
      if (typeof window !== 'undefined') {
        Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
          if (data[name]) {
            localStorage.setItem(key, JSON.stringify(data[name]));
          }
        });
      }
    } catch (error) {
      console.error('Error importing data:', error);
    }
  }
}
