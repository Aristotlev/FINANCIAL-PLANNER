/**
 * SEC Financial Data API (XBRL)
 *
 * PERMANENT STORAGE MODEL:
 *   - ALWAYS serves data from Supabase sec_financials table
 *   - Background syncs fetch only NEW financial periods from SEC EDGAR
 *   - forceRefresh=true triggers a full re-fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { createXBRLParser } from '@/lib/sec/xbrl-parser';
import { secCacheService } from '@/lib/sec-cache-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();
const xbrlParser = createXBRLParser();

/**
 * Background sync: fetches NEW financial periods from SEC and writes to DB.
 */
async function backgroundSyncFinancials(cik: string) {
  try {
    const financials = await secApi.getFinancials(cik);
    // writeFinancials uses upsert on (company_id, period_end_date, period_type)
    // so duplicates are safely handled — only truly new periods get inserted
    if (financials.length > 0) {
      await secCacheService.writeFinancials(cik, financials);
      console.log(`[SEC Financials] Background sync: ${financials.length} periods for CIK ${cik}`);
    }
  } catch (err) {
    console.warn('[SEC Financials] Background sync failed:', err);
  }
}

// GET /api/sec/financials?ticker=AAPL&periods=5
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const cik = searchParams.get('cik');
    const periods = parseInt(searchParams.get('periods') || '10');
    const concept = searchParams.get('concept');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!ticker && !cik) {
      return NextResponse.json(
        { error: 'Either ticker or cik parameter is required' },
        { status: 400 }
      );
    }

    // Resolve CIK (DB-first)
    let companyCik = cik;
    let companyInfo = null;

    if (ticker) {
      const cached = await secCacheService.getCompanyByTicker(ticker);
      companyInfo = cached.data;

      if (!companyInfo) {
        companyInfo = await secApi.getCIKByTicker(ticker);
        if (!companyInfo) {
          return NextResponse.json(
            { error: `Company not found for ticker: ${ticker}` },
            { status: 404 }
          );
        }
        secCacheService.upsertCompanies([companyInfo]).catch(() => {});
      }
      companyCik = companyInfo.cik;
    }

    // If specific concept requested — always hit SEC (rare, analytical query)
    if (concept) {
      const history = await xbrlParser.getMetricHistory(companyCik!, concept, periods);
      return NextResponse.json({
        company: companyInfo,
        concept,
        history,
      }, {
        headers: limiter.headers,
      });
    }

    // ── Force refresh: fetch everything from SEC, store, then return ─
    if (forceRefresh) {
      const financials = await secApi.getFinancials(companyCik!);
      if (financials.length > 0) {
        await secCacheService.writeFinancials(companyCik!, financials);
      }
      return NextResponse.json({
        company: companyInfo,
        financials: financials.slice(0, periods),
        total: financials.length,
        _source: 'sec-edgar',
      }, {
        headers: { ...limiter.headers, 'X-Data-Source': 'fresh' },
      });
    }

    // ── Always serve from DB (permanent storage) ────────────────
    const cachedFinancials = await secCacheService.getFinancials(companyCik!, { periods });

    if (cachedFinancials.data.length > 0) {
      if (cachedFinancials.needsBackgroundRefresh) {
        backgroundSyncFinancials(companyCik!).catch(() => {});
      }

      return NextResponse.json({
        company: companyInfo,
        financials: cachedFinancials.data.slice(0, periods),
        total: cachedFinancials.data.length,
        _source: 'db',
        _cache: {
          cachedAt: cachedFinancials.cachedAt,
          ageSeconds: cachedFinancials.ageSeconds,
          ttlSeconds: cachedFinancials.ttlSeconds,
          refreshTriggered: cachedFinancials.needsBackgroundRefresh,
        },
      }, {
        headers: {
          ...limiter.headers,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          'X-Data-Source': 'cache',
        },
      });
    }

    // ── DB is empty: first-time fetch from SEC EDGAR ────────────
    const financials = await secApi.getFinancials(companyCik!);

    if (financials.length > 0) {
      secCacheService.writeFinancials(companyCik!, financials).catch(err =>
        console.warn('[SEC Financials] Initial cache write failed:', err)
      );
    }

    return NextResponse.json({
      company: companyInfo,
      financials: financials.slice(0, periods),
      total: financials.length,
      _source: 'sec-edgar',
    }, {
      headers: { ...limiter.headers, 'X-Data-Source': 'fresh' },
    });
  } catch (error) {
    console.error('[SEC API] Error fetching financials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
