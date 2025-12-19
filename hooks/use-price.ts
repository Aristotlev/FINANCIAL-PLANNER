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
    const unsubscribers: (() => void)[] = [];
    let loadedCount = 0;

    setLoading(true);
    setError(null);
    pricesRef.current = {};

    symbols.forEach(symbol => {
      const unsubscribe = priceService.subscribe(symbol, (price: AssetPrice) => {
        const prevPrice = pricesRef.current[symbol];
        
        // Only update if price actually changed (avoid unnecessary re-renders)
        if (!prevPrice || prevPrice.price !== price.price || prevPrice.change24h !== price.change24h) {
          pricesRef.current[symbol] = price;
          loadedCount++;
          
          // Batch updates - only set state once all initial prices are loaded
          // or when an existing price changes
          if (loadedCount >= symbols.length || prevPrice) {
            setPrices({ ...pricesRef.current });
            setLoading(false);
          }
        } else {
          loadedCount++;
          if (loadedCount >= symbols.length) {
            setLoading(false);
          }
        }
      });
      
      unsubscribers.push(unsubscribe);
    });

    return () => {
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
