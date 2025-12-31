/**
 * SEC Company Search and Lookup API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
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

    // Search mode
    if (search) {
      const limit = parseInt(searchParams.get('limit') || '10');
      const results = await secApi.searchCompanies(search, limit);
      
      return NextResponse.json({
        results,
        count: results.length,
      }, {
        headers: limiter.headers,
      });
    }

    // Lookup mode
    if (!ticker && !cik) {
      return NextResponse.json(
        { error: 'Provide ticker, cik, or search parameter' },
        { status: 400 }
      );
    }

    let company;
    if (ticker) {
      company = await secApi.getCIKByTicker(ticker);
    } else if (cik) {
      company = await secApi.getTickerByCIK(cik);
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // If overview requested, get additional data
    if (overview) {
      const overviewData = await secApi.getCompanyOverview(company.cik);
      return NextResponse.json({
        company: overviewData.company,
        recentFilings: overviewData.recentFilings,
        financials: overviewData.financials.slice(0, 5),
      }, {
        headers: limiter.headers,
      });
    }

    return NextResponse.json({ company }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    );
  }
}
