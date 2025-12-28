"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketMarketService, type PriceUpdate } from '../lib/websocket-market-service';
import { cacheService } from '../lib/cache-service';

// Helper to determine asset type
const isCrypto = (symbol: string) => {
  const cryptoSymbols = [
    'BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'LINK', 'MATIC', 'AVAX', 'ATOM', 'NEAR',
    'XRP', 'BNB', 'DOGE', 'UNI', 'LTC', 'ALGO', 'VET', 'XLM', 'SHIB', 'TRX',
    'DAI', 'USDT', 'USDC', 'WBTC', 'AAVE', 'CRO', 'FTM', 'HBAR', 'PEPE', 'SUI',
    'APT', 'LDO', 'ARB', 'OP', 'INJ', 'RNDR', 'FIL', 'ICP', 'STX', 'IMX'
  ];
  return cryptoSymbols.includes(symbol.toUpperCase());
};

const getAssetType = (symbol: string): 'crypto' | 'stock' | 'forex' => {
  if (symbol.startsWith('FX:') || symbol.includes('/')) return 'forex';
  if (isCrypto(symbol)) return 'crypto';
  return 'stock';
};

const cleanSymbol = (symbol: string) => {
  return symbol.replace('FX:', '').replace('/', '');
};

export interface AssetPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  lastUpdated: number;
}

export function useAssetPrice(symbol: string, overrideType?: 'crypto' | 'stock' | 'forex') {
  const [price, setPrice] = useState<AssetPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for throttling
  const priceRef = useRef<AssetPrice | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const handlePriceUpdate = (update: PriceUpdate) => {
      const newPrice: AssetPrice = {
        symbol: update.symbol,
        price: update.price,
        change24h: update.change,
        changePercent24h: update.changePercent,
        lastUpdated: update.timestamp
      };

      const now = Date.now();
      priceRef.current = newPrice;
      
      // Throttle updates to max once every 200ms
      if (now - lastUpdateRef.current >= 200) {
        setPrice(newPrice);
        lastUpdateRef.current = now;
        setLoading(false);
        setError(null);
      } else {
        // Schedule an update if one isn't already scheduled
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (priceRef.current) {
              setPrice(priceRef.current);
              lastUpdateRef.current = Date.now();
              setLoading(false);
              setError(null);
            }
            timeoutRef.current = null;
          }, 200 - (now - lastUpdateRef.current));
        }
      }
    };

    const type = overrideType || getAssetType(symbol);
    const actualSymbol = cleanSymbol(symbol);
    
    const unsubscribe = websocketMarketService.subscribe(actualSymbol, handlePriceUpdate, type);

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [symbol, overrideType]);

  return { price, loading, error };
}

export function useAssetPrices(symbols: string[]) {
  // Initialize with cached data if available
  const [prices, setPrices] = useState<{ [symbol: string]: AssetPrice }>(() => {
    if (typeof window === 'undefined') return {};
    
    const initial: { [symbol: string]: AssetPrice } = {};
    symbols.forEach(symbol => {
      const type = getAssetType(symbol);
      const actualSymbol = cleanSymbol(symbol);
      const cacheKey = cacheService.keys.marketPrice(actualSymbol, type);
      const cached = cacheService.get<{
        symbol: string;
        currentPrice: number;
        change24h: number;
        changePercent24h: number;
      }>(cacheKey);
      
      if (cached) {
        initial[symbol] = {
          symbol: cached.symbol,
          price: cached.currentPrice,
          change24h: cached.change24h,
          changePercent24h: cached.changePercent24h,
          lastUpdated: Date.now()
        };
      }
    });
    return initial;
  });

  // Check if we have all prices to determine initial loading state
  const [loading, setLoading] = useState(() => {
    if (!symbols || symbols.length === 0) return false;
    if (typeof window === 'undefined') return true;
    
    // Check if all symbols are in cache
    const hasAll = symbols.every(s => {
       const type = getAssetType(s);
       const actualSymbol = cleanSymbol(s);
       return cacheService.has(cacheService.keys.marketPrice(actualSymbol, type));
    });
    return !hasAll;
  });

  const [error, setError] = useState<string | null>(null);
  
  const pricesRef = useRef<{ [symbol: string]: AssetPrice }>(prices);
  const dirtyRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Handle empty symbols list immediately
    if (!symbols || symbols.length === 0) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];
    const loadedSymbols = new Set<string>();
    
    // Initialize loadedSymbols with what we already have in pricesRef
    // This handles the case where we already have data from cache or previous fetches
    const uniqueSymbols = [...new Set(symbols)]; // Work with unique symbols
    
    uniqueSymbols.forEach(s => {
      if (pricesRef.current[s]) {
        loadedSymbols.add(s);
      }
    });
    
    // Only set loading to true if we don't have all symbols
    if (loadedSymbols.size < uniqueSymbols.length) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    
    setError(null);
    
    // Start the update interval
    intervalRef.current = setInterval(() => {
      if (dirtyRef.current) {
        setPrices({ ...pricesRef.current });
        dirtyRef.current = false;
      }
    }, 200); // Update UI at most every 200ms

    // Safety timeout to ensure loading state doesn't get stuck
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Asset prices loading timed out, forcing display');
        setLoading(false);
        setPrices({ ...pricesRef.current });
      }
    }, 2000); // 2 second safety timeout (reduced from 5s)

    uniqueSymbols.forEach(symbol => {
      const type = getAssetType(symbol);
      const actualSymbol = cleanSymbol(symbol);
      
      const unsubscribe = websocketMarketService.subscribe(actualSymbol, (update: PriceUpdate) => {
        const price: AssetPrice = {
          symbol: update.symbol,
          price: update.price,
          change24h: update.change,
          changePercent24h: update.changePercent,
          lastUpdated: update.timestamp
        };

        // Store by original symbol (so caller can look it up easily)
        pricesRef.current[symbol] = price;
        loadedSymbols.add(symbol);
        dirtyRef.current = true;
        
        // Check if we have loaded all unique symbols
        if (loadedSymbols.size >= uniqueSymbols.length) {
          // Initial load complete - update immediately
          setPrices({ ...pricesRef.current });
          setLoading(false);
          clearTimeout(safetyTimeout);
          dirtyRef.current = false;
        }
      }, type);
      
      unsubscribers.push(unsubscribe);
    });

    return () => {
      clearTimeout(safetyTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      unsubscribers.forEach(unsub => unsub());
    };
  }, [symbols.join(',')]);

  return { prices, loading, error };
}

export function usePriceUpdates() {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const forceUpdate = useCallback(() => {
    setLastUpdate(Date.now());
  }, []);

  return { lastUpdate, forceUpdate };
}
