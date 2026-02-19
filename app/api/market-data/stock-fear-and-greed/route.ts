/**
 * OmniFolio Stock Market Fear & Greed Index API
 *
 * Proprietary composite sentiment engine for the S&P 500 / US equity market.
 * Zero third-party index dependencies — all signals derived from publicly
 * available free market data.
 *
 * Signals (6 equally weighted, each scored 0–100):
 *   1. Price Momentum   — SPY 30-day price change vs 90-day baseline
 *   2. Volatility (VIX) — VIX level (inverted: high VIX = fear = low score)
 *   3. Market Breadth   — % of S&P sector ETFs outperforming SPY in 24 h
 *   4. Volume Surge     — SPY 1-day vs 20-day average volume
 *   5. RSI Signal       — 14-period Wilder RSI on SPY daily closes (inverted)
 *   6. Safe Haven Demand — TLT (20Y Treasury) vs SPY relative flow proxy
 *
 * Data sources:
 *   - Yahoo Finance (public quote endpoint, no key required)
 *   - All requests are server-side; no CORS or ToS concerns
 *
 * DB-first caching pattern:
 *   1. Server in-memory cache (instant)
 *   2. Supabase DB cache (shared across all instances)
 *   3. Compute fresh score — stored in DB for all future users
 *
 * Copyright OmniFolio. All rights reserved.
 */

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface StockFearGreedComponents {
  price_momentum: number;    // SPY 30-day vs 90-day baseline
  vix_level: number;         // VIX fear gauge (inverted)
  market_breadth: number;    // Sector ETF breadth
  volume_surge: number;      // SPY volume vs 20-day avg
  rsi_signal: number;        // 14-period RSI on SPY (inverted)
  safe_haven: number;        // TLT vs SPY relative demand
}

interface StockFearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
  components?: StockFearGreedComponents;
}

interface MemoryCacheEntry {
  data: StockFearGreedData;
  storedAt: number;
  ttlMs: number;
}

// ══════════════════════════════════════════════════════════════════
// CACHE CONFIG
// ══════════════════════════════════════════════════════════════════

let _memoryCache: MemoryCacheEntry | null = null;
let _fetchLock: Promise<StockFearGreedData | null> | null = null;
let _lastComputeMs = 0;

const MEMORY_CACHE_TTL_MS = 15 * 60 * 1000;  // 15 minutes
const REFRESH_COOLDOWN_MS = 20 * 60 * 1000;  // 20 min between computes
const MAX_CACHE_AGE_MS    = 24 * 60 * 60 * 1000;
const NEXT_UPDATE_SECONDS = '1200';           // 20-min cadence

function getFromMemoryCache(): StockFearGreedData | null {
  if (!_memoryCache) return null;
  if (Date.now() - _memoryCache.storedAt > _memoryCache.ttlMs) {
    _memoryCache = null;
    return null;
  }
  return _memoryCache.data;
}

function setInMemoryCache(data: StockFearGreedData, ttlMs = MEMORY_CACHE_TTL_MS): void {
  _memoryCache = { data, storedAt: Date.now(), ttlMs };
}

// ══════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ══════════════════════════════════════════════════════════════════

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

// ══════════════════════════════════════════════════════════════════
// CACHE FRESHNESS
// ══════════════════════════════════════════════════════════════════

function isCacheFresh(entry: any): { fresh: boolean; stale: boolean; expired: boolean } {
  if (!entry) return { fresh: false, stale: false, expired: true };

  const createdAt   = new Date(entry.created_at).getTime();
  const lastUpdate  = new Date(entry.timestamp).getTime();
  const now         = Date.now();
  const ttlMs       = parseInt(entry.time_until_update || NEXT_UPDATE_SECONDS) * 1000;

  const freshUntil  = createdAt + ttlMs + (5 * 60 * 1000);
  const staleUntil  = createdAt + (ttlMs * 2) + (10 * 60 * 1000);
  const absoluteMax = lastUpdate + MAX_CACHE_AGE_MS;

  if (now > absoluteMax)  return { fresh: false, stale: false, expired: true };
  if (now < freshUntil)   return { fresh: true,  stale: false, expired: false };
  if (now < staleUntil)   return { fresh: false, stale: true,  expired: false };
  return { fresh: false, stale: false, expired: true };
}

// ══════════════════════════════════════════════════════════════════
// YAHOO FINANCE HELPER
// ══════════════════════════════════════════════════════════════════

async function yahooFetch(symbol: string, range: string, interval: string): Promise<any[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    const volumes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.volume;
    if (!closes) return null;
    // Return array of { close, volume } objects, filtering nulls
    return closes
      .map((c: number | null, i: number) => ({ close: c, volume: volumes?.[i] ?? null }))
      .filter((d: any) => d.close !== null && d.close !== undefined);
  } catch {
    return null;
  }
}

async function yahooQuote(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const changePercent = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    return { price, changePercent };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

// ══════════════════════════════════════════════════════════════════
// SIGNAL SCORERS  (each returns 0–100)
// ══════════════════════════════════════════════════════════════════

/**
 * SIGNAL 1 — Price Momentum
 * SPY 30-day close change. +30% → 100, -30% → 0, flat → 50.
 */
async function scorePriceMomentum(): Promise<number> {
  const data = await yahooFetch('SPY', '3mo', '1d');
  if (!data || data.length < 2) return 50;

  const oldest  = data[0].close;
  const current = data[data.length - 1].close;
  const pct     = ((current - oldest) / oldest) * 100;

  // Map pct in [−30, +30] → [0, 100]
  return clamp(50 + (pct * (50 / 30)));
}

/**
 * SIGNAL 2 — VIX Level (inverted)
 * VIX ≥ 40 → score 0 (extreme fear), VIX ≤ 12 → score 100 (extreme greed).
 * Linear mapping between those bounds.
 */
async function scoreVIX(): Promise<number> {
  const quote = await yahooQuote('^VIX');
  if (!quote) return 50;

  const vix = quote.price;
  // Linear: vix 12 → 100, vix 40 → 0
  const score = ((40 - vix) / (40 - 12)) * 100;
  return clamp(score);
}

/**
 * SIGNAL 3 — Market Breadth
 * % of major S&P 500 sector ETFs that outperformed SPY in the last day.
 * 100% outperforming → score 100 (broad greed), 0% → score 0 (fear).
 */
async function scoreMarketBreadth(): Promise<number> {
  const sectors = ['XLK', 'XLV', 'XLF', 'XLY', 'XLP', 'XLE', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC'];

  const [spyQuote, ...sectorQuotes] = await Promise.all([
    yahooQuote('SPY'),
    ...sectors.map(s => yahooQuote(s)),
  ]);

  const spyChange = spyQuote?.changePercent ?? 0;

  let gainers = 0;
  let total   = 0;

  for (const q of sectorQuotes) {
    if (q) {
      total++;
      if (q.changePercent > spyChange) gainers++;
    }
  }

  return total > 0 ? clamp((gainers / total) * 100) : 50;
}

/**
 * SIGNAL 4 — Volume Surge
 * SPY today's volume vs 20-day average. Surge → greed, drought → fear.
 */
async function scoreVolumeSurge(): Promise<number> {
  const data = await yahooFetch('SPY', '1mo', '1d');
  if (!data || data.length < 5) return 50;

  const volumes  = data.map(d => d.volume).filter((v): v is number => v !== null);
  const curVol   = volumes[volumes.length - 1];
  const avgVol   = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
  const ratio    = avgVol > 0 ? curVol / avgVol : 1;

  // ratio 0 → 0, 1 → 50, 2 → 100
  return clamp(ratio * 50);
}

/**
 * SIGNAL 5 — RSI Signal (inverted)
 * 14-period Wilder RSI on SPY daily closes.
 * RSI > 70 → overbought → score low (fear of correction).
 * RSI < 30 → oversold  → score high (bargain opportunity).
 */
async function scoreRSI(): Promise<number> {
  const data = await yahooFetch('SPY', '3mo', '1d');
  if (!data || data.length < 15) return 50;

  const closes  = data.map(d => d.close);
  const changes = closes.slice(1).map((c, i) => c - closes[i]);

  const seed   = changes.slice(0, 14);
  let avgGain  = seed.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
  let avgLoss  = seed.filter(c => c < 0).reduce((a, b) => a + Math.abs(b), 0) / 14;

  for (const c of changes.slice(14)) {
    const gain = c > 0 ? c : 0;
    const loss = c < 0 ? Math.abs(c) : 0;
    avgGain = (avgGain * 13 + gain) / 14;
    avgLoss = (avgLoss * 13 + loss) / 14;
  }

  const rs  = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // Invert: RSI 100 → score 0, RSI 0 → score 100
  return clamp(100 - rsi);
}

/**
 * SIGNAL 6 — Safe Haven Demand
 * TLT (20Y Treasury Bond ETF) relative strength vs SPY.
 * When money flows INTO bonds (TLT up vs SPY) → fear → low score.
 * When money flows OUT of bonds (TLT down vs SPY) → greed → high score.
 */
async function scoreSafeHaven(): Promise<number> {
  const [tltQuote, spyQuote] = await Promise.all([
    yahooQuote('TLT'),
    yahooQuote('SPY'),
  ]);

  if (!tltQuote || !spyQuote) return 50;

  const tltPct = tltQuote.changePercent;
  const spyPct = spyQuote.changePercent;

  // Relative flow = SPY change - TLT change
  // Positive = equity preferred over bonds → greed
  // Negative = bonds preferred → fear
  const relativeFlow = spyPct - tltPct;

  // Map [-5, +5] pct difference → [0, 100]
  return clamp(50 + (relativeFlow * 10));
}

// ══════════════════════════════════════════════════════════════════
// CLASSIFICATION
// ══════════════════════════════════════════════════════════════════

function classify(score: number): string {
  if (score < 20) return 'Extreme Fear';
  if (score < 40) return 'Fear';
  if (score < 60) return 'Neutral';
  if (score < 80) return 'Greed';
  return 'Extreme Greed';
}

// ══════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════

async function computeStockFearGreed(): Promise<StockFearGreedData | null> {
  const now = Date.now();
  if (now - _lastComputeMs < REFRESH_COOLDOWN_MS) {
    console.log(`[OmniFolio StockFG] Cooldown active (${Math.round((REFRESH_COOLDOWN_MS - (now - _lastComputeMs)) / 1000)}s remaining)`);
    return null;
  }
  _lastComputeMs = now;

  console.log('[OmniFolio StockFG] 🧮 Computing S&P 500 Fear & Greed score…');

  const [momentum, vix, breadth, volume, rsi, safeHaven] = await Promise.all([
    scorePriceMomentum(),
    scoreVIX(),
    scoreMarketBreadth(),
    scoreVolumeSurge(),
    scoreRSI(),
    scoreSafeHaven(),
  ]);

  const components: StockFearGreedComponents = {
    price_momentum: Math.round(momentum),
    vix_level:      Math.round(vix),
    market_breadth: Math.round(breadth),
    volume_surge:   Math.round(volume),
    rsi_signal:     Math.round(rsi),
    safe_haven:     Math.round(safeHaven),
  };

  const composite = Object.values(components).reduce((a, b) => a + b, 0) / 6;
  const value = Math.round(composite);

  console.log(`[OmniFolio StockFG] ✅ Score: ${value} (${classify(value)})`, components);

  return {
    value,
    value_classification: classify(value),
    timestamp: new Date().toISOString(),
    time_until_update: NEXT_UPDATE_SECONDS,
    components,
  };
}

// ══════════════════════════════════════════════════════════════════
// COMPUTE + DB STORE
// ══════════════════════════════════════════════════════════════════

async function computeAndStore(supabase: SupabaseClient | null): Promise<StockFearGreedData | null> {
  const freshData = await computeStockFearGreed();
  if (!freshData) return null;

  if (supabase) {
    const { error } = await supabase
      .from('stock_fear_and_greed')
      .insert({
        value:                freshData.value,
        value_classification: freshData.value_classification,
        timestamp:            freshData.timestamp,
        time_until_update:    freshData.time_until_update,
        components:           freshData.components ?? null,
        source:               'omnifolio-stock-engine-v1',
      });

    if (error) console.error('[OmniFolio StockFG] DB insert error:', error);
    else console.log('[OmniFolio StockFG] ✅ Stored in DB');
  }

  setInMemoryCache(freshData);
  return freshData;
}

function refreshInBackground(supabase: SupabaseClient | null): void {
  if (_fetchLock) return;
  _fetchLock = computeAndStore(supabase).finally(() => { _fetchLock = null; });
}

// ══════════════════════════════════════════════════════════════════
// RESPONSE BUILDER
// ══════════════════════════════════════════════════════════════════

function buildResponse(data: StockFearGreedData, source: string): NextResponse {
  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        'X-Data-Source':  source,
        'X-Engine':       'omnifolio-stock-v1',
      },
    }
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    // ── 1. In-memory cache ─────────────────────────────────────
    const memoryCached = getFromMemoryCache();
    if (memoryCached) return buildResponse(memoryCached, 'memory-cache');

    // ── 2. Supabase DB cache ───────────────────────────────────
    const supabase = getSupabaseClient();
    let latestEntry: any = null;

    if (supabase) {
      const { data, error: dbError } = await supabase
        .from('stock_fear_and_greed')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!dbError && data) latestEntry = data;
    }

    if (latestEntry) {
      const freshness = isCacheFresh(latestEntry);
      const dbData: StockFearGreedData = {
        value:                latestEntry.value,
        value_classification: latestEntry.value_classification,
        timestamp:            latestEntry.timestamp,
        time_until_update:    latestEntry.time_until_update,
        components:           latestEntry.components ?? undefined,
      };

      if (freshness.fresh) {
        setInMemoryCache(dbData);
        return buildResponse(dbData, 'db-cache-fresh');
      }
      if (freshness.stale) {
        setInMemoryCache(dbData, 5 * 60 * 1000);
        refreshInBackground(supabase);
        return buildResponse(dbData, 'db-cache-stale');
      }
      setInMemoryCache(dbData, 2 * 60 * 1000);
      refreshInBackground(supabase);
      return buildResponse(dbData, 'db-cache-expired');
    }

    // ── 3. No DB data — compute fresh ─────────────────────────
    if (_fetchLock) {
      const result = await _fetchLock;
      if (result) return buildResponse(result, 'compute-locked');
    }

    _fetchLock = computeAndStore(supabase).finally(() => { _fetchLock = null; });
    const freshData = await _fetchLock;
    if (freshData) return buildResponse(freshData, 'compute-fresh');

    // ── 4. Complete failure ─────────────────────────────────────
    return NextResponse.json(
      { error: 'Stock Fear & Greed data unavailable. Please try again shortly.' },
      { status: 503, headers: { 'Retry-After': '60' } }
    );
  } catch (error: any) {
    console.error('[OmniFolio StockFG] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compute Stock Fear & Greed Index' },
      { status: 500 }
    );
  }
}
