"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAssetPrices } from '../hooks/use-price';
import { useEnhancedTimeTracking } from '../hooks/use-enhanced-time-tracking';
import { useBetterAuth } from './better-auth-context';

export interface CryptoHolding {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  value: number;
  color: string;
  change: string;
  entryPoint: number;
  walletType?: string;
  walletName?: string;
  walletAddress?: string;
  iconUrl?: string;
}

export interface StockHolding {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  value: number;
  color: string;
  change: string;
  sector: string;
  entryPoint: number;
}

interface PortfolioContextType {
  cryptoHoldings: CryptoHolding[];
  stockHoldings: StockHolding[];
  setCryptoHoldings: (holdings: CryptoHolding[]) => void;
  setStockHoldings: (holdings: StockHolding[]) => void;
  portfolioValues: {
    crypto: {
      value: number;
      gainLoss: number;
      return: number;
      loading: boolean;
    };
    stocks: {
      value: number;
      gainLoss: number;
      return: number;
      loading: boolean;
    };
    total: {
      value: number;
      gainLoss: number;
      loading: boolean;
    };
  };
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
}

const initialCryptoHoldings: CryptoHolding[] = [
  { 
    id: '1',
    name: 'Bitcoin', 
    symbol: 'BTC', 
    amount: 0.75, 
    value: 49500, 
    color: '#f59e0b', 
    change: '+8.3%', 
    entryPoint: 18000
  },
  { 
    id: '2',
    name: 'Ethereum', 
    symbol: 'ETH', 
    amount: 6.2, 
    value: 17390, 
    color: '#8b5cf6', 
    change: '+12.7%', 
    entryPoint: 1200
  },
  { 
    id: '3',
    name: 'Cardano', 
    symbol: 'ADA', 
    amount: 8500, 
    value: 3825, 
    color: '#3b82f6', 
    change: '+5.2%', 
    entryPoint: 0.45
  },
  { 
    id: '4',
    name: 'Solana', 
    symbol: 'SOL', 
    amount: 45, 
    value: 6750, 
    color: '#10b981', 
    change: '+15.8%', 
    entryPoint: 85
  },
  { 
    id: '5',
    name: 'Polkadot', 
    symbol: 'DOT', 
    amount: 320, 
    value: 1920, 
    color: '#f97316', 
    change: '-2.1%', 
    entryPoint: 12
  }
];

const initialStockHoldings: StockHolding[] = [
  { 
    id: '1',
    name: 'Apple Inc.', 
    symbol: 'AAPL', 
    shares: 50, 
    value: 8750, 
    color: '#8b5cf6', 
    change: '+5.2%', 
    sector: 'Technology',
    entryPoint: 150
  },
  { 
    id: '2',
    name: 'Microsoft Corp.', 
    symbol: 'MSFT', 
    shares: 25, 
    value: 8500, 
    color: '#a78bfa', 
    change: '+7.1%', 
    sector: 'Technology',
    entryPoint: 300
  },
  { 
    id: '3',
    name: 'Amazon.com Inc.', 
    symbol: 'AMZN', 
    shares: 30, 
    value: 12250, 
    color: '#c4b5fd', 
    change: '+12.3%', 
    sector: 'Consumer Discretionary',
    entryPoint: 350
  },
  { 
    id: '4',
    name: 'Vanguard S&P 500', 
    symbol: 'VOO', 
    shares: 100, 
    value: 38390, 
    color: '#ddd6fe', 
    change: '+8.9%', 
    sector: 'ETF',
    entryPoint: 350
  }
];

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const { user } = useBetterAuth();

  // Load holdings from database on mount and when data changes
  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: NodeJS.Timeout | null = null;
    
    const loadData = async () => {
      try {
        const { SupabaseDataService } = await import('../lib/supabase/supabase-data-service');
        const [cryptoData, stockData] = await Promise.all([
          SupabaseDataService.getCryptoHoldings([]),
          SupabaseDataService.getStockHoldings([])
        ]);
        if (isMounted) {
          setCryptoHoldings(cryptoData);
          setStockHoldings(stockData);
        }
      } catch (error) {
        console.error('Error loading portfolio data:', error);
      }
    };
    
    // Initial load (immediate)
    loadData();

    // Listen for data changes with debounce to allow database consistency
    const handleDataChange = () => {
      // Debounce to prevent rapid re-fetches and allow DB to sync
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        loadData();
      }, 500); // 500ms delay
    };

    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);

    return () => {
      isMounted = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  const cryptoSymbols = cryptoHoldings.map(h => h.symbol);
  const stockSymbols = stockHoldings.map(h => h.symbol);
  
  const { prices: cryptoPrices, loading: cryptoLoading } = useAssetPrices(cryptoSymbols);
  const { prices: stockPrices, loading: stockLoading } = useAssetPrices(stockSymbols);

  const portfolioValues = {
    crypto: {
      value: cryptoHoldings.reduce((sum, holding) => {
        const currentPriceData = cryptoPrices[holding.symbol];
        if (currentPriceData) {
          return sum + (holding.amount * currentPriceData.price);
        }
        return sum + holding.value; // fallback to stored value
      }, 0),
      gainLoss: cryptoHoldings.reduce((sum, holding) => {
        const currentPriceData = cryptoPrices[holding.symbol];
        const currentPrice = currentPriceData?.price || (holding.value / holding.amount);
        const costBasis = holding.amount * holding.entryPoint;
        const currentValue = holding.amount * currentPrice;
        return sum + (currentValue - costBasis);
      }, 0),
      return: 0, // Will be calculated
      loading: cryptoLoading
    },
    stocks: {
      value: stockHoldings.reduce((sum, holding) => {
        const currentPriceData = stockPrices[holding.symbol];
        if (currentPriceData) {
          return sum + (holding.shares * currentPriceData.price);
        }
        return sum + holding.value; // fallback to stored value
      }, 0),
      gainLoss: stockHoldings.reduce((sum, holding) => {
        const currentPriceData = stockPrices[holding.symbol];
        const currentPrice = currentPriceData?.price || (holding.value / holding.shares);
        const costBasis = holding.shares * holding.entryPoint;
        const currentValue = holding.shares * currentPrice;
        return sum + (currentValue - costBasis);
      }, 0),
      return: 0, // Will be calculated
      loading: stockLoading
    },
    total: {
      value: 0, // Will be calculated
      gainLoss: 0, // Will be calculated
      loading: cryptoLoading || stockLoading
    }
  };

  // Calculate returns and totals
  portfolioValues.crypto.return = portfolioValues.crypto.value > 0 ? 
    (portfolioValues.crypto.gainLoss / (portfolioValues.crypto.value - portfolioValues.crypto.gainLoss)) * 100 : 0;
  
  portfolioValues.stocks.return = portfolioValues.stocks.value > 0 ? 
    (portfolioValues.stocks.gainLoss / (portfolioValues.stocks.value - portfolioValues.stocks.gainLoss)) * 100 : 0;

  portfolioValues.total.value = portfolioValues.crypto.value + portfolioValues.stocks.value;
  portfolioValues.total.gainLoss = portfolioValues.crypto.gainLoss + portfolioValues.stocks.gainLoss;

  // Memoize portfolio snapshot to prevent unnecessary re-renders of time tracking hook
  const portfolioSnapshot = useMemo(() => ({
    netWorth: portfolioValues.total.value,
    totalAssets: portfolioValues.total.value,
    totalLiabilities: 0,
    cryptoValue: portfolioValues.crypto.value,
    stocksValue: portfolioValues.stocks.value,
    cryptoHoldings: cryptoHoldings.map(h => ({
      ...h,
      currentPrice: cryptoPrices[h.symbol]?.price || (h.value / h.amount)
    })),
    stockHoldings: stockHoldings.map(h => ({
      ...h,
      currentPrice: stockPrices[h.symbol]?.price || (h.value / h.shares)
    }))
  }), [
    portfolioValues.total.value,
    portfolioValues.crypto.value,
    portfolioValues.stocks.value,
    cryptoHoldings,
    stockHoldings,
    cryptoPrices,
    stockPrices
  ]);

  // Enable enhanced time tracking with hourly snapshots (only when there are holdings)
  useEnhancedTimeTracking(portfolioSnapshot, {
    enabled: !!user?.id && (cryptoHoldings.length > 0 || stockHoldings.length > 0),
    snapshotInterval: 60 * 60 * 1000, // 1 hour
    trackAssetPrices: true
  });

  return (
    <PortfolioContext.Provider 
      value={{
        cryptoHoldings,
        stockHoldings,
        setCryptoHoldings,
        setStockHoldings,
        portfolioValues
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}
