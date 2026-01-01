/**
 * SEC Filing Details API
 * Fetches detailed content and sections for a specific filing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

// GET /api/sec/filing-details?cik=...&accessionNumber=...
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const cik = searchParams.get('cik');
    const accessionNumber = searchParams.get('accessionNumber');

    if (!cik || !accessionNumber) {
      return NextResponse.json(
        { error: 'CIK and Accession Number are required' },
        { status: 400 }
      );
    }

    // Get filing detail
    const detail = await secApi.getFilingDetail(cik, accessionNumber);
    
    if (!detail) {
      return NextResponse.json(
        { error: 'Filing not found' },
        { status: 404 }
      );
    }

    // Extract sections if it's a text-heavy filing
    let sections: any[] = [];
    let form4: any = null;

    if (['10-K', '10-Q', '8-K'].includes(detail.form)) {
      sections = await secApi.extractFilingSections(detail);
    } else if (detail.form === '4' || detail.form === '4/A') {
      form4 = await secApi.parseForm4(detail);
    }

    return NextResponse.json({
      ...detail,
      sections,
      form4,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error fetching filing details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filing details' },
      { status: 500 }
    );
  }
}
