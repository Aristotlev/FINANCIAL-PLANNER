/**
 * SEC Company Search and Lookup API
 *
 * PERMANENT STORAGE MODEL:
 *   - ALWAYS serves from Supabase sec_companies table
 *   - Falls back to SEC EDGAR only for unknown companies, then stores
 *   - Overview mode uses permanent DB data with background refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { secCacheService } from '@/lib/sec-cache-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

// GET /api/sec/company?ticker=AAPL or ?cik=0000320193 or ?search=Apple
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const cik = searchParams.get('cik');
    const search = searchParams.get('search');
    const overview = searchParams.get('overview') === 'true';
    const forceRefresh = searchParams.get('refresh') === 'true';

    // ── Search mode: DB-first ────────────────────────────────────
    if (search) {
      const limit = parseInt(searchParams.get('limit') || '10');

      // 1. Try DB cache
      if (!forceRefresh) {
        const cached = await secCacheService.searchCompanies(search, limit);
        if (cached.data.length > 0) {
          return NextResponse.json({
            results: cached.data,
            count: cached.data.length,
            _source: 'db',
          }, {
            headers: {
              ...limiter.headers,
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              'X-Data-Source': 'cache',
            },
          });
        }
      }

      // 2. Fallback to SEC EDGAR (also loads into memory CIK cache)
      const results = await secApi.searchCompanies(search, limit);
      return NextResponse.json({
        results,
        count: results.length,
        _source: 'sec-edgar',
      }, {
        headers: {
          ...limiter.headers,
          'X-Data-Source': 'fresh',
        },
      });
    }

    // ── Lookup mode: DB-first ────────────────────────────────────
    if (!ticker && !cik) {
      return NextResponse.json(
        { error: 'Provide ticker, cik, or search parameter' },
        { status: 400 }
      );
    }

    let company = null;
    let source: 'db' | 'fresh' = 'db';

    // 1. Try DB cache
    if (!forceRefresh) {
      if (ticker) {
        const cached = await secCacheService.getCompanyByTicker(ticker);
        company = cached.data;
      } else if (cik) {
        const cached = await secCacheService.getCompanyByCIK(cik);
        company = cached.data;
      }
    }

    // 2. Fallback to SEC EDGAR
    if (!company) {
      source = 'fresh';
      if (ticker) {
        company = await secApi.getCIKByTicker(ticker);
      } else if (cik) {
        company = await secApi.getTickerByCIK(cik);
      }

      // Write to DB in background for next time
      if (company) {
        secCacheService.upsertCompanies([company]).catch(err =>
          console.warn('[SEC Company] Background cache write failed:', err)
        );
      }
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // ── Overview mode: uses permanent DB data ─────────────────────
    if (overview) {
      // Always read from DB (permanent storage)
      const [cachedFilings, cachedFinancials] = await Promise.all([
        secCacheService.getFilings(company.cik, { limit: 10 }),
        secCacheService.getFinancials(company.cik, { periods: 5 }),
      ]);

      // If DB has data, return it. Trigger background sync if needed.
      if (cachedFilings.data.length > 0 || cachedFinancials.data.length > 0) {
        // Background sync if either needs refresh
        if (cachedFilings.needsBackgroundRefresh || cachedFinancials.needsBackgroundRefresh) {
          const secApi = createSECEdgarClient();
          secApi.getCompanyOverview(company.cik).then(overviewData => {
            if (overviewData.recentFilings.length > 0) {
              secCacheService.writeFilings(company.cik, overviewData.recentFilings).catch(() => {});
            }
            if (overviewData.financials.length > 0) {
              secCacheService.writeFinancials(company.cik, overviewData.financials).catch(() => {});
            }
          }).catch(() => {});
        }

        return NextResponse.json({
          company,
          recentFilings: cachedFilings.data,
          financials: cachedFinancials.data,
          _source: 'db',
          _cache: {
            refreshTriggered: cachedFilings.needsBackgroundRefresh || cachedFinancials.needsBackgroundRefresh,
          },
        }, {
          headers: {
            ...limiter.headers,
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Data-Source': 'cache',
          },
        });
      }

      // DB is empty: first-time fetch from SEC
      const overviewData = await secApi.getCompanyOverview(company.cik);

      // Background cache write
      if (overviewData.recentFilings.length > 0) {
        secCacheService.writeFilings(company.cik, overviewData.recentFilings).catch(() => {});
      }
      if (overviewData.financials.length > 0) {
        secCacheService.writeFinancials(company.cik, overviewData.financials).catch(() => {});
      }

      return NextResponse.json({
        company: overviewData.company,
        recentFilings: overviewData.recentFilings,
        financials: overviewData.financials.slice(0, 5),
        _source: 'sec-edgar',
      }, {
        headers: {
          ...limiter.headers,
          'X-Data-Source': 'fresh',
        },
      });
    }

    return NextResponse.json({
      company,
      _source: source,
    }, {
      headers: {
        ...limiter.headers,
        'Cache-Control': source === 'db' ? 'public, s-maxage=300, stale-while-revalidate=600' : undefined,
        'X-Data-Source': source === 'db' ? 'cache' : 'fresh',
      } as Record<string, string>,
    });
  } catch (error) {
    console.error('[SEC API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    );
  }
}
