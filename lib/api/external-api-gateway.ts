/**
 * External API Gateway
 * 
 * Centralized rate limiting and caching for ALL outbound API calls
 * to prevent IP bans from public APIs (SEC EDGAR, Yahoo Finance, etc.)
 * 
 * Features:
 * ─────────
 * 1. Per-provider outbound rate limiting (respects each API's fair access policy)
 * 2. Server-side in-memory cache with configurable TTLs per data type
 * 3. Stale-while-revalidate: returns stale data immediately, refreshes in background
 * 4. Request deduplication: concurrent identical requests share one outbound call
 * 5. Exponential backoff on 429/rate-limit errors
 * 6. Circuit breaker: stops calling a provider after repeated failures
 * 
 * Copyright OmniFolio. All rights reserved.
 */

// ─── Types ────────────────────────────────────────────────────────────

export type APIProvider = 
  | 'sec-edgar'       // SEC EDGAR — 10 req/s max, we do 4/s
  | 'sec-efts'        // SEC EFTS search — same limits as EDGAR
  | 'yahoo-finance'   // Yahoo Finance — unofficial, be very conservative
  | 'exchange-rate'   // exchangerate-api.com — 1500 req/day
  | 'rss-feeds'       // RSS news feeds — varies per source
  | 'google-favicon'; // Google favicon service — very lenient

interface ProviderConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Time window in ms */
  windowMs: number;
  /** Minimum delay between requests in ms */
  minIntervalMs: number;
  /** Max consecutive errors before circuit breaks */
  circuitBreakerThreshold: number;
  /** How long to keep circuit open (ms) */
  circuitBreakerResetMs: number;
  /** User-Agent header (required by SEC) */
  userAgent?: string;
}

interface ProviderState {
  /** Timestamps of recent requests */
  requestTimestamps: number[];
  /** Last request time for minimum interval enforcement */
  lastRequestTime: number;
  /** Consecutive error count */
  consecutiveErrors: number;
  /** Whether circuit breaker is open (blocking requests) */
  circuitOpen: boolean;
  /** When circuit breaker was opened */
  circuitOpenedAt: number;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  staleUntil: number; // timestamp until which stale data can be served
  provider: APIProvider;
  key: string;
}

interface PendingRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
}

// ─── TTL Presets (in milliseconds) ────────────────────────────────────

export const CacheTTL = {
  // SEC EDGAR — data changes infrequently
  SEC_CIK_MAPPING:      24 * 60 * 60 * 1000,   // 24 hours — ticker→CIK rarely changes
  SEC_COMPANY_PROFILE:  60 * 60 * 1000,         // 1 hour — company info
  SEC_FILINGS_LIST:     15 * 60 * 1000,         // 15 minutes — new filings
  SEC_FILING_DETAIL:    24 * 60 * 60 * 1000,    // 24 hours — filings don't change
  SEC_XBRL_FINANCIALS:  6 * 60 * 60 * 1000,     // 6 hours — quarterly updates
  SEC_RSS_FEED:         5 * 60 * 1000,           // 5 minutes — recent filings feed
  SEC_INSIDER_TX:       30 * 60 * 1000,          // 30 minutes — Form 4 data
  SEC_IPO_FILINGS:      60 * 60 * 1000,          // 1 hour — IPO filings

  // Yahoo Finance
  YAHOO_QUOTE:          5 * 60 * 1000,            // 5 minutes — stock price (less aggressive)
  YAHOO_CHART:          10 * 60 * 1000,           // 10 minutes — chart data

  // Exchange Rates
  EXCHANGE_RATES:       60 * 60 * 1000,           // 1 hour — FX rates

  // News RSS
  RSS_FEED:             5 * 60 * 1000,            // 5 minutes — news feeds
} as const;

// Stale-while-revalidate multiplier: stale data is acceptable for N × TTL
const STALE_MULTIPLIER = 4;

// ─── Provider Configurations ──────────────────────────────────────────

const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  'sec-edgar': {
    maxRequests: 8,           // 8 per 2 seconds (SEC allows 10/s)
    windowMs: 2000,
    minIntervalMs: 250,       // 4 req/s max
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000, // 1 minute
    userAgent: 'OmniFolio/1.0 (support@omnifolio.app)',
  },
  'sec-efts': {
    maxRequests: 8,
    windowMs: 2000,
    minIntervalMs: 250,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000,
    userAgent: 'OmniFolio/1.0 (support@omnifolio.app)',
  },
  'yahoo-finance': {
    maxRequests: 30,          // Very conservative — unofficial API
    windowMs: 60000,
    minIntervalMs: 500,       // 2 req/s max
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 300000, // 5 minutes — Yahoo bans are harsh
  },
  'exchange-rate': {
    maxRequests: 60,          // 60 per hour (1500/day limit)
    windowMs: 3600000,
    minIntervalMs: 1000,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 600000, // 10 minutes
  },
  'rss-feeds': {
    maxRequests: 120,         // Lenient — each source is different
    windowMs: 60000,
    minIntervalMs: 100,
    circuitBreakerThreshold: 20,
    circuitBreakerResetMs: 60000,
  },
  'google-favicon': {
    maxRequests: 100,
    windowMs: 60000,
    minIntervalMs: 50,
    circuitBreakerThreshold: 20,
    circuitBreakerResetMs: 30000,
  },
};

// ─── Gateway Class ────────────────────────────────────────────────────

class ExternalAPIGateway {
  private providerStates: Map<APIProvider, ProviderState> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    staleHits: 0,
    deduplicated: 0,
    rateLimited: 0,
    circuitBroken: 0,
    totalRequests: 0,
    errors: 0,
  };

  constructor() {
    // Initialize provider states
    for (const provider of Object.keys(PROVIDER_CONFIGS) as APIProvider[]) {
      this.providerStates.set(provider, {
        requestTimestamps: [],
        lastRequestTime: 0,
        consecutiveErrors: 0,
        circuitOpen: false,
        circuitOpenedAt: 0,
      });
    }

    // Cleanup expired cache entries every 5 minutes
    if (typeof globalThis !== 'undefined' && typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
    }

    console.log('[APIGateway] Initialized with provider configs:', 
      Object.keys(PROVIDER_CONFIGS).join(', '));
  }

  // ─── Public API ───────────────────────────────────────────────────

  /**
   * Make a cached, rate-limited, deduplicated API call
   * 
   * @param provider - Which API provider this call is for
   * @param cacheKey - Unique cache key for this request
   * @param fetchFn - Function that performs the actual API call
   * @param ttl - Cache TTL in ms (use CacheTTL presets)
   * @param options - Additional options
   */
  async cachedFetch<T>(
    provider: APIProvider,
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    options: {
      /** Force bypass cache and fetch fresh data */
      forceRefresh?: boolean;
      /** Allow returning stale data (default: true) */
      allowStale?: boolean;
      /** Custom stale duration (default: ttl * STALE_MULTIPLIER) */
      staleDuration?: number;
      /** Skip rate limiting (e.g., for internal/cron calls) */
      skipRateLimit?: boolean;
    } = {}
  ): Promise<{ data: T; source: 'cache' | 'stale' | 'api' | 'deduplicated' }> {
    const { forceRefresh = false, allowStale = true, staleDuration, skipRateLimit = false } = options;
    this.stats.totalRequests++;

    const fullKey = `${provider}:${cacheKey}`;

    // 1. Check cache (unless force refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(fullKey);
      if (cached) {
        const now = Date.now();
        const age = now - cached.timestamp;

        // Fresh cache hit
        if (age < cached.ttl) {
          this.stats.cacheHits++;
          return { data: cached.data as T, source: 'cache' };
        }

        // Stale but acceptable
        if (allowStale && now < cached.staleUntil) {
          this.stats.staleHits++;
          // Trigger background refresh (fire-and-forget)
          this.backgroundRefresh(provider, fullKey, fetchFn, ttl, staleDuration);
          return { data: cached.data as T, source: 'stale' };
        }
      }
    }

    this.stats.cacheMisses++;

    // 2. Check for pending identical request (deduplication)
    const pending = this.pendingRequests.get(fullKey);
    if (pending && Date.now() - pending.timestamp < 30000) { // 30s max pending
      this.stats.deduplicated++;
      try {
        const data = await pending.promise as T;
        return { data, source: 'deduplicated' };
      } catch {
        // If pending request failed, we'll try our own
      }
    }

    // 3. Rate limit check
    if (!skipRateLimit) {
      await this.enforceRateLimit(provider);
    }

    // 4. Execute the fetch
    const fetchPromise = this.executeFetch(provider, fullKey, fetchFn, ttl, staleDuration);
    this.pendingRequests.set(fullKey, { promise: fetchPromise, timestamp: Date.now() });

    try {
      const data = await fetchPromise;
      return { data, source: 'api' };
    } finally {
      this.pendingRequests.delete(fullKey);
    }
  }

  /**
   * Get data from cache only (no API call)
   */
  getCached<T>(provider: APIProvider, cacheKey: string): T | null {
    const fullKey = `${provider}:${cacheKey}`;
    const cached = this.cache.get(fullKey);
    if (!cached) return null;

    const now = Date.now();
    // Return if fresh or stale-acceptable
    if (now < cached.staleUntil) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Manually set cache entry (e.g., from DB cache)
   */
  setCache<T>(provider: APIProvider, cacheKey: string, data: T, ttl: number): void {
    const fullKey = `${provider}:${cacheKey}`;
    const staleDuration = ttl * STALE_MULTIPLIER;
    this.cache.set(fullKey, {
      data,
      timestamp: Date.now(),
      ttl,
      staleUntil: Date.now() + staleDuration,
      provider,
      key: cacheKey,
    });
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(provider: APIProvider, cacheKey: string): void {
    const fullKey = `${provider}:${cacheKey}`;
    this.cache.delete(fullKey);
  }

  /**
   * Invalidate all cache entries for a provider
   */
  invalidateProvider(provider: APIProvider): void {
    const prefix = `${provider}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get gateway stats for monitoring
   */
  getStats() {
    const providerStats: Record<string, any> = {};
    for (const [provider, state] of this.providerStates.entries()) {
      const config = PROVIDER_CONFIGS[provider];
      const now = Date.now();
      const recentRequests = state.requestTimestamps.filter(
        t => now - t < config.windowMs
      ).length;

      providerStats[provider] = {
        recentRequests,
        maxRequests: config.maxRequests,
        utilizationPercent: Math.round((recentRequests / config.maxRequests) * 100),
        consecutiveErrors: state.consecutiveErrors,
        circuitOpen: state.circuitOpen,
      };
    }

    const totalOps = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = totalOps > 0 ? Math.round((this.stats.cacheHits / totalOps) * 100) : 0;

    return {
      cache: {
        size: this.cache.size,
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        staleHits: this.stats.staleHits,
        hitRate: `${hitRate}%`,
      },
      requests: {
        total: this.stats.totalRequests,
        deduplicated: this.stats.deduplicated,
        rateLimited: this.stats.rateLimited,
        circuitBroken: this.stats.circuitBroken,
        errors: this.stats.errors,
      },
      providers: providerStats,
      pendingRequests: this.pendingRequests.size,
    };
  }

  // ─── Private Methods ──────────────────────────────────────────────

  private async enforceRateLimit(provider: APIProvider): Promise<void> {
    const config = PROVIDER_CONFIGS[provider];
    const state = this.providerStates.get(provider)!;
    const now = Date.now();

    // Circuit breaker check
    if (state.circuitOpen) {
      if (now - state.circuitOpenedAt > config.circuitBreakerResetMs) {
        // Reset circuit breaker (half-open)
        state.circuitOpen = false;
        state.consecutiveErrors = 0;
        console.log(`[APIGateway] Circuit breaker reset for ${provider}`);
      } else {
        this.stats.circuitBroken++;
        throw new Error(
          `[APIGateway] Circuit breaker open for ${provider}. ` +
          `Retry in ${Math.ceil((config.circuitBreakerResetMs - (now - state.circuitOpenedAt)) / 1000)}s`
        );
      }
    }

    // Clean old timestamps
    state.requestTimestamps = state.requestTimestamps.filter(
      t => now - t < config.windowMs
    );

    // Check window limit
    if (state.requestTimestamps.length >= config.maxRequests) {
      const oldestInWindow = state.requestTimestamps[0];
      const waitTime = config.windowMs - (now - oldestInWindow) + 100; // +100ms buffer
      
      if (waitTime > 0) {
        this.stats.rateLimited++;
        console.log(`[APIGateway] Rate limited ${provider}, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - state.lastRequestTime;
    const backoffMultiplier = state.consecutiveErrors > 0 
      ? Math.min(Math.pow(2, state.consecutiveErrors), 16) 
      : 1;
    const requiredInterval = config.minIntervalMs * backoffMultiplier;

    if (timeSinceLastRequest < requiredInterval) {
      const delay = requiredInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Record this request
    state.lastRequestTime = Date.now();
    state.requestTimestamps.push(Date.now());
  }

  private async executeFetch<T>(
    provider: APIProvider,
    fullKey: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    staleDuration?: number,
  ): Promise<T> {
    const state = this.providerStates.get(provider)!;

    try {
      const data = await fetchFn();

      // Success — reset error counter
      state.consecutiveErrors = 0;

      // Store in cache
      const stale = staleDuration || ttl * STALE_MULTIPLIER;
      this.cache.set(fullKey, {
        data,
        timestamp: Date.now(),
        ttl,
        staleUntil: Date.now() + stale,
        provider,
        key: fullKey,
      });

      return data;
    } catch (error: any) {
      state.consecutiveErrors++;
      this.stats.errors++;

      // Check for rate limit errors
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('rate limit') ||
                          error.message?.includes('Too Many');

      if (isRateLimit) {
        console.warn(`[APIGateway] Rate limit hit for ${provider}! ` +
          `Consecutive errors: ${state.consecutiveErrors}`);
      }

      // Trip circuit breaker if too many errors
      const config = PROVIDER_CONFIGS[provider];
      if (state.consecutiveErrors >= config.circuitBreakerThreshold) {
        state.circuitOpen = true;
        state.circuitOpenedAt = Date.now();
        console.error(
          `[APIGateway] 🔴 Circuit breaker OPEN for ${provider}! ` +
          `${state.consecutiveErrors} consecutive errors. ` +
          `Will retry in ${config.circuitBreakerResetMs / 1000}s`
        );
      }

      // Try to return stale cache on error
      const cached = this.cache.get(fullKey);
      if (cached) {
        console.log(`[APIGateway] Returning stale cache for ${fullKey} after error`);
        return cached.data as T;
      }

      throw error;
    }
  }

  private backgroundRefresh<T>(
    provider: APIProvider,
    fullKey: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    staleDuration?: number,
  ): void {
    // Don't start multiple background refreshes for the same key
    if (this.pendingRequests.has(`bg:${fullKey}`)) return;

    const refreshPromise = (async () => {
      try {
        await this.enforceRateLimit(provider);
        await this.executeFetch(provider, fullKey, fetchFn, ttl, staleDuration);
      } catch (error) {
        // Silently fail — we already returned stale data
        console.warn(`[APIGateway] Background refresh failed for ${fullKey}:`, 
          error instanceof Error ? error.message : 'Unknown error');
      } finally {
        this.pendingRequests.delete(`bg:${fullKey}`);
      }
    })();

    this.pendingRequests.set(`bg:${fullKey}`, { 
      promise: refreshPromise, 
      timestamp: Date.now() 
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Remove entries that are past their stale-acceptable window
      if (now > entry.staleUntil) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Also clean old pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > 60000) { // 1 minute timeout
        this.pendingRequests.delete(key);
      }
    }

    if (cleaned > 0) {
      console.log(`[APIGateway] Cleaned ${cleaned} expired cache entries. ` +
        `Cache size: ${this.cache.size}`);
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────

// Use globalThis to persist across hot reloads in Next.js dev mode
const globalForGateway = globalThis as unknown as {
  __externalAPIGateway: ExternalAPIGateway | undefined;
};

export const apiGateway = globalForGateway.__externalAPIGateway ?? new ExternalAPIGateway();

if (process.env.NODE_ENV !== 'production') {
  globalForGateway.__externalAPIGateway = apiGateway;
}

export default apiGateway;
