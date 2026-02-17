/**
 * OmniFolio Proprietary Earnings Surprises API
 * 
 * 100% proprietary earnings surprise scoring derived from SEC EDGAR
 * XBRL financial data. Actual EPS comes from public 10-Q/10-K filings.
 * No third-party earnings APIs — fully legal for commercial use at scale.
 * 
 * Endpoints:
 *   GET /api/earnings-surprises?symbol=AAPL
 *   GET /api/earnings-surprises?symbol=AAPL&quarters=8&refresh=true
 * 
 * Response includes:
 *   - Quarterly EPS actual vs estimate with surprise %
 *   - Revenue, margins, YoY/QoQ comparisons
 *   - Proprietary OES (OmniFolio Earnings Surprise) scores
 *   - Beat/miss streaks and consistency metrics
 *   - Cache metadata (TTL, freshness, expiry)
 * 
 * Smart Caching:
 *   - Supabase DB cache with earnings-season-aware TTL
 *   - Server-side in-memory cache for instant responses
 *   - Stale-while-revalidate pattern
 *   - Request deduplication (global fetch locks)
 *   - Background refresh to prevent stale data
 * 
 * Rate Limiting:
 *   - Standard preset (60 req/min per client)
 *   - SEC EDGAR: 4 req/sec (safely under 10/sec limit)
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { earningsSurprisesService } from '@/lib/earnings-surprises-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  // Rate limit: standard 60 req/min
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const quarters = parseInt(searchParams.get('quarters') || '16', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Validate symbol
    if (!symbol) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: symbol',
          usage: '/api/earnings-surprises?symbol=AAPL',
        },
        { status: 400 }
      );
    }

    // Validate quarters range
    if (quarters < 1 || quarters > 40) {
      return NextResponse.json(
        { error: 'Quarters must be between 1 and 40' },
        { status: 400 }
      );
    }

    // Validate symbol format
    const cleanSymbol = symbol.toUpperCase().trim();
    if (!/^[A-Z0-9.\-]{1,10}$/.test(cleanSymbol)) {
      return NextResponse.json(
        { error: 'Invalid ticker symbol format' },
        { status: 400 }
      );
    }

    // Fetch earnings surprises (with smart caching)
    const result = await earningsSurprisesService.getEarningsSurprises(cleanSymbol, {
      quarters,
      forceRefresh,
    });

    // Build cache headers based on data-driven TTL
    const ttl = result.expiresAt
      ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
      : earningsSurprisesService.calculateSmartTTL();

    const cacheHeaders: Record<string, string> = {
      'Cache-Control': `public, s-maxage=${Math.floor(ttl / 2)}, stale-while-revalidate=${ttl}`,
      'X-Data-Source': result.source,
      'X-OES-Score': result.currentScore.toString(),
      'X-Surprise-Label': result.currentLabel,
      'X-Beat-Rate': `${result.beatRate}%`,
      'X-Trend': result.trend,
      ...limiter.headers,
    };

    if (result.cachedAt) {
      cacheHeaders['X-Cached-At'] = result.cachedAt;
    }
    if (result.expiresAt) {
      cacheHeaders['X-Expires-At'] = result.expiresAt;
    }

    return NextResponse.json({
      success: true,
      symbol: result.symbol,
      companyName: result.companyName,
      cik: result.cik,

      // Current snapshot
      currentScore: result.currentScore,
      currentLabel: result.currentLabel,
      trend: result.trend,
      beatRate: result.beatRate,
      avgSurprisePct: result.avgSurprisePct,
      currentStreak: result.currentStreak,

      // Historical data
      quarters: result.quarters,
      quarterCount: result.quarters.length,

      // Cache metadata
      meta: {
        source: result.source,
        cachedAt: result.cachedAt,
        expiresAt: result.expiresAt,
        ttlSeconds: ttl,
        algorithm: 'OmniFolio Earnings Surprise (OES) v1',
        dataSource: 'SEC EDGAR XBRL (10-Q/10-K)',
      },
    }, {
      headers: cacheHeaders,
    });
  } catch (error: any) {
    console.error('[EarningsSurprises API] Error:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 404, headers: limiter.headers }
      );
    }

    if (error.message?.includes('Rate limited') || error.message?.includes('429')) {
      return NextResponse.json(
        {
          error: 'SEC EDGAR rate limit reached. Data will be available shortly.',
          retryAfter: 30,
          success: false,
        },
        { status: 503, headers: { ...limiter.headers, 'Retry-After': '30' } }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to compute earnings surprises',
        detail: error.message,
        success: false,
      },
      { status: 500, headers: limiter.headers }
    );
  }
}
