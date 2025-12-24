/**
 * Hybrid Data Context
 * 
 * Provides a unified data layer that:
 * 1. Hydrates from server-side prefetched data (instant first paint)
 * 2. Transitions to real-time client-side updates
 * 3. Uses SWR-like stale-while-revalidate pattern
 */

"use client";

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  useMemo,
  ReactNode 
} from 'react';
import type { PrefetchedDashboardData } from '../lib/server/data-prefetch';

// Data freshness states
export type DataFreshness = 'fresh' | 'stale' | 'revalidating' | 'error';

interface HybridDataState<T> {
  data: T | null;
  freshness: DataFreshness;
  lastUpdated: number | null;
  error: Error | null;
}

interface HybridDataContextType {
  // Prefetched data from server
  serverData: PrefetchedDashboardData | null;
  
  // Individual data states
  portfolio: HybridDataState<any>;
  marketPrices: HybridDataState<Record<string, any>>;
  currencyRates: HybridDataState<Record<string, number>>;
  news: HybridDataState<any[]>;
  
  // Actions
  revalidate: (key?: 'portfolio' | 'prices' | 'currency' | 'news' | 'all') => Promise<void>;
  setServerData: (data: PrefetchedDashboardData) => void;
  
  // Status
  isHydrated: boolean;
  lastServerFetch: number | null;
}

const HybridDataContext = createContext<HybridDataContextType | undefined>(undefined);

// Revalidation intervals (ms)
const REVALIDATION_INTERVALS = {
  portfolio: 30000,      // 30 seconds
  prices: 15000,         // 15 seconds - real-time prices
  currency: 300000,      // 5 minutes
  news: 300000,          // 5 minutes
};

// Stale threshold (ms) - data older than this triggers background revalidation
const STALE_THRESHOLD = {
  portfolio: 60000,      // 1 minute
  prices: 30000,         // 30 seconds
  currency: 600000,      // 10 minutes
  news: 600000,          // 10 minutes
};

function createInitialState<T>(): HybridDataState<T> {
  return {
    data: null,
    freshness: 'stale',
    lastUpdated: null,
    error: null,
  };
}

interface HybridDataProviderProps {
  children: ReactNode;
  initialData?: PrefetchedDashboardData;
}

export function HybridDataProvider({ children, initialData }: HybridDataProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [serverData, setServerDataState] = useState<PrefetchedDashboardData | null>(initialData || null);
  
  // Individual data states - hydrated from server data
  const [portfolio, setPortfolio] = useState<HybridDataState<any>>(() => {
    if (initialData?.portfolio) {
      return {
        data: initialData.portfolio,
        freshness: 'fresh' as DataFreshness,
        lastUpdated: initialData.fetchedAt,
        error: null,
      };
    }
    return createInitialState();
  });

  const [marketPrices, setMarketPrices] = useState<HybridDataState<Record<string, any>>>(() => {
    if (initialData?.marketPrices) {
      return {
        data: initialData.marketPrices,
        freshness: 'fresh' as DataFreshness,
        lastUpdated: initialData.fetchedAt,
        error: null,
      };
    }
    return createInitialState();
  });

  const [currencyRates, setCurrencyRates] = useState<HybridDataState<Record<string, number>>>(() => {
    if (initialData?.currencyRates) {
      return {
        data: initialData.currencyRates,
        freshness: 'fresh' as DataFreshness,
        lastUpdated: initialData.fetchedAt,
        error: null,
      };
    }
    return createInitialState();
  });

  const [news, setNews] = useState<HybridDataState<any[]>>(() => {
    if (initialData?.news) {
      return {
        data: initialData.news,
        freshness: 'fresh' as DataFreshness,
        lastUpdated: initialData.fetchedAt,
        error: null,
      };
    }
    return createInitialState();
  });

  // Track last server fetch time
  const lastServerFetch = useMemo(() => initialData?.fetchedAt || null, [initialData]);

  // Revalidation intervals refs
  const revalidationTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Set server data and hydrate states
  const setServerData = useCallback((data: PrefetchedDashboardData) => {
    setServerDataState(data);
    
    if (data.portfolio) {
      setPortfolio({
        data: data.portfolio,
        freshness: 'fresh',
        lastUpdated: data.fetchedAt,
        error: null,
      });
    }
    
    if (data.marketPrices && Object.keys(data.marketPrices).length > 0) {
      setMarketPrices({
        data: data.marketPrices,
        freshness: 'fresh',
        lastUpdated: data.fetchedAt,
        error: null,
      });
    }
    
    if (data.currencyRates) {
      setCurrencyRates({
        data: data.currencyRates,
        freshness: 'fresh',
        lastUpdated: data.fetchedAt,
        error: null,
      });
    }
    
    if (data.news && data.news.length > 0) {
      setNews({
        data: data.news,
        freshness: 'fresh',
        lastUpdated: data.fetchedAt,
        error: null,
      });
    }
  }, []);

  // Revalidation function
  const revalidate = useCallback(async (key?: 'portfolio' | 'prices' | 'currency' | 'news' | 'all') => {
    const revalidatePortfolio = async () => {
      setPortfolio(prev => ({ ...prev, freshness: 'revalidating' }));
      try {
        const { SupabaseDataService } = await import('../lib/supabase/supabase-data-service');
        const [crypto, stocks, cash, savings, realEstate, valuableItems, expenses] = await Promise.all([
          SupabaseDataService.getCryptoHoldings([]),
          SupabaseDataService.getStockHoldings([]),
          SupabaseDataService.getCashAccounts([]),
          SupabaseDataService.getSavingsAccounts([]),
          SupabaseDataService.getRealEstate([]),
          SupabaseDataService.getValuableItems([]),
          SupabaseDataService.getExpenseCategories([]),
        ]);
        
        setPortfolio({
          data: { crypto, stocks, cash, savings, realEstate, valuableItems, expenses },
          freshness: 'fresh',
          lastUpdated: Date.now(),
          error: null,
        });
      } catch (error: any) {
        // Don't show error state for transient network errors - just keep stale data
        if (error?.message === 'Failed to fetch') {
          setPortfolio(prev => ({ 
            ...prev, 
            freshness: 'stale',
          }));
        } else {
          setPortfolio(prev => ({ 
            ...prev, 
            freshness: 'error',
            error: error as Error,
          }));
        }
      }
    };

    const revalidatePrices = async () => {
      setMarketPrices(prev => ({ ...prev, freshness: 'revalidating' }));
      try {
        // Get symbols from current portfolio data
        const cryptoSymbols = portfolio.data?.crypto?.map((c: any) => c.symbol) || [];
        const stockSymbols = portfolio.data?.stocks?.map((s: any) => s.symbol) || [];
        const symbols = [...cryptoSymbols, ...stockSymbols];
        
        if (symbols.length === 0) {
          setMarketPrices(prev => ({ ...prev, freshness: 'fresh' }));
          return;
        }

        const response = await fetch('/api/market-data/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });
        
        if (!response.ok) throw new Error('Failed to fetch prices');
        
        const data = await response.json();
        setMarketPrices({
          data: data.prices || {},
          freshness: 'fresh',
          lastUpdated: Date.now(),
          error: null,
        });
      } catch (error: any) {
        // Don't show error state for transient network errors
        if (error?.message === 'Failed to fetch') {
          setMarketPrices(prev => ({ ...prev, freshness: 'stale' }));
        } else {
          setMarketPrices(prev => ({ 
            ...prev, 
            freshness: 'error',
            error: error as Error,
          }));
        }
      }
    };

    const revalidateCurrency = async () => {
      setCurrencyRates(prev => ({ ...prev, freshness: 'revalidating' }));
      try {
        const response = await fetch('/api/currency/rates');
        if (!response.ok) throw new Error('Failed to fetch rates');
        
        const data = await response.json();
        setCurrencyRates({
          data: data.rates || {},
          freshness: 'fresh',
          lastUpdated: Date.now(),
          error: null,
        });
      } catch (error: any) {
        // Don't show error state for transient network errors
        if (error?.message === 'Failed to fetch') {
          setCurrencyRates(prev => ({ ...prev, freshness: 'stale' }));
        } else {
          setCurrencyRates(prev => ({ 
            ...prev, 
            freshness: 'error',
            error: error as Error,
          }));
        }
      }
    };

    const revalidateNews = async () => {
      setNews(prev => ({ ...prev, freshness: 'revalidating' }));
      try {
        const response = await fetch('/api/news?category=general');
        if (!response.ok) throw new Error('Failed to fetch news');
        
        const data = await response.json();
        setNews({
          data: data.articles || [],
          freshness: 'fresh',
          lastUpdated: Date.now(),
          error: null,
        });
      } catch (error) {
        setNews(prev => ({ 
          ...prev, 
          freshness: 'error',
          error: error as Error,
        }));
      }
    };

    // Execute revalidation based on key
    switch (key) {
      case 'portfolio':
        await revalidatePortfolio();
        break;
      case 'prices':
        await revalidatePrices();
        break;
      case 'currency':
        await revalidateCurrency();
        break;
      case 'news':
        await revalidateNews();
        break;
      case 'all':
      default:
        await Promise.all([
          revalidatePortfolio(),
          revalidatePrices(),
          revalidateCurrency(),
          revalidateNews(),
        ]);
    }
  }, [portfolio.data]);

  // Check staleness and setup automatic revalidation
  useEffect(() => {
    const now = Date.now();

    // Check if data is stale and needs background revalidation
    const checkStaleness = () => {
      if (portfolio.lastUpdated && now - portfolio.lastUpdated > STALE_THRESHOLD.portfolio) {
        setPortfolio(prev => ({ ...prev, freshness: 'stale' }));
      }
      if (marketPrices.lastUpdated && now - marketPrices.lastUpdated > STALE_THRESHOLD.prices) {
        setMarketPrices(prev => ({ ...prev, freshness: 'stale' }));
      }
      if (currencyRates.lastUpdated && now - currencyRates.lastUpdated > STALE_THRESHOLD.currency) {
        setCurrencyRates(prev => ({ ...prev, freshness: 'stale' }));
      }
      if (news.lastUpdated && now - news.lastUpdated > STALE_THRESHOLD.news) {
        setNews(prev => ({ ...prev, freshness: 'stale' }));
      }
    };

    // Initial staleness check
    checkStaleness();

    // Setup periodic revalidation
    revalidationTimersRef.current.portfolio = setInterval(() => {
      revalidate('portfolio');
    }, REVALIDATION_INTERVALS.portfolio);

    revalidationTimersRef.current.prices = setInterval(() => {
      revalidate('prices');
    }, REVALIDATION_INTERVALS.prices);

    revalidationTimersRef.current.currency = setInterval(() => {
      revalidate('currency');
    }, REVALIDATION_INTERVALS.currency);

    revalidationTimersRef.current.news = setInterval(() => {
      revalidate('news');
    }, REVALIDATION_INTERVALS.news);

    // Mark as hydrated
    setIsHydrated(true);

    return () => {
      Object.values(revalidationTimersRef.current).forEach(clearInterval);
    };
  }, [revalidate]);

  // Listen for data change events from other parts of the app
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleDataChange = () => {
      // Debounced revalidation on data changes (500ms)
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        revalidate('portfolio');
      }, 500);
    };

    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
    };
  }, [revalidate]);

  const value = useMemo(() => ({
    serverData,
    portfolio,
    marketPrices,
    currencyRates,
    news,
    revalidate,
    setServerData,
    isHydrated,
    lastServerFetch,
  }), [
    serverData,
    portfolio,
    marketPrices,
    currencyRates,
    news,
    revalidate,
    setServerData,
    isHydrated,
    lastServerFetch,
  ]);

  return (
    <HybridDataContext.Provider value={value}>
      {children}
    </HybridDataContext.Provider>
  );
}

export function useHybridData() {
  const context = useContext(HybridDataContext);
  if (!context) {
    throw new Error('useHybridData must be used within a HybridDataProvider');
  }
  return context;
}

// Hook for specific data types with automatic SWR-like behavior
export function useHybridPortfolio() {
  const { portfolio, revalidate } = useHybridData();
  
  return {
    ...portfolio,
    revalidate: () => revalidate('portfolio'),
    isLoading: portfolio.freshness === 'revalidating',
    isStale: portfolio.freshness === 'stale',
  };
}

export function useHybridPrices() {
  const { marketPrices, revalidate } = useHybridData();
  
  return {
    ...marketPrices,
    revalidate: () => revalidate('prices'),
    isLoading: marketPrices.freshness === 'revalidating',
    isStale: marketPrices.freshness === 'stale',
    getPrice: (symbol: string) => marketPrices.data?.[symbol] || null,
  };
}

export function useHybridCurrency() {
  const { currencyRates, revalidate } = useHybridData();
  
  return {
    ...currencyRates,
    revalidate: () => revalidate('currency'),
    isLoading: currencyRates.freshness === 'revalidating',
    isStale: currencyRates.freshness === 'stale',
    getRate: (currency: string) => currencyRates.data?.[currency] || 1,
  };
}

export function useHybridNews() {
  const { news, revalidate } = useHybridData();
  
  return {
    ...news,
    revalidate: () => revalidate('news'),
    isLoading: news.freshness === 'revalidating',
    isStale: news.freshness === 'stale',
  };
}
