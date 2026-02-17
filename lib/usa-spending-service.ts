/**
 * OmniFolio Proprietary USA Spending Service
 *
 * Computes government contracting influence scores from public federal data.
 * NO third-party APIs — 100% proprietary, 100% legal.
 *
 * Data Source: USAspending.gov API v2
 *   URL: https://api.usaspending.gov/api/v2/
 *   Auth: None required (public data)
 *   Rate: ~120 req/min (generous)
 *
 * Cache Strategy: Supabase DB with smart TTL
 *
 * Scoring Algorithm: OmniFolio Government Influence (OGI) Score
 * ─────────────────────────────────────────────────────────────
 * The OGI score measures a company's federal contracting depth:
 *   1. Contract Magnitude (CM):  Total $ obligated relative to peers (log-scaled)
 *   2. Agency Breadth (AB):      Number of distinct agencies contracting
 *   3. Sector Diversity (SD):    Number of NAICS/PSC categories
 *   4. Contract Volume (CV):     Number of distinct awards
 *   5. Consistency (CO):         Sustained contracting over multiple years
 *   6. Trend (TR):               Spending direction (increasing/decreasing)
 *
 * OGI = clamp( CM*0.30 + AB*0.15 + SD*0.15 + CV*0.10 + CO*0.15 + TR*0.15, 0, 100 )
 *
 * Copyright OmniFolio. All rights reserved.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  USASpendingAPI,
  createUSASpendingClient,
  SpendingAward,
  NAICS_SECTORS,
  AGENCY_CATEGORIES,
} from './api/usa-spending-api';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

export interface SpendingFiscalYear {
  symbol: string;
  year: number;
  ogiScore: number;
  influenceLabel: string;
  totalObligated: number;
  awardCount: number;
  uniqueAgencies: number;
  uniqueSectors: number;
  topAgencies: { name: string; amount: number; count: number }[];
  topSectors: { code: string; name: string; amount: number }[];
  latestActionDate: string | null;
}

export interface SpendingActivity {
  symbol: string;
  awardId: string;
  actionDate: string;
  fiscalYear: number;
  awardType: string;
  awardDescription: string | null;
  totalObligation: number | null;
  federalActionObligation: number | null;
  totalOutlay: number | null;
  recipientName: string;
  recipientParentName: string | null;
  awardingAgencyName: string;
  awardingSubAgencyName: string | null;
  fundingAgencyName: string | null;
  performanceCity: string | null;
  performanceState: string | null;
  performanceCountry: string;
  performanceStartDate: string | null;
  performanceEndDate: string | null;
  naicsCode: string | null;
  naicsDescription: string | null;
  productServiceCode: string | null;
  permalink: string | null;
}

export interface SpendingSummary {
  totalObligated: number;
  totalAwards: number;
  totalFiscalYears: number;
  averagePerYear: number;
  uniqueAgencies: number;
  uniqueSubAgencies: number;
  uniqueSectors: number;
  uniqueStates: number;
  topAgencies: { name: string; awardCount: number; totalObligated: number }[];
  topSubAgencies: { name: string; awardCount: number; totalObligated: number }[];
  topStates: { state: string; awardCount: number; totalObligated: number }[];
  spendByYear: { year: number; obligated: number; awardCount: number }[];
  awardTypeBreakdown: { type: string; count: number; amount: number }[];
}

export interface SpendingResult {
  symbol: string;
  companyName: string | null;
  fiscalYears: SpendingFiscalYear[];
  activities: SpendingActivity[];
  summary: SpendingSummary;
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
  NORMAL: 12 * 60 * 60,     // 12 hours
  WEEKEND: 48 * 60 * 60,    // 48 hours
  MAX_TTL: 72 * 60 * 60,    // 72 hours absolute max
};

const STALE_THRESHOLD = 0.75;

// ══════════════════════════════════════════════════════════════════
// SERVER-SIDE IN-MEMORY CACHE
// ══════════════════════════════════════════════════════════════════

interface MemoryCacheEntry {
  result: SpendingResult;
  storedAt: number;
  ttlMs: number;
}

const _memoryCache = new Map<string, MemoryCacheEntry>();
const _fetchLocks = new Map<string, Promise<SpendingResult>>();
const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const MEMORY_CACHE_MAX_ENTRIES = 200;

function getFromMemoryCache(key: string): SpendingResult | null {
  const entry = _memoryCache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.storedAt;
  if (age > entry.ttlMs) {
    _memoryCache.delete(key);
    return null;
  }
  return entry.result;
}

function setInMemoryCache(key: string, result: SpendingResult, ttlMs: number = MEMORY_CACHE_TTL_MS): void {
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
// USA SPENDING SERVICE
// ══════════════════════════════════════════════════════════════════

class USASpendingService {
  private _supabase: SupabaseClient | null = null;
  private _supabaseAdmin: SupabaseClient | null = null;
  private _spendingApi: USASpendingAPI | null = null;

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

  private get spendingApi(): USASpendingAPI {
    if (!this._spendingApi) {
      this._spendingApi = createUSASpendingClient();
    }
    return this._spendingApi;
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════

  /**
   * Get USA spending data for a ticker symbol.
   *
   * Resolution order (fastest → slowest):
   *   1. Server in-memory cache (instant, shared across all users)
   *   2. Supabase DB cache (fast, shared across all servers/instances)
   *   3. USAspending.gov API (slow, external)
   */
  async getSpendingData(
    symbol: string,
    options: {
      years?: number;
      forceRefresh?: boolean;
      includeActivities?: boolean;
    } = {}
  ): Promise<SpendingResult> {
    const { years = 3, forceRefresh = false, includeActivities = true } = options;
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `${upperSymbol}:${years}`;

    // ── 1. Memory cache (instant, ~0ms) ──────────────────────
    if (!forceRefresh) {
      const memoryCached = getFromMemoryCache(cacheKey);
      if (memoryCached) {
        console.log(`[USASpendingService] ⚡ Memory cache hit for ${upperSymbol}`);
        return {
          ...memoryCached,
          activities: includeActivities ? memoryCached.activities : [],
        };
      }
    }

    // ── 2. Global fetch lock (prevent duplicate API calls) ───
    const lockKey = `${upperSymbol}:${years}:${forceRefresh}`;
    if (_fetchLocks.has(lockKey)) {
      console.log(`[USASpendingService] 🔒 Waiting on existing fetch for ${upperSymbol}`);
      const locked = await _fetchLocks.get(lockKey)!;
      return {
        ...locked,
        activities: includeActivities ? locked.activities : [],
      };
    }

    // ── 3. Acquire lock and run fetch pipeline ───────────────
    const fetchPromise = this._getSpendingInternal(upperSymbol, years, forceRefresh, true)
      .then(result => {
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
   * Calculate smart TTL
   */
  calculateSmartTTL(): number {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();

    if (day === 0 || day === 6) return TTL_FALLBACK.WEEKEND;
    return TTL_FALLBACK.NORMAL;
  }

  /**
   * Get smart TTL from DB (uses RPC function if available)
   */
  private async getSmartTTLFromDB(symbol: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_usa_spending_last_refresh_date', { p_symbol: symbol });

      if (!error && data && data.length > 0) {
        const ttl = data[0].smart_ttl;
        if (typeof ttl === 'number' && ttl > 0) {
          return Math.min(ttl, TTL_FALLBACK.MAX_TTL);
        }
      }
    } catch {
      // RPC not available
    }
    return this.calculateSmartTTL();
  }

  // ══════════════════════════════════════════════════════════════
  // INTERNAL: Main Orchestration
  // ══════════════════════════════════════════════════════════════

  private async _getSpendingInternal(
    symbol: string,
    years: number,
    forceRefresh: boolean,
    includeActivities: boolean
  ): Promise<SpendingResult> {
    // Step 1: Check Supabase DB cache freshness
    if (!forceRefresh) {
      const cacheCheck = await this.checkCacheFreshness(symbol);

      if (cacheCheck.isFresh) {
        console.log(`[USASpendingService] ✅ Serving fresh DB cache for ${symbol}`);
        return this.buildResultFromCache(symbol, years, includeActivities, 'cache');
      }

      if (cacheCheck.isStale) {
        console.log(`[USASpendingService] ⚡ Serving stale DB cache for ${symbol}, refreshing in background`);
        this.refreshInBackground(symbol, years).catch(err =>
          console.error(`[USASpendingService] Background refresh failed for ${symbol}:`, err)
        );
        return this.buildResultFromCache(symbol, years, includeActivities, 'cache');
      }

      // Cache expired — always try serving DB data first before hitting external API
      if (cacheCheck.isExpired) {
        try {
          const cachedResult = await this.buildResultFromCache(symbol, years, includeActivities, 'cache');
          if (cachedResult.fiscalYears.length > 0 || cachedResult.summary.totalAwards > 0) {
            console.log(`[USASpendingService] 📦 Serving expired DB cache for ${symbol}, refreshing in background`);
            this.refreshInBackground(symbol, years).catch(err =>
              console.error(`[USASpendingService] Background refresh failed for ${symbol}:`, err)
            );
            return cachedResult;
          }
        } catch (cacheError) {
          console.warn(`[USASpendingService] DB cache read failed for ${symbol}:`, cacheError);
        }
      }

      // No cache data at all — check if there's ANY data in the cache table
      // (even without a refresh log entry, we might have data from a previous run)
      try {
        const fallbackResult = await this.buildResultFromCache(symbol, years, includeActivities, 'cache');
        if (fallbackResult.fiscalYears.length > 0 || fallbackResult.summary.totalAwards > 0) {
          console.log(`[USASpendingService] 📦 Found orphaned cache data for ${symbol}, serving + refreshing`);
          this.refreshInBackground(symbol, years).catch(err =>
            console.error(`[USASpendingService] Background refresh failed for ${symbol}:`, err)
          );
          return fallbackResult;
        }
      } catch {
        // No fallback data either
      }
    }

    // Step 2: No usable cache — must fetch fresh from USAspending.gov
    console.log(`[USASpendingService] 🔄 Fetching fresh data for ${symbol}`);
    return this.fetchAndCacheSpendingData(symbol, years, includeActivities);
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
    // Try RPC function first (fastest, most accurate)
    try {
      const { data, error } = await this.supabase
        .rpc('get_usa_spending_last_refresh_date', { p_symbol: symbol });

      if (!error && data && data.length > 0) {
        const info = data[0];
        const ttlSeconds = info.smart_ttl || this.calculateSmartTTL();
        const ageSeconds = info.age_seconds;
        const staleThreshold = ttlSeconds * STALE_THRESHOLD;

        return {
          isFresh: ageSeconds < staleThreshold,
          isStale: ageSeconds >= staleThreshold && ageSeconds < ttlSeconds,
          isExpired: ageSeconds >= ttlSeconds,
          lastRefresh: info.last_refresh_at ? new Date(info.last_refresh_at) : null,
          ttlSeconds,
        };
      }
    } catch {
      // RPC not available, fall through
    }

    // Fallback: query refresh log directly
    try {
      const { data: refreshData } = await this.supabase
        .from('usa_spending_refresh_log')
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
      return this.checkCacheFreshnessFromData(symbol);
    }
  }

  private async checkCacheFreshnessFromData(symbol: string): Promise<{
    isFresh: boolean;
    isStale: boolean;
    isExpired: boolean;
    lastRefresh: Date | null;
    ttlSeconds: number;
  }> {
    try {
      const { data: cacheRows } = await this.supabase
        .from('usa_spending_cache')
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

  // ══════════════════════════════════════════════════════════════
  // DATA FETCHING & CACHING
  // ══════════════════════════════════════════════════════════════

  private async fetchAndCacheSpendingData(
    symbol: string,
    years: number,
    includeActivities: boolean
  ): Promise<SpendingResult> {
    const admin = this.supabaseAdmin;
    const refreshId = admin ? await this.logRefreshStart(symbol) : null;
    const startMs = Date.now();
    const TOTAL_FETCH_TIMEOUT_MS = 50000;

    try {
      const rawAwards = await Promise.race([
        this.spendingApi.getByTicker(symbol, { years, maxResults: 200 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('USAspending.gov fetch timed out')), TOTAL_FETCH_TIMEOUT_MS)
        ),
      ]);

      const elapsedMs = Date.now() - startMs;
      console.log(`[USASpendingService] Fetched ${rawAwards.length} awards for ${symbol} in ${elapsedMs}ms`);

      const activities = this.transformAwards(symbol, rawAwards);

      if (admin) {
        await this.persistActivities(admin, symbol, activities);
      }

      const fiscalYears = this.aggregateFiscalYears(symbol, activities, years);
      const summary = this.computeSummary(activities);

      const ttl = await this.getSmartTTLFromDB(symbol);
      if (admin && refreshId) {
        await this.logRefreshComplete(refreshId, symbol, rawAwards.length, ttl);
      }

      const sortedFY = [...fiscalYears].sort((a, b) => b.year - a.year);
      const currentScore = sortedFY.find(fy => fy.awardCount > 0)?.ogiScore ?? 0;
      const currentLabel = sortedFY.find(fy => fy.awardCount > 0)?.influenceLabel ?? 'Minimal';

      return {
        symbol,
        companyName: activities[0]?.recipientName || null,
        fiscalYears: sortedFY,
        activities: includeActivities ? activities.slice(0, 300) : [],
        summary,
        currentScore,
        currentLabel,
        trend: this.calculateTrend(sortedFY),
        source: 'fresh',
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      };
    } catch (error: any) {
      if (admin && refreshId) {
        await this.logRefreshFailed(refreshId, symbol, error.message);
      }

      try {
        const cachedResult = await this.buildResultFromCache(symbol, years, includeActivities, 'cache');
        if (cachedResult.activities.length > 0 || cachedResult.fiscalYears.length > 0) {
          console.warn(`[USASpendingService] Serving stale cache for ${symbol} after error: ${error.message}`);
          return cachedResult;
        }
      } catch { /* Can't serve cache either */ }

      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // DATA TRANSFORMATION
  // ══════════════════════════════════════════════════════════════

  private transformAwards(symbol: string, awards: SpendingAward[]): SpendingActivity[] {
    return awards.map(award => ({
      symbol,
      awardId: award.awardId,
      actionDate: award.actionDate || '',
      fiscalYear: award.fiscalYear,
      awardType: award.awardType,
      awardDescription: award.awardDescription,
      totalObligation: award.totalObligation,
      federalActionObligation: award.federalActionObligation,
      totalOutlay: award.totalOutlay,
      recipientName: award.recipientName,
      recipientParentName: award.recipientParentName,
      awardingAgencyName: award.awardingAgencyName,
      awardingSubAgencyName: award.awardingSubAgencyName,
      fundingAgencyName: award.fundingAgencyName,
      performanceCity: award.performanceCity,
      performanceState: award.performanceState,
      performanceCountry: award.performanceCountry || 'USA',
      performanceStartDate: award.performanceStartDate,
      performanceEndDate: award.performanceEndDate,
      naicsCode: award.naicsCode,
      naicsDescription: award.naicsDescription,
      productServiceCode: award.productServiceCode,
      permalink: award.permalink,
    }));
  }

  // ══════════════════════════════════════════════════════════════
  // PROPRIETARY OGI SCORING ALGORITHM
  // ══════════════════════════════════════════════════════════════

  private aggregateFiscalYears(
    symbol: string,
    activities: SpendingActivity[],
    years: number
  ): SpendingFiscalYear[] {
    const buckets = new Map<number, SpendingActivity[]>();

    for (const activity of activities) {
      const fy = activity.fiscalYear;
      if (!buckets.has(fy)) buckets.set(fy, []);
      buckets.get(fy)!.push(activity);
    }

    const results: SpendingFiscalYear[] = [];
    const now = new Date();
    const currentFY = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();

    for (let y = 0; y < years; y++) {
      const fy = currentFY - y;
      const fyActivities = buckets.get(fy) || [];
      const fyData = this.computeFiscalYearMetrics(symbol, fy, fyActivities);
      results.push(fyData);
    }

    this.applyTrendScoring(results);
    return results;
  }

  private computeFiscalYearMetrics(
    symbol: string,
    year: number,
    activities: SpendingActivity[]
  ): SpendingFiscalYear {
    const totalObligated = activities.reduce((sum, a) => sum + (a.totalObligation || 0), 0);
    const allAgencies = new Map<string, { amount: number; count: number }>();
    const allSectors = new Map<string, { name: string; amount: number }>();

    for (const a of activities) {
      // Agencies
      if (a.awardingAgencyName) {
        const existing = allAgencies.get(a.awardingAgencyName) || { amount: 0, count: 0 };
        existing.amount += a.totalObligation || 0;
        existing.count++;
        allAgencies.set(a.awardingAgencyName, existing);
      }

      // Sectors (from NAICS code first 2 digits)
      if (a.naicsCode) {
        const sectorCode = a.naicsCode.substring(0, 2);
        const sectorName = NAICS_SECTORS[sectorCode] || a.naicsDescription || sectorCode;
        const existing = allSectors.get(sectorCode) || { name: sectorName, amount: 0 };
        existing.amount += a.totalObligation || 0;
        allSectors.set(sectorCode, existing);
      }
    }

    const topAgencies = [...allAgencies.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([name, data]) => ({ name, amount: data.amount, count: data.count }));

    const topSectors = [...allSectors.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([code, data]) => ({ code, name: data.name, amount: data.amount }));

    const latestAction = activities.length > 0
      ? activities.reduce((latest, a) => a.actionDate > latest ? a.actionDate : latest, activities[0].actionDate)
      : null;

    const ogiScore = this.computeOGIScore({
      totalObligated,
      awardCount: activities.length,
      uniqueAgencies: allAgencies.size,
      uniqueSectors: allSectors.size,
    });

    return {
      symbol,
      year,
      ogiScore,
      influenceLabel: this.scoreToLabel(ogiScore),
      totalObligated,
      awardCount: activities.length,
      uniqueAgencies: allAgencies.size,
      uniqueSectors: allSectors.size,
      topAgencies,
      topSectors,
      latestActionDate: latestAction,
    };
  }

  /**
   * OmniFolio Government Influence (OGI) Score
   *
   * Components (single-year view):
   *   CM (30%): Contract Magnitude — log-scaled obligation relative to thresholds
   *   AB (15%): Agency Breadth — number of distinct agencies
   *   SD (15%): Sector Diversity — number of NAICS sectors
   *   CV (10%): Contract Volume — number of distinct awards
   *   CO (15%): Consistency — applied in post-processing
   *   TR (15%): Trend — applied in post-processing
   */
  private computeOGIScore(data: {
    totalObligated: number;
    awardCount: number;
    uniqueAgencies: number;
    uniqueSectors: number;
  }): number {
    if (data.awardCount === 0) return 0;

    // ── CM: Contract Magnitude (30%) ────────────────────────
    // Log-scaled: $0=0, $1M=20, $100M=50, $1B=70, $10B+=100
    let cm = 0;
    if (data.totalObligated > 0) {
      const logSpend = Math.log10(Math.abs(data.totalObligated));
      cm = Math.min(100, Math.max(0, (logSpend - 5) * 20));
    }

    // ── AB: Agency Breadth (15%) ────────────────────────────
    // 1 agency = 15, 3 = 45, 5+ = 75, 8+ = 100
    const ab = Math.min(100, data.uniqueAgencies * 13);

    // ── SD: Sector Diversity (15%) ──────────────────────────
    // 1 sector = 20, 3 = 60, 5+ = 100
    const sd = Math.min(100, data.uniqueSectors * 20);

    // ── CV: Contract Volume (10%) ───────────────────────────
    // 1 award = 5, 10 = 30, 50 = 60, 100+ = 100
    const cv = Math.min(100, Math.log2(Math.max(1, data.awardCount)) * 14);

    // Composite (CO and TR applied in post-processing)
    const baseScore = (cm * 0.30 + ab * 0.15 + sd * 0.15 + cv * 0.10) / 0.70;

    return Math.max(0, Math.min(100, Math.round(baseScore * 100) / 100));
  }

  private applyTrendScoring(fiscalYears: SpendingFiscalYear[]): void {
    const sorted = [...fiscalYears].sort((a, b) => a.year - b.year);

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].awardCount === 0) continue;

      // Consistency: count consecutive years with awards
      let consecutiveActive = 0;
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        if (sorted[j].awardCount > 0) consecutiveActive++;
        else break;
      }

      const coBonus = Math.min(consecutiveActive * 5, 15);

      // Trend: compare spend to previous year
      let trBonus = 0;
      if (i > 0 && sorted[i - 1].totalObligated > 0) {
        const ratio = sorted[i].totalObligated / sorted[i - 1].totalObligated;
        if (ratio > 1.5) trBonus = 10;
        else if (ratio > 1.1) trBonus = 5;
        else if (ratio < 0.5) trBonus = -5;
        else if (ratio < 0.9) trBonus = -3;
      }

      sorted[i].ogiScore = Math.max(0, Math.min(100, sorted[i].ogiScore + coBonus + trBonus));
      sorted[i].influenceLabel = this.scoreToLabel(sorted[i].ogiScore);
    }

    // Update original array
    const scoreMap = new Map<number, { ogiScore: number; influenceLabel: string }>();
    for (const fy of sorted) {
      scoreMap.set(fy.year, { ogiScore: fy.ogiScore, influenceLabel: fy.influenceLabel });
    }
    for (const fy of fiscalYears) {
      const update = scoreMap.get(fy.year);
      if (update) {
        fy.ogiScore = update.ogiScore;
        fy.influenceLabel = update.influenceLabel;
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

  private calculateTrend(sortedFYDesc: SpendingFiscalYear[]): 'increasing' | 'decreasing' | 'stable' {
    const active = sortedFYDesc.filter(fy => fy.awardCount > 0);
    if (active.length < 2) return 'stable';

    const recent = active[0];
    const older = active[1];

    if (older.totalObligated === 0 && recent.totalObligated > 0) return 'increasing';
    if (older.totalObligated === 0) return 'stable';

    const ratio = recent.totalObligated / older.totalObligated;
    if (ratio > 1.2) return 'increasing';
    if (ratio < 0.8) return 'decreasing';
    return 'stable';
  }

  // ══════════════════════════════════════════════════════════════
  // SUMMARY COMPUTATION
  // ══════════════════════════════════════════════════════════════

  private computeSummary(activities: SpendingActivity[]): SpendingSummary {
    const totalObligated = activities.reduce((sum, a) => sum + (a.totalObligation || 0), 0);
    const allAgencies = new Map<string, { count: number; amount: number }>();
    const allSubAgencies = new Map<string, { count: number; amount: number }>();
    const allStates = new Map<string, { count: number; amount: number }>();
    const allSectors = new Set<string>();
    const spendByYear = new Map<number, { obligated: number; count: number }>();
    const awardTypes = new Map<string, { count: number; amount: number }>();

    for (const a of activities) {
      // Agencies
      if (a.awardingAgencyName) {
        const existing = allAgencies.get(a.awardingAgencyName) || { count: 0, amount: 0 };
        existing.count++;
        existing.amount += a.totalObligation || 0;
        allAgencies.set(a.awardingAgencyName, existing);
      }

      // Sub-agencies
      if (a.awardingSubAgencyName) {
        const existing = allSubAgencies.get(a.awardingSubAgencyName) || { count: 0, amount: 0 };
        existing.count++;
        existing.amount += a.totalObligation || 0;
        allSubAgencies.set(a.awardingSubAgencyName, existing);
      }

      // States
      if (a.performanceState) {
        const existing = allStates.get(a.performanceState) || { count: 0, amount: 0 };
        existing.count++;
        existing.amount += a.totalObligation || 0;
        allStates.set(a.performanceState, existing);
      }

      // Sectors
      if (a.naicsCode) allSectors.add(a.naicsCode.substring(0, 2));

      // Year spend
      const yearData = spendByYear.get(a.fiscalYear) || { obligated: 0, count: 0 };
      yearData.obligated += a.totalObligation || 0;
      yearData.count++;
      spendByYear.set(a.fiscalYear, yearData);

      // Award types
      const typeData = awardTypes.get(a.awardType) || { count: 0, amount: 0 };
      typeData.count++;
      typeData.amount += a.totalObligation || 0;
      awardTypes.set(a.awardType, typeData);
    }

    const uniqueFY = new Set(activities.map(a => a.fiscalYear)).size;

    return {
      totalObligated,
      totalAwards: activities.length,
      totalFiscalYears: uniqueFY,
      averagePerYear: uniqueFY > 0 ? totalObligated / uniqueFY : 0,
      uniqueAgencies: allAgencies.size,
      uniqueSubAgencies: allSubAgencies.size,
      uniqueSectors: allSectors.size,
      uniqueStates: allStates.size,
      topAgencies: [...allAgencies.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([name, data]) => ({ name, awardCount: data.count, totalObligated: data.amount })),
      topSubAgencies: [...allSubAgencies.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([name, data]) => ({ name, awardCount: data.count, totalObligated: data.amount })),
      topStates: [...allStates.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([state, data]) => ({ state, awardCount: data.count, totalObligated: data.amount })),
      spendByYear: [...spendByYear.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([year, data]) => ({ year, obligated: data.obligated, awardCount: data.count })),
      awardTypeBreakdown: [...awardTypes.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([type, data]) => ({ type, count: data.count, amount: data.amount })),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // DATABASE PERSISTENCE
  // ══════════════════════════════════════════════════════════════

  private async persistActivities(
    admin: SupabaseClient,
    symbol: string,
    activities: SpendingActivity[]
  ): Promise<void> {
    if (activities.length === 0) return;

    const rows = activities.map(a => ({
      symbol: a.symbol,
      award_id: a.awardId,
      action_date: a.actionDate || null,
      fiscal_year: a.fiscalYear,
      award_type: a.awardType,
      award_description: a.awardDescription,
      awarding_agency_name: a.awardingAgencyName,
      awarding_sub_agency_name: a.awardingSubAgencyName,
      awarding_office_name: null,
      funding_agency_name: a.fundingAgencyName,
      recipient_name: a.recipientName,
      recipient_parent_name: a.recipientParentName,
      recipient_uei: null,
      total_obligation: a.totalObligation,
      federal_action_obligation: a.federalActionObligation,
      total_outlay: a.totalOutlay,
      performance_city: a.performanceCity,
      performance_state: a.performanceState,
      performance_country: a.performanceCountry,
      performance_start_date: a.performanceStartDate,
      performance_end_date: a.performanceEndDate,
      naics_code: a.naicsCode,
      naics_description: a.naicsDescription,
      product_service_code: a.productServiceCode,
      permalink: a.permalink || `https://www.usaspending.gov/award/${a.awardId}`,  // Legacy NOT NULL column
      updated_at: new Date().toISOString(),
    }));

    // DELETE existing rows for this symbol, then INSERT fresh data.
    // This avoids issues with missing or mismatched UNIQUE constraints.
    const { error: deleteError } = await admin
      .from('usa_spending_cache')
      .delete()
      .eq('symbol', symbol);

    if (deleteError) {
      console.error(`[USASpendingService] Cache delete error for ${symbol}:`, deleteError);
      return;
    }

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await admin
        .from('usa_spending_cache')
        .insert(batch);

      if (error) {
        console.error(`[USASpendingService] Cache insert error (batch ${i}):`, error);
      }
    }

    console.log(`[USASpendingService] 💾 Persisted ${rows.length} awards for ${symbol} to DB`);
  }

  // ══════════════════════════════════════════════════════════════
  // CACHE BUILDING
  // ══════════════════════════════════════════════════════════════

  private async buildResultFromCache(
    symbol: string,
    years: number,
    includeActivities: boolean,
    source: 'cache' | 'fresh'
  ): Promise<SpendingResult> {
    const now = new Date();
    const currentFY = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
    const cutoffYear = currentFY - years;

    // Fetch cached data with a reasonable limit to keep response fast
    const { data: cachedRows, error } = await this.supabase
      .from('usa_spending_cache')
      .select('*')
      .eq('symbol', symbol)
      .gte('fiscal_year', cutoffYear)
      .order('action_date', { ascending: false })
      .limit(500);

    if (error || !cachedRows || cachedRows.length === 0) {
      return this.buildEmptyResult(symbol, source);
    }

    const activities: SpendingActivity[] = cachedRows.map(this.mapDbRowToActivity);
    const fiscalYears = this.aggregateFiscalYears(symbol, activities, years);
    const summary = this.computeSummary(activities);

    const sortedFY = [...fiscalYears].sort((a, b) => b.year - a.year);
    const currentScore = sortedFY.find(fy => fy.awardCount > 0)?.ogiScore ?? 0;
    const currentLabel = sortedFY.find(fy => fy.awardCount > 0)?.influenceLabel ?? 'Minimal';

    // Get cache metadata from refresh log
    const { data: refreshData } = await this.supabase
      .from('usa_spending_refresh_log')
      .select('completed_at, ttl_seconds')
      .eq('symbol', symbol)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1);

    const cachedAt = refreshData?.[0]?.completed_at || cachedRows[0]?.updated_at || null;
    const ttl = refreshData?.[0]?.ttl_seconds || this.calculateSmartTTL();
    const expiresAt = cachedAt
      ? new Date(new Date(cachedAt).getTime() + ttl * 1000).toISOString()
      : null;

    return {
      symbol,
      companyName: activities[0]?.recipientName || null,
      fiscalYears: sortedFY,
      activities: includeActivities ? activities.slice(0, 300) : [],
      summary,
      currentScore,
      currentLabel,
      trend: this.calculateTrend(sortedFY),
      source,
      cachedAt,
      expiresAt,
    };
  }

  private buildEmptyResult(symbol: string, source: 'cache' | 'fresh'): SpendingResult {
    return {
      symbol,
      companyName: null,
      fiscalYears: [],
      activities: [],
      summary: {
        totalObligated: 0,
        totalAwards: 0,
        totalFiscalYears: 0,
        averagePerYear: 0,
        uniqueAgencies: 0,
        uniqueSubAgencies: 0,
        uniqueSectors: 0,
        uniqueStates: 0,
        topAgencies: [],
        topSubAgencies: [],
        topStates: [],
        spendByYear: [],
        awardTypeBreakdown: [],
      },
      currentScore: 0,
      currentLabel: 'Minimal',
      trend: 'stable',
      source,
      cachedAt: null,
      expiresAt: null,
    };
  }

  private mapDbRowToActivity(row: any): SpendingActivity {
    return {
      symbol: row.symbol,
      awardId: row.award_id,
      actionDate: row.action_date || '',
      fiscalYear: row.fiscal_year,
      awardType: row.award_type || 'contract',
      awardDescription: row.award_description || null,
      totalObligation: row.total_obligation ? parseFloat(row.total_obligation) : null,
      federalActionObligation: row.federal_action_obligation ? parseFloat(row.federal_action_obligation) : null,
      totalOutlay: row.total_outlay ? parseFloat(row.total_outlay) : null,
      recipientName: row.recipient_name || '',
      recipientParentName: row.recipient_parent_name || null,
      awardingAgencyName: row.awarding_agency_name || '',
      awardingSubAgencyName: row.awarding_sub_agency_name || null,
      fundingAgencyName: row.funding_agency_name || null,
      performanceCity: row.performance_city || null,
      performanceState: row.performance_state || null,
      performanceCountry: row.performance_country || 'USA',
      performanceStartDate: row.performance_start_date || null,
      performanceEndDate: row.performance_end_date || null,
      naicsCode: row.naics_code || null,
      naicsDescription: row.naics_description || null,
      productServiceCode: row.product_service_code || null,
      permalink: row.permalink || null,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // BACKGROUND REFRESH
  // ══════════════════════════════════════════════════════════════

  private async refreshInBackground(symbol: string, years: number): Promise<void> {
    try {
      await this.fetchAndCacheSpendingData(symbol, years, false);
      console.log(`[USASpendingService] ✅ Background refresh completed for ${symbol}`);
    } catch (error) {
      console.error(`[USASpendingService] ❌ Background refresh failed for ${symbol}:`, error);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // REFRESH LOGGING
  // ══════════════════════════════════════════════════════════════

  private async logRefreshStart(symbol: string): Promise<string | null> {
    const admin = this.supabaseAdmin;
    if (!admin) return null;

    const { data, error } = await admin
      .from('usa_spending_refresh_log')
      .insert({
        symbol,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[USASpendingService] Refresh log start error:', error);
      return null;
    }
    return data?.id || null;
  }

  private async logRefreshComplete(
    id: string,
    symbol: string,
    awardsParsed: number,
    ttlSeconds: number
  ): Promise<void> {
    const admin = this.supabaseAdmin;
    if (!admin) return;

    await admin
      .from('usa_spending_refresh_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        awards_parsed: awardsParsed,
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
      .from('usa_spending_refresh_log')
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

export const usaSpendingService = new USASpendingService();
export default usaSpendingService;
