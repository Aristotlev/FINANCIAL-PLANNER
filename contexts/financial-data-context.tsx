"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const [cash, setCash] = useState(0);
  const [savings, setSavings] = useState(0);
  const [valuableItems, setValuableItems] = useState(0);
  const [realEstate, setRealEstate] = useState(0);
  const [tradingAccount, setTradingAccount] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(false); // Changed from true to false - show data immediately

  const loadData = async () => {
    // Don't set loading to true on subsequent loads - prevents flashing
    try {
      // Load cash accounts
      const cashAccounts = await SupabaseDataService.getCashAccounts([]);
      const totalCash = cashAccounts.reduce((sum, account) => sum + account.balance, 0);
      setCash(totalCash);

      // Load savings goals
      const savingsGoals = await SupabaseDataService.getSavingsAccounts([]);
      const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.current, 0);
      setSavings(totalSavings);

      // Load valuable items
      const items = await SupabaseDataService.getValuableItems([]);
      const totalItems = items.reduce((sum, item) => sum + item.currentValue, 0);
      setValuableItems(totalItems);

      // Load real estate
      const properties = await SupabaseDataService.getRealEstate([]);
      const totalRealEstate = properties.reduce((sum, prop) => sum + prop.currentValue, 0);
      setRealEstate(totalRealEstate);

      // Load trading account - calculate from actual positions
      const tradingPositions = await SupabaseDataService.getTradingAccounts([]);
      const totalTrading = tradingPositions.reduce((sum: number, position: any) => {
        // Calculate market value of each position
        const marketValue = Math.abs(position.shares || 0) * (position.currentPrice || 0);
        return sum + marketValue;
      }, 0);
      setTradingAccount(totalTrading);

      // Load expenses
      const expenseCategories = await SupabaseDataService.getExpenseCategories([]);
      const totalMonthlyExpenses = expenseCategories.reduce((sum: number, cat: any) => sum + cat.amount, 0);
      setExpenses(totalMonthlyExpenses); // Use monthly expenses as liabilities
      
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('financialDataChanged'));
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for data changes from any card
    const handleDataChange = () => {
      loadData();
    };

    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);

    return () => {
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
    };
  }, []);

  const refreshData = async () => {
    await loadData();
  };

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
