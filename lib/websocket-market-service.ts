/**
 * WebSocket Market Data Service (Worker Proxy)
 * 
 * Offloads WebSocket connections and polling to a Web Worker.
 * Keeps the main thread free for UI rendering.
 */

import { cacheService } from './cache-service';

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume?: number;
}

type PriceCallback = (update: PriceUpdate) => void;

class WebSocketMarketService {
  private worker: Worker | null = null;
  private subscribers: Map<string, Set<PriceCallback>> = new Map();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker('/market-worker.js');
      
      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'PRICE_UPDATE') {
          this.handlePriceUpdate(payload);
        }
      };

      console.log('✅ Market Data Worker initialized');
    } catch (error) {
      console.error('Failed to initialize Market Data Worker:', error);
    }
  }

  /**
   * Subscribe to real-time price updates for a symbol
   */
  subscribe(symbol: string, callback: PriceCallback, type: 'crypto' | 'stock' | 'forex' = 'stock'): () => void {
    const upperSymbol = symbol.toUpperCase();
    const key = `${type}:${upperSymbol}`;

    // Add callback to subscribers
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Check cache and notify immediately if available
    const cacheKey = cacheService.keys.marketPrice(upperSymbol, type);
    const cachedData = cacheService.get<{
      symbol: string;
      currentPrice: number;
      change24h: number;
      changePercent24h: number;
    }>(cacheKey);

    if (cachedData) {
      // Execute callback immediately with cached data
      // Use setTimeout to ensure it runs after the subscription is returned (if needed)
      // or run synchronously. Synchronous is better for initial render if possible,
      // but might cause issues if the component isn't mounted yet? 
      // Actually, in useEffect, it's fine.
      try {
        callback({
          symbol: cachedData.symbol,
          price: cachedData.currentPrice,
          change: cachedData.change24h,
          changePercent: cachedData.changePercent24h,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('Error in cached price callback:', e);
      }
    }

    // Notify worker
    if (this.worker) {
      this.worker.postMessage({
        type: 'SUBSCRIBE',
        payload: { symbol: upperSymbol, type }
      });
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(key, callback, upperSymbol, type);
    };
  }

  /**
   * Unsubscribe from price updates
   */
  private unsubscribe(key: string, callback: PriceCallback, symbol: string, type: string): void {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.delete(callback);
      
      // If no more subscribers, notify worker
      if (callbacks.size === 0) {
        if (this.worker) {
          this.worker.postMessage({
            type: 'UNSUBSCRIBE',
            payload: { symbol, type }
          });
        }
      }
    }
  }

  /**
   * Handle price update from worker
   */
  private handlePriceUpdate(update: PriceUpdate) {
    const { symbol } = update;
    
    const cryptoKey = `crypto:${symbol}`;
    const stockKey = `stock:${symbol}`;
    const forexKey = `forex:${symbol}`;

    let type: 'crypto' | 'stock' | 'forex' = 'stock';
    let key = stockKey;

    if (this.subscribers.has(cryptoKey)) {
      type = 'crypto';
      key = cryptoKey;
    } else if (this.subscribers.has(forexKey)) {
      type = 'forex';
      key = forexKey;
    }

    // Update main thread cache so other components can access it synchronously
    const cacheKey = cacheService.keys.marketPrice(symbol, type);
    cacheService.set(cacheKey, {
      symbol: update.symbol,
      currentPrice: update.price,
      change24h: update.change,
      changePercent24h: update.changePercent,
    }, cacheService.getTTL('MARKET_PRICE'));

    // Notify subscribers
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(update));
    }
  }

  /**
   * Disconnect all WebSockets
   */
  disconnectAll(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'DISCONNECT_ALL' });
    }
    this.subscribers.clear();
  }

  /**
   * Get connection status (Mocked for compatibility)
   */
  getStatus(symbol: string, type: 'crypto' | 'stock' = 'stock'): {
    connected: boolean;
    subscribers: number;
    reconnectAttempts: number;
  } {
    const key = `${type}:${symbol.toUpperCase()}`;
    return {
      connected: !!this.worker,
      subscribers: this.subscribers.get(key)?.size || 0,
      reconnectAttempts: 0,
    };
  }

  /**
   * Get statistics (Mocked for compatibility)
   */
  getStats(): {
    totalConnections: number;
    totalSubscribers: number;
    connections: Array<{ key: string; status: string; subscribers: number }>;
  } {
    return {
      totalConnections: this.worker ? 1 : 0,
      totalSubscribers: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
      connections: [],
    };
  }
}

// Export singleton instance
export const websocketMarketService = new WebSocketMarketService();

// Export types
export type { PriceUpdate, PriceCallback };

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    websocketMarketService.disconnectAll();
  });
}
