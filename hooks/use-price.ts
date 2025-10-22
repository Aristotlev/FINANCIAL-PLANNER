"use client";

import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    const newPrices: { [symbol: string]: AssetPrice } = {};
    let loadedCount = 0;

    setLoading(true);
    setError(null);

    symbols.forEach(symbol => {
      const unsubscribe = priceService.subscribe(symbol, (price: AssetPrice) => {
        newPrices[symbol] = price;
        loadedCount++;
        
        setPrices({ ...newPrices });
        
        if (loadedCount >= symbols.length) {
          setLoading(false);
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
