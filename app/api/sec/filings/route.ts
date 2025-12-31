/**
 * SEC EDGAR API Routes
 * Provides endpoints for SEC filing data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, FilingType } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

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

    if (!ticker && !cik) {
      return NextResponse.json(
        { error: 'Either ticker or cik parameter is required' },
        { status: 400 }
      );
    }

    // Get CIK if ticker provided
    let companyCik = cik;
    let companyInfo = null;

    if (ticker) {
      companyInfo = await secApi.getCIKByTicker(ticker);
      if (!companyInfo) {
        return NextResponse.json(
          { error: `Company not found for ticker: ${ticker}` },
          { status: 404 }
        );
      }
      companyCik = companyInfo.cik;
    }

    // Parse form types
    const formTypes = formTypesParam
      ? (formTypesParam.split(',') as FilingType[])
      : undefined;

    // Get filings
    const filings = await secApi.getCompanyFilings(companyCik!, formTypes);

    return NextResponse.json({
      company: companyInfo,
      filings: filings.slice(0, limit),
      total: filings.length,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error fetching filings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filings' },
      { status: 500 }
    );
  }
}
