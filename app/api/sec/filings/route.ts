/**
 * SEC EDGAR Filings API
 *
 * PERMANENT STORAGE MODEL:
 *   - ALWAYS serves data from Supabase sec_filings table
 *   - Background syncs fetch only NEW filings from SEC EDGAR
 *   - forceRefresh=true triggers a full re-fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, FilingType } from '@/lib/api/sec-edgar-api';
import { secCacheService } from '@/lib/sec-cache-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

/**
 * Background sync: fetches NEW filings from SEC EDGAR and writes to DB.
 * Only fetches filings newer than what we already have.
 */
async function backgroundSyncFilings(cik: string, formTypes?: FilingType[]) {
  try {
    const latestDate = await secCacheService.getLatestFilingDate(cik);
    const allFilings = await secApi.getCompanyFilings(cik, formTypes);

    // Only write filings we don't already have (newer than latest in DB)
    const newFilings = latestDate
      ? allFilings.filter(f => f.filingDate > latestDate)
      : allFilings;

    if (newFilings.length > 0) {
      await secCacheService.writeFilings(cik, newFilings);
      console.log(`[SEC Filings] Background sync: ${newFilings.length} new filings for CIK ${cik}`);
    } else {
      // Still update the refresh log so TTL resets
      await secCacheService.writeFilings(cik, []);
      console.log(`[SEC Filings] Background sync: no new filings for CIK ${cik}`);
    }
  } catch (err) {
    console.warn('[SEC Filings] Background sync failed:', err);
  }
}

// GET /api/sec/filings?ticker=AAPL&formTypes=10-K,10-Q
export async function GET(request: NextRequest) {
  // Rate limiting
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const cik = searchParams.get('cik');
    const formTypesParam = searchParams.get('formTypes');
    const limit = parseInt(searchParams.get('limit') || '20');
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
      // Try DB first
      const cached = await secCacheService.getCompanyByTicker(ticker);
      companyInfo = cached.data;

      if (!companyInfo) {
        // Fallback to SEC
        companyInfo = await secApi.getCIKByTicker(ticker);
        if (!companyInfo) {
          return NextResponse.json(
            { error: `Company not found for ticker: ${ticker}` },
            { status: 404 }
          );
        }
        // Cache for next time
        secCacheService.upsertCompanies([companyInfo]).catch(() => {});
      }
      companyCik = companyInfo.cik;
    }

    // Parse form types
    const formTypes = formTypesParam
      ? (formTypesParam.split(',') as FilingType[])
      : undefined;

    // ── Force refresh: fetch everything from SEC, store, then return ─
    if (forceRefresh) {
      const filings = await secApi.getCompanyFilings(companyCik!, formTypes);
      if (filings.length > 0) {
        await secCacheService.writeFilings(companyCik!, filings);
      }
      return NextResponse.json({
        company: companyInfo,
        filings: filings.slice(0, limit),
        total: filings.length,
        _source: 'sec-edgar',
      }, {
        headers: { ...limiter.headers, 'X-Data-Source': 'fresh' },
      });
    }

    // ── Always serve from DB (permanent storage) ────────────────
    const cachedFilings = await secCacheService.getFilings(companyCik!, {
      formTypes,
      limit,
    });

    // If DB has data → return it. Trigger background sync if TTL expired.
    if (cachedFilings.data.length > 0) {
      if (cachedFilings.needsBackgroundRefresh) {
        // Fire-and-forget background sync for NEW filings only
        backgroundSyncFilings(companyCik!, formTypes).catch(() => {});
      }

      return NextResponse.json({
        company: companyInfo,
        filings: cachedFilings.data.slice(0, limit),
        total: cachedFilings.data.length,
        _source: 'db',
        _cache: {
          cachedAt: cachedFilings.cachedAt,
          ageSeconds: cachedFilings.ageSeconds,
          ttlSeconds: cachedFilings.ttlSeconds,
          refreshTriggered: cachedFilings.needsBackgroundRefresh,
        },
      }, {
        headers: {
          ...limiter.headers,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Data-Source': 'cache',
        },
      });
    }

    // ── DB is empty: first-time fetch from SEC EDGAR ────────────
    const filings = await secApi.getCompanyFilings(companyCik!, formTypes);

    if (filings.length > 0) {
      // Write ALL filings to DB (first population)
      secCacheService.writeFilings(companyCik!, filings).catch(err =>
        console.warn('[SEC Filings] Initial cache write failed:', err)
      );
    }

    return NextResponse.json({
      company: companyInfo,
      filings: filings.slice(0, limit),
      total: filings.length,
      _source: 'sec-edgar',
    }, {
      headers: { ...limiter.headers, 'X-Data-Source': 'fresh' },
    });
  } catch (error) {
    console.error('[SEC API] Error fetching filings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filings' },
      { status: 500 }
    );
  }
}
