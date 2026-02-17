/**
 * OmniFolio Proprietary Insider Sentiment Service
 * 
 * Computes insider confidence scores entirely from SEC EDGAR Form 4 filings.
 * NO third-party sentiment APIs — 100% proprietary, 100% legal.
 * 
 * Data Source: SEC EDGAR (public, free, no API key needed)
 * Rate Strategy: 4 req/sec to SEC (well under 10/sec limit)
 * Cache Strategy: Supabase DB with smart TTL (market-hours aware)
 * 
 * Scoring Algorithm: OmniFolio Insider Confidence (OIC) Score
 * ─────────────────────────────────────────────────────────────
 * The OIC score is a weighted composite of:
 *   1. Net Purchase Ratio (NPR): buys vs sells by count
 *   2. Value Weighted Signal (VWS): dollar-weighted buy/sell ratio
 *   3. Insider Role Weight (IRW): officers/directors weighted more than 10% owners
 *   4. Cluster Signal (CS): multiple insiders acting together amplifies score
 *   5. Consistency Bonus (CB): sustained direction over multiple months
 * 
 * OIC = clamp( NPR*0.25 + VWS*0.30 + IRW*0.20 + CS*0.15 + CB*0.10, -100, 100 )
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  SECEdgarAPI, 
  createSECEdgarClient, 
  Form4Filing, 
  Form4Transaction 
} from './api/sec-edgar-api';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

export interface InsiderSentimentMonth {
  symbol: string;
  year: number;
  month: number;
  oicScore: number;
  sentimentLabel: string;
  totalBuys: number;
  totalSells: number;
  totalBuyShares: number;
  totalSellShares: number;
  totalBuyValue: number;
  totalSellValue: number;
  netShares: number;
  netValue: number;
  officerBuys: number;
  officerSells: number;
  directorBuys: number;
  directorSells: number;
  tenPctOwnerBuys: number;
  tenPctOwnerSells: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  clusterBuyFlag: boolean;
  clusterSellFlag: boolean;
  filingCount: number;
  latestFilingDate: string | null;
}

export interface InsiderSentimentTransaction {
  symbol: string;
  accessionNumber: string;
  filingDate: string;
  ownerName: string;
  ownerCik: string;
  isOfficer: boolean;
  isDirector: boolean;
  isTenPctOwner: boolean;
  officerTitle: string | null;
  transactionDate: string;
  transactionCode: string;
  securityTitle: string;
  shares: number;
  pricePerShare: number | null;
  totalValue: number;
  sharesOwnedAfter: number;
  isAcquisition: boolean;
  directOrIndirect: string;
  transactionType: 'buy' | 'sell' | 'other';
}

export interface InsiderSentimentResult {
  symbol: string;
  companyName: string | null;
  cik: string | null;
  months: InsiderSentimentMonth[];
  transactions: InsiderSentimentTransaction[];
  currentScore: number;
  currentLabel: string;
  trend: 'improving' | 'declining' | 'stable';
  source: 'cache' | 'fresh';
  cachedAt: string | null;
  expiresAt: string | null;
}

export interface CacheCheckResult {
  isFresh: boolean;
  isStale: boolean; // Fresh enough to serve, but should refresh in background
  isExpired: boolean;
  lastRefresh: Date | null;
  ttlSeconds: number;
}

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════

// TTL Configuration (in seconds) — used as FALLBACK only when DB is unreachable
const TTL_FALLBACK = {
  MARKET_HOURS_HIGH_ACTIVITY: 2 * 60 * 60,    // 2 hours
  MARKET_HOURS_NORMAL: 6 * 60 * 60,           // 6 hours
  OFF_HOURS: 24 * 60 * 60,                    // 24 hours
  WEEKEND: 48 * 60 * 60,                      // 48 hours
  MAX_TTL: 72 * 60 * 60,                      // 72 hours absolute max
};

// Stale-while-revalidate threshold
const STALE_THRESHOLD = 0.75; // Serve stale at 75% of TTL

// Global SEC rate tracking across all symbols
const GLOBAL_SEC_RATE = {
  requestTimestamps: [] as number[],
  MAX_REQUESTS_PER_SECOND: 4,
  WINDOW_MS: 1000,
  // Track concurrent refreshes to prevent stampede
  activeRefreshCount: 0,
  MAX_CONCURRENT_REFRESHES: 2,
};

// Filing activity data shape from DB RPC
interface FilingActivity {
  filings_7d: number;
  filings_30d: number;
  filings_90d: number;
  latest_filing_date: string | null;
  latest_filing_age_hours: number | null;
  unique_insiders_30d: number;
  has_cluster_activity: boolean;
  recommended_ttl: number;
}

// Last refresh metadata from DB RPC
interface LastRefreshInfo {
  last_refresh_at: string;
  filings_parsed: number;
  ttl_seconds: number;
  age_seconds: number;
  is_fresh: boolean;
  smart_ttl: number;
}

// Transaction code classification
const BUY_CODES = new Set(['P', 'L']);  // Open market purchase, small acquisition
const SELL_CODES = new Set(['S', 'D', 'F']); // Sale, disposition, tax withholding
const EXERCISE_CODES = new Set(['M', 'X', 'C']); // Option exercise, conversion

// Role weights for OIC calculation
const ROLE_WEIGHTS = {
  CEO: 3.0,
  CFO: 2.5,
  COO: 2.5,
  CTO: 2.0,
  OFFICER: 2.0,
  DIRECTOR: 1.5,
  TEN_PCT_OWNER: 1.0,
  OTHER: 0.5,
};

// ══════════════════════════════════════════════════════════════════
// INSIDER SENTIMENT SERVICE
// ══════════════════════════════════════════════════════════════════

class InsiderSentimentService {
  private _supabase: SupabaseClient | null = null;
  private _supabaseAdmin: SupabaseClient | null = null;
  private _secApi: SECEdgarAPI | null = null;

  // In-memory request deduplication
  private _activeRequests = new Map<string, Promise<InsiderSentimentResult>>();

  // ── Lazy Initialization ────────────────────────────────────────

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Supabase environment variables not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
      }
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  private get supabaseAdmin(): SupabaseClient | null {
    if (typeof window !== 'undefined') return null;
    if (!this._supabaseAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) {
        this._supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      }
    }
    return this._supabaseAdmin;
  }

  private get secApi(): SECEdgarAPI {
    if (!this._secApi) {
      this._secApi = createSECEdgarClient();
    }
    return this._secApi;
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════

  /**
   * Get insider sentiment for a symbol.
   * Implements stale-while-revalidate caching pattern:
   * 1. If cache is fresh → return immediately
   * 2. If cache is stale → return stale + trigger background refresh
   * 3. If cache is expired/empty → fetch fresh data
   */
  async getInsiderSentiment(
    symbol: string,
    options: { 
      months?: number; 
      forceRefresh?: boolean;
      includeTransactions?: boolean;
    } = {}
  ): Promise<InsiderSentimentResult> {
    const { months = 24, forceRefresh = false, includeTransactions = true } = options;
    const upperSymbol = symbol.toUpperCase();

    // Deduplicate concurrent requests for the same symbol
    const activeKey = `${upperSymbol}:${months}`;
    if (this._activeRequests.has(activeKey)) {
      return this._activeRequests.get(activeKey)!;
    }

    const promise = this._getInsiderSentimentInternal(upperSymbol, months, forceRefresh, includeTransactions);
    this._activeRequests.set(activeKey, promise);

    try {
      return await promise;
    } finally {
      this._activeRequests.delete(activeKey);
    }
  }

  /**
   * Get cached monthly data from DB (for bulk/list views)
   */
  async getCachedMonthlyData(
    symbol: string,
    limit: number = 24
  ): Promise<InsiderSentimentMonth[]> {
    const { data, error } = await this.supabase
      .from('insider_sentiment_cache')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[InsiderSentiment] Cache read error:', error);
      return [];
    }

    return (data || []).map(this.mapDbRowToMonth);
  }

  /**
   * Get cached transactions from DB
   */
  async getCachedTransactions(
    symbol: string,
    options: { limit?: number; daysAgo?: number } = {}
  ): Promise<InsiderSentimentTransaction[]> {
    let query = this.supabase
      .from('insider_sentiment_transactions')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('filing_date', { ascending: false });

    if (options.daysAgo) {
      const since = new Date();
      since.setDate(since.getDate() - options.daysAgo);
      query = query.gte('filing_date', since.toISOString().split('T')[0]);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[InsiderSentiment] Transaction cache read error:', error);
      return [];
    }

    return (data || []).map(this.mapDbRowToTransaction);
  }

  // ══════════════════════════════════════════════════════════════
  // INTERNAL: Main Orchestration
  // ══════════════════════════════════════════════════════════════

  private async _getInsiderSentimentInternal(
    symbol: string,
    months: number,
    forceRefresh: boolean,
    includeTransactions: boolean
  ): Promise<InsiderSentimentResult> {
    // Step 1: Check cache freshness
    if (!forceRefresh) {
      const cacheCheck = await this.checkCacheFreshness(symbol);

      if (cacheCheck.isFresh) {
        console.log(`[InsiderSentiment] ✅ Serving fresh cache for ${symbol}`);
        return this.buildResultFromCache(symbol, months, includeTransactions, 'cache');
      }

      if (cacheCheck.isStale) {
        console.log(`[InsiderSentiment] ⚡ Serving stale cache for ${symbol}, refreshing in background`);
        // Fire and forget background refresh
        this.refreshInBackground(symbol, months).catch(err => 
          console.error(`[InsiderSentiment] Background refresh failed for ${symbol}:`, err)
        );
        return this.buildResultFromCache(symbol, months, includeTransactions, 'cache');
      }
    }

    // Step 2: Fetch fresh data from SEC EDGAR
    console.log(`[InsiderSentiment] 🔄 Fetching fresh data for ${symbol}`);
    return this.fetchAndCacheInsiderData(symbol, months, includeTransactions);
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT — DATA-DRIVEN SMART TTL
  // ══════════════════════════════════════════════════════════════

  /**
   * Check cache freshness using the DB-side smart TTL function.
   * This queries EXISTING DATA in the database (filing count, recency,
   * activity patterns) to determine TTL — not just time-of-day.
   */
  async checkCacheFreshness(symbol: string): Promise<CacheCheckResult> {
    try {
      // Prefer the DB RPC function which considers filing activity data
      const { data, error } = await this.supabase
        .rpc('get_insider_last_refresh_date', { p_symbol: symbol });

      if (!error && data && data.length > 0) {
        const info: LastRefreshInfo = data[0];
        const ttlSeconds = info.smart_ttl; // This comes from get_insider_cache_ttl() in DB
        const ageSeconds = info.age_seconds;
        const staleThreshold = ttlSeconds * STALE_THRESHOLD;

        console.log(
          `[InsiderSentiment] 📊 Smart TTL for ${symbol}: ${ttlSeconds}s ` +
          `(age: ${Math.round(ageSeconds)}s, stale at: ${Math.round(staleThreshold)}s, ` +
          `filings parsed: ${info.filings_parsed})`
        );

        return {
          isFresh: ageSeconds < staleThreshold,
          isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
          isExpired: ageSeconds >= ttlSeconds,
          lastRefresh: new Date(info.last_refresh_at),
          ttlSeconds,
        };
      }
    } catch (rpcError) {
      console.warn('[InsiderSentiment] RPC fallback — using query-based freshness check');
    }

    // Fallback: query refresh log directly + use filing activity for TTL
    const { data: refreshData, error: refreshError } = await this.supabase
      .from('insider_sentiment_refresh_log')
      .select('completed_at, ttl_seconds, status, filings_parsed')
      .eq('symbol', symbol)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1);

    if (refreshError || !refreshData || refreshData.length === 0) {
      return { isFresh: false, isStale: false, isExpired: true, lastRefresh: null, ttlSeconds: 0 };
    }

    const lastRefresh = new Date(refreshData[0].completed_at);
    const ageSeconds = (Date.now() - lastRefresh.getTime()) / 1000;

    // Get data-driven TTL from filing activity
    const ttlSeconds = await this.getSmartTTLFromDB(symbol);
    const staleThreshold = ttlSeconds * STALE_THRESHOLD;

    return {
      isFresh: ageSeconds < staleThreshold,
      isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
      isExpired: ageSeconds >= ttlSeconds,
      lastRefresh,
      ttlSeconds,
    };
  }

  /**
   * Data-driven TTL: queries the DB for filing activity to determine
   * how frequently this symbol needs refreshing.
   * 
   * HIGH ACTIVITY (5+ filings/week) → 2h TTL (data changes fast)
   * MODERATE (1-4 filings/week) → 6h TTL
   * LOW (some in 30 days) → 12h TTL
   * DORMANT (nothing recent) → 24h TTL (save API calls)
   * 
   * Adjusted by: market hours, weekends, latest filing recency
   */
  async getSmartTTLFromDB(symbol: string): Promise<number> {
    try {
      // Try the DB RPC function first (single DB call, does all the logic server-side)
      const { data, error } = await this.supabase
        .rpc('get_insider_cache_ttl', { p_symbol: symbol });

      if (!error && data !== null && data !== undefined) {
        const ttl = typeof data === 'number' ? data : parseInt(data);
        if (!isNaN(ttl) && ttl > 0) {
          return Math.min(ttl, TTL_FALLBACK.MAX_TTL);
        }
      }
    } catch {
      // RPC not available — fall through to query-based approach
    }

    // Fallback: query filing activity directly and compute TTL in TypeScript
    return this.computeTTLFromFilingActivity(symbol);
  }

  /**
   * Fallback TTL computation when RPC is unavailable.
   * Queries existing transaction data from DB to make the same decisions
   * the SQL function would make.
   */
  private async computeTTLFromFilingActivity(symbol: string): Promise<number> {
    try {
      // Count filings in different time windows
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Single query to get filing counts and latest filing date
      const { data: txData } = await this.supabase
        .from('insider_sentiment_transactions')
        .select('filing_date')
        .eq('symbol', symbol)
        .gte('filing_date', thirtyDaysAgo)
        .order('filing_date', { ascending: false });

      const filings = txData || [];
      const filings7d = filings.filter(f => f.filing_date >= sevenDaysAgo).length;
      const filings30d = filings.length;
      const latestFilingDate = filings[0]?.filing_date || null;

      // Calculate latest filing age in hours
      let latestFilingAgeHours = Infinity;
      if (latestFilingDate) {
        latestFilingAgeHours = (now.getTime() - new Date(latestFilingDate).getTime()) / (1000 * 60 * 60);
      }

      // Base TTL from filing activity
      let baseTTL: number;
      if (filings7d >= 5) {
        baseTTL = 7200;   // 2 hours — very active (earnings window?)
      } else if (filings7d >= 3) {
        baseTTL = 10800;  // 3 hours
      } else if (filings7d >= 1) {
        baseTTL = 21600;  // 6 hours
      } else if (filings30d >= 3) {
        baseTTL = 43200;  // 12 hours
      } else {
        baseTTL = 86400;  // 24 hours — dormant
      }

      // Latest filing recency bonus: if < 24h old, halve TTL
      if (latestFilingAgeHours < 24) {
        baseTTL = Math.max(Math.floor(baseTTL / 2), 3600); // Min 1 hour
      }

      // Market hours adjustment
      const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = etNow.getDay();
      const hours = etNow.getHours();
      const minutes = etNow.getMinutes();
      const timeInMinutes = hours * 60 + minutes;

      if (day === 0 || day === 6) {
        baseTTL *= 3; // Triple on weekends
      } else if (timeInMinutes < 570 || timeInMinutes > 960) { // Before 9:30 or after 16:00
        baseTTL *= 2; // Double off-hours
      }

      return Math.min(baseTTL, TTL_FALLBACK.MAX_TTL);
    } catch {
      // Complete fallback: time-only TTL
      return this.calculateFallbackTTL();
    }
  }

  /**
   * Last-resort TTL: time-of-day only. Used ONLY when DB is unreachable.
   */
  calculateSmartTTL(): number {
    // Public method kept for API route compatibility, but now it tries DB first
    // The API route calls this for cache headers — we return a reasonable default
    return this.calculateFallbackTTL();
  }

  private calculateFallbackTTL(): number {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();
    const hours = etNow.getHours();
    const minutes = etNow.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    if (day === 0 || day === 6) return TTL_FALLBACK.WEEKEND;
    if (timeInMinutes >= 570 && timeInMinutes <= 960) return TTL_FALLBACK.MARKET_HOURS_NORMAL;
    return TTL_FALLBACK.OFF_HOURS;
  }

  // ── Global SEC Rate Tracking ─────────────────────────────────
  // Prevents multiple concurrent symbol refreshes from exceeding SEC rate limits

  private async waitForGlobalRateSlot(): Promise<void> {
    const now = Date.now();
    // Clean old timestamps
    GLOBAL_SEC_RATE.requestTimestamps = GLOBAL_SEC_RATE.requestTimestamps.filter(
      ts => now - ts < GLOBAL_SEC_RATE.WINDOW_MS
    );

    // If at capacity, wait
    while (GLOBAL_SEC_RATE.requestTimestamps.length >= GLOBAL_SEC_RATE.MAX_REQUESTS_PER_SECOND) {
      const oldestInWindow = GLOBAL_SEC_RATE.requestTimestamps[0];
      const waitMs = GLOBAL_SEC_RATE.WINDOW_MS - (Date.now() - oldestInWindow) + 50;
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      const currentTime = Date.now();
      GLOBAL_SEC_RATE.requestTimestamps = GLOBAL_SEC_RATE.requestTimestamps.filter(
        ts => currentTime - ts < GLOBAL_SEC_RATE.WINDOW_MS
      );
    }

    GLOBAL_SEC_RATE.requestTimestamps.push(Date.now());
  }

  private async acquireRefreshSlot(): Promise<boolean> {
    if (GLOBAL_SEC_RATE.activeRefreshCount >= GLOBAL_SEC_RATE.MAX_CONCURRENT_REFRESHES) {
      console.warn('[InsiderSentiment] ⏳ Max concurrent refreshes reached, queuing...');
      // Wait up to 30 seconds for a slot
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (GLOBAL_SEC_RATE.activeRefreshCount < GLOBAL_SEC_RATE.MAX_CONCURRENT_REFRESHES) {
          break;
        }
      }
      if (GLOBAL_SEC_RATE.activeRefreshCount >= GLOBAL_SEC_RATE.MAX_CONCURRENT_REFRESHES) {
        return false;
      }
    }
    GLOBAL_SEC_RATE.activeRefreshCount++;
    return true;
  }

  private releaseRefreshSlot(): void {
    GLOBAL_SEC_RATE.activeRefreshCount = Math.max(0, GLOBAL_SEC_RATE.activeRefreshCount - 1);
  }

  // ══════════════════════════════════════════════════════════════
  // SEC EDGAR DATA FETCHING
  // ══════════════════════════════════════════════════════════════

  private async fetchAndCacheInsiderData(
    symbol: string,
    months: number,
    includeTransactions: boolean
  ): Promise<InsiderSentimentResult> {
    const admin = this.supabaseAdmin;
    if (!admin) {
      throw new Error('Admin client required for data refresh');
    }

    // Acquire a global refresh slot (prevents SEC rate stampede)
    const gotSlot = await this.acquireRefreshSlot();
    if (!gotSlot) {
      console.warn(`[InsiderSentiment] ⚠️ Could not acquire refresh slot for ${symbol}, serving stale cache`);
      try {
        return await this.buildResultFromCache(symbol, months, includeTransactions, 'cache');
      } catch {
        throw new Error('SEC rate limit protection: too many concurrent refreshes');
      }
    }

    // Record refresh start
    const refreshId = await this.logRefreshStart(symbol);

    try {
      // Step 1: Get CIK for the ticker (with company name search fallback)
      await this.waitForGlobalRateSlot();
      let company = await this.secApi.getCIKByTicker(symbol);
      if (!company) {
        // Fallback: user may have typed a company name instead of ticker
        // (e.g. "NVIDIA" instead of "NVDA")
        const searchResults = await this.secApi.searchCompanies(symbol, 1);
        if (searchResults.length > 0) {
          company = searchResults[0];
          console.log(
            `[InsiderSentiment] 🔍 "${symbol}" resolved to ticker "${company.ticker}" ` +
            `(${company.name}) via company name search`
          );
        }
      }
      if (!company) {
        throw new Error(
          `Company not found for "${symbol}". Try using the ticker symbol (e.g. NVDA, AAPL, MSFT).`
        );
      }

      // Step 2: Determine if we can do an INCREMENTAL refresh
      const lastRefreshDate = await this.getLastSuccessfulRefreshDate(symbol);
      let fetchDays: number;
      let refreshType: 'full' | 'incremental';

      if (lastRefreshDate) {
        // Calculate days since last refresh
        const daysSinceRefresh = Math.ceil(
          (Date.now() - lastRefreshDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRefresh <= 7) {
          // Incremental: only fetch filings newer than last refresh + 1 day buffer
          fetchDays = daysSinceRefresh + 1;
          refreshType = 'incremental';
          console.log(
            `[InsiderSentiment] 📈 INCREMENTAL refresh for ${symbol}: ` +
            `only fetching last ${fetchDays} days (last refresh: ${daysSinceRefresh} days ago)`
          );
        } else if (daysSinceRefresh <= 30) {
          // Partial: fetch last 30 days + buffer
          fetchDays = Math.min(daysSinceRefresh + 7, 60);
          refreshType = 'incremental';
          console.log(
            `[InsiderSentiment] 📊 PARTIAL refresh for ${symbol}: ` +
            `fetching last ${fetchDays} days`
          );
        } else {
          // Full: cache is too old
          fetchDays = months * 31;
          refreshType = 'full';
          console.log(
            `[InsiderSentiment] 🔄 FULL refresh for ${symbol}: ` +
            `cache is ${daysSinceRefresh} days old`
          );
        }
      } else {
        // No previous cache — full fetch
        fetchDays = months * 31;
        refreshType = 'full';
        console.log(`[InsiderSentiment] 🆕 INITIAL fetch for ${symbol}: ${fetchDays} days`);
      }

      // Step 3: Fetch Form 4 filings from SEC EDGAR (respecting global rate limit)
      await this.waitForGlobalRateSlot();
      const form4Filings = await this.secApi.getInsiderTransactions(company.cik, fetchDays);

      // Step 4: Transform filings into our transaction format
      const newTransactions = this.transformForm4Filings(symbol, form4Filings);

      // Step 5: Persist new transactions (upsert handles dedup)
      await this.persistTransactions(admin, symbol, newTransactions);

      // Step 6: For monthly aggregation, we need ALL transactions (old + new)
      // Pull from DB to include previously cached data for complete OIC scoring
      const allTransactions = await this.getAllCachedTransactions(symbol, months);

      // Step 7: Aggregate into monthly data and compute OIC scores
      const monthlyData = this.aggregateMonthly(symbol, company.cik, company.name, allTransactions, months);

      // Step 8: Persist monthly aggregations
      await this.persistMonthlyData(admin, symbol, monthlyData);

      // Step 9: Get data-driven TTL AFTER persisting (so DB function sees new filings)
      const ttl = await this.getSmartTTLFromDB(symbol);

      // Step 10: Record refresh completion with actual TTL
      await this.logRefreshComplete(refreshId, symbol, form4Filings.length, ttl, refreshType);

      // Step 11: Build result
      const sortedMonths = [...monthlyData].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      const currentScore = sortedMonths[0]?.oicScore ?? 0;
      const currentLabel = sortedMonths[0]?.sentimentLabel ?? 'Neutral';

      return {
        symbol,
        companyName: company.name,
        cik: company.cik,
        months: sortedMonths.slice(0, months),
        transactions: includeTransactions ? newTransactions.slice(0, 100) : [],
        currentScore,
        currentLabel,
        trend: this.calculateTrend(sortedMonths),
        source: 'fresh',
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      };
    } catch (error: any) {
      await this.logRefreshFailed(refreshId, symbol, error.message);
      
      // Try to serve stale cache on error
      try {
        const cachedResult = await this.buildResultFromCache(symbol, months, includeTransactions, 'cache');
        if (cachedResult.months.length > 0) {
          console.warn(`[InsiderSentiment] Serving stale cache for ${symbol} after error: ${error.message}`);
          return cachedResult;
        }
      } catch {
        // Can't serve cache either
      }

      throw error;
    } finally {
      this.releaseRefreshSlot();
    }
  }

  /**
   * Get the last successful refresh date for a symbol.
   * Used to determine if we can do an incremental refresh.
   */
  private async getLastSuccessfulRefreshDate(symbol: string): Promise<Date | null> {
    try {
      const { data } = await this.supabase
        .from('insider_sentiment_refresh_log')
        .select('completed_at')
        .eq('symbol', symbol)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].completed_at) {
        return new Date(data[0].completed_at);
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /**
   * Pull ALL cached transactions for a symbol from DB.
   * Used for re-aggregation after incremental refresh so OIC scores
   * are computed from the full dataset, not just new filings.
   */
  private async getAllCachedTransactions(
    symbol: string,
    months: number
  ): Promise<InsiderSentimentTransaction[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const { data, error } = await this.supabase
      .from('insider_sentiment_transactions')
      .select('*')
      .eq('symbol', symbol)
      .gte('filing_date', cutoffDate.toISOString().split('T')[0])
      .order('filing_date', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapDbRowToTransaction);
  }

  // ══════════════════════════════════════════════════════════════
  // DATA TRANSFORMATION
  // ══════════════════════════════════════════════════════════════

  private transformForm4Filings(
    symbol: string,
    filings: Form4Filing[]
  ): InsiderSentimentTransaction[] {
    const transactions: InsiderSentimentTransaction[] = [];

    for (const filing of filings) {
      for (const tx of filing.transactions) {
        const txType = this.classifyTransaction(tx.transactionCode, tx.isAcquisition);
        const totalValue = (tx.sharesAmount || 0) * (tx.pricePerShare || 0);

        transactions.push({
          symbol,
          accessionNumber: filing.accessionNumber,
          filingDate: filing.filingDate,
          ownerName: filing.reportingOwner.name,
          ownerCik: filing.reportingOwner.cik,
          isOfficer: filing.reportingOwner.isOfficer,
          isDirector: filing.reportingOwner.isDirector,
          isTenPctOwner: filing.reportingOwner.isTenPercentOwner,
          officerTitle: filing.reportingOwner.officerTitle || null,
          transactionDate: tx.transactionDate || filing.filingDate,
          transactionCode: tx.transactionCode,
          securityTitle: tx.securityTitle,
          shares: tx.sharesAmount,
          pricePerShare: tx.pricePerShare || null,
          totalValue,
          sharesOwnedAfter: tx.sharesOwnedAfter,
          isAcquisition: tx.isAcquisition,
          directOrIndirect: tx.directOrIndirect,
          transactionType: txType,
        });
      }
    }

    return transactions;
  }

  private classifyTransaction(code: string, isAcquisition: boolean): 'buy' | 'sell' | 'other' {
    if (BUY_CODES.has(code)) return 'buy';
    if (SELL_CODES.has(code)) return 'sell';
    // Exercise codes: classify by acquisition/disposition
    if (EXERCISE_CODES.has(code)) return isAcquisition ? 'buy' : 'sell';
    // Generic fallback
    return isAcquisition ? 'buy' : 'other';
  }

  // ══════════════════════════════════════════════════════════════
  // PROPRIETARY OIC SCORING ALGORITHM
  // ══════════════════════════════════════════════════════════════

  private aggregateMonthly(
    symbol: string,
    cik: string,
    companyName: string,
    transactions: InsiderSentimentTransaction[],
    months: number
  ): InsiderSentimentMonth[] {
    // Group transactions by year-month
    const buckets = new Map<string, InsiderSentimentTransaction[]>();
    
    for (const tx of transactions) {
      const date = new Date(tx.transactionDate || tx.filingDate);
      if (isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(tx);
    }

    // Generate month entries even for months with no transactions
    const results: InsiderSentimentMonth[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      const monthTxs = buckets.get(key) || [];

      const monthData = this.computeMonthMetrics(symbol, cik, companyName, year, month, monthTxs);
      results.push(monthData);
    }

    // Compute consistency bonus (requires multi-month context)
    this.applyConsistencyBonus(results);

    return results;
  }

  private computeMonthMetrics(
    symbol: string,
    cik: string,
    companyName: string,
    year: number,
    month: number,
    transactions: InsiderSentimentTransaction[]
  ): InsiderSentimentMonth {
    const buys = transactions.filter(t => t.transactionType === 'buy');
    const sells = transactions.filter(t => t.transactionType === 'sell');

    const totalBuyShares = buys.reduce((s, t) => s + t.shares, 0);
    const totalSellShares = sells.reduce((s, t) => s + t.shares, 0);
    const totalBuyValue = buys.reduce((s, t) => s + t.totalValue, 0);
    const totalSellValue = sells.reduce((s, t) => s + t.totalValue, 0);

    const officerBuys = buys.filter(t => t.isOfficer).length;
    const officerSells = sells.filter(t => t.isOfficer).length;
    const directorBuys = buys.filter(t => t.isDirector).length;
    const directorSells = sells.filter(t => t.isDirector).length;
    const tenPctBuys = buys.filter(t => t.isTenPctOwner).length;
    const tenPctSells = sells.filter(t => t.isTenPctOwner).length;

    const uniqueBuyers = new Set(buys.map(t => t.ownerCik || t.ownerName)).size;
    const uniqueSellers = new Set(sells.map(t => t.ownerCik || t.ownerName)).size;

    const clusterBuyFlag = uniqueBuyers >= 3;
    const clusterSellFlag = uniqueSellers >= 3;

    const latestFiling = transactions.length > 0
      ? transactions.reduce((latest, t) => t.filingDate > latest ? t.filingDate : latest, transactions[0].filingDate)
      : null;

    // ── Compute OIC Score ──────────────────────────────────────
    const oicScore = this.computeOICScore({
      buys: buys.length,
      sells: sells.length,
      buyValue: totalBuyValue,
      sellValue: totalSellValue,
      officerBuys,
      officerSells,
      directorBuys,
      directorSells,
      tenPctBuys,
      tenPctSells,
      uniqueBuyers,
      uniqueSellers,
      clusterBuyFlag,
      clusterSellFlag,
      transactions,
    });

    const sentimentLabel = this.scoreToLabel(oicScore);

    return {
      symbol,
      year,
      month,
      oicScore,
      sentimentLabel,
      totalBuys: buys.length,
      totalSells: sells.length,
      totalBuyShares,
      totalSellShares,
      totalBuyValue,
      totalSellValue,
      netShares: totalBuyShares - totalSellShares,
      netValue: totalBuyValue - totalSellValue,
      officerBuys,
      officerSells,
      directorBuys,
      directorSells,
      tenPctOwnerBuys: tenPctBuys,
      tenPctOwnerSells: tenPctSells,
      uniqueBuyers,
      uniqueSellers,
      clusterBuyFlag,
      clusterSellFlag,
      filingCount: transactions.length,
      latestFilingDate: latestFiling,
    };
  }

  /**
   * OmniFolio Insider Confidence (OIC) Score
   * 
   * Components:
   *   NPR (25%): Net Purchase Ratio = (buys - sells) / (buys + sells) * 100
   *   VWS (30%): Value Weighted Signal = (buyValue - sellValue) / (buyValue + sellValue) * 100
   *   IRW (20%): Insider Role Weight = role-weighted buy/sell ratio
   *   CS  (15%): Cluster Signal = bonus for 3+ insiders acting together
   *   CB  (10%): Consistency Bonus (applied in post-processing)
   */
  private computeOICScore(data: {
    buys: number;
    sells: number;
    buyValue: number;
    sellValue: number;
    officerBuys: number;
    officerSells: number;
    directorBuys: number;
    directorSells: number;
    tenPctBuys: number;
    tenPctSells: number;
    uniqueBuyers: number;
    uniqueSellers: number;
    clusterBuyFlag: boolean;
    clusterSellFlag: boolean;
    transactions: InsiderSentimentTransaction[];
  }): number {
    const totalTx = data.buys + data.sells;
    if (totalTx === 0) return 0;

    // ── NPR: Net Purchase Ratio (25%) ────────────────────────
    const npr = ((data.buys - data.sells) / totalTx) * 100;

    // ── VWS: Value Weighted Signal (30%) ─────────────────────
    const totalValue = data.buyValue + data.sellValue;
    const vws = totalValue > 0
      ? ((data.buyValue - data.sellValue) / totalValue) * 100
      : 0;

    // ── IRW: Insider Role Weight (20%) ───────────────────────
    let weightedBuyScore = 0;
    let weightedSellScore = 0;

    for (const tx of data.transactions) {
      const weight = this.getInsiderWeight(tx);
      if (tx.transactionType === 'buy') {
        weightedBuyScore += weight;
      } else if (tx.transactionType === 'sell') {
        weightedSellScore += weight;
      }
    }

    const totalWeighted = weightedBuyScore + weightedSellScore;
    const irw = totalWeighted > 0
      ? ((weightedBuyScore - weightedSellScore) / totalWeighted) * 100
      : 0;

    // ── CS: Cluster Signal (15%) ─────────────────────────────
    let cs = 0;
    if (data.clusterBuyFlag && !data.clusterSellFlag) {
      cs = Math.min(data.uniqueBuyers * 15, 100); // Cap at 100
    } else if (data.clusterSellFlag && !data.clusterBuyFlag) {
      cs = -Math.min(data.uniqueSellers * 15, 100);
    } else if (data.clusterBuyFlag && data.clusterSellFlag) {
      cs = ((data.uniqueBuyers - data.uniqueSellers) / (data.uniqueBuyers + data.uniqueSellers)) * 50;
    }

    // ── Composite Score ──────────────────────────────────────
    const oic = (npr * 0.25) + (vws * 0.30) + (irw * 0.20) + (cs * 0.15);
    // CB (10%) is applied in applyConsistencyBonus()

    return Math.max(-100, Math.min(100, Math.round(oic * 100) / 100));
  }

  private getInsiderWeight(tx: InsiderSentimentTransaction): number {
    if (tx.isOfficer && tx.officerTitle) {
      const title = tx.officerTitle.toUpperCase();
      if (title.includes('CEO') || title.includes('CHIEF EXECUTIVE')) return ROLE_WEIGHTS.CEO;
      if (title.includes('CFO') || title.includes('CHIEF FINANCIAL')) return ROLE_WEIGHTS.CFO;
      if (title.includes('COO') || title.includes('CHIEF OPERATING')) return ROLE_WEIGHTS.COO;
      if (title.includes('CTO') || title.includes('CHIEF TECH')) return ROLE_WEIGHTS.CTO;
      return ROLE_WEIGHTS.OFFICER;
    }
    if (tx.isOfficer) return ROLE_WEIGHTS.OFFICER;
    if (tx.isDirector) return ROLE_WEIGHTS.DIRECTOR;
    if (tx.isTenPctOwner) return ROLE_WEIGHTS.TEN_PCT_OWNER;
    return ROLE_WEIGHTS.OTHER;
  }

  /**
   * Apply consistency bonus: sustained buying/selling over consecutive months
   * amplifies the signal by up to ±10 points
   */
  private applyConsistencyBonus(months: InsiderSentimentMonth[]): void {
    // Sort oldest to newest for streak detection
    const sorted = [...months].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    for (let i = 0; i < sorted.length; i++) {
      let consecutiveSameDirection = 0;
      const currentDirection = sorted[i].oicScore > 0 ? 'positive' : sorted[i].oicScore < 0 ? 'negative' : 'neutral';

      if (currentDirection === 'neutral') continue;

      // Look back up to 5 months
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevDirection = sorted[j].oicScore > 0 ? 'positive' : sorted[j].oicScore < 0 ? 'negative' : 'neutral';
        if (prevDirection === currentDirection) {
          consecutiveSameDirection++;
        } else {
          break;
        }
      }

      // Apply bonus: 2 points per consecutive month, max 10
      const bonus = Math.min(consecutiveSameDirection * 2, 10);
      if (currentDirection === 'positive') {
        sorted[i].oicScore = Math.min(100, sorted[i].oicScore + bonus);
      } else {
        sorted[i].oicScore = Math.max(-100, sorted[i].oicScore - bonus);
      }

      // Update label after bonus
      sorted[i].sentimentLabel = this.scoreToLabel(sorted[i].oicScore);
    }

    // Update the original array (sorted by reference won't work, we need to update months in place)
    const scoreMap = new Map<string, { oicScore: number; sentimentLabel: string }>();
    for (const m of sorted) {
      scoreMap.set(`${m.year}-${m.month}`, { oicScore: m.oicScore, sentimentLabel: m.sentimentLabel });
    }
    for (const m of months) {
      const update = scoreMap.get(`${m.year}-${m.month}`);
      if (update) {
        m.oicScore = update.oicScore;
        m.sentimentLabel = update.sentimentLabel;
      }
    }
  }

  private scoreToLabel(score: number): string {
    if (score >= 40) return 'Strong Buy';
    if (score >= 15) return 'Buy';
    if (score > -15) return 'Neutral';
    if (score > -40) return 'Sell';
    return 'Strong Sell';
  }

  private calculateTrend(sortedMonthsDesc: InsiderSentimentMonth[]): 'improving' | 'declining' | 'stable' {
    if (sortedMonthsDesc.length < 3) return 'stable';

    const recent = sortedMonthsDesc.slice(0, 3);
    const avgRecent = recent.reduce((s, m) => s + m.oicScore, 0) / recent.length;

    const older = sortedMonthsDesc.slice(3, 6);
    if (older.length === 0) return 'stable';
    const avgOlder = older.reduce((s, m) => s + m.oicScore, 0) / older.length;

    const diff = avgRecent - avgOlder;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  // ══════════════════════════════════════════════════════════════
  // DATABASE PERSISTENCE
  // ══════════════════════════════════════════════════════════════

  private async persistTransactions(
    admin: SupabaseClient,
    symbol: string,
    transactions: InsiderSentimentTransaction[]
  ): Promise<void> {
    if (transactions.length === 0) return;

    const rows = transactions.map(tx => ({
      symbol: tx.symbol,
      cik: tx.ownerCik || null,
      accession_number: tx.accessionNumber,
      filing_date: tx.filingDate,
      owner_name: tx.ownerName,
      owner_cik: tx.ownerCik || null,
      is_officer: tx.isOfficer,
      is_director: tx.isDirector,
      is_ten_pct_owner: tx.isTenPctOwner,
      officer_title: tx.officerTitle,
      transaction_date: tx.transactionDate || tx.filingDate,
      transaction_code: tx.transactionCode,
      security_title: tx.securityTitle,
      shares: tx.shares,
      price_per_share: tx.pricePerShare,
      total_value: tx.totalValue,
      shares_owned_after: tx.sharesOwnedAfter,
      is_acquisition: tx.isAcquisition,
      direct_or_indirect: tx.directOrIndirect,
      transaction_type: tx.transactionType,
      updated_at: new Date().toISOString(),
    }));

    // Deduplicate
    const seen = new Set<string>();
    const deduped = rows.filter(r => {
      const key = `${r.symbol}|${r.accession_number}|${r.owner_name}|${r.transaction_date}|${r.shares}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Batch upsert in chunks of 100
    for (let i = 0; i < deduped.length; i += 100) {
      const batch = deduped.slice(i, i + 100);
      const { error } = await admin
        .from('insider_sentiment_transactions')
        .upsert(batch, {
          onConflict: 'symbol,accession_number,owner_name,transaction_date,shares',
        });

      if (error) {
        console.error(`[InsiderSentiment] Transaction upsert error (batch ${i}):`, error);
      }
    }
  }

  private async persistMonthlyData(
    admin: SupabaseClient,
    symbol: string,
    months: InsiderSentimentMonth[]
  ): Promise<void> {
    if (months.length === 0) return;

    // Use data-driven TTL (queries DB for filing activity)
    const ttl = await this.getSmartTTLFromDB(symbol);
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const rows = months.map(m => ({
      symbol: m.symbol,
      cik: null as string | null,
      company_name: null as string | null,
      year: m.year,
      month: m.month,
      oic_score: m.oicScore,
      total_buys: m.totalBuys,
      total_sells: m.totalSells,
      total_buy_shares: m.totalBuyShares,
      total_sell_shares: m.totalSellShares,
      total_buy_value: m.totalBuyValue,
      total_sell_value: m.totalSellValue,
      net_shares: m.netShares,
      net_value: m.netValue,
      officer_buys: m.officerBuys,
      officer_sells: m.officerSells,
      director_buys: m.directorBuys,
      director_sells: m.directorSells,
      ten_pct_owner_buys: m.tenPctOwnerBuys,
      ten_pct_owner_sells: m.tenPctOwnerSells,
      unique_buyers: m.uniqueBuyers,
      unique_sellers: m.uniqueSellers,
      cluster_buy_flag: m.clusterBuyFlag,
      cluster_sell_flag: m.clusterSellFlag,
      filing_count: m.filingCount,
      latest_filing_date: m.latestFilingDate,
      sentiment_label: m.sentimentLabel,
      source: 'sec-edgar',
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
    }));

    const { error } = await admin
      .from('insider_sentiment_cache')
      .upsert(rows, {
        onConflict: 'symbol,year,month',
      });

    if (error) {
      console.error('[InsiderSentiment] Monthly upsert error:', error);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE BUILDING
  // ══════════════════════════════════════════════════════════════

  private async buildResultFromCache(
    symbol: string,
    months: number,
    includeTransactions: boolean,
    source: 'cache' | 'fresh'
  ): Promise<InsiderSentimentResult> {
    const monthlyData = await this.getCachedMonthlyData(symbol, months);
    const transactions = includeTransactions
      ? await this.getCachedTransactions(symbol, { limit: 100 })
      : [];

    const sorted = [...monthlyData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    const currentScore = sorted[0]?.oicScore ?? 0;
    const currentLabel = sorted[0]?.sentimentLabel ?? 'Neutral';

    // Get cache metadata
    const { data: refreshData } = await this.supabase
      .from('insider_sentiment_refresh_log')
      .select('completed_at, ttl_seconds')
      .eq('symbol', symbol)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1);

    const cachedAt = refreshData?.[0]?.completed_at || null;
    // Use data-driven TTL from DB
    const ttl = await this.getSmartTTLFromDB(symbol);
    const expiresAt = cachedAt
      ? new Date(new Date(cachedAt).getTime() + ttl * 1000).toISOString()
      : null;

    return {
      symbol,
      companyName: null, // Not stored in monthly cache
      cik: null,
      months: sorted,
      transactions,
      currentScore,
      currentLabel,
      trend: this.calculateTrend(sorted),
      source,
      cachedAt,
      expiresAt,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // BACKGROUND REFRESH
  // ══════════════════════════════════════════════════════════════

  private async refreshInBackground(symbol: string, months: number): Promise<void> {
    try {
      await this.fetchAndCacheInsiderData(symbol, months, false);
      console.log(`[InsiderSentiment] ✅ Background refresh completed for ${symbol}`);
    } catch (error) {
      console.error(`[InsiderSentiment] ❌ Background refresh failed for ${symbol}:`, error);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // REFRESH LOGGING
  // ══════════════════════════════════════════════════════════════

  private async logRefreshStart(symbol: string, refreshType: string = 'full'): Promise<string | null> {
    const admin = this.supabaseAdmin;
    if (!admin) return null;

    const { data, error } = await admin
      .from('insider_sentiment_refresh_log')
      .insert({
        symbol,
        refresh_type: refreshType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[InsiderSentiment] Refresh log start error:', error);
      return null;
    }
    return data?.id || null;
  }

  private async logRefreshComplete(
    id: string | null,
    symbol: string,
    filingsParsed: number,
    ttlSeconds: number,
    refreshType: string = 'full'
  ): Promise<void> {
    const admin = this.supabaseAdmin;
    if (!admin || !id) return;

    await admin
      .from('insider_sentiment_refresh_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        filings_parsed: filingsParsed,
        ttl_seconds: ttlSeconds,
        refresh_type: refreshType,
      })
      .eq('id', id);
  }

  private async logRefreshFailed(
    id: string | null,
    symbol: string,
    errorMessage: string
  ): Promise<void> {
    const admin = this.supabaseAdmin;
    if (!admin || !id) return;

    await admin
      .from('insider_sentiment_refresh_log')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', id);
  }

  // ══════════════════════════════════════════════════════════════
  // ROW MAPPERS
  // ══════════════════════════════════════════════════════════════

  private mapDbRowToMonth(row: any): InsiderSentimentMonth {
    return {
      symbol: row.symbol,
      year: row.year,
      month: row.month,
      oicScore: parseFloat(row.oic_score) || 0,
      sentimentLabel: row.sentiment_label || 'Neutral',
      totalBuys: row.total_buys || 0,
      totalSells: row.total_sells || 0,
      totalBuyShares: parseInt(row.total_buy_shares) || 0,
      totalSellShares: parseInt(row.total_sell_shares) || 0,
      totalBuyValue: parseFloat(row.total_buy_value) || 0,
      totalSellValue: parseFloat(row.total_sell_value) || 0,
      netShares: parseInt(row.net_shares) || 0,
      netValue: parseFloat(row.net_value) || 0,
      officerBuys: row.officer_buys || 0,
      officerSells: row.officer_sells || 0,
      directorBuys: row.director_buys || 0,
      directorSells: row.director_sells || 0,
      tenPctOwnerBuys: row.ten_pct_owner_buys || 0,
      tenPctOwnerSells: row.ten_pct_owner_sells || 0,
      uniqueBuyers: row.unique_buyers || 0,
      uniqueSellers: row.unique_sellers || 0,
      clusterBuyFlag: row.cluster_buy_flag || false,
      clusterSellFlag: row.cluster_sell_flag || false,
      filingCount: row.filing_count || 0,
      latestFilingDate: row.latest_filing_date || null,
    };
  }

  private mapDbRowToTransaction(row: any): InsiderSentimentTransaction {
    return {
      symbol: row.symbol,
      accessionNumber: row.accession_number,
      filingDate: row.filing_date,
      ownerName: row.owner_name,
      ownerCik: row.owner_cik || '',
      isOfficer: row.is_officer || false,
      isDirector: row.is_director || false,
      isTenPctOwner: row.is_ten_pct_owner || false,
      officerTitle: row.officer_title || null,
      transactionDate: row.transaction_date || row.filing_date,
      transactionCode: row.transaction_code || '',
      securityTitle: row.security_title || '',
      shares: parseInt(row.shares) || 0,
      pricePerShare: row.price_per_share ? parseFloat(row.price_per_share) : null,
      totalValue: parseFloat(row.total_value) || 0,
      sharesOwnedAfter: parseInt(row.shares_owned_after) || 0,
      isAcquisition: row.is_acquisition || false,
      directOrIndirect: row.direct_or_indirect || 'D',
      transactionType: row.transaction_type || 'other',
    };
  }
}

// ══════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ══════════════════════════════════════════════════════════════════

export const insiderSentimentService = new InsiderSentimentService();
export default insiderSentimentService;
