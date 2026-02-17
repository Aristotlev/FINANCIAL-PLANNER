/**
 * OmniFolio Proprietary Insider Sentiment API
 * 
 * 100% proprietary insider sentiment scoring derived from SEC EDGAR Form 4 filings.
 * No third-party sentiment APIs — fully legal for commercial use at scale.
 * 
 * Endpoints:
 *   GET /api/insider-sentiment?symbol=AAPL
 *   GET /api/insider-sentiment?symbol=AAPL&months=12&refresh=true
 *   GET /api/insider-sentiment?symbol=AAPL&transactions=false
 * 
 * Response includes:
 *   - Monthly OIC (OmniFolio Insider Confidence) scores
 *   - Individual insider transactions with role/weight data
 *   - Trend analysis (improving/declining/stable)
 *   - Cache metadata (TTL, freshness, expiry)
 * 
 * Smart Caching:
 *   - Supabase DB cache with market-hours-aware TTL
 *   - Stale-while-revalidate pattern for instant responses
 *   - Request deduplication for concurrent users
 *   - Background refresh to prevent stale data
 * 
 * Rate Limiting:
 *   - Standard preset (60 req/min per client)
 *   - SEC EDGAR: 4 req/sec (safely under 10/sec limit)
 *   - Exponential backoff on 429s from SEC
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { insiderSentimentService } from '@/lib/insider-sentiment-service';
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
    const months = parseInt(searchParams.get('months') || '24', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const includeTransactions = searchParams.get('transactions') !== 'false';

    // Validate symbol
    if (!symbol) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter: symbol',
          usage: '/api/insider-sentiment?symbol=AAPL',
        },
        { status: 400 }
      );
    }

    // Validate months range
    if (months < 1 || months > 60) {
      return NextResponse.json(
        { error: 'Months must be between 1 and 60' },
        { status: 400 }
      );
    }

    // Validate symbol format (1-10 uppercase letters, dots, hyphens)
    const cleanSymbol = symbol.toUpperCase().trim();
    if (!/^[A-Z0-9.\-]{1,10}$/.test(cleanSymbol)) {
      return NextResponse.json(
        { error: 'Invalid ticker symbol format' },
        { status: 400 }
      );
    }

    // Fetch insider sentiment (with smart caching)
    const result = await insiderSentimentService.getInsiderSentiment(cleanSymbol, {
      months,
      forceRefresh,
      includeTransactions,
    });

    // Build cache headers based on data-driven TTL
    // Use the TTL from the result (already computed from DB filing activity)
    const ttl = result.expiresAt
      ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
      : insiderSentimentService.calculateSmartTTL();
    const cacheHeaders: Record<string, string> = {
      'Cache-Control': `public, s-maxage=${Math.floor(ttl / 2)}, stale-while-revalidate=${ttl}`,
      'X-Data-Source': result.source,
      'X-OIC-Score': result.currentScore.toString(),
      'X-Sentiment': result.currentLabel,
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
      
      // Historical data
      months: result.months,
      monthCount: result.months.length,
      
      // Transaction detail
      transactions: result.transactions,
      transactionCount: result.transactions.length,
      
      // Cache metadata
      meta: {
        source: result.source,
        cachedAt: result.cachedAt,
        expiresAt: result.expiresAt,
        ttlSeconds: ttl,
        algorithm: 'OmniFolio Insider Confidence (OIC) v1',
        dataSource: 'SEC EDGAR Form 4',
      },
    }, {
      headers: cacheHeaders,
    });
  } catch (error: any) {
    console.error('[InsiderSentiment API] Error:', error);

    // Distinguish between different error types
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
        error: 'Failed to compute insider sentiment',
        detail: error.message,
        success: false,
      },
      { status: 500, headers: limiter.headers }
    );
  }
}
