/**
 * SEC Insider Trading API (Form 4)
 *
 * Smart DB Cache Strategy:
 *   1. Check Supabase `insider_sentiment_transactions` cache first (instant)
 *   2. If cache is fresh → return immediately (zero SEC requests)
 *   3. If cache is stale → return stale + background refresh
 *   4. If cache is empty → fetch from SEC EDGAR, cache for next time
 *
 * SEC EDGAR rate limit: 10 req/sec — each ticker lookup uses ~21 requests.
 * Without caching, 5 concurrent users = instant IP ban.
 *
 * TTL: Market-hours aware
 *   - Market hours: 4h cache
 *   - Off hours: 12h cache
 *   - Weekends: 24h cache
 *
 * 100% proprietary — SEC EDGAR (public, free, no API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, parseTransactionCode } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';
import { createClient } from '@supabase/supabase-js';

const secApi = createSECEdgarClient();

// ── Smart TTL (market-hours aware) ───────────────────────────────
function getSmartTTLSeconds(): number {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const mins = et.getMinutes();
  const timeInMins = hours * 60 + mins;

  // Weekend → 24h cache
  if (day === 0 || day === 6) return 24 * 60 * 60;
  // Market hours (9:30–16:00 ET) → 4h cache
  if (timeInMins >= 570 && timeInMins <= 960) return 4 * 60 * 60;
  // Off hours → 12h cache
  return 12 * 60 * 60;
}

// ── Supabase client (lazy) ───────────────────────────────────────
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      _supabase = createClient(url, key);
    }
  }
  return _supabase;
}

// ── In-flight deduplication ──────────────────────────────────────
const _inflight = new Map<string, Promise<any>>();

// GET /api/sec/insider?ticker=AAPL&days=90
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const cik = searchParams.get('cik');
    const days = parseInt(searchParams.get('days') || '90');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!ticker && !cik) {
      return NextResponse.json(
        { error: 'Either ticker or cik parameter is required' },
        { status: 400 }
      );
    }

    const upperTicker = ticker?.toUpperCase().trim() || '';

    // ── 1. Try Supabase DB cache first (instant, no SEC requests) ──
    if (!forceRefresh && upperTicker) {
      const cached = await tryGetCachedTransactions(upperTicker, days);
      if (cached) {
        console.log(`[SEC Insider] Cache HIT for ${upperTicker} (${cached.transactions.length} txns)`);
        const ttl = getSmartTTLSeconds();
        return NextResponse.json(cached, {
          headers: {
            ...limiter.headers,
            'Cache-Control': `public, s-maxage=${Math.floor(ttl / 2)}, stale-while-revalidate=${ttl}`,
            'X-Data-Source': 'cache',
            'X-Cache-TTL': `${ttl}s`,
          },
        });
      }
    }

    // ── 2. Deduplicate concurrent requests for same ticker ─────────
    const dedupeKey = `${upperTicker || cik}:${days}`;
    if (_inflight.has(dedupeKey)) {
      console.log(`[SEC Insider] Deduplicating request for ${dedupeKey}`);
      const result = await _inflight.get(dedupeKey);
      return NextResponse.json(result, { headers: limiter.headers });
    }

    const fetchPromise = fetchFreshAndCache(upperTicker, cik, days);
    _inflight.set(dedupeKey, fetchPromise);

    try {
      const result = await fetchPromise;
      const ttl = getSmartTTLSeconds();
      return NextResponse.json(result, {
        headers: {
          ...limiter.headers,
          'Cache-Control': `public, s-maxage=${Math.floor(ttl / 2)}, stale-while-revalidate=${ttl}`,
          'X-Data-Source': 'fresh',
          'X-Cache-TTL': `${ttl}s`,
        },
      });
    } finally {
      _inflight.delete(dedupeKey);
    }
  } catch (error) {
    console.error('[SEC API] Error fetching insider data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insider trading data' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// CACHE READ — check Supabase `insider_sentiment_transactions`
// ═══════════════════════════════════════════════════════════════════

async function tryGetCachedTransactions(ticker: string, days: number) {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    // Check if we have a recent refresh log entry (tells us cache is warm)
    const { data: refreshLog } = await (supabase as any)
      .from('insider_sentiment_refresh_log')
      .select('last_refresh_at, ttl_seconds, filings_parsed')
      .eq('symbol', ticker)
      .order('last_refresh_at', { ascending: false })
      .limit(1) as { data: any[] | null };

    if (!refreshLog || refreshLog.length === 0) return null;

    const lastRefresh = new Date(refreshLog[0].last_refresh_at);
    const ttl = refreshLog[0].ttl_seconds || getSmartTTLSeconds();
    const ageSeconds = (Date.now() - lastRefresh.getTime()) / 1000;

    // If cache is expired, return null (will force fresh fetch)
    if (ageSeconds > ttl * 1.5) return null;

    // Fetch cached transactions
    const { data: txRows, error } = await (supabase as any)
      .from('insider_sentiment_transactions')
      .select('*')
      .eq('symbol', ticker)
      .gte('filing_date', sinceStr)
      .order('filing_date', { ascending: false }) as { data: any[] | null; error: any };

    if (error || !txRows || txRows.length === 0) return null;

    // Transform cached rows to API format
    const formattedTransactions = txRows.map((row: any) => ({
      date: row.transaction_date || row.filing_date,
      filingDate: row.filing_date,
      owner: row.owner_name,
      title: row.officer_title || (row.is_director ? 'Director' : row.is_officer ? 'Officer' : 'Insider'),
      isOfficer: row.is_officer || false,
      isDirector: row.is_director || false,
      transactionType: row.is_acquisition ? 'Buy' : 'Sell',
      transactionCode: row.transaction_code || '',
      transactionDescription: row.transaction_code ? parseTransactionCode(row.transaction_code) : '',
      shares: parseInt(row.shares) || 0,
      price: row.price_per_share ? parseFloat(row.price_per_share) : null,
      value: parseFloat(row.total_value) || 0,
      sharesOwnedAfter: parseInt(row.shares_owned_after) || 0,
      securityTitle: row.security_title || '',
      accessionNumber: row.accession_number,
    }));

    // Calculate summary from cached data
    let totalBuys = 0, totalSells = 0, buyValue = 0, sellValue = 0;
    const insiderSet = new Set<string>();

    formattedTransactions.forEach((tx: any) => {
      insiderSet.add(tx.owner);
      if (tx.transactionType === 'Buy') {
        totalBuys += tx.shares;
        buyValue += tx.value;
      } else {
        totalSells += tx.shares;
        sellValue += tx.value;
      }
    });

    return {
      company: { cik: '', ticker, name: ticker, exchange: '' },
      summary: {
        totalBuys,
        totalSells,
        buyValue,
        sellValue,
        netShares: totalBuys - totalSells,
        netValue: buyValue - sellValue,
        transactionCount: formattedTransactions.length,
        uniqueInsiders: insiderSet.size,
      },
      transactions: formattedTransactions,
      _cache: {
        source: 'db',
        cachedAt: refreshLog[0].last_refresh_at,
        ageSeconds: Math.round(ageSeconds),
        ttlSeconds: ttl,
      },
    };
  } catch (err) {
    console.warn('[SEC Insider] Cache read failed, falling back to SEC:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FRESH FETCH — hit SEC EDGAR + write results to Supabase cache
// ═══════════════════════════════════════════════════════════════════

async function fetchFreshAndCache(ticker: string, cik: string | null, days: number) {
  // Get CIK
  let companyCik = cik;
  let companyInfo = null;

  if (ticker) {
    companyInfo = await secApi.getCIKByTicker(ticker);
    if (!companyInfo) {
      throw new Error(`Company not found for ticker: ${ticker}`);
    }
    companyCik = companyInfo.cik;
  }

  // Fetch from SEC EDGAR (this is the expensive part: ~21 requests)
  const transactions = await secApi.getInsiderTransactions(companyCik!, days);

  // Calculate summary
  let totalBuys = 0, totalSells = 0, buyValue = 0, sellValue = 0;

  transactions.forEach(filing => {
    filing.transactions.forEach(tx => {
      const value = (tx.sharesAmount || 0) * (tx.pricePerShare || 0);
      if (tx.isAcquisition) {
        totalBuys += tx.sharesAmount || 0;
        buyValue += value;
      } else {
        totalSells += tx.sharesAmount || 0;
        sellValue += value;
      }
    });
  });

  // Transform for response
  const formattedTransactions = transactions.flatMap(filing =>
    filing.transactions.map(tx => ({
      date: tx.transactionDate,
      filingDate: filing.filingDate,
      owner: filing.reportingOwner.name,
      title: filing.reportingOwner.officerTitle ||
        (filing.reportingOwner.isDirector ? 'Director' : 'Insider'),
      isOfficer: filing.reportingOwner.isOfficer,
      isDirector: filing.reportingOwner.isDirector,
      transactionType: tx.isAcquisition ? 'Buy' : 'Sell',
      transactionCode: tx.transactionCode,
      transactionDescription: parseTransactionCode(tx.transactionCode),
      shares: tx.sharesAmount,
      price: tx.pricePerShare,
      value: (tx.sharesAmount || 0) * (tx.pricePerShare || 0),
      sharesOwnedAfter: tx.sharesOwnedAfter,
      securityTitle: tx.securityTitle,
      accessionNumber: filing.accessionNumber,
    }))
  );

  const result = {
    company: companyInfo,
    summary: {
      totalBuys,
      totalSells,
      buyValue,
      sellValue,
      netShares: totalBuys - totalSells,
      netValue: buyValue - sellValue,
      transactionCount: formattedTransactions.length,
      uniqueInsiders: new Set(transactions.map(t => t.reportingOwner.cik)).size,
    },
    transactions: formattedTransactions,
  };

  // ── Background: write transactions to Supabase cache ──────────
  if (ticker) {
    writeCacheInBackground(ticker, transactions).catch(err =>
      console.warn('[SEC Insider] Background cache write failed:', err)
    );
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// CACHE WRITE — store Form 4 data in Supabase for future requests
// ═══════════════════════════════════════════════════════════════════

async function writeCacheInBackground(
  ticker: string,
  filings: Awaited<ReturnType<typeof secApi.getInsiderTransactions>>
) {
  const supabase = getSupabase();
  if (!supabase || filings.length === 0) return;

  try {
    // Upsert transactions into insider_sentiment_transactions
    const rows = filings.flatMap(filing =>
      filing.transactions.map(tx => ({
        symbol: ticker.toUpperCase(),
        accession_number: filing.accessionNumber,
        filing_date: filing.filingDate,
        owner_name: filing.reportingOwner.name,
        owner_cik: filing.reportingOwner.cik || '',
        is_officer: filing.reportingOwner.isOfficer,
        is_director: filing.reportingOwner.isDirector,
        is_ten_pct_owner: filing.reportingOwner.isTenPercentOwner || false,
        officer_title: filing.reportingOwner.officerTitle || null,
        transaction_date: tx.transactionDate || filing.filingDate,
        transaction_code: tx.transactionCode,
        security_title: tx.securityTitle,
        shares: tx.sharesAmount || 0,
        price_per_share: tx.pricePerShare || null,
        total_value: (tx.sharesAmount || 0) * (tx.pricePerShare || 0),
        shares_owned_after: tx.sharesOwnedAfter || 0,
        is_acquisition: tx.isAcquisition,
        transaction_type: tx.isAcquisition ? 'buy' : 'sell',
      }))
    );

    if (rows.length > 0) {
      // Batch upsert (Supabase handles dedup via accession_number + transaction_code)
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await (supabase as any)
          .from('insider_sentiment_transactions')
          .upsert(batch, {
            onConflict: 'symbol,accession_number,transaction_code,security_title',
            ignoreDuplicates: true,
          });
      }
    }

    // Update refresh log so cache reads know data is fresh
    const ttl = getSmartTTLSeconds();
    await (supabase as any)
      .from('insider_sentiment_refresh_log')
      .upsert({
        symbol: ticker.toUpperCase(),
        last_refresh_at: new Date().toISOString(),
        filings_parsed: filings.length,
        ttl_seconds: ttl,
        status: 'success',
        refresh_type: 'insider-transactions-api',
      }, {
        onConflict: 'symbol',
      });

    console.log(`[SEC Insider] Cached ${rows.length} transactions for ${ticker} (TTL: ${ttl}s)`);
  } catch (err) {
    console.error('[SEC Insider] Cache write error:', err);
  }
}
