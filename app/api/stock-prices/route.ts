/**
 * Stock Prices API — Commercial-Grade Multi-Provider
 *
 * Architecture:
 * ─────────────
 * Provider waterfall (each tried in order until success):
 *   1. Yahoo Finance v8/chart (unofficial, free, ~1 req/symbol)
 *   2. Finnhub.io free tier  (official, 60 calls/min, requires FINNHUB_API_KEY env)
 *   3. Alpha Vantage free    (official, 25 calls/day,  requires ALPHAVANTAGE_API_KEY env)
 *   4. Upstash Redis stale   (returns last known good price, any age)
 *   5. Hardcoded fallback    (last resort — shows data is stale)
 *
 * Caching strategy:
 *   - Upstash Redis: 5-min TTL  (shared across all serverless instances / edge nodes)
 *   - In-memory Map: 3-min TTL  (per-instance, prevents Redis hammering)
 *
 * Rate-limit compliance:
 *   - Finnhub:       60 calls/min  → we batch and deduplicate
 *   - Alpha Vantage: 25 calls/day  → last-resort only, NOT for batch
 *   - Yahoo:         unofficial    → circuit breaker after 3 consecutive errors
 *
 * Usage:
 *   GET /api/stock-prices?symbols=AAPL,MSFT,TSLA
 *   GET /api/stock-prices?symbols=AAPL
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  source: string;         // e.g. 'yahoo' | 'finnhub' | 'alphavantage' | 'redis-stale' | 'fallback'
  stale: boolean;         // true if not from a live API call this request
  updatedAt: number;      // unix ms
}

// ── Environment ────────────────────────────────────────────────────────────────

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_API_KEY || '';
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const HAS_FINNHUB = FINNHUB_KEY.length > 0;
const HAS_ALPHAVANTAGE = ALPHAVANTAGE_KEY.length > 0;
const HAS_REDIS = UPSTASH_URL.length > 0 && UPSTASH_TOKEN.length > 0;

// ── In-Process Cache (per serverless instance) ─────────────────────────────────

const LOCAL_TTL_MS = 3 * 60 * 1000; // 3 minutes
const localCache = new Map<string, { data: StockPrice; ts: number }>();

function getLocal(symbol: string): StockPrice | null {
  const e = localCache.get(symbol);
  if (!e) return null;
  if (Date.now() - e.ts > LOCAL_TTL_MS) { localCache.delete(symbol); return null; }
  return e.data;
}
function setLocal(symbol: string, data: StockPrice) {
  localCache.set(symbol, { data, ts: Date.now() });
}

// ── Upstash Redis helpers ──────────────────────────────────────────────────────

const REDIS_TTL_SEC = 5 * 60; // 5 minutes
const REDIS_STALE_TTL_SEC = 24 * 60 * 60; // 24 hours for stale fallback

async function redisGet(symbol: string): Promise<StockPrice | null> {
  if (!HAS_REDIS) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/stock:${symbol}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.result) return null;
    return JSON.parse(json.result) as StockPrice;
  } catch { return null; }
}

async function redisSet(symbol: string, data: StockPrice, ttl = REDIS_TTL_SEC) {
  if (!HAS_REDIS) return;
  try {
    await fetch(`${UPSTASH_URL}/set/stock:${symbol}?ex=${ttl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(data)),
    });
  } catch { /* non-critical */ }
}

// ── Circuit Breaker State (module-level, per instance) ─────────────────────────

const circuit = {
  yahoo: { errors: 0, openUntil: 0 },
};
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 2 * 60 * 1000; // 2 minutes

function isCircuitOpen(name: keyof typeof circuit): boolean {
  const c = circuit[name];
  if (c.openUntil > Date.now()) return true;
  if (c.openUntil > 0) { c.errors = 0; c.openUntil = 0; } // reset
  return false;
}
function recordSuccess(name: keyof typeof circuit) { circuit[name].errors = 0; }
function recordError(name: keyof typeof circuit) {
  const c = circuit[name];
  c.errors++;
  if (c.errors >= CIRCUIT_THRESHOLD) {
    c.openUntil = Date.now() + CIRCUIT_RESET_MS;
    console.warn(`[stock-prices] 🔴 Circuit breaker OPEN for ${name} — retry in ${CIRCUIT_RESET_MS / 1000}s`);
  }
}

// ── Provider 1: Yahoo Finance v8/chart ────────────────────────────────────────

async function fetchYahoo(symbol: string): Promise<StockPrice | null> {
  if (isCircuitOpen('yahoo')) return null;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmniFolio/1.0)' },
        cache: 'no-store',
      }
    );
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      recordError('yahoo');
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;

    recordSuccess('yahoo');
    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      source: 'yahoo',
      stale: false,
      updatedAt: Date.now(),
    };
  } catch {
    recordError('yahoo');
    return null;
  }
}

// ── Provider 2: Finnhub (free tier — 60 calls/min) ────────────────────────────
// Get a FREE key at https://finnhub.io — set FINNHUB_API_KEY in your .env

async function fetchFinnhub(symbol: string): Promise<StockPrice | null> {
  if (!HAS_FINNHUB) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.c || d.c === 0) return null; // c = current price

    const change = d.d ?? 0;       // d = change
    const changePercent = d.dp ?? 0; // dp = change percent

    return {
      symbol: symbol.toUpperCase(),
      price: d.c,
      change,
      changePercent,
      high: d.h,
      low: d.l,
      source: 'finnhub',
      stale: false,
      updatedAt: Date.now(),
    };
  } catch { return null; }
}

// ── Provider 3: Alpha Vantage (free — 25 calls/day) ──────────────────────────
// ONLY used for single-symbol fallback, never for batch > 1 symbol
// Get a FREE key at https://www.alphavantage.co/support/#api-key — set ALPHAVANTAGE_API_KEY

async function fetchAlphaVantage(symbol: string): Promise<StockPrice | null> {
  if (!HAS_ALPHAVANTAGE) return null;
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHAVANTAGE_KEY}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const q = d['Global Quote'];
    if (!q || !q['05. price']) return null;

    const price = parseFloat(q['05. price']);
    const change = parseFloat(q['09. change'] || '0');
    const changePercent = parseFloat((q['10. change percent'] || '0%').replace('%', ''));

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      high: parseFloat(q['03. high'] || '0') || undefined,
      low: parseFloat(q['04. low'] || '0') || undefined,
      volume: parseInt(q['06. volume'] || '0', 10) || undefined,
      source: 'alphavantage',
      stale: false,
      updatedAt: Date.now(),
    };
  } catch { return null; }
}

// ── Hardcoded last-resort fallback prices ─────────────────────────────────────
// These are intentionally left here so the app never shows $0
// but users/UI should show a "stale" badge when source === 'fallback'

const STATIC_FALLBACK: Record<string, { price: number; change: number }> = {
  AAPL: { price: 198.50, change: 1.25 },
  MSFT: { price: 425.20, change: 2.10 },
  AMZN: { price: 185.30, change: -1.80 },
  GOOGL: { price: 175.75, change: 0.95 },
  GOOG: { price: 174.50, change: 0.90 },
  TSLA: { price: 248.90, change: -3.20 },
  NVDA: { price: 130.20, change: 5.40 },
  META: { price: 505.80, change: 2.75 },
  VOO: { price: 487.90, change: 1.50 },
  SPY: { price: 530.50, change: 1.80 },
  QQQ: { price: 460.25, change: 2.30 },
  NFLX: { price: 685.60, change: 3.15 },
  AMD: { price: 165.30, change: -0.85 },
  INTC: { price: 30.80, change: -0.45 },
  DIS: { price: 112.40, change: 0.55 },
  V: { price: 285.20, change: 1.40 },
  MA: { price: 465.10, change: 2.15 },
  JPM: { price: 208.90, change: 0.95 },
  WMT: { price: 85.40, change: 0.60 },
  PG: { price: 168.70, change: 0.35 },
  JNJ: { price: 155.30, change: 0.80 },
  UNH: { price: 540.20, change: 2.85 },
  BAC: { price: 38.90, change: 0.45 },
  XOM: { price: 104.50, change: -0.30 },
  CVX: { price: 152.60, change: -0.55 },
  ABBV: { price: 170.40, change: 1.20 },
  KO: { price: 61.80, change: 0.25 },
  PEP: { price: 165.90, change: 0.40 },
  MRK: { price: 118.70, change: 0.65 },
  LLY: { price: 785.30, change: 8.40 },
  AVGO: { price: 168.90, change: 2.10 },
  ORCL: { price: 112.45, change: 1.30 },
  CSCO: { price: 48.60, change: 0.20 },
  ADBE: { price: 420.80, change: 3.50 },
  CRM: { price: 258.40, change: 2.90 },
  ACN: { price: 305.60, change: 1.75 },
  TXN: { price: 185.20, change: -0.60 },
  QCOM: { price: 158.90, change: -1.20 },
  IBM: { price: 185.40, change: 0.80 },
  SBUX: { price: 81.30, change: -0.45 },
  MCD: { price: 290.60, change: 0.85 },
  NKE: { price: 72.80, change: -0.35 },
  GS: { price: 465.20, change: 3.80 },
  MS: { price: 102.40, change: 0.95 },
  BRK: { price: 355.80, change: 1.40 },
  'BRK.B': { price: 355.80, change: 1.40 },
  T: { price: 17.90, change: 0.10 },
  VZ: { price: 39.40, change: -0.20 },
  PYPL: { price: 62.30, change: -0.80 },
  SQ: { price: 65.40, change: -1.20 },
  SHOP: { price: 58.70, change: -0.95 },
  UBER: { price: 72.40, change: 1.10 },
  LYFT: { price: 15.80, change: 0.25 },
  SNAP: { price: 10.20, change: -0.30 },
  TWTR: { price: 54.20, change: 0.40 },
  PINS: { price: 28.90, change: 0.55 },
  RBLX: { price: 38.60, change: 0.75 },
  COIN: { price: 185.40, change: -3.20 },
  HOOD: { price: 15.70, change: -0.25 },
  PLTR: { price: 25.40, change: 0.35 },
  SOFI: { price: 7.80, change: -0.10 },
  RIVN: { price: 12.40, change: 0.30 },
  LCID: { price: 2.80, change: -0.05 },
  F: { price: 10.50, change: -0.15 },
  GM: { price: 42.80, change: 0.40 },
  BA: { price: 178.90, change: -1.40 },
  CAT: { price: 325.60, change: 2.10 },
  DE: { price: 384.20, change: 1.80 },
  MMM: { price: 105.30, change: -0.40 },
  GE: { price: 155.20, change: 1.20 },
  HON: { price: 192.40, change: 0.85 },
  RTX: { price: 115.80, change: 0.55 },
  LMT: { price: 452.30, change: 2.40 },
  NOC: { price: 478.90, change: 1.90 },
  AMGN: { price: 310.50, change: 1.50 },
  GILD: { price: 76.80, change: 0.45 },
  BIIB: { price: 228.60, change: -0.85 },
  REGN: { price: 865.40, change: 4.20 },
  MRNA: { price: 78.30, change: -1.40 },
  PFE: { price: 27.80, change: -0.20 },
  BMY: { price: 55.40, change: 0.30 },
  ABT: { price: 118.70, change: 0.65 },
  MDT: { price: 87.30, change: 0.40 },
  ZTS: { price: 178.90, change: 0.85 },
  CI: { price: 325.60, change: 1.80 },
  CVS: { price: 58.40, change: -0.30 },
  WBA: { price: 10.80, change: -0.25 },
  COST: { price: 868.40, change: 5.30 },
  TGT: { price: 128.90, change: -0.75 },
  HD: { price: 390.50, change: 2.40 },
  LOW: { price: 228.60, change: 1.30 },
  CMG: { price: 54.80, change: 0.40 },
  YUM: { price: 128.90, change: 0.55 },
  DRI: { price: 168.40, change: 0.80 },
  DIA: { price: 387.90, change: 1.60 },
  IWM: { price: 202.40, change: 0.90 },
  EEM: { price: 42.80, change: 0.30 },
  GLD: { price: 185.40, change: 0.85 },
  SLV: { price: 23.60, change: 0.15 },
  USO: { price: 74.80, change: -0.55 },
  TLT: { price: 88.30, change: -0.40 },
};

function getStaticFallback(symbol: string): StockPrice {
  const fb = STATIC_FALLBACK[symbol.toUpperCase()];
  const price = fb?.price ?? 100;
  const change = fb?.change ?? 0;
  return {
    symbol: symbol.toUpperCase(),
    price,
    change,
    changePercent: price ? (change / price) * 100 : 0,
    source: 'fallback',
    stale: true,
    updatedAt: Date.now(),
  };
}

// ── Core fetch: single symbol with full waterfall ─────────────────────────────

async function fetchSinglePrice(
  symbol: string,
  batchSize: number = 1,
): Promise<StockPrice> {
  const sym = symbol.toUpperCase();

  // 1. Local memory cache
  const local = getLocal(sym);
  if (local) return local;

  // 2. Redis cache (shared across instances)
  const cached = await redisGet(sym);
  if (cached && !cached.stale) {
    setLocal(sym, cached);
    return cached;
  }

  // 3. Yahoo Finance v8
  const yahoo = await fetchYahoo(sym);
  if (yahoo) {
    setLocal(sym, yahoo);
    await redisSet(sym, yahoo, REDIS_TTL_SEC);
    return yahoo;
  }

  // 4. Finnhub (if key set)
  const finnhub = await fetchFinnhub(sym);
  if (finnhub) {
    setLocal(sym, finnhub);
    await redisSet(sym, finnhub, REDIS_TTL_SEC);
    return finnhub;
  }

  // 5. Alpha Vantage — ONLY for single-symbol requests (too rate-limited for batch)
  if (batchSize === 1) {
    const av = await fetchAlphaVantage(sym);
    if (av) {
      setLocal(sym, av);
      await redisSet(sym, av, REDIS_TTL_SEC);
      return av;
    }
  }

  // 6. Redis stale (any age — at least it's real data from a previous fetch)
  if (cached) {
    const staleResult = { ...cached, stale: true, source: 'redis-stale' };
    setLocal(sym, staleResult);
    return staleResult;
  }

  // 7. Hardcoded fallback
  const fb = getStaticFallback(sym);
  // Cache fallback in Redis for a short time to reduce hammering
  await redisSet(sym, fb, 60); // 60 seconds
  return fb;
}

// ── In-flight deduplication (prevents thundering herd) ───────────────────────

const inFlight = new Map<string, Promise<StockPrice>>();

async function fetchWithDedup(symbol: string, batchSize: number): Promise<StockPrice> {
  const existing = inFlight.get(symbol);
  if (existing) return existing;

  const promise = fetchSinglePrice(symbol, batchSize).finally(() => inFlight.delete(symbol));
  inFlight.set(symbol, promise);
  return promise;
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || searchParams.get('symbol') || '';

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50); // hard cap

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'no valid symbols' }, { status: 400 });
  }

  const startMs = Date.now();

  // Fetch all in parallel (deduped)
  const results = await Promise.all(
    symbols.map(sym => fetchWithDedup(sym, symbols.length))
  );

  const prices: Record<string, StockPrice> = {};
  for (const r of results) {
    prices[r.symbol] = r;
  }

  const fetchMs = Date.now() - startMs;
  const staleSources = results.filter(r => r.stale).length;

  return NextResponse.json(
    {
      prices,
      meta: {
        symbols: symbols.length,
        fetchMs,
        stale: staleSources,
        providers: {
          yahoo: !isCircuitOpen('yahoo') ? 'up' : 'circuit-open',
          finnhub: HAS_FINNHUB ? 'configured' : 'not-configured',
          alphavantage: HAS_ALPHAVANTAGE ? 'configured' : 'not-configured',
          redis: HAS_REDIS ? 'configured' : 'not-configured',
        },
      },
    },
    {
      headers: {
        // 5-minute shared CDN cache, stale-while-revalidate 10 minutes
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Fetch-Ms': String(fetchMs),
      },
    }
  );
}

// POST for batch (same logic, symbols in body)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbols: string[] = (body.symbols || [])
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 50);

    if (symbols.length === 0) {
      return NextResponse.json({ error: 'symbols array required' }, { status: 400 });
    }

    const startMs = Date.now();
    const results = await Promise.all(
      symbols.map(sym => fetchWithDedup(sym, symbols.length))
    );

    const prices: Record<string, StockPrice> = {};
    for (const r of results) prices[r.symbol] = r;

    return NextResponse.json({ prices, meta: { fetchMs: Date.now() - startMs } });
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }
}

// Not needed for edge — keep Node runtime for Redis fetch
export const dynamic = 'force-dynamic';
