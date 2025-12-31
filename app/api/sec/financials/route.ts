/**
 * SEC Financial Data API (XBRL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { createXBRLParser } from '@/lib/sec/xbrl-parser';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();
const xbrlParser = createXBRLParser();

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
    const concept = searchParams.get('concept'); // For specific XBRL concept history

    if (!ticker && !cik) {
      return NextResponse.json(
        { error: 'Either ticker or cik parameter is required' },
        { status: 400 }
      );
    }

    // Get CIK
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

    // If specific concept requested
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

    // Get full financials
    const financials = await secApi.getFinancials(companyCik!);

    return NextResponse.json({
      company: companyInfo,
      financials: financials.slice(0, periods),
      total: financials.length,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error fetching financials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
