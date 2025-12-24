"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { SupabaseDataService } from '../lib/supabase/supabase-data-service';
import { usePortfolioValues } from '../hooks/use-portfolio';

interface FinancialDataContextType {
  cash: number;
  savings: number;
  valuableItems: number;
  realEstate: number;
  tradingAccount: number;
  expenses: number;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}

// Debounce delay to prevent rapid re-fetching
const DEBOUNCE_DELAY = 500;

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const [cash, setCash] = useState(0);
  const [savings, setSavings] = useState(0);
  const [valuableItems, setValuableItems] = useState(0);
  const [realEstate, setRealEstate] = useState(0);
  const [tradingAccount, setTradingAccount] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const loadData = useCallback(async () => {
    // Prevent concurrent loads
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      // Load all data in parallel for better performance
      const [cashAccounts, savingsGoals, items, properties, tradingPositions, expenseCategories] = await Promise.all([
        SupabaseDataService.getCashAccounts([]),
        SupabaseDataService.getSavingsAccounts([]),
        SupabaseDataService.getValuableItems([]),
        SupabaseDataService.getRealEstate([]),
        SupabaseDataService.getTradingAccounts([]),
        SupabaseDataService.getExpenseCategories([])
      ]);

      // Calculate totals
      const totalCash = cashAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
      const totalSavings = savingsGoals.reduce((sum, goal) => sum + (goal.balance || goal.current || 0), 0);
      const totalItems = items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
      const totalRealEstate = properties.reduce((sum, prop) => sum + (prop.currentValue || 0), 0);
      
      // Calculate trading account total: positions + forex/crypto/options account balances from localStorage
      const positionsValue = tradingPositions.reduce((sum: number, position: any) => {
        const marketValue = Math.abs(position.shares || 0) * (position.currentPrice || 0);
        return sum + marketValue;
      }, 0);
      
      // Get trading account balances from localStorage (forex, crypto futures, options accounts)
      let forexBalance = 0;
      let cryptoFuturesBalance = 0;
      let optionsBalance = 0;
      if (typeof window !== 'undefined') {
        forexBalance = parseFloat(localStorage.getItem('forexAccountBalance') || '0');
        cryptoFuturesBalance = parseFloat(localStorage.getItem('cryptoAccountBalance') || '0');
        optionsBalance = parseFloat(localStorage.getItem('optionsAccountBalance') || '0');
      }
      
      const totalTrading = positionsValue + forexBalance + cryptoFuturesBalance + optionsBalance;
      const totalMonthlyExpenses = expenseCategories.reduce((sum: number, cat: any) => sum + cat.amount, 0);

      // Batch state updates to minimize re-renders
      setCash(totalCash);
      setSavings(totalSavings);
      setValuableItems(totalItems);
      setRealEstate(totalRealEstate);
      setTradingAccount(totalTrading);
      setExpenses(totalMonthlyExpenses);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Debounced data change handler
  const handleDataChange = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Schedule new load with debounce
    debounceTimeoutRef.current = setTimeout(() => {
      loadData();
    }, DEBOUNCE_DELAY);
  }, [loadData]);

  useEffect(() => {
    // Initial load
    loadData();

    // Listen for data changes with debouncing
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('tradingDataChanged', handleDataChange);

    return () => {
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('tradingDataChanged', handleDataChange);
      
      // Cleanup debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [loadData, handleDataChange]);

  const refreshData = useCallback(async () => {
    lastLoadTimeRef.current = 0; // Reset throttle for manual refresh
    await loadData();
  }, [loadData]);

  return (
    <FinancialDataContext.Provider
      value={{
        cash,
        savings,
        valuableItems,
        realEstate,
        tradingAccount,
        expenses,
        loading,
        refreshData
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
}
