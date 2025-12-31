/**
 * SEC 13F Institutional Holdings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

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

    if (!cik && !managerName) {
      return NextResponse.json(
        { error: 'Either cik or manager parameter is required' },
        { status: 400 }
      );
    }

    let managerCik = cik;

    // If manager name provided, search for CIK
    if (managerName && !cik) {
      const results = await secApi.searchCompanies(managerName, 5);
      if (results.length === 0) {
        return NextResponse.json(
          { error: `Manager not found: ${managerName}` },
          { status: 404 }
        );
      }
      managerCik = results[0].cik;
    }

    // Get 13F holdings
    const holdings = await secApi.get13FHoldings(managerCik!);

    if (!holdings) {
      return NextResponse.json(
        { error: 'No 13F filing found for this manager' },
        { status: 404 }
      );
    }

    // Sort holdings by value
    const sortedHoldings = holdings.holdings.sort((a, b) => b.value - a.value);

    // Calculate top holdings percentage
    const totalValue = holdings.totalValue;
    const topHoldings = sortedHoldings.slice(0, 20).map(h => ({
      ...h,
      valueFormatted: `$${(h.value / 1000).toFixed(2)}M`,
      percentOfPortfolio: totalValue > 0 ? ((h.value / totalValue) * 100).toFixed(2) : 0,
    }));

    return NextResponse.json({
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
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error fetching 13F data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional holdings' },
      { status: 500 }
    );
  }
}
