/**
 * Real-time Price Hook
 * 
 * React hook for subscribing to WebSocket price updates
 * Automatically manages subscriptions and cleanup
 */

import { useEffect, useState } from 'react';
import { websocketMarketService } from '@/lib/websocket-market-service';

interface RealtimePriceUpdate {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface UseRealtimePriceOptions {
  enabled?: boolean;
  fallbackPrice?: number;
}

export function useRealtimePrice(
  symbol: string,
  type: 'crypto' | 'stock',
  options: UseRealtimePriceOptions = {}
) {
  const { enabled = true, fallbackPrice } = options;
  
  const [priceData, setPriceData] = useState<RealtimePriceUpdate | null>(
    fallbackPrice ? {
      price: fallbackPrice,
      change: 0,
      changePercent: 0,
      timestamp: Date.now(),
    } : null
  );
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    // Subscribe to WebSocket updates
    try {
      unsubscribe = websocketMarketService.subscribe(
        symbol,
        (update) => {
          setPriceData({
            price: update.price,
            change: update.change || 0,
            changePercent: update.changePercent || 0,
            timestamp: update.timestamp,
          });
          setIsConnected(true);
          setError(null);
        },
        type
      );

      // Check connection status after 2 seconds
      const statusCheck = setTimeout(() => {
        const status = websocketMarketService.getStatus(symbol, type);
        setIsConnected(status.connected);
        
        if (!status.connected) {
          setError('WebSocket not connected, using fallback polling');
        }
      }, 2000);

      return () => {
        clearTimeout(statusCheck);
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`[useRealtimePrice] Error subscribing to ${symbol}:`, err);
    }
  }, [symbol, type, enabled]);

  return {
    priceData,
    isConnected,
    error,
    isLoading: enabled && !priceData && !error,
  };
}

/**
 * Hook for subscribing to multiple assets at once
 */
export function useRealtimePrices(
  assets: Array<{ symbol: string; type: 'crypto' | 'stock' }>,
  options: UseRealtimePriceOptions = {}
) {
  const { enabled = true } = options;
  
  const [pricesMap, setPricesMap] = useState<Map<string, RealtimePriceUpdate>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || assets.length === 0) {
      return;
    }

    const unsubscribers: Array<() => void> = [];

    // Subscribe to all assets
    assets.forEach(({ symbol, type }) => {
      try {
        const unsubscribe = websocketMarketService.subscribe(
          symbol,
          (update) => {
            setPricesMap((prev) => {
              const next = new Map(prev);
              next.set(symbol, {
                price: update.price,
                change: update.change || 0,
                changePercent: update.changePercent || 0,
                timestamp: update.timestamp,
              });
              return next;
            });

            setConnectionStatus((prev) => {
              const next = new Map(prev);
              next.set(symbol, true);
              return next;
            });

            setErrors((prev) => {
              const next = new Map(prev);
              next.delete(symbol);
              return next;
            });
          },
          type
        );

        unsubscribers.push(unsubscribe);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setErrors((prev) => {
          const next = new Map(prev);
          next.set(symbol, errorMessage);
          return next;
        });
      }
    });

    // Check connection status after 2 seconds
    const statusCheck = setTimeout(() => {
      assets.forEach(({ symbol, type }) => {
        const status = websocketMarketService.getStatus(symbol, type);
        setConnectionStatus((prev) => {
          const next = new Map(prev);
          next.set(symbol, status.connected);
          return next;
        });

        if (!status.connected) {
          setErrors((prev) => {
            const next = new Map(prev);
            next.set(symbol, 'WebSocket not connected, using fallback polling');
            return next;
          });
        }
      });
    }, 2000);

    return () => {
      clearTimeout(statusCheck);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [assets, enabled]);

  return {
    pricesMap,
    connectionStatus,
    errors,
    isLoading: enabled && pricesMap.size === 0 && errors.size === 0,
  };
}

/**
 * Hook for WebSocket service statistics
 */
export function useWebSocketStats() {
  const [stats, setStats] = useState(websocketMarketService.getStats());

  useEffect(() => {
    // Update stats every 5 seconds
    const interval = setInterval(() => {
      setStats(websocketMarketService.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
