"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketMarketService, type PriceUpdate } from '../lib/websocket-market-service';

// Helper to determine asset type
const isCrypto = (symbol: string) => {
  const cryptoSymbols = [
    'BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'LINK', 'MATIC', 'AVAX', 'ATOM', 'NEAR',
    'XRP', 'BNB', 'DOGE', 'UNI', 'LTC', 'ALGO', 'VET', 'XLM', 'SHIB', 'TRX',
    'DAI', 'USDT', 'USDC', 'WBTC', 'AAVE', 'CRO', 'FTM'
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
  const [prices, setPrices] = useState<{ [symbol: string]: AssetPrice }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pricesRef = useRef<{ [symbol: string]: AssetPrice }>({});
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
    const uniqueSymbols = [...new Set(symbols)]; // Work with unique symbols
    
    setLoading(true);
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
    }, 5000); // 5 second safety timeout

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
