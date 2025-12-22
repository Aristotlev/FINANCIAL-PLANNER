/**
 * Use Hybrid Data Hook
 * 
 * Main hook for components to access the hybrid data system.
 * Provides:
 * - Server-side prefetched data on initial load
 * - Client-side real-time updates
 * - Smart caching with SWR pattern
 * - Automatic revalidation
 * - Loading and freshness states
 */

"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  useHybridData, 
  useHybridPortfolio, 
  useHybridPrices as useHybridPricesContext, 
  useHybridCurrency,
  useHybridNews 
} from '@/contexts/hybrid-data-context';
import { 
  prefetchPrices, 
  prefetchNews, 
  prefetchCurrencyRates,
  trackSymbolInteraction,
  useInitialPrefetch 
} from '@/lib/prefetch-service';
import enhancedCache, { cacheKeys, cacheConfigs } from '@/lib/enhanced-cache-service';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  [key: string]: any;
}

/**
 * Hook for real-time price data with hybrid loading
 */
export function useHybridPrice(symbol: string) {
  const { getPrice, revalidate, isLoading, isStale } = useHybridPricesContext();
  const lastPriceRef = useRef<number | null>(null);
  
  // Track interaction for smart prefetching
  useEffect(() => {
    if (symbol) {
      trackSymbolInteraction(symbol);
    }
  }, [symbol]);
  
  // Get current price
  const priceData = useMemo(() => getPrice(symbol), [getPrice, symbol]);
  
  // Calculate price change direction for animations
  const priceDirection = useMemo(() => {
    if (!priceData?.price || lastPriceRef.current === null) {
      lastPriceRef.current = priceData?.price || null;
      return 'none';
    }
    
    const direction = priceData.price > lastPriceRef.current ? 'up' : 
                      priceData.price < lastPriceRef.current ? 'down' : 'none';
    lastPriceRef.current = priceData.price;
    return direction;
  }, [priceData?.price]);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    prefetchPrices([symbol]);
    revalidate();
  }, [symbol, revalidate]);
  
  return {
    price: priceData?.price || 0,
    change: priceData?.change || 0,
    changePercent: priceData?.changePercent || 0,
    isLoading,
    isStale,
    priceDirection,
    refresh,
    raw: priceData,
  };
}

/**
 * Hook for batch price data (multiple symbols)
 */
export function useHybridBatchPrices(symbols: string[]): {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  isStale: boolean;
  refresh: () => void;
  calculateTotalValue: (holdings: Array<{ symbol: string; amount: number }>) => number;
} {
  const { data, revalidate, isLoading, isStale } = useHybridPricesContext();
  
  // Use initial prefetch hook
  useInitialPrefetch(symbols);
  
  // Get prices for requested symbols
  const prices = useMemo((): Record<string, PriceData> => {
    if (!data) return {};
    return symbols.reduce((acc, symbol) => {
      if (data[symbol]) {
        acc[symbol] = data[symbol];
      }
      return acc;
    }, {} as Record<string, PriceData>);
  }, [data, symbols]);
  
  // Total value calculation helper
  const calculateTotalValue = useCallback((
    holdings: Array<{ symbol: string; amount: number }>
  ): number => {
    return holdings.reduce((total, holding) => {
      const price = prices[holding.symbol]?.price || 0;
      return total + (holding.amount * price);
    }, 0);
  }, [prices]);
  
  const refresh = useCallback((): void => {
    prefetchPrices(symbols);
    revalidate();
  }, [symbols, revalidate]);
  
  return {
    prices,
    isLoading,
    isStale,
    refresh,
    calculateTotalValue,
  };
}

/**
 * Hook for portfolio data with hybrid loading
 */
export function useHybridPortfolioData() {
  const { data, revalidate, isLoading, isStale, error } = useHybridPortfolio();
  
  // Calculate totals
  const totals = useMemo(() => {
    if (!data) return {
      cash: 0,
      savings: 0,
      crypto: 0,
      stocks: 0,
      realEstate: 0,
      valuableItems: 0,
      expenses: 0,
      netWorth: 0,
    };
    
    const cash = data.cash?.reduce((sum: number, a: any) => sum + (a.balance || 0), 0) || 0;
    const savings = data.savings?.reduce((sum: number, a: any) => sum + (a.current || 0), 0) || 0;
    const crypto = data.crypto?.reduce((sum: number, a: any) => sum + (a.value || 0), 0) || 0;
    const stocks = data.stocks?.reduce((sum: number, a: any) => sum + (a.value || 0), 0) || 0;
    const realEstate = data.realEstate?.reduce((sum: number, a: any) => sum + (a.current_value || 0), 0) || 0;
    const valuableItems = data.valuableItems?.reduce((sum: number, a: any) => sum + (a.current_value || 0), 0) || 0;
    const expenses = data.expenses?.reduce((sum: number, a: any) => sum + (a.amount || 0), 0) || 0;
    
    return {
      cash,
      savings,
      crypto,
      stocks,
      realEstate,
      valuableItems,
      expenses,
      netWorth: cash + savings + crypto + stocks + realEstate + valuableItems,
    };
  }, [data]);
  
  return {
    data,
    totals,
    isLoading,
    isStale,
    error,
    revalidate,
  };
}

/**
 * Hook for currency conversion with hybrid loading
 */
export function useHybridCurrencyConversion() {
  const { data, getRate, revalidate, isLoading, isStale } = useHybridCurrency();
  
  const convert = useCallback((
    amount: number, 
    from: string, 
    to: string
  ): number => {
    if (from === to) return amount;
    
    const fromRate = getRate(from);
    const toRate = getRate(to);
    
    if (!fromRate || !toRate) return amount;
    
    // Convert through USD as base
    return (amount / fromRate) * toRate;
  }, [getRate]);
  
  const formatWithCurrency = useCallback((
    amount: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      ...options,
    }).format(amount);
  }, []);
  
  return {
    rates: data,
    convert,
    formatWithCurrency,
    isLoading,
    isStale,
    revalidate,
  };
}

/**
 * Hook for news with hybrid loading
 */
export function useHybridNewsData() {
  const { data, revalidate, isLoading, isStale, error } = useHybridNews();
  
  // Filter and sort news
  const newsItems = useMemo(() => {
    if (!data) return [];
    return data.slice(0, 20); // Limit to 20 items
  }, [data]);
  
  const refresh = useCallback(() => {
    prefetchNews('general');
    revalidate();
  }, [revalidate]);
  
  return {
    news: newsItems,
    isLoading,
    isStale,
    error,
    refresh,
  };
}

/**
 * Combined hook for dashboard data
 */
export function useDashboardData() {
  const portfolio = useHybridPortfolioData();
  const currency = useHybridCurrencyConversion();
  const news = useHybridNewsData();
  const { isHydrated, lastServerFetch } = useHybridData();
  
  // Get symbols for price fetching
  const symbols = useMemo(() => {
    const cryptoSymbols = portfolio.data?.crypto?.map((c: any) => c.symbol) || [];
    const stockSymbols = portfolio.data?.stocks?.map((s: any) => s.symbol) || [];
    return [...cryptoSymbols, ...stockSymbols];
  }, [portfolio.data]);
  
  // Use initial prefetch
  useInitialPrefetch(symbols);
  
  // Overall loading state
  const isLoading = !isHydrated || portfolio.isLoading || currency.isLoading;
  
  // Overall stale state
  const isStale = portfolio.isStale || currency.isStale;
  
  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      portfolio.revalidate(),
      currency.revalidate(),
      news.refresh(),
    ]);
  }, [portfolio.revalidate, currency.revalidate, news.refresh]);
  
  return {
    portfolio,
    currency,
    news,
    symbols,
    isHydrated,
    isLoading,
    isStale,
    lastServerFetch,
    refreshAll,
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(
  cacheKey: string,
  currentData: T | null
) {
  const update = useCallback((
    mutator: (current: T | null) => T,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    // Optimistically update cache
    enhancedCache.mutate<T>(cacheKey, mutator);
    
    // Notify on success
    onSuccess?.();
  }, [cacheKey]);
  
  const rollback = useCallback(() => {
    if (currentData !== null) {
      enhancedCache.set(cacheKey, currentData);
    }
  }, [cacheKey, currentData]);
  
  return { update, rollback };
}

export default useDashboardData;
