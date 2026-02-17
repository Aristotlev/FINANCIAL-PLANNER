/**
 * OmniFolio Proprietary Senate Lobbying Service
 * 
 * Computes lobbying influence scores entirely from public government data.
 * NO third-party APIs — 100% proprietary, 100% legal.
 * 
 * Data Source: US Senate Lobbying Disclosure Act (LDA) Database
 *   URL: https://lda.senate.gov/api/v1/
 *   Auth: None required (public data)
 *   Rate: ~2 req/sec (polite)
 * 
 * Cache Strategy: Supabase DB with smart TTL
 * 
 * Scoring Algorithm: OmniFolio Lobbying Influence (OLI) Score
 * ─────────────────────────────────────────────────────────────
 * The OLI score measures a company's lobbying intensity and breadth:
 *   1. Spend Magnitude (SM):  Total $ spent relative to peers (log-scaled)
 *   2. Issue Breadth (IB):    Number of distinct issue areas lobbied
 *   3. Government Reach (GR): Number of gov entities contacted
 *   4. Lobbyist Count (LC):   Unique lobbyists deployed
 *   5. Consistency (CO):      Sustained lobbying over multiple quarters
 *   6. Trend (TR):            Spending direction (increasing/decreasing)
 * 
 * OLI = clamp( SM*0.30 + IB*0.15 + GR*0.15 + LC*0.10 + CO*0.15 + TR*0.15, 0, 100 )
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SenateLobbyingAPI,
  createSenateLobbyingClient,
  LobbyingFiling,
  ISSUE_AREA_CODES,
} from './api/senate-lobbying-api';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

export interface LobbyingQuarter {
  symbol: string;
  year: number;
  quarter: string; // Q1, Q2, Q3, Q4, H1, H2
  oliScore: number;
  influenceLabel: string;
  totalSpend: number;
  filingCount: number;
  uniqueLobbyists: number;
  uniqueIssues: number;
  uniqueGovEntities: number;
  topIssues: { code: string; name: string; count: number }[];
  topRegistrants: { name: string; amount: number }[];
  latestFilingDate: string | null;
}

export interface LobbyingActivity {
  symbol: string;
  filingUuid: string;
  filingDate: string;
  filingYear: number;
  filingPeriod: string;
  filingType: string;
  clientName: string;
  clientDescription: string | null;
  registrantName: string;
  amount: number | null;
  expenses: number | null;
  income: number | null;
  lobbyistNames: string[];
  issueAreas: string[];
  issueDescriptions: string[];
  governmentEntities: string[];
  specificIssues: string[];
  documentUrl: string | null;
  country: string;
}

export interface LobbyingSummary {
  totalSpend: number;
  totalFilings: number;
  totalQuarters: number;
  averagePerQuarter: number;
  uniqueLobbyists: number;
  uniqueIssueAreas: number;
  uniqueGovEntities: number;
  uniqueRegistrants: number;
  topIssueAreas: { code: string; name: string; count: number; totalSpend: number }[];
  topRegistrants: { name: string; filingCount: number; totalSpend: number }[];
  topLobbyists: { name: string; coveredPosition: string | null; filingCount: number }[];
  spendByYear: { year: number; spend: number; filingCount: number }[];
}

export interface LobbyingResult {
  symbol: string;
  companyName: string | null;
  quarters: LobbyingQuarter[];
  activities: LobbyingActivity[];
  summary: LobbyingSummary;
  currentScore: number;
  currentLabel: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  source: 'cache' | 'fresh';
  cachedAt: string | null;
  expiresAt: string | null;
}

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════

const TTL_FALLBACK = {
  NORMAL: 12 * 60 * 60,     // 12 hours (lobbying data updates slowly)
  WEEKEND: 48 * 60 * 60,    // 48 hours
  MAX_TTL: 72 * 60 * 60,    // 72 hours absolute max
};

const STALE_THRESHOLD = 0.75;

// ══════════════════════════════════════════════════════════════════
// SERVER-SIDE IN-MEMORY CACHE
// ──────────────────────────────────────────────────────────────────
// Shared across ALL users in this server process.  This means if
// user A looked up "LMT" 5 min ago, user B gets it instantly from
// memory — zero Supabase queries, zero Senate LDA API calls.
// ══════════════════════════════════════════════════════════════════

interface MemoryCacheEntry {
  result: LobbyingResult;
  storedAt: number;   // Date.now()
  ttlMs: number;      // milliseconds until considered stale
}

/** In-process cache — survives across requests, clears on cold start */
const _memoryCache = new Map<string, MemoryCacheEntry>();

/** Global lock map — prevents duplicate fetches for the same symbol */
const _fetchLocks = new Map<string, Promise<LobbyingResult>>();

/** Memory cache TTL — 30 min (lobbying data barely changes) */
const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000;

/** Max memory cache entries (prevent unbounded memory growth) */
const MEMORY_CACHE_MAX_ENTRIES = 200;

function getFromMemoryCache(key: string): LobbyingResult | null {
  const entry = _memoryCache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.storedAt;
  if (age > entry.ttlMs) {
    _memoryCache.delete(key);
    return null;
  }
  return entry.result;
}

function setInMemoryCache(key: string, result: LobbyingResult, ttlMs: number = MEMORY_CACHE_TTL_MS): void {
  // Evict oldest entries if at capacity
  if (_memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of _memoryCache) {
      if (v.storedAt < oldestTime) {
        oldestTime = v.storedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) _memoryCache.delete(oldestKey);
  }
  _memoryCache.set(key, { result, storedAt: Date.now(), ttlMs });
}

// ══════════════════════════════════════════════════════════════════
// LOBBYING SERVICE
// ══════════════════════════════════════════════════════════════════

class SenateLobbyingService {
  private _supabase: SupabaseClient | null = null;
  private _supabaseAdmin: SupabaseClient | null = null;
  private _lobbyingApi: SenateLobbyingAPI | null = null;
  private _activeRequests = new Map<string, Promise<LobbyingResult>>();

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

  private get lobbyingApi(): SenateLobbyingAPI {
    if (!this._lobbyingApi) {
      this._lobbyingApi = createSenateLobbyingClient();
    }
    return this._lobbyingApi;
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════

  /**
   * Get lobbying data for a ticker symbol.
   * 
   * Resolution order (fastest → slowest):
   *   1. Server in-memory cache (instant, shared across all users)
   *   2. Supabase DB cache (fast, shared across all servers/instances)
   *   3. Senate LDA API (slow, rate-limited, external)
   * 
   * Global fetch lock ensures only ONE request to Senate LDA per ticker
   * at any given time, even with 100 concurrent users.
   */
  async getLobbyingData(
    symbol: string,
    options: {
      years?: number;
      forceRefresh?: boolean;
      includeActivities?: boolean;
    } = {}
  ): Promise<LobbyingResult> {
    const { years = 3, forceRefresh = false, includeActivities = true } = options;
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `${upperSymbol}:${years}`;

    // ── 1. Memory cache (instant, ~0ms) ──────────────────────
    if (!forceRefresh) {
      const memoryCached = getFromMemoryCache(cacheKey);
      if (memoryCached) {
        console.log(`[SenateLobbyingService] ⚡ Memory cache hit for ${upperSymbol}`);
        // Return a copy with correct includeActivities setting
        return {
          ...memoryCached,
          activities: includeActivities ? memoryCached.activities : [],
        };
      }
    }

    // ── 2. Global fetch lock (prevent duplicate Senate LDA calls) ──
    // If another request is already fetching this ticker, piggyback on it
    const lockKey = `${upperSymbol}:${years}:${forceRefresh}`;
    if (_fetchLocks.has(lockKey)) {
      console.log(`[SenateLobbyingService] 🔒 Waiting on existing fetch for ${upperSymbol}`);
      const locked = await _fetchLocks.get(lockKey)!;
      return {
        ...locked,
        activities: includeActivities ? locked.activities : [],
      };
    }

    // ── 3. Acquire lock and run fetch pipeline ───────────────
    const fetchPromise = this._getLobbyingInternal(upperSymbol, years, forceRefresh, true)
      .then(result => {
        // Store in memory cache for all subsequent users
        setInMemoryCache(cacheKey, result);
        return result;
      })
      .finally(() => {
        _fetchLocks.delete(lockKey);
      });

    _fetchLocks.set(lockKey, fetchPromise);

    const result = await fetchPromise;
    return {
      ...result,
      activities: includeActivities ? result.activities : [],
    };
  }

  /**
   * Get lobbying data for multiple tickers at once
   */
  async getBulkLobbyingData(
    symbols: string[],
    options: { years?: number } = {}
  ): Promise<LobbyingResult[]> {
    const results: LobbyingResult[] = [];
    // Process sequentially to respect rate limits
    for (const symbol of symbols) {
      try {
        const result = await this.getLobbyingData(symbol, {
          years: options.years || 2,
          includeActivities: false,
        });
        results.push(result);
      } catch (error) {
        console.warn(`[SenateLobbyingService] Failed to get data for ${symbol}:`, error);
      }
    }
    return results;
  }

  /**
   * Calculate smart TTL
   */
  calculateSmartTTL(): number {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();

    if (day === 0 || day === 6) return TTL_FALLBACK.WEEKEND;
    return TTL_FALLBACK.NORMAL;
  }

  // ══════════════════════════════════════════════════════════════
  // INTERNAL: Main Orchestration
  // ══════════════════════════════════════════════════════════════

  private async _getLobbyingInternal(
    symbol: string,
    years: number,
    forceRefresh: boolean,
    includeActivities: boolean
  ): Promise<LobbyingResult> {
    // Step 1: Check Supabase DB cache freshness
    if (!forceRefresh) {
      const cacheCheck = await this.checkCacheFreshness(symbol);

      if (cacheCheck.isFresh) {
        console.log(`[SenateLobbyingService] ✅ Serving fresh DB cache for ${symbol}`);
        return this.buildResultFromCache(symbol, years, includeActivities, 'cache');
      }

      if (cacheCheck.isStale) {
        console.log(`[SenateLobbyingService] ⚡ Serving stale DB cache for ${symbol}, refreshing in background`);
        // Return stale data immediately, refresh in background
        this.refreshInBackground(symbol, years).catch(err =>
          console.error(`[SenateLobbyingService] Background refresh failed for ${symbol}:`, err)
        );
        return this.buildResultFromCache(symbol, years, includeActivities, 'cache');
      }

      // Cache is expired — ALWAYS try serving DB data first, regardless of
      // whether the refresh_log has an entry.  This prevents external API calls
      // when the cache table has data but the refresh_log table is missing/empty.
      if (cacheCheck.isExpired) {
        console.log(`[SenateLobbyingService] ♻️ Cache expired for ${symbol}, trying DB before external API`);
        try {
          const cachedResult = await this.buildResultFromCache(symbol, years, includeActivities, 'cache');
          if (cachedResult.activities.length > 0 || cachedResult.quarters.some(q => q.filingCount > 0)) {
            // We have usable cached data — serve it and refresh in background
            console.log(`[SenateLobbyingService] 📦 Serving expired DB cache for ${symbol}, refreshing in background`);
            this.refreshInBackground(symbol, years).catch(err =>
              console.error(`[SenateLobbyingService] Background refresh failed for ${symbol}:`, err)
            );
            return cachedResult;
          }
        } catch (cacheError) {
          console.warn(`[SenateLobbyingService] DB cache read failed for ${symbol}:`, cacheError);
          // DB may be unreachable — fall through to external API as last resort
        }
        // No cached data at all — fall through to fresh fetch
      }
    }

    // Step 2: No usable cache — must fetch fresh from Senate LDA (LAST RESORT)
    console.log(`[SenateLobbyingService] 🔄 Fetching fresh data for ${symbol} (no DB cache available)`);
    return this.fetchAndCacheLobbyingData(symbol, years, includeActivities);
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  async checkCacheFreshness(symbol: string): Promise<{
    isFresh: boolean;
    isStale: boolean;
    isExpired: boolean;
    lastRefresh: Date | null;
    ttlSeconds: number;
  }> {
    try {
      const { data: refreshData } = await this.supabase
        .from('senate_lobbying_refresh_log')
        .select('completed_at, ttl_seconds, status')
        .eq('symbol', symbol)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!refreshData || refreshData.length === 0) {
        // No refresh log entry — but cache table might still have data.
        // Fall through to the cache-table-based freshness check below.
        return this.checkCacheFreshnessFromData(symbol);
      }

      const lastRefresh = new Date(refreshData[0].completed_at);
      const ageSeconds = (Date.now() - lastRefresh.getTime()) / 1000;
      const ttlSeconds = refreshData[0].ttl_seconds || this.calculateSmartTTL();
      const staleThreshold = ttlSeconds * STALE_THRESHOLD;

      return {
        isFresh: ageSeconds < staleThreshold,
        isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
        isExpired: ageSeconds >= ttlSeconds,
        lastRefresh,
        ttlSeconds,
      };
    } catch {
      // refresh_log table might not exist — try reading cache table directly
      return this.checkCacheFreshnessFromData(symbol);
    }
  }

  /**
   * Fallback freshness check: looks at the `updated_at` column in the
   * `senate_lobbying_cache` table directly.  Used when the refresh_log
   * table is missing or empty.
   */
  private async checkCacheFreshnessFromData(symbol: string): Promise<{
    isFresh: boolean;
    isStale: boolean;
    isExpired: boolean;
    lastRefresh: Date | null;
    ttlSeconds: number;
  }> {
    try {
      const { data: cacheRows } = await this.supabase
        .from('senate_lobbying_cache')
        .select('updated_at')
        .eq('symbol', symbol)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!cacheRows || cacheRows.length === 0 || !cacheRows[0].updated_at) {
        return { isFresh: false, isStale: false, isExpired: true, lastRefresh: null, ttlSeconds: 0 };
      }

      const lastRefresh = new Date(cacheRows[0].updated_at);
      const ageSeconds = (Date.now() - lastRefresh.getTime()) / 1000;
      const ttlSeconds = this.calculateSmartTTL();
      const staleThreshold = ttlSeconds * STALE_THRESHOLD;

      console.log(
        `[SenateLobbyingService] 📊 Fallback freshness for ${symbol}: ` +
        `age=${Math.round(ageSeconds)}s, ttl=${ttlSeconds}s, stale at ${Math.round(staleThreshold)}s`
      );

      return {
        isFresh: ageSeconds < staleThreshold,
        isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
        isExpired: ageSeconds >= ttlSeconds,
        lastRefresh,
        ttlSeconds,
      };
    } catch {
      // Both tables missing — treat as expired with no data
      return { isFresh: false, isStale: false, isExpired: true, lastRefresh: null, ttlSeconds: 0 };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // DATA FETCHING & CACHING
  // ══════════════════════════════════════════════════════════════

  private async fetchAndCacheLobbyingData(
    symbol: string,
    years: number,
    includeActivities: boolean
  ): Promise<LobbyingResult> {
    const admin = this.supabaseAdmin;
    const refreshId = admin ? await this.logRefreshStart(symbol) : null;
    const startMs = Date.now();

    // Wrap the entire external fetch in a timeout so the API route never hangs
    const TOTAL_FETCH_TIMEOUT_MS = 50000; // 50s — must be under Next.js route timeout

    try {
      // Step 1: Fetch from Senate LDA API (capped at ~8 API calls max)
      const rawFilings = await Promise.race([
        this.lobbyingApi.getByTicker(symbol, {
          years,
          maxResults: 150,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Senate LDA fetch timed out — data may be slow today')),
          TOTAL_FETCH_TIMEOUT_MS)
        ),
      ]);

      const elapsedMs = Date.now() - startMs;
      console.log(`[SenateLobbyingService] Fetched ${rawFilings.length} filings for ${symbol} in ${elapsedMs}ms`);

      // Step 2: Transform to our format
      const activities = this.transformFilings(symbol, rawFilings);

      // Step 3: Persist to cache
      if (admin) {
        await this.persistActivities(admin, symbol, activities);
      }

      // Step 4: Compute quarterly aggregations and OLI scores
      const quarters = this.aggregateQuarters(symbol, activities, years);

      // Step 5: Compute summary
      const summary = this.computeSummary(activities);

      // Step 6: Calculate TTL and persist metadata
      const ttl = this.calculateSmartTTL();
      if (admin && refreshId) {
        await this.logRefreshComplete(refreshId, symbol, rawFilings.length, ttl);
      }

      // Step 7: Build result
      const sortedQuarters = [...quarters].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter.localeCompare(a.quarter);
      });

      // Use the most recent quarter that actually has filings (skip future/empty quarters)
      const currentScore = sortedQuarters.find(q => q.filingCount > 0)?.oliScore ?? 0;
      const currentLabel = sortedQuarters.find(q => q.filingCount > 0)?.influenceLabel ?? 'Minimal';

      return {
        symbol,
        companyName: activities[0]?.clientName || null,
        quarters: sortedQuarters,
        activities: includeActivities ? activities.slice(0, 200) : [],
        summary,
        currentScore,
        currentLabel,
        trend: this.calculateTrend(sortedQuarters),
        source: 'fresh',
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      };
    } catch (error: any) {
      if (admin && refreshId) {
        await this.logRefreshFailed(refreshId, symbol, error.message);
      }

      // Try to serve stale cache on error
      try {
        const cachedResult = await this.buildResultFromCache(symbol, years, includeActivities, 'cache');
        if (cachedResult.activities.length > 0 || cachedResult.quarters.length > 0) {
          console.warn(`[SenateLobbyingService] Serving stale cache for ${symbol} after error: ${error.message}`);
          return cachedResult;
        }
      } catch {
        // Can't serve cache either
      }

      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // DATA TRANSFORMATION
  // ══════════════════════════════════════════════════════════════

  private transformFilings(symbol: string, filings: LobbyingFiling[]): LobbyingActivity[] {
    return filings.map(filing => ({
      symbol,
      filingUuid: filing.filingUuid,
      filingDate: filing.filingDate || filing.postedDate || '',
      filingYear: filing.filingYear,
      filingPeriod: filing.filingPeriod,
      filingType: filing.filingType,
      clientName: filing.clientName,
      clientDescription: filing.clientDescription,
      registrantName: filing.registrantName,
      amount: filing.amountReported || filing.amount,
      expenses: filing.expenses,
      income: filing.income,
      lobbyistNames: filing.lobbyists.map(l => l.name),
      issueAreas: filing.issues.map(i => i.code).filter(Boolean),
      issueDescriptions: filing.issues.map(i => i.description).filter(Boolean),
      governmentEntities: filing.governmentEntities.map(g => g.name).filter(Boolean),
      specificIssues: filing.issues.map(i => i.specificIssue).filter(Boolean) as string[],
      documentUrl: filing.documentUrl,
      country: filing.clientCountry || 'USA',
    }));
  }

  // ══════════════════════════════════════════════════════════════
  // PROPRIETARY OLI SCORING ALGORITHM
  // ══════════════════════════════════════════════════════════════

  private aggregateQuarters(
    symbol: string,
    activities: LobbyingActivity[],
    years: number
  ): LobbyingQuarter[] {
    // Group by year-quarter
    const buckets = new Map<string, LobbyingActivity[]>();

    for (const activity of activities) {
      const key = `${activity.filingYear}-${activity.filingPeriod}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(activity);
    }

    // Generate quarter entries
    const results: LobbyingQuarter[] = [];
    const now = new Date();
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    for (let y = 0; y < years; y++) {
      const year = now.getFullYear() - y;
      for (const q of quarters) {
        const key = `${year}-${q}`;
        const quarterActivities = buckets.get(key) || [];
        const quarterData = this.computeQuarterMetrics(symbol, year, q, quarterActivities);
        results.push(quarterData);
      }
    }

    // Apply consistency and trend scoring
    this.applyTrendScoring(results);

    return results;
  }

  private computeQuarterMetrics(
    symbol: string,
    year: number,
    quarter: string,
    activities: LobbyingActivity[]
  ): LobbyingQuarter {
    const totalSpend = activities.reduce((sum, a) => sum + (a.amount || a.expenses || a.income || 0), 0);
    const allLobbyists = new Set<string>();
    const allIssues = new Set<string>();
    const allGovEntities = new Set<string>();
    const issueCount = new Map<string, number>();
    const registrantSpend = new Map<string, number>();

    for (const a of activities) {
      a.lobbyistNames.forEach(l => allLobbyists.add(l));
      a.issueAreas.forEach(i => {
        allIssues.add(i);
        issueCount.set(i, (issueCount.get(i) || 0) + 1);
      });
      a.governmentEntities.forEach(g => allGovEntities.add(g));
      registrantSpend.set(
        a.registrantName,
        (registrantSpend.get(a.registrantName) || 0) + (a.amount || 0)
      );
    }

    const topIssues = [...issueCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({
        code,
        name: ISSUE_AREA_CODES[code] || code,
        count,
      }));

    const topRegistrants = [...registrantSpend.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    const latestFiling = activities.length > 0
      ? activities.reduce((latest, a) => a.filingDate > latest ? a.filingDate : latest, activities[0].filingDate)
      : null;

    // ── Compute OLI Score ──────────────────────────────────────
    const oliScore = this.computeOLIScore({
      totalSpend,
      filingCount: activities.length,
      uniqueLobbyists: allLobbyists.size,
      uniqueIssues: allIssues.size,
      uniqueGovEntities: allGovEntities.size,
    });

    return {
      symbol,
      year,
      quarter,
      oliScore,
      influenceLabel: this.scoreToLabel(oliScore),
      totalSpend,
      filingCount: activities.length,
      uniqueLobbyists: allLobbyists.size,
      uniqueIssues: allIssues.size,
      uniqueGovEntities: allGovEntities.size,
      topIssues,
      topRegistrants,
      latestFilingDate: latestFiling,
    };
  }

  /**
   * OmniFolio Lobbying Influence (OLI) Score
   * 
   * Components (single-quarter view):
   *   SM (30%): Spend Magnitude — log-scaled spend relative to thresholds
   *   IB (15%): Issue Breadth — number of distinct issue areas
   *   GR (15%): Government Reach — number of gov entities contacted
   *   LC (10%): Lobbyist Count — unique lobbyists deployed
   *   CO (15%): Consistency — applied in post-processing
   *   TR (15%): Trend — applied in post-processing
   */
  private computeOLIScore(data: {
    totalSpend: number;
    filingCount: number;
    uniqueLobbyists: number;
    uniqueIssues: number;
    uniqueGovEntities: number;
  }): number {
    if (data.filingCount === 0) return 0;

    // ── SM: Spend Magnitude (30%) ────────────────────────
    // Log-scaled: $0=0, $100K=20, $1M=50, $10M=80, $50M+=100
    let sm = 0;
    if (data.totalSpend > 0) {
      const logSpend = Math.log10(data.totalSpend);
      // Scale: log10(100000)=5 → 20, log10(1000000)=6 → 50, log10(10000000)=7 → 80
      sm = Math.min(100, Math.max(0, (logSpend - 4) * 25));
    }

    // ── IB: Issue Breadth (15%) ──────────────────────────
    // 1 issue = 15, 3 issues = 40, 5+ issues = 70, 10+ = 100
    const ib = Math.min(100, data.uniqueIssues * 12);

    // ── GR: Government Reach (15%) ───────────────────────
    // 1 entity = 15, 3 entities = 45, 5+ = 75, 8+ = 100
    const gr = Math.min(100, data.uniqueGovEntities * 13);

    // ── LC: Lobbyist Count (10%) ─────────────────────────
    // 1 lobbyist = 10, 3 = 30, 5 = 50, 10+ = 100
    const lc = Math.min(100, data.uniqueLobbyists * 10);

    // Composite (CO and TR applied in post-processing)
    // For now, use the 70% that's computable per-quarter
    const baseScore = (sm * 0.30 + ib * 0.15 + gr * 0.15 + lc * 0.10) / 0.70;

    return Math.max(0, Math.min(100, Math.round(baseScore * 100) / 100));
  }

  /**
   * Apply consistency and trend scoring across quarters
   */
  private applyTrendScoring(quarters: LobbyingQuarter[]): void {
    // Sort oldest to newest
    const sorted = [...quarters].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter.localeCompare(b.quarter);
    });

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].filingCount === 0) continue;

      // Consistency: count consecutive quarters with filings
      let consecutiveActive = 0;
      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        if (sorted[j].filingCount > 0) {
          consecutiveActive++;
        } else {
          break;
        }
      }

      // Consistency bonus: 3 points per consecutive quarter, max 15
      const coBonus = Math.min(consecutiveActive * 3, 15);

      // Trend: compare spend to previous quarter
      let trBonus = 0;
      if (i > 0 && sorted[i - 1].totalSpend > 0) {
        const ratio = sorted[i].totalSpend / sorted[i - 1].totalSpend;
        if (ratio > 1.5) trBonus = 10;
        else if (ratio > 1.1) trBonus = 5;
        else if (ratio < 0.5) trBonus = -5;
        else if (ratio < 0.9) trBonus = -3;
      }

      sorted[i].oliScore = Math.max(0, Math.min(100, sorted[i].oliScore + coBonus + trBonus));
      sorted[i].influenceLabel = this.scoreToLabel(sorted[i].oliScore);
    }

    // Update original array
    const scoreMap = new Map<string, { oliScore: number; influenceLabel: string }>();
    for (const q of sorted) {
      scoreMap.set(`${q.year}-${q.quarter}`, { oliScore: q.oliScore, influenceLabel: q.influenceLabel });
    }
    for (const q of quarters) {
      const update = scoreMap.get(`${q.year}-${q.quarter}`);
      if (update) {
        q.oliScore = update.oliScore;
        q.influenceLabel = update.influenceLabel;
      }
    }
  }

  private scoreToLabel(score: number): string {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Minimal';
  }

  private calculateTrend(sortedQuartersDesc: LobbyingQuarter[]): 'increasing' | 'decreasing' | 'stable' {
    const activeQuarters = sortedQuartersDesc.filter(q => q.filingCount > 0);
    if (activeQuarters.length < 2) return 'stable';

    const recent = activeQuarters.slice(0, 2);
    const older = activeQuarters.slice(2, 4);

    if (older.length === 0) return 'stable';

    const avgRecent = recent.reduce((s, q) => s + q.totalSpend, 0) / recent.length;
    const avgOlder = older.reduce((s, q) => s + q.totalSpend, 0) / older.length;

    if (avgOlder === 0 && avgRecent > 0) return 'increasing';
    if (avgOlder === 0) return 'stable';

    const ratio = avgRecent / avgOlder;
    if (ratio > 1.2) return 'increasing';
    if (ratio < 0.8) return 'decreasing';
    return 'stable';
  }

  // ══════════════════════════════════════════════════════════════
  // SUMMARY COMPUTATION
  // ══════════════════════════════════════════════════════════════

  private computeSummary(activities: LobbyingActivity[]): LobbyingSummary {
    const totalSpend = activities.reduce((sum, a) => sum + (a.amount || a.expenses || a.income || 0), 0);
    const allLobbyists = new Map<string, number>();
    const allIssues = new Map<string, { count: number; spend: number }>();
    const allRegistrants = new Map<string, { count: number; spend: number }>();
    const allGovEntities = new Set<string>();
    const spendByYear = new Map<number, { spend: number; count: number }>();

    for (const a of activities) {
      // Lobbyists
      a.lobbyistNames.forEach(l => {
        allLobbyists.set(l, (allLobbyists.get(l) || 0) + 1);
      });

      // Issues
      a.issueAreas.forEach(code => {
        const existing = allIssues.get(code) || { count: 0, spend: 0 };
        existing.count++;
        existing.spend += a.amount || 0;
        allIssues.set(code, existing);
      });

      // Registrants
      const regExisting = allRegistrants.get(a.registrantName) || { count: 0, spend: 0 };
      regExisting.count++;
      regExisting.spend += a.amount || 0;
      allRegistrants.set(a.registrantName, regExisting);

      // Gov entities
      a.governmentEntities.forEach(g => allGovEntities.add(g));

      // Year spend
      const yearData = spendByYear.get(a.filingYear) || { spend: 0, count: 0 };
      yearData.spend += a.amount || 0;
      yearData.count++;
      spendByYear.set(a.filingYear, yearData);
    }

    // Count unique quarters
    const uniqueQuarters = new Set(activities.map(a => `${a.filingYear}-${a.filingPeriod}`)).size;

    return {
      totalSpend,
      totalFilings: activities.length,
      totalQuarters: uniqueQuarters,
      averagePerQuarter: uniqueQuarters > 0 ? totalSpend / uniqueQuarters : 0,
      uniqueLobbyists: allLobbyists.size,
      uniqueIssueAreas: allIssues.size,
      uniqueGovEntities: allGovEntities.size,
      uniqueRegistrants: allRegistrants.size,
      topIssueAreas: [...allIssues.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([code, data]) => ({
          code,
          name: ISSUE_AREA_CODES[code] || code,
          count: data.count,
          totalSpend: data.spend,
        })),
      topRegistrants: [...allRegistrants.entries()]
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 10)
        .map(([name, data]) => ({
          name,
          filingCount: data.count,
          totalSpend: data.spend,
        })),
      topLobbyists: [...allLobbyists.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
          name,
          coveredPosition: null,
          filingCount: count,
        })),
      spendByYear: [...spendByYear.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([year, data]) => ({
          year,
          spend: data.spend,
          filingCount: data.count,
        })),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // DATABASE PERSISTENCE
  // ══════════════════════════════════════════════════════════════

  private async persistActivities(
    admin: SupabaseClient,
    symbol: string,
    activities: LobbyingActivity[]
  ): Promise<void> {
    if (activities.length === 0) return;

    const rows = activities.map(a => ({
      symbol: a.symbol,
      name: a.clientName || a.registrantName || a.symbol,  // Legacy column (NOT NULL in old schema)
      senate_id: a.filingUuid,  // Legacy column — use filingUuid to satisfy old UNIQUE(symbol, senate_id, house_registrant_id)
      house_registrant_id: a.filingUuid,  // Legacy column — use filingUuid for uniqueness
      filing_uuid: a.filingUuid,
      filing_date: a.filingDate || null,
      filing_year: a.filingYear,
      filing_period: a.filingPeriod,
      filing_type: a.filingType,
      client_name: a.clientName,
      client_description: a.clientDescription,
      registrant_name: a.registrantName,
      amount: a.amount,
      expenses: a.expenses,
      income: a.income,
      lobbyist_names: a.lobbyistNames,
      issue_areas: a.issueAreas,
      issue_descriptions: a.issueDescriptions,
      government_entities: a.governmentEntities,
      specific_issues: a.specificIssues,
      document_url: a.documentUrl,
      country: a.country,
      updated_at: new Date().toISOString(),
    }));

    // DELETE existing rows for this symbol, then INSERT fresh data.
    // This avoids the need for a UNIQUE constraint (which may be missing
    // if the table was created before the constraint was added).
    const { error: deleteError } = await admin
      .from('senate_lobbying_cache')
      .delete()
      .eq('symbol', symbol);

    if (deleteError) {
      console.error(`[SenateLobbyingService] Cache delete error for ${symbol}:`, deleteError);
      return; // Don't insert if delete failed — would cause duplicates
    }

    // Batch insert in chunks of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await admin
        .from('senate_lobbying_cache')
        .insert(batch);

      if (error) {
        console.error(`[SenateLobbyingService] Cache insert error (batch ${i}):`, error);
      }
    }

    console.log(`[SenateLobbyingService] 💾 Persisted ${rows.length} filings for ${symbol} to DB`);
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE BUILDING
  // ══════════════════════════════════════════════════════════════

  private async buildResultFromCache(
    symbol: string,
    years: number,
    includeActivities: boolean,
    source: 'cache' | 'fresh'
  ): Promise<LobbyingResult> {
    const cutoffYear = new Date().getFullYear() - years;

    const { data: cachedRows, error } = await this.supabase
      .from('senate_lobbying_cache')
      .select('*')
      .eq('symbol', symbol)
      .gte('filing_year', cutoffYear)
      .order('filing_date', { ascending: false });

    if (error || !cachedRows) {
      return this.buildEmptyResult(symbol, source);
    }

    const activities: LobbyingActivity[] = cachedRows.map(this.mapDbRowToActivity);
    const quarters = this.aggregateQuarters(symbol, activities, years);
    const summary = this.computeSummary(activities);

    const sortedQuarters = [...quarters].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.quarter.localeCompare(a.quarter);
    });

    const currentScore = sortedQuarters.find(q => q.filingCount > 0)?.oliScore ?? 0;
    const currentLabel = sortedQuarters.find(q => q.filingCount > 0)?.influenceLabel ?? 'Minimal';

    // Get cache metadata
    const { data: refreshData } = await this.supabase
      .from('senate_lobbying_refresh_log')
      .select('completed_at, ttl_seconds')
      .eq('symbol', symbol)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1);

    const cachedAt = refreshData?.[0]?.completed_at || null;
    const ttl = this.calculateSmartTTL();
    const expiresAt = cachedAt
      ? new Date(new Date(cachedAt).getTime() + ttl * 1000).toISOString()
      : null;

    return {
      symbol,
      companyName: activities[0]?.clientName || null,
      quarters: sortedQuarters,
      activities: includeActivities ? activities.slice(0, 200) : [],
      summary,
      currentScore,
      currentLabel,
      trend: this.calculateTrend(sortedQuarters),
      source,
      cachedAt,
      expiresAt,
    };
  }

  private buildEmptyResult(symbol: string, source: 'cache' | 'fresh'): LobbyingResult {
    return {
      symbol,
      companyName: null,
      quarters: [],
      activities: [],
      summary: {
        totalSpend: 0,
        totalFilings: 0,
        totalQuarters: 0,
        averagePerQuarter: 0,
        uniqueLobbyists: 0,
        uniqueIssueAreas: 0,
        uniqueGovEntities: 0,
        uniqueRegistrants: 0,
        topIssueAreas: [],
        topRegistrants: [],
        topLobbyists: [],
        spendByYear: [],
      },
      currentScore: 0,
      currentLabel: 'Minimal',
      trend: 'stable',
      source,
      cachedAt: null,
      expiresAt: null,
    };
  }

  private mapDbRowToActivity(row: any): LobbyingActivity {
    return {
      symbol: row.symbol,
      filingUuid: row.filing_uuid,
      filingDate: row.filing_date || '',
      filingYear: row.filing_year,
      filingPeriod: row.filing_period,
      filingType: row.filing_type,
      clientName: row.client_name || '',
      clientDescription: row.client_description || null,
      registrantName: row.registrant_name || '',
      amount: row.amount ? parseFloat(row.amount) : null,
      expenses: row.expenses ? parseFloat(row.expenses) : null,
      income: row.income ? parseFloat(row.income) : null,
      lobbyistNames: row.lobbyist_names || [],
      issueAreas: row.issue_areas || [],
      issueDescriptions: row.issue_descriptions || [],
      governmentEntities: row.government_entities || [],
      specificIssues: row.specific_issues || [],
      documentUrl: row.document_url || null,
      country: row.country || 'USA',
    };
  }

  // ══════════════════════════════════════════════════════════════
  // BACKGROUND REFRESH
  // ══════════════════════════════════════════════════════════════

  private async refreshInBackground(symbol: string, years: number): Promise<void> {
    try {
      await this.fetchAndCacheLobbyingData(symbol, years, false);
      console.log(`[SenateLobbyingService] ✅ Background refresh completed for ${symbol}`);
    } catch (error) {
      console.error(`[SenateLobbyingService] ❌ Background refresh failed for ${symbol}:`, error);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // REFRESH LOGGING
  // ══════════════════════════════════════════════════════════════

  private async logRefreshStart(symbol: string): Promise<string | null> {
    const admin = this.supabaseAdmin;
    if (!admin) return null;

    const { data, error } = await admin
      .from('senate_lobbying_refresh_log')
      .insert({
        symbol,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[SenateLobbyingService] Refresh log start error:', error);
      return null;
    }
    return data?.id || null;
  }

  private async logRefreshComplete(
    id: string,
    symbol: string,
    filingsParsed: number,
    ttlSeconds: number
  ): Promise<void> {
    const admin = this.supabaseAdmin;
    if (!admin) return;

    await admin
      .from('senate_lobbying_refresh_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        filings_parsed: filingsParsed,
        ttl_seconds: ttlSeconds,
      })
      .eq('id', id);
  }

  private async logRefreshFailed(
    id: string,
    symbol: string,
    errorMessage: string
  ): Promise<void> {
    const admin = this.supabaseAdmin;
    if (!admin) return;

    await admin
      .from('senate_lobbying_refresh_log')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', id);
  }
}

// ══════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ══════════════════════════════════════════════════════════════════

export const senateLobbyingService = new SenateLobbyingService();
export default senateLobbyingService;
