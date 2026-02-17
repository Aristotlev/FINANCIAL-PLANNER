/**
 * SEC 13F Institutional Holdings API
 *
 * PERMANENT STORAGE MODEL:
 *   - ALWAYS serves data from Supabase sec_institutional_holdings table
 *   - Background syncs fetch only NEW 13F reports from SEC EDGAR
 *   - forceRefresh=true triggers a full re-fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { secCacheService } from '@/lib/sec-cache-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

/**
 * Background sync: fetches latest 13F from SEC and writes to DB.
 * writeHoldings uses upsert on (manager_cik, cusip, report_date)
 * so only truly new report dates get inserted.
 */
async function backgroundSyncHoldings(managerCik: string) {
  try {
    const holdings = await secApi.get13FHoldings(managerCik);
    if (holdings && holdings.holdings.length > 0) {
      await secCacheService.writeHoldings(managerCik, holdings);
      console.log(`[SEC Holdings] Background sync: ${holdings.holdings.length} holdings for CIK ${managerCik}`);
    }
  } catch (err) {
    console.warn('[SEC Holdings] Background sync failed:', err);
  }
}

/** Format holdings response (shared between DB and fresh paths) */
function formatHoldingsResponse(holdings: any, source: 'db' | 'sec-edgar', cacheInfo?: any) {
  const sortedHoldings = holdings.holdings.sort((a: any, b: any) => b.value - a.value);
  const totalValue = holdings.totalValue;

  const topHoldings = sortedHoldings.slice(0, 20).map((h: any) => ({
    ...h,
    valueFormatted: `$${(h.value / 1000).toFixed(2)}M`,
    percentOfPortfolio: totalValue > 0 ? ((h.value / totalValue) * 100).toFixed(2) : 0,
  }));

  return {
    manager: {
      cik: holdings.cik,
      name: holdings.managerName,
    },
    reportDate: holdings.reportDate,
    filingDate: holdings.filingDate,
    totalValue: holdings.totalValue,
    totalValueFormatted: `$${(holdings.totalValue / 1000000).toFixed(2)}B`,
    holdingsCount: holdings.holdings.length,
    topHoldings,
    allHoldings: sortedHoldings,
    _source: source,
    ...(cacheInfo ? { _cache: cacheInfo } : {}),
  };
}

// GET /api/sec/holdings?cik=0001067983 (for a hedge fund like Berkshire)
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const cik = searchParams.get('cik');
    const managerName = searchParams.get('manager');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!cik && !managerName) {
      return NextResponse.json(
        { error: 'Either cik or manager parameter is required' },
        { status: 400 }
      );
    }

    let managerCik = cik;

    // If manager name provided, search for CIK (DB-first)
    if (managerName && !cik) {
      const cached = await secCacheService.searchCompanies(managerName, 5);
      if (cached.data.length > 0) {
        managerCik = cached.data[0].cik;
      } else {
        const results = await secApi.searchCompanies(managerName, 5);
        if (results.length === 0) {
          return NextResponse.json(
            { error: `Manager not found: ${managerName}` },
            { status: 404 }
          );
        }
        managerCik = results[0].cik;
      }
    }

    // ── Force refresh: fetch from SEC, store, return ────────────
    if (forceRefresh) {
      const holdings = await secApi.get13FHoldings(managerCik!);
      if (!holdings) {
        return NextResponse.json(
          { error: 'No 13F filing found for this manager' },
          { status: 404 }
        );
      }
      await secCacheService.writeHoldings(managerCik!, holdings);
      return NextResponse.json(formatHoldingsResponse(holdings, 'sec-edgar'), {
        headers: { ...limiter.headers, 'X-Data-Source': 'fresh' },
      });
    }

    // ── Always serve from DB (permanent storage) ────────────────
    const cachedHoldings = await secCacheService.getHoldings(managerCik!);

    if (cachedHoldings.data) {
      if (cachedHoldings.needsBackgroundRefresh) {
        backgroundSyncHoldings(managerCik!).catch(() => {});
      }

      return NextResponse.json(
        formatHoldingsResponse(cachedHoldings.data, 'db', {
          cachedAt: cachedHoldings.cachedAt,
          ageSeconds: cachedHoldings.ageSeconds,
          ttlSeconds: cachedHoldings.ttlSeconds,
          refreshTriggered: cachedHoldings.needsBackgroundRefresh,
        }),
        {
          headers: {
            ...limiter.headers,
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-Data-Source': 'cache',
          },
        }
      );
    }

    // ── DB is empty: first-time fetch from SEC EDGAR ────────────
    const holdings = await secApi.get13FHoldings(managerCik!);

    if (!holdings) {
      return NextResponse.json(
        { error: 'No 13F filing found for this manager' },
        { status: 404 }
      );
    }

    // Write to DB for next time
    secCacheService.writeHoldings(managerCik!, holdings).catch(err =>
      console.warn('[SEC Holdings] Initial cache write failed:', err)
    );

    return NextResponse.json(formatHoldingsResponse(holdings, 'sec-edgar'), {
      headers: { ...limiter.headers, 'X-Data-Source': 'fresh' },
    });
  } catch (error) {
    console.error('[SEC API] Error fetching 13F data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional holdings' },
      { status: 500 }
    );
  }
}
