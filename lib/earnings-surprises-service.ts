/**
 * OmniFolio Proprietary Earnings Surprises Service
 * 
 * Computes earnings surprise scores from SEC EDGAR XBRL financial data.
 * NO third-party earnings APIs for actual EPS data — 100% proprietary, 100% legal.
 * 
 * Data Sources:
 *   - SEC EDGAR XBRL Company Facts API (public, free, no API key)
 *     → Provides actual EPS, revenue, net income from 10-Q/10-K filings
 *   - Proprietary earnings calendar API (for consensus estimates)
 * 
 * Rate Strategy: 4 req/sec to SEC (well under 10/sec limit)
 * Cache Strategy: Supabase DB with smart TTL (earnings-season aware)
 * 
 * Scoring Algorithm: OmniFolio Earnings Surprise (OES) Score
 * ──────────────────────────────────────────────────────────────
 * The OES score is a weighted composite of:
 *   1. EPS Surprise Magnitude (ESM): how big was the beat/miss
 *   2. Revenue Surprise (RS): revenue beat/miss (growth signal)
 *   3. Margin Trend (MT): are margins expanding or contracting
 *   4. Consistency Bonus (CB): sustained beats/misses over quarters
 *   5. YoY Momentum (YM): year-over-year growth direction
 * 
 * OES = clamp( ESM*0.35 + RS*0.25 + MT*0.15 + CB*0.15 + YM*0.10, -100, 100 )
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createSECEdgarClient, SECEdgarAPI, XBRLFinancials } from './api/sec-edgar-api';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

export interface EarningsSurpriseQuarter {
  symbol: string;
  fiscalYear: number;
  fiscalQuarter: number;
  periodEndDate: string | null;
  reportDate: string | null;
  
  // EPS data
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprise: number | null;
  epsSurprisePct: number | null;
  epsBasic: number | null;
  epsDiluted: number | null;
  
  // Revenue data
  revenueActual: number | null;
  revenueEstimate: number | null;
  revenueSurprise: number | null;
  revenueSurprisePct: number | null;
  
  // Additional financials
  netIncome: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  
  // Comparisons
  revenueYoyPct: number | null;
  epsYoyPct: number | null;
  revenueQoqPct: number | null;
  epsQoqPct: number | null;
  
  // Proprietary score
  oesScore: number;
  surpriseLabel: string;
  beatCountLast4: number;
  missCountLast4: number;
  streakType: string;
  streakLength: number;
  
  // Filing info
  filingType: string;
  filingUrl: string | null;
  accessionNumber: string | null;
}

export interface EarningsSurpriseResult {
  symbol: string;
  companyName: string | null;
  cik: string | null;
  quarters: EarningsSurpriseQuarter[];
  currentScore: number;
  currentLabel: string;
  trend: 'improving' | 'declining' | 'stable';
  beatRate: number;  // percentage of quarters that beat
  avgSurprisePct: number;
  currentStreak: { type: string; length: number };
  source: 'cache' | 'fresh';
  cachedAt: string | null;
  expiresAt: string | null;
}

export interface CacheCheckResult {
  isFresh: boolean;
  isStale: boolean;
  isExpired: boolean;
  lastRefresh: Date | null;
  ttlSeconds: number;
}

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════

const TTL_FALLBACK = {
  EARNINGS_SEASON_MARKET: 6 * 60 * 60,    // 6 hours
  EARNINGS_SEASON_OFF: 12 * 60 * 60,      // 12 hours
  NORMAL: 24 * 60 * 60,                    // 24 hours
  WEEKEND: 48 * 60 * 60,                   // 48 hours
  FRESH_REPORT: 24 * 60 * 60,             // 24 hours after new report
  MAX_TTL: 72 * 60 * 60,                   // 72 hours absolute max
};

const STALE_THRESHOLD = 0.75;

// Earnings season months (most companies report in these months)
const EARNINGS_SEASON_MONTHS = new Set([1, 2, 4, 5, 7, 8, 10, 11]);

// ══════════════════════════════════════════════════════════════════
// SERVER-SIDE IN-MEMORY CACHE
// ══════════════════════════════════════════════════════════════════

interface MemoryCacheEntry {
  result: EarningsSurpriseResult;
  storedAt: number;
  ttlMs: number;
}

const _memoryCache = new Map<string, MemoryCacheEntry>();
const _fetchLocks = new Map<string, Promise<EarningsSurpriseResult>>();

const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MEMORY_CACHE_MAX_ENTRIES = 200;

function getFromMemoryCache(key: string): EarningsSurpriseResult | null {
  const entry = _memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > entry.ttlMs) {
    _memoryCache.delete(key);
    return null;
  }
  return entry.result;
}

function setInMemoryCache(key: string, result: EarningsSurpriseResult, ttlMs = MEMORY_CACHE_TTL_MS): void {
  if (_memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of _memoryCache) {
      if (v.storedAt < oldestTime) { oldestTime = v.storedAt; oldestKey = k; }
    }
    if (oldestKey) _memoryCache.delete(oldestKey);
  }
  _memoryCache.set(key, { result, storedAt: Date.now(), ttlMs });
}

// ══════════════════════════════════════════════════════════════════
// EARNINGS SURPRISES SERVICE
// ══════════════════════════════════════════════════════════════════

class EarningsSurprisesService {
  private _supabase: SupabaseClient | null = null;
  private _supabaseAdmin: SupabaseClient | null = null;
  private _secApi: SECEdgarAPI | null = null;

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
   * Get earnings surprises for a symbol.
   * 
   * Resolution order (fastest → slowest):
   *   1. Server in-memory cache (instant, shared across all users)
   *   2. Supabase DB cache (fast, shared across all servers/instances)
   *   3. SEC EDGAR XBRL API (slow, rate-limited, external)
   * 
   * Global fetch lock ensures only ONE request to SEC per ticker
   * at any given time, even with 100 concurrent users.
   */
  async getEarningsSurprises(
    symbol: string,
    options: {
      quarters?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<EarningsSurpriseResult> {
    const { quarters = 16, forceRefresh = false } = options;
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `${upperSymbol}:${quarters}`;

    // ── 1. Memory cache (instant, ~0ms) ──────────────────────
    if (!forceRefresh) {
      const memoryCached = getFromMemoryCache(cacheKey);
      if (memoryCached) {
        console.log(`[EarningsSurprises] ⚡ Memory cache hit for ${upperSymbol}`);
        return memoryCached;
      }
    }

    // ── 2. Global fetch lock (prevent duplicate SEC calls) ───
    const lockKey = `${upperSymbol}:${quarters}:${forceRefresh}`;
    if (_fetchLocks.has(lockKey)) {
      console.log(`[EarningsSurprises] 🔒 Waiting on existing fetch for ${upperSymbol}`);
      return _fetchLocks.get(lockKey)!;
    }

    // ── 3. Acquire lock and run fetch pipeline ───────────────
    const fetchPromise = this._getEarningsSurprisesInternal(upperSymbol, quarters, forceRefresh)
      .then(result => {
        setInMemoryCache(cacheKey, result);
        return result;
      })
      .finally(() => {
        _fetchLocks.delete(lockKey);
      });

    _fetchLocks.set(lockKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Calculate smart TTL for cache headers
   */
  calculateSmartTTL(): number {
    return this.calculateFallbackTTL();
  }

  // ══════════════════════════════════════════════════════════════
  // INTERNAL: Main Orchestration
  // ══════════════════════════════════════════════════════════════

  private async _getEarningsSurprisesInternal(
    symbol: string,
    quarters: number,
    forceRefresh: boolean
  ): Promise<EarningsSurpriseResult> {
    // Step 1: Check Supabase DB cache freshness
    if (!forceRefresh) {
      const cacheCheck = await this.checkCacheFreshness(symbol);

      if (cacheCheck.isFresh) {
        console.log(`[EarningsSurprises] ✅ Serving fresh DB cache for ${symbol}`);
        return this.buildResultFromCache(symbol, quarters, 'cache');
      }

      if (cacheCheck.isStale) {
        console.log(`[EarningsSurprises] ⚡ Serving stale DB cache for ${symbol}, refreshing in background`);
        this.refreshInBackground(symbol, quarters).catch(err =>
          console.error(`[EarningsSurprises] Background refresh failed for ${symbol}:`, err)
        );
        return this.buildResultFromCache(symbol, quarters, 'cache');
      }

      // Cache expired — try serving DB data first
      if (cacheCheck.isExpired) {
        try {
          const cachedResult = await this.buildResultFromCache(symbol, quarters, 'cache');
          if (cachedResult.quarters.length > 0) {
            console.log(`[EarningsSurprises] 📦 Serving expired DB cache for ${symbol}, refreshing in background`);
            this.refreshInBackground(symbol, quarters).catch(err =>
              console.error(`[EarningsSurprises] Background refresh failed for ${symbol}:`, err)
            );
            return cachedResult;
          }
        } catch (cacheError) {
          console.warn(`[EarningsSurprises] DB cache read failed for ${symbol}:`, cacheError);
        }
      }
    }

    // Step 2: No usable cache — fetch fresh from SEC EDGAR
    console.log(`[EarningsSurprises] 🔄 Fetching fresh data for ${symbol}`);
    return this.fetchAndCacheEarningsData(symbol, quarters);
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  async checkCacheFreshness(symbol: string): Promise<CacheCheckResult> {
    try {
      // Try RPC function first
      const { data, error } = await this.supabase
        .rpc('get_earnings_surprises_last_refresh', { p_symbol: symbol });

      if (!error && data && data.length > 0) {
        const info = data[0];
        const ttlSeconds = info.smart_ttl;
        const ageSeconds = info.age_seconds;
        const staleThreshold = ttlSeconds * STALE_THRESHOLD;

        return {
          isFresh: ageSeconds < staleThreshold,
          isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
          isExpired: ageSeconds >= ttlSeconds,
          lastRefresh: new Date(info.last_refresh_at),
          ttlSeconds,
        };
      }
    } catch {
      // RPC not available
    }

    // Fallback: query refresh log directly
    return this.checkCacheFreshnessFromLog(symbol);
  }

  private async checkCacheFreshnessFromLog(symbol: string): Promise<CacheCheckResult> {
    try {
      const { data: refreshData } = await this.supabase
        .from('earnings_surprises_refresh_log')
        .select('completed_at, ttl_seconds, status')
        .eq('symbol', symbol)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!refreshData || refreshData.length === 0) {
        return this.checkCacheFreshnessFromData(symbol);
      }

      const lastRefresh = new Date(refreshData[0].completed_at);
      const ageSeconds = (Date.now() - lastRefresh.getTime()) / 1000;
      const ttlSeconds = refreshData[0].ttl_seconds || this.calculateFallbackTTL();
      const staleThreshold = ttlSeconds * STALE_THRESHOLD;

      return {
        isFresh: ageSeconds < staleThreshold,
        isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
        isExpired: ageSeconds >= ttlSeconds,
        lastRefresh,
        ttlSeconds,
      };
    } catch {
      return this.checkCacheFreshnessFromData(symbol);
    }
  }

  private async checkCacheFreshnessFromData(symbol: string): Promise<CacheCheckResult> {
    try {
      const { data: cacheRows } = await this.supabase
        .from('earnings_surprises_cache')
        .select('updated_at')
        .eq('symbol', symbol)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!cacheRows || cacheRows.length === 0 || !cacheRows[0].updated_at) {
        return { isFresh: false, isStale: false, isExpired: true, lastRefresh: null, ttlSeconds: 0 };
      }

      const lastRefresh = new Date(cacheRows[0].updated_at);
      const ageSeconds = (Date.now() - lastRefresh.getTime()) / 1000;
      const ttlSeconds = this.calculateFallbackTTL();
      const staleThreshold = ttlSeconds * STALE_THRESHOLD;

      return {
        isFresh: ageSeconds < staleThreshold,
        isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
        isExpired: ageSeconds >= ttlSeconds,
        lastRefresh,
        ttlSeconds,
      };
    } catch {
      return { isFresh: false, isStale: false, isExpired: true, lastRefresh: null, ttlSeconds: 0 };
    }
  }

  private calculateFallbackTTL(): number {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();
    const month = etNow.getMonth() + 1;
    const hours = etNow.getHours();
    const minutes = etNow.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    if (day === 0 || day === 6) return TTL_FALLBACK.WEEKEND;
    if (EARNINGS_SEASON_MONTHS.has(month) && timeInMinutes >= 570 && timeInMinutes <= 960) {
      return TTL_FALLBACK.EARNINGS_SEASON_MARKET;
    }
    if (EARNINGS_SEASON_MONTHS.has(month)) return TTL_FALLBACK.EARNINGS_SEASON_OFF;
    return TTL_FALLBACK.NORMAL;
  }

  private async getSmartTTLFromDB(symbol: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_earnings_surprises_cache_ttl', { p_symbol: symbol });

      if (!error && data !== null && data !== undefined) {
        const ttl = typeof data === 'number' ? data : parseInt(data);
        if (!isNaN(ttl) && ttl > 0) {
          return Math.min(ttl, TTL_FALLBACK.MAX_TTL);
        }
      }
    } catch {
      // RPC not available
    }
    return this.calculateFallbackTTL();
  }

  // ══════════════════════════════════════════════════════════════
  // SEC EDGAR DATA FETCHING
  // ══════════════════════════════════════════════════════════════

  private async fetchAndCacheEarningsData(
    symbol: string,
    maxQuarters: number
  ): Promise<EarningsSurpriseResult> {
    const admin = this.supabaseAdmin;
    const refreshId = admin ? await this.logRefreshStart(symbol) : null;
    const TOTAL_FETCH_TIMEOUT_MS = 50000;

    try {
      // Step 1: Resolve ticker to CIK
      let company = await this.secApi.getCIKByTicker(symbol);
      if (!company) {
        const searchResults = await this.secApi.searchCompanies(symbol, 1);
        if (searchResults.length > 0) {
          company = searchResults[0];
        }
      }
      if (!company) {
        throw new Error(`Company not found for "${symbol}". Try using the ticker symbol.`);
      }

      // Step 2: Fetch XBRL financial data from SEC EDGAR
      const xbrlData = await Promise.race([
        this.fetchXBRLEarningsData(company.cik, maxQuarters),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SEC EDGAR fetch timed out')), TOTAL_FETCH_TIMEOUT_MS)
        ),
      ]);

      console.log(`[EarningsSurprises] Fetched ${xbrlData.length} quarters of XBRL data for ${symbol}`);

      // Step 3: Fetch analyst estimates (from SEC EDGAR data)
      const estimates = await this.fetchEstimates(symbol, maxQuarters);

      // Step 4: Combine actual XBRL data with estimates
      const quarters = this.buildQuarters(symbol, company.cik, company.name, xbrlData, estimates);

      // Step 5: Compute OES scores and streaks
      this.computeOESScores(quarters);
      this.computeStreaks(quarters);
      this.computeComparisons(quarters);

      // Step 6: Persist to cache
      if (admin) {
        await this.persistQuarters(admin, symbol, quarters);
      }

      // Step 7: Calculate TTL and log refresh
      const ttl = await this.getSmartTTLFromDB(symbol);
      if (admin && refreshId) {
        await this.logRefreshComplete(refreshId, symbol, quarters.length, ttl);
      }

      // Step 8: Build result
      const sorted = [...quarters].sort((a, b) => {
        if (a.fiscalYear !== b.fiscalYear) return b.fiscalYear - a.fiscalYear;
        return b.fiscalQuarter - a.fiscalQuarter;
      });

      const recentWithData = sorted.filter(q => q.epsActual !== null);
      const currentScore = recentWithData[0]?.oesScore ?? 0;
      const currentLabel = recentWithData[0]?.surpriseLabel ?? 'In Line';
      const beatsTotal = recentWithData.filter(q => (q.epsSurprisePct ?? 0) > 0).length;
      const beatRate = recentWithData.length > 0 ? (beatsTotal / recentWithData.length) * 100 : 0;
      const avgSurprise = recentWithData.length > 0
        ? recentWithData.reduce((s, q) => s + (q.epsSurprisePct ?? 0), 0) / recentWithData.length
        : 0;

      return {
        symbol,
        companyName: company.name,
        cik: company.cik,
        quarters: sorted.slice(0, maxQuarters),
        currentScore,
        currentLabel,
        trend: this.calculateTrend(sorted),
        beatRate: Math.round(beatRate * 100) / 100,
        avgSurprisePct: Math.round(avgSurprise * 100) / 100,
        currentStreak: {
          type: recentWithData[0]?.streakType ?? 'none',
          length: recentWithData[0]?.streakLength ?? 0,
        },
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
        const cachedResult = await this.buildResultFromCache(symbol, maxQuarters, 'cache');
        if (cachedResult.quarters.length > 0) {
          console.warn(`[EarningsSurprises] Serving stale cache for ${symbol} after error: ${error.message}`);
          return cachedResult;
        }
      } catch {
        // Can't serve cache either
      }

      throw error;
    }
  }

  /**
   * Fetch XBRL earnings data from SEC EDGAR Company Facts API.
   * This gives us actual EPS and revenue from 10-Q/10-K filings.
   */
  private async fetchXBRLEarningsData(
    cik: string,
    maxQuarters: number
  ): Promise<XBRLFinancials[]> {
    try {
      const facts = await this.secApi.getCompanyFacts(cik);
      const usGaap = facts?.facts?.['us-gaap'];
      if (!usGaap) return [];

      // Extract quarterly and annual data
      const periodData: Record<string, XBRLFinancials> = {};

      // Key XBRL tags for earnings data
      const epsBasicTags = ['EarningsPerShareBasic'];
      const epsDilutedTags = ['EarningsPerShareDiluted'];
      const revenueTags = [
        'Revenues',
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'SalesRevenueNet',
        'RevenueFromContractWithCustomerIncludingAssessedTax',
      ];
      const netIncomeTags = ['NetIncomeLoss'];
      const grossProfitTags = ['GrossProfit'];
      const operatingIncomeTags = ['OperatingIncomeLoss'];

      const extractTag = (tags: string[], field: keyof XBRLFinancials, forms: string[]) => {
        for (const tag of tags) {
          const tagData = usGaap[tag]?.units?.USD || usGaap[tag]?.units?.['USD/shares'];
          if (!tagData) continue;

          for (const item of tagData) {
            if (!forms.includes(item.form)) continue;
            
            const endDate = item.end;
            const startDate = item.start;
            if (!endDate) continue;

            // For quarterly data: require start date and duration < 120 days
            // For annual: require start date and duration > 300 days
            let isQuarterly = false;
            let isAnnual = false;
            
            if (startDate && endDate) {
              const durationDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
              isQuarterly = durationDays < 120;
              isAnnual = durationDays > 300;
            }

            const fy = item.fy;
            const fp = item.fp; // Q1, Q2, Q3, Q4, FY

            if (!fy) continue;

            // Determine quarter number
            let quarter: number;
            if (fp === 'Q1') quarter = 1;
            else if (fp === 'Q2') quarter = 2;
            else if (fp === 'Q3') quarter = 3;
            else if (fp === 'Q4' || fp === 'FY') quarter = 4;
            else continue;

            // Skip annual aggregates for quarterly fields unless it's Q4
            if (fp === 'FY' && !isAnnual) continue;

            const key = `${fy}-Q${quarter}`;
            if (!periodData[key]) {
              periodData[key] = {
                fiscalYear: fy.toString(),
                fiscalPeriod: `Q${quarter}`,
                periodEndDate: endDate,
                documentType: item.form,
                rawTags: {},
              };
            }

            // Only set if not already set (first match wins — most specific tag)
            if ((periodData[key] as any)[field] === undefined) {
              (periodData[key] as any)[field] = item.val;
            }
          }
        }
      };

      // Extract all financial metrics
      extractTag(epsBasicTags, 'earningsPerShareBasic', ['10-Q', '10-K']);
      extractTag(epsDilutedTags, 'earningsPerShareDiluted', ['10-Q', '10-K']);
      extractTag(revenueTags, 'revenue', ['10-Q', '10-K']);
      extractTag(netIncomeTags, 'netIncome', ['10-Q', '10-K']);
      extractTag(grossProfitTags, 'grossProfit', ['10-Q', '10-K']);
      extractTag(operatingIncomeTags, 'operatingIncome', ['10-Q', '10-K']);

      // Convert to array and sort by date (newest first)
      return Object.values(periodData)
        .sort((a, b) => {
          const yearA = parseInt(a.fiscalYear || '0');
          const yearB = parseInt(b.fiscalYear || '0');
          if (yearA !== yearB) return yearB - yearA;
          const qA = parseInt(a.fiscalPeriod?.replace('Q', '') || '0');
          const qB = parseInt(b.fiscalPeriod?.replace('Q', '') || '0');
          return qB - qA;
        })
        .slice(0, maxQuarters);
    } catch (error) {
      console.error(`[EarningsSurprises] XBRL fetch error for CIK ${cik}:`, error);
      return [];
    }
  }

  /**
   * Fetch analyst consensus estimates.
   * Uses SEC EDGAR XBRL data as the source for earnings data.
   * Returns empty map if no estimates are available.
   */
  private async fetchEstimates(
    symbol: string,
    limit: number
  ): Promise<Map<string, { epsEstimate: number; revenueEstimate?: number }>> {
    const estimates = new Map<string, { epsEstimate: number; revenueEstimate?: number }>();

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(
        `${baseUrl}/api/calendar/earnings?symbol=${symbol}&limit=${limit}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        if (Array.isArray(data)) {
          for (const item of data) {
            const year = item.year || item.fiscalYear;
            const quarter = item.quarter || item.fiscalQuarter;
            if (year && quarter) {
              const key = `${year}-Q${quarter}`;
              estimates.set(key, {
                epsEstimate: item.estimate || item.epsEstimate,
                revenueEstimate: item.revenueEstimate,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[EarningsSurprises] Estimates fetch failed for ${symbol}, will use XBRL data only:`, error);
    }

    return estimates;
  }

  // ══════════════════════════════════════════════════════════════
  // DATA BUILDING
  // ══════════════════════════════════════════════════════════════

  private buildQuarters(
    symbol: string,
    cik: string,
    companyName: string,
    xbrlData: XBRLFinancials[],
    estimates: Map<string, { epsEstimate: number; revenueEstimate?: number }>
  ): EarningsSurpriseQuarter[] {
    const quarters: EarningsSurpriseQuarter[] = [];

    for (const xbrl of xbrlData) {
      const fy = parseInt(xbrl.fiscalYear || '0');
      const fq = parseInt(xbrl.fiscalPeriod?.replace('Q', '') || '0');
      if (!fy || !fq) continue;

      const key = `${fy}-Q${fq}`;
      const est = estimates.get(key);

      const epsActual = xbrl.earningsPerShareDiluted ?? xbrl.earningsPerShareBasic ?? null;
      const epsEstimate = est?.epsEstimate ?? null;
      const revenueActual = xbrl.revenue ?? null;
      const revenueEstimate = est?.revenueEstimate ?? null;

      // Calculate surprises
      let epsSurprise: number | null = null;
      let epsSurprisePct: number | null = null;
      if (epsActual !== null && epsEstimate !== null) {
        epsSurprise = epsActual - epsEstimate;
        epsSurprisePct = epsEstimate !== 0 ? (epsSurprise / Math.abs(epsEstimate)) * 100 : 0;
      }

      let revenueSurprise: number | null = null;
      let revenueSurprisePct: number | null = null;
      if (revenueActual !== null && revenueEstimate !== null) {
        revenueSurprise = revenueActual - revenueEstimate;
        revenueSurprisePct = revenueEstimate !== 0 ? (revenueSurprise / Math.abs(revenueEstimate)) * 100 : 0;
      }

      // Calculate margins
      const grossMarginPct = (revenueActual && xbrl.grossProfit)
        ? (xbrl.grossProfit / revenueActual) * 100
        : null;
      const operatingMarginPct = (revenueActual && xbrl.operatingIncome)
        ? (xbrl.operatingIncome / revenueActual) * 100
        : null;
      const netMarginPct = (revenueActual && xbrl.netIncome)
        ? (xbrl.netIncome / revenueActual) * 100
        : null;

      quarters.push({
        symbol,
        fiscalYear: fy,
        fiscalQuarter: fq,
        periodEndDate: xbrl.periodEndDate || null,
        reportDate: null, // Will be populated from filing date if available
        epsActual,
        epsEstimate,
        epsSurprise,
        epsSurprisePct: epsSurprisePct !== null ? Math.round(epsSurprisePct * 100) / 100 : null,
        epsBasic: xbrl.earningsPerShareBasic ?? null,
        epsDiluted: xbrl.earningsPerShareDiluted ?? null,
        revenueActual,
        revenueEstimate,
        revenueSurprise,
        revenueSurprisePct: revenueSurprisePct !== null ? Math.round(revenueSurprisePct * 100) / 100 : null,
        netIncome: xbrl.netIncome ?? null,
        grossProfit: xbrl.grossProfit ?? null,
        operatingIncome: xbrl.operatingIncome ?? null,
        grossMarginPct: grossMarginPct !== null ? Math.round(grossMarginPct * 100) / 100 : null,
        operatingMarginPct: operatingMarginPct !== null ? Math.round(operatingMarginPct * 100) / 100 : null,
        netMarginPct: netMarginPct !== null ? Math.round(netMarginPct * 100) / 100 : null,
        revenueYoyPct: null, // Computed later
        epsYoyPct: null,
        revenueQoqPct: null,
        epsQoqPct: null,
        oesScore: 0, // Computed later
        surpriseLabel: 'In Line',
        beatCountLast4: 0,
        missCountLast4: 0,
        streakType: 'none',
        streakLength: 0,
        filingType: xbrl.documentType || '10-Q',
        filingUrl: null,
        accessionNumber: null,
      });
    }

    return quarters;
  }

  // ══════════════════════════════════════════════════════════════
  // PROPRIETARY OES SCORING ALGORITHM
  // ══════════════════════════════════════════════════════════════

  /**
   * OmniFolio Earnings Surprise (OES) Score
   * 
   * Components:
   *   ESM (35%): EPS Surprise Magnitude
   *   RS  (25%): Revenue Surprise
   *   MT  (15%): Margin Trend
   *   CB  (15%): Consistency Bonus
   *   YM  (10%): Year-over-Year Momentum
   */
  private computeOESScores(quarters: EarningsSurpriseQuarter[]): void {
    // Sort oldest to newest for proper scoring
    const sorted = [...quarters].sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
      return a.fiscalQuarter - b.fiscalQuarter;
    });

    for (let i = 0; i < sorted.length; i++) {
      const q = sorted[i];
      if (q.epsActual === null || q.epsEstimate === null) {
        q.oesScore = 0;
        q.surpriseLabel = 'N/A';
        continue;
      }

      // ── ESM: EPS Surprise Magnitude (35%) ────────────────
      // Scale: 0% surprise = 0, ±5% = ±50, ±10%+ = ±100
      const esm = q.epsSurprisePct !== null
        ? Math.max(-100, Math.min(100, (q.epsSurprisePct / 10) * 100))
        : 0;

      // ── RS: Revenue Surprise (25%) ───────────────────────
      // Scale: 0% surprise = 0, ±3% = ±50, ±6%+ = ±100
      const rs = q.revenueSurprisePct !== null
        ? Math.max(-100, Math.min(100, (q.revenueSurprisePct / 6) * 100))
        : 0;

      // ── MT: Margin Trend (15%) ───────────────────────────
      // Compare current margins to previous quarter
      let mt = 0;
      if (i > 0) {
        const prev = sorted[i - 1];
        if (q.netMarginPct !== null && prev.netMarginPct !== null) {
          const marginChange = q.netMarginPct - prev.netMarginPct;
          // Expanding margins = positive, contracting = negative
          mt = Math.max(-100, Math.min(100, marginChange * 10));
        }
      }

      // ── CB: Consistency Bonus (15%) ──────────────────────
      // Count consecutive beats/misses looking backward
      let cb = 0;
      let consecutiveSameDirection = 0;
      const currentDirection = (q.epsSurprisePct ?? 0) > 0 ? 'beat' : (q.epsSurprisePct ?? 0) < 0 ? 'miss' : 'inline';

      if (currentDirection !== 'inline') {
        for (let j = i - 1; j >= Math.max(0, i - 7); j--) {
          const prevSurprise = sorted[j].epsSurprisePct ?? 0;
          const prevDirection = prevSurprise > 0 ? 'beat' : prevSurprise < 0 ? 'miss' : 'inline';
          if (prevDirection === currentDirection) {
            consecutiveSameDirection++;
          } else {
            break;
          }
        }
        // 10 points per consecutive quarter, max 100
        const cbMagnitude = Math.min(consecutiveSameDirection * 10, 100);
        cb = currentDirection === 'beat' ? cbMagnitude : -cbMagnitude;
      }

      // ── YM: Year-over-Year Momentum (10%) ────────────────
      let ym = 0;
      if (q.epsYoyPct !== null) {
        // YoY EPS growth: +20% = +100, -20% = -100
        ym = Math.max(-100, Math.min(100, (q.epsYoyPct / 20) * 100));
      }

      // ── Composite Score ────────────────────────────────────
      const oesScore = (esm * 0.35) + (rs * 0.25) + (mt * 0.15) + (cb * 0.15) + (ym * 0.10);
      q.oesScore = Math.max(-100, Math.min(100, Math.round(oesScore * 100) / 100));
      q.surpriseLabel = this.scoreToLabel(q.oesScore);
    }

    // Copy back to original array
    const scoreMap = new Map<string, EarningsSurpriseQuarter>();
    for (const q of sorted) {
      scoreMap.set(`${q.fiscalYear}-${q.fiscalQuarter}`, q);
    }
    for (const q of quarters) {
      const updated = scoreMap.get(`${q.fiscalYear}-${q.fiscalQuarter}`);
      if (updated) {
        q.oesScore = updated.oesScore;
        q.surpriseLabel = updated.surpriseLabel;
      }
    }
  }

  /**
   * Compute YoY and QoQ comparisons
   */
  private computeComparisons(quarters: EarningsSurpriseQuarter[]): void {
    const byKey = new Map<string, EarningsSurpriseQuarter>();
    for (const q of quarters) {
      byKey.set(`${q.fiscalYear}-${q.fiscalQuarter}`, q);
    }

    for (const q of quarters) {
      // YoY: same quarter, previous year
      const yoyKey = `${q.fiscalYear - 1}-${q.fiscalQuarter}`;
      const yoy = byKey.get(yoyKey);
      if (yoy) {
        if (q.epsActual !== null && yoy.epsActual !== null && yoy.epsActual !== 0) {
          q.epsYoyPct = Math.round(((q.epsActual - yoy.epsActual) / Math.abs(yoy.epsActual)) * 100 * 100) / 100;
        }
        if (q.revenueActual !== null && yoy.revenueActual !== null && yoy.revenueActual !== 0) {
          q.revenueYoyPct = Math.round(((q.revenueActual - yoy.revenueActual) / Math.abs(yoy.revenueActual)) * 100 * 100) / 100;
        }
      }

      // QoQ: previous quarter
      let prevYear = q.fiscalYear;
      let prevQ = q.fiscalQuarter - 1;
      if (prevQ === 0) { prevQ = 4; prevYear--; }
      const qoqKey = `${prevYear}-${prevQ}`;
      const qoq = byKey.get(qoqKey);
      if (qoq) {
        if (q.epsActual !== null && qoq.epsActual !== null && qoq.epsActual !== 0) {
          q.epsQoqPct = Math.round(((q.epsActual - qoq.epsActual) / Math.abs(qoq.epsActual)) * 100 * 100) / 100;
        }
        if (q.revenueActual !== null && qoq.revenueActual !== null && qoq.revenueActual !== 0) {
          q.revenueQoqPct = Math.round(((q.revenueActual - qoq.revenueActual) / Math.abs(qoq.revenueActual)) * 100 * 100) / 100;
        }
      }
    }
  }

  /**
   * Compute beat/miss streaks
   */
  private computeStreaks(quarters: EarningsSurpriseQuarter[]): void {
    // Sort newest first
    const sorted = [...quarters]
      .filter(q => q.epsActual !== null && q.epsEstimate !== null)
      .sort((a, b) => {
        if (a.fiscalYear !== b.fiscalYear) return b.fiscalYear - a.fiscalYear;
        return b.fiscalQuarter - a.fiscalQuarter;
      });

    if (sorted.length === 0) return;

    // Determine current streak
    const firstDirection = (sorted[0].epsSurprisePct ?? 0) > 0 ? 'beat_streak' : (sorted[0].epsSurprisePct ?? 0) < 0 ? 'miss_streak' : 'none';
    let streakLength = 1;

    for (let i = 1; i < sorted.length; i++) {
      const dir = (sorted[i].epsSurprisePct ?? 0) > 0 ? 'beat_streak' : (sorted[i].epsSurprisePct ?? 0) < 0 ? 'miss_streak' : 'none';
      if (dir === firstDirection && dir !== 'none') {
        streakLength++;
      } else {
        break;
      }
    }

    // Count beats/misses in last 4 quarters
    const last4 = sorted.slice(0, 4);
    const beats = last4.filter(q => (q.epsSurprisePct ?? 0) > 0).length;
    const misses = last4.filter(q => (q.epsSurprisePct ?? 0) < 0).length;

    // Apply to all quarters (most recent gets the full streak info)
    for (const q of quarters) {
      q.beatCountLast4 = beats;
      q.missCountLast4 = misses;
    }
    if (sorted.length > 0) {
      sorted[0].streakType = firstDirection;
      sorted[0].streakLength = streakLength;
    }

    // Map back
    for (const q of quarters) {
      const match = sorted.find(s => s.fiscalYear === q.fiscalYear && s.fiscalQuarter === q.fiscalQuarter);
      if (match) {
        q.streakType = match.streakType;
        q.streakLength = match.streakLength;
        q.beatCountLast4 = match.beatCountLast4;
        q.missCountLast4 = match.missCountLast4;
      }
    }
  }

  private scoreToLabel(score: number): string {
    if (score >= 50) return 'Massive Beat';
    if (score >= 20) return 'Beat';
    if (score > -20) return 'In Line';
    if (score > -50) return 'Miss';
    return 'Massive Miss';
  }

  private calculateTrend(sortedDesc: EarningsSurpriseQuarter[]): 'improving' | 'declining' | 'stable' {
    const withData = sortedDesc.filter(q => q.epsActual !== null);
    if (withData.length < 4) return 'stable';

    const recent = withData.slice(0, 4);
    const older = withData.slice(4, 8);
    if (older.length === 0) return 'stable';

    const avgRecent = recent.reduce((s, q) => s + q.oesScore, 0) / recent.length;
    const avgOlder = older.reduce((s, q) => s + q.oesScore, 0) / older.length;

    const diff = avgRecent - avgOlder;
    if (diff > 10) return 'improving';
    if (diff < -10) return 'declining';
    return 'stable';
  }

  // ══════════════════════════════════════════════════════════════
  // DATABASE PERSISTENCE
  // ══════════════════════════════════════════════════════════════

  private async persistQuarters(
    admin: SupabaseClient,
    symbol: string,
    quarters: EarningsSurpriseQuarter[]
  ): Promise<void> {
    if (quarters.length === 0) return;

    const ttl = await this.getSmartTTLFromDB(symbol);
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const rows = quarters.map(q => ({
      symbol: q.symbol,
      cik: null as string | null,
      company_name: null as string | null,
      fiscal_year: q.fiscalYear,
      fiscal_quarter: q.fiscalQuarter,
      period_end_date: q.periodEndDate,
      report_date: q.reportDate,
      eps_actual: q.epsActual,
      eps_estimate: q.epsEstimate,
      eps_surprise: q.epsSurprise,
      eps_surprise_pct: q.epsSurprisePct,
      eps_basic: q.epsBasic,
      eps_diluted: q.epsDiluted,
      revenue_actual: q.revenueActual,
      revenue_estimate: q.revenueEstimate,
      revenue_surprise: q.revenueSurprise,
      revenue_surprise_pct: q.revenueSurprisePct,
      net_income: q.netIncome,
      gross_profit: q.grossProfit,
      operating_income: q.operatingIncome,
      gross_margin_pct: q.grossMarginPct,
      operating_margin_pct: q.operatingMarginPct,
      net_margin_pct: q.netMarginPct,
      revenue_yoy_pct: q.revenueYoyPct,
      eps_yoy_pct: q.epsYoyPct,
      revenue_qoq_pct: q.revenueQoqPct,
      eps_qoq_pct: q.epsQoqPct,
      oes_score: q.oesScore,
      surprise_label: q.surpriseLabel,
      beat_count_last_4: q.beatCountLast4,
      miss_count_last_4: q.missCountLast4,
      streak_type: q.streakType,
      streak_length: q.streakLength,
      filing_type: q.filingType,
      filing_url: q.filingUrl,
      accession_number: q.accessionNumber,
      source: 'sec-edgar',
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
    }));

    // Batch upsert
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await admin
        .from('earnings_surprises_cache')
        .upsert(batch, {
          onConflict: 'symbol,fiscal_year,fiscal_quarter',
        });

      if (error) {
        console.error(`[EarningsSurprises] Cache upsert error (batch ${i}):`, error);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE BUILDING
  // ══════════════════════════════════════════════════════════════

  private async buildResultFromCache(
    symbol: string,
    maxQuarters: number,
    source: 'cache' | 'fresh'
  ): Promise<EarningsSurpriseResult> {
    const { data: cachedRows, error } = await this.supabase
      .from('earnings_surprises_cache')
      .select('*')
      .eq('symbol', symbol)
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })
      .limit(maxQuarters);

    if (error || !cachedRows || cachedRows.length === 0) {
      return this.buildEmptyResult(symbol, source);
    }

    const quarters: EarningsSurpriseQuarter[] = cachedRows.map(this.mapDbRowToQuarter);

    const withData = quarters.filter(q => q.epsActual !== null);
    const currentScore = withData[0]?.oesScore ?? 0;
    const currentLabel = withData[0]?.surpriseLabel ?? 'In Line';
    const beatsTotal = withData.filter(q => (q.epsSurprisePct ?? 0) > 0).length;
    const beatRate = withData.length > 0 ? (beatsTotal / withData.length) * 100 : 0;
    const avgSurprise = withData.length > 0
      ? withData.reduce((s, q) => s + (q.epsSurprisePct ?? 0), 0) / withData.length
      : 0;

    // Get cache metadata
    const { data: refreshData } = await this.supabase
      .from('earnings_surprises_refresh_log')
      .select('completed_at, ttl_seconds')
      .eq('symbol', symbol)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1);

    const cachedAt = refreshData?.[0]?.completed_at || null;
    const ttl = await this.getSmartTTLFromDB(symbol);
    const expiresAt = cachedAt
      ? new Date(new Date(cachedAt).getTime() + ttl * 1000).toISOString()
      : null;

    return {
      symbol,
      companyName: cachedRows[0]?.company_name || null,
      cik: cachedRows[0]?.cik || null,
      quarters,
      currentScore,
      currentLabel,
      trend: this.calculateTrend(quarters),
      beatRate: Math.round(beatRate * 100) / 100,
      avgSurprisePct: Math.round(avgSurprise * 100) / 100,
      currentStreak: {
        type: withData[0]?.streakType ?? 'none',
        length: withData[0]?.streakLength ?? 0,
      },
      source,
      cachedAt,
      expiresAt,
    };
  }

  private buildEmptyResult(symbol: string, source: 'cache' | 'fresh'): EarningsSurpriseResult {
    return {
      symbol,
      companyName: null,
      cik: null,
      quarters: [],
      currentScore: 0,
      currentLabel: 'N/A',
      trend: 'stable',
      beatRate: 0,
      avgSurprisePct: 0,
      currentStreak: { type: 'none', length: 0 },
      source,
      cachedAt: null,
      expiresAt: null,
    };
  }

  private mapDbRowToQuarter(row: any): EarningsSurpriseQuarter {
    return {
      symbol: row.symbol,
      fiscalYear: row.fiscal_year,
      fiscalQuarter: row.fiscal_quarter,
      periodEndDate: row.period_end_date || null,
      reportDate: row.report_date || null,
      epsActual: row.eps_actual !== null ? parseFloat(row.eps_actual) : null,
      epsEstimate: row.eps_estimate !== null ? parseFloat(row.eps_estimate) : null,
      epsSurprise: row.eps_surprise !== null ? parseFloat(row.eps_surprise) : null,
      epsSurprisePct: row.eps_surprise_pct !== null ? parseFloat(row.eps_surprise_pct) : null,
      epsBasic: row.eps_basic !== null ? parseFloat(row.eps_basic) : null,
      epsDiluted: row.eps_diluted !== null ? parseFloat(row.eps_diluted) : null,
      revenueActual: row.revenue_actual !== null ? parseFloat(row.revenue_actual) : null,
      revenueEstimate: row.revenue_estimate !== null ? parseFloat(row.revenue_estimate) : null,
      revenueSurprise: row.revenue_surprise !== null ? parseFloat(row.revenue_surprise) : null,
      revenueSurprisePct: row.revenue_surprise_pct !== null ? parseFloat(row.revenue_surprise_pct) : null,
      netIncome: row.net_income !== null ? parseFloat(row.net_income) : null,
      grossProfit: row.gross_profit !== null ? parseFloat(row.gross_profit) : null,
      operatingIncome: row.operating_income !== null ? parseFloat(row.operating_income) : null,
      grossMarginPct: row.gross_margin_pct !== null ? parseFloat(row.gross_margin_pct) : null,
      operatingMarginPct: row.operating_margin_pct !== null ? parseFloat(row.operating_margin_pct) : null,
      netMarginPct: row.net_margin_pct !== null ? parseFloat(row.net_margin_pct) : null,
      revenueYoyPct: row.revenue_yoy_pct !== null ? parseFloat(row.revenue_yoy_pct) : null,
      epsYoyPct: row.eps_yoy_pct !== null ? parseFloat(row.eps_yoy_pct) : null,
      revenueQoqPct: row.revenue_qoq_pct !== null ? parseFloat(row.revenue_qoq_pct) : null,
      epsQoqPct: row.eps_qoq_pct !== null ? parseFloat(row.eps_qoq_pct) : null,
      oesScore: parseFloat(row.oes_score) || 0,
      surpriseLabel: row.surprise_label || 'In Line',
      beatCountLast4: row.beat_count_last_4 || 0,
      missCountLast4: row.miss_count_last_4 || 0,
      streakType: row.streak_type || 'none',
      streakLength: row.streak_length || 0,
      filingType: row.filing_type || '10-Q',
      filingUrl: row.filing_url || null,
      accessionNumber: row.accession_number || null,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // BACKGROUND REFRESH
  // ══════════════════════════════════════════════════════════════

  private async refreshInBackground(symbol: string, quarters: number): Promise<void> {
    try {
      await this.fetchAndCacheEarningsData(symbol, quarters);
      console.log(`[EarningsSurprises] ✅ Background refresh completed for ${symbol}`);
    } catch (error) {
      console.error(`[EarningsSurprises] ❌ Background refresh failed for ${symbol}:`, error);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // REFRESH LOGGING
  // ══════════════════════════════════════════════════════════════

  private async logRefreshStart(symbol: string): Promise<string | null> {
    const admin = this.supabaseAdmin;
    if (!admin) return null;

    const { data, error } = await admin
      .from('earnings_surprises_refresh_log')
      .insert({
        symbol,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[EarningsSurprises] Refresh log start error:', error);
      return null;
    }
    return data?.id || null;
  }

  private async logRefreshComplete(
    id: string,
    symbol: string,
    quartersParsed: number,
    ttlSeconds: number
  ): Promise<void> {
    const admin = this.supabaseAdmin;
    if (!admin) return;

    await admin
      .from('earnings_surprises_refresh_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        quarters_parsed: quartersParsed,
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
      .from('earnings_surprises_refresh_log')
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

export const earningsSurprisesService = new EarningsSurprisesService();
export default earningsSurprisesService;
