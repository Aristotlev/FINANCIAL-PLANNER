/**
 * OmniFolio Proprietary USA Spending API
 *
 * 100% proprietary federal spending data derived from USAspending.gov.
 * No third-party paid APIs — fully legal, fully public data.
 *
 * Endpoints:
 *   GET /api/usa-spending?symbol=LMT
 *   GET /api/usa-spending?symbol=LMT&years=3&refresh=true
 *   GET /api/usa-spending?symbol=LMT&activities=false
 *
 * Response includes:
 *   - Fiscal year OGI (OmniFolio Government Influence) scores
 *   - Individual award/contract detail
 *   - Summary statistics (obligations, agencies, sectors, states)
 *   - Trend analysis (increasing/decreasing/stable)
 *   - Cache metadata (TTL, freshness, expiry)
 *
 * Smart Caching:
 *   - Supabase DB cache with smart TTL
 *   - Stale-while-revalidate pattern
 *   - Request deduplication for concurrent users
 *   - Background refresh to prevent stale data
 *
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { usaSpendingService } from '@/lib/usa-spending-service';
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
    const years = parseInt(searchParams.get('years') || '3', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const includeActivities = searchParams.get('activities') !== 'false';

    // Validate symbol
    if (!symbol) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: symbol',
          usage: '/api/usa-spending?symbol=LMT',
        },
        { status: 400 }
      );
    }

    // Validate years range
    if (years < 1 || years > 10) {
      return NextResponse.json(
        { error: 'Years must be between 1 and 10' },
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

    // Fetch spending data (with smart caching)
    const result = await usaSpendingService.getSpendingData(cleanSymbol, {
      years,
      forceRefresh,
      includeActivities,
    });

    // Build cache headers
    const ttl = result.expiresAt
      ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
      : usaSpendingService.calculateSmartTTL();

    const cacheHeaders: Record<string, string> = {
      'Cache-Control': `public, s-maxage=${Math.floor(ttl / 2)}, stale-while-revalidate=${ttl}`,
      'X-Data-Source': result.source,
      'X-OGI-Score': result.currentScore.toString(),
      'X-Influence': result.currentLabel,
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

      // Current snapshot
      currentScore: result.currentScore,
      currentLabel: result.currentLabel,
      trend: result.trend,

      // Fiscal year data
      fiscalYears: result.fiscalYears,
      fiscalYearCount: result.fiscalYears.length,

      // Award detail
      activities: result.activities,
      activityCount: result.activities.length,

      // Summary
      summary: result.summary,

      // Cache metadata
      meta: {
        source: result.source,
        cachedAt: result.cachedAt,
        expiresAt: result.expiresAt,
        ttlSeconds: ttl,
        algorithm: 'OmniFolio Government Influence (OGI) v1',
        dataSource: 'USAspending.gov (Public)',
      },
    }, {
      headers: cacheHeaders,
    });
  } catch (error: any) {
    console.error('[USA Spending API] Error:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 404, headers: limiter.headers }
      );
    }

    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      return NextResponse.json(
        {
          error: 'USAspending.gov rate limit reached. Data will be available shortly.',
          retryAfter: 30,
          success: false,
        },
        { status: 503, headers: { ...limiter.headers, 'Retry-After': '30' } }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch USA spending data',
        detail: error.message,
        success: false,
      },
      { status: 500, headers: limiter.headers }
    );
  }
}
