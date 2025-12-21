"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { priceService, type AssetPrice } from '../lib/price-service';

export function useAssetPrice(symbol: string) {
  const [price, setPrice] = useState<AssetPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = priceService.subscribe(symbol, (newPrice: AssetPrice) => {
      setPrice(newPrice);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [symbol]);

  return { price, loading, error };
}

export function useAssetPrices(symbols: string[]) {
  const [prices, setPrices] = useState<{ [symbol: string]: AssetPrice }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pricesRef = useRef<{ [symbol: string]: AssetPrice }>({});

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
    
    // Keep existing prices to avoid flickering, but mark as loading
    // pricesRef.current is preserved across renders

    // Safety timeout to ensure loading state doesn't get stuck
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Asset prices loading timed out, forcing display');
        setLoading(false);
        setPrices({ ...pricesRef.current });
      }
    }, 5000); // 5 second safety timeout

    uniqueSymbols.forEach(symbol => {
      const unsubscribe = priceService.subscribe(symbol, (price: AssetPrice) => {
        pricesRef.current[symbol] = price;
        loadedSymbols.add(symbol);
        
        // Check if we have loaded all unique symbols
        if (loadedSymbols.size >= uniqueSymbols.length) {
          setPrices({ ...pricesRef.current });
          setLoading(false);
          clearTimeout(safetyTimeout);
        } else {
          // Optional: Update incrementally for better UX
          setPrices({ ...pricesRef.current });
        }
      });
      
      unsubscribers.push(unsubscribe);
    });

    return () => {
      clearTimeout(safetyTimeout);
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
