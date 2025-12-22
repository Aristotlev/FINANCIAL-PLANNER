/**
 * Enhanced Cache Service with SWR Pattern
 * 
 * Implements intelligent caching with:
 * - Stale-while-revalidate pattern
 * - Request deduplication
 * - Background refresh
 * - TTL-based expiration
 * - Memory-efficient LRU eviction
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
  isRevalidating: boolean;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number;           // Time until stale (ms)
  maxAge?: number;        // Time until expired (ms)
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  dedupingInterval?: number; // Dedup requests within this interval
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 30000,             // 30 seconds
  maxAge: 300000,         // 5 minutes
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // 2 seconds
};

class EnhancedCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private pendingRequests: Map<string, PendingRequest<any>>;
  private subscribers: Map<string, Set<(data: any) => void>>;
  private maxSize: number;
  
  constructor(maxSize: number = 500) {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.subscribers = new Map();
    this.maxSize = maxSize;

    // Setup browser event listeners
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }

    console.log('✅ EnhancedCacheService initialized');
  }

  private setupEventListeners() {
    // Revalidate on window focus
    window.addEventListener('focus', () => {
      this.cache.forEach((entry, key) => {
        if (Date.now() > entry.staleAt && !entry.isRevalidating) {
          this.notifySubscribers(key, entry.data);
        }
      });
    });

    // Revalidate on reconnect
    window.addEventListener('online', () => {
      this.cache.forEach((entry, key) => {
        if (Date.now() > entry.staleAt && !entry.isRevalidating) {
          this.notifySubscribers(key, entry.data);
        }
      });
    });
  }

  /**
   * Get data with SWR pattern
   * Returns stale data immediately, revalidates in background
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const now = Date.now();

    // Check for existing cache entry
    const cached = this.cache.get(key);

    if (cached) {
      // If fresh, return immediately
      if (now < cached.staleAt) {
        return cached.data as T;
      }

      // If stale but not expired, return stale data and revalidate in background
      if (now < cached.expiresAt) {
        this.revalidateInBackground(key, fetcher, opts);
        return cached.data as T;
      }
    }

    // No valid cache - fetch with request deduplication
    return this.fetchWithDedup(key, fetcher, opts);
  }

  /**
   * Fetch with request deduplication
   */
  private async fetchWithDedup<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const now = Date.now();

    // Check for pending request
    const pending = this.pendingRequests.get(key);
    if (pending && now - pending.timestamp < (options.dedupingInterval || 2000)) {
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = fetcher().then(data => {
      this.set(key, data, options);
      this.pendingRequests.delete(key);
      this.notifySubscribers(key, data);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, { promise, timestamp: now });
    return promise;
  }

  /**
   * Revalidate in background without blocking
   */
  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    const cached = this.cache.get(key);
    if (!cached || cached.isRevalidating) return;

    // Mark as revalidating
    cached.isRevalidating = true;

    try {
      const data = await fetcher();
      this.set(key, data, options);
      this.notifySubscribers(key, data);
    } catch (error) {
      console.error(`Background revalidation failed for ${key}:`, error);
    } finally {
      if (this.cache.get(key)) {
        this.cache.get(key)!.isRevalidating = false;
      }
    }
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const now = Date.now();

    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      staleAt: now + (opts.ttl || 30000),
      expiresAt: now + (opts.maxAge || 300000),
      isRevalidating: false,
    });
  }

  /**
   * Get from cache (without revalidation)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Return even if stale/expired (caller decides what to do)
    return entry.data as T;
  }

  /**
   * Check if cache entry is fresh
   */
  isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? Date.now() < entry.staleAt : false;
  }

  /**
   * Check if cache entry is stale
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    const now = Date.now();
    return now >= entry.staleAt && now < entry.expiresAt;
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    return !entry || Date.now() >= entry.expiresAt;
  }

  /**
   * Subscribe to cache updates
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of cache update
   */
  private notifySubscribers(key: string, data: any): void {
    this.subscribers.get(key)?.forEach(callback => callback(data));
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (regex.test(key)) this.cache.delete(key);
    });
  }

  /**
   * Mutate cache entry optimistically
   */
  mutate<T>(key: string, mutator: (current: T | null) => T): void {
    const current = this.get<T>(key);
    const newData = mutator(current);
    this.set(key, newData);
    this.notifySubscribers(key, newData);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    let fresh = 0, stale = 0, expired = 0;
    const now = Date.now();

    this.cache.forEach(entry => {
      if (now < entry.staleAt) fresh++;
      else if (now < entry.expiresAt) stale++;
      else expired++;
    });

    return { total: this.cache.size, fresh, stale, expired };
  }
}

// Singleton instance
export const enhancedCache = new EnhancedCacheService();

// Cache key builders for consistency
export const cacheKeys = {
  portfolio: (userId: string) => `portfolio:${userId}`,
  prices: (symbols: string[]) => `prices:${symbols.sort().join(',')}`,
  price: (symbol: string) => `price:${symbol}`,
  currency: (from: string, to: string) => `currency:${from}:${to}`,
  currencyRates: () => 'currency:rates',
  news: (category: string) => `news:${category}`,
  userSettings: (userId: string) => `settings:${userId}`,
};

// Preset cache configurations
export const cacheConfigs = {
  realtime: { ttl: 15000, maxAge: 60000 },      // 15s fresh, 1min max
  frequent: { ttl: 30000, maxAge: 300000 },     // 30s fresh, 5min max
  standard: { ttl: 60000, maxAge: 600000 },     // 1min fresh, 10min max
  slow: { ttl: 300000, maxAge: 3600000 },       // 5min fresh, 1hr max
  static: { ttl: 3600000, maxAge: 86400000 },   // 1hr fresh, 24hr max
};

export default enhancedCache;
