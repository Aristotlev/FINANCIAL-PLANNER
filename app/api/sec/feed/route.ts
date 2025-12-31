/**
 * SEC RSS Feed API - Latest Filings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, FilingType, getFormTypeDescription, formatFilingDate } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

// GET /api/sec/feed?formType=8-K&limit=40
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const formType = searchParams.get('formType') as FilingType | null;
    const limit = parseInt(searchParams.get('limit') || '40');

    // Get latest filings from RSS feed
    const items = await secApi.getLatestFilings(formType || undefined);

    // Transform for response
    const filings = items.slice(0, limit).map(item => {
      // Parse form type from title
      const formMatch = item.title.match(/^(\d+-[KQ]|8-K|4|13F-\w+)/i);
      const form = formMatch ? formMatch[1] : 'Unknown';
      
      // Parse company name
      const companyMatch = item.title.match(/- (.+?) \(/);
      const company = companyMatch ? companyMatch[1] : item.title.split(' - ')[0];
      
      return {
        title: item.title,
        company,
        formType: form,
        formDescription: getFormTypeDescription(form),
        link: item.link,
        pubDate: item.pubDate,
        pubDateFormatted: new Date(item.pubDate).toLocaleString(),
        description: item.description,
      };
    });

    return NextResponse.json({
      filings,
      count: filings.length,
      formType: formType || 'all',
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        ...limiter.headers,
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('[SEC API] Error fetching RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEC feed' },
      { status: 500 }
    );
  }
}
