/**
 * SEC Filing Details API
 * Fetches detailed content and sections for a specific filing
 *
 * PERMANENT STORAGE MODEL:
 *   - Filed documents are immutable — once in DB, they never change
 *   - Falls back to SEC EDGAR for first-time fetch, then stores permanently
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { secCacheService } from '@/lib/sec-cache-service';
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
    let accessionNumber = searchParams.get('accessionNumber');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!cik || !accessionNumber) {
      return NextResponse.json(
        { error: 'CIK and Accession Number are required' },
        { status: 400 }
      );
    }

    // Sanitize accession number
    accessionNumber = accessionNumber.replace(/:\d+$/, '');

    // ── 1. Try DB cache for filing detail ────────────────────────
    if (!forceRefresh) {
      const cachedDetail = await secCacheService.getFilingDetail(cik, accessionNumber);

      if (cachedDetail.data) {
        const detail = cachedDetail.data;

        // Also check for cached sections (immutable — no TTL needed)
        const cachedSections = await secCacheService.getFilingSections(accessionNumber);

        return NextResponse.json({
          ...detail,
          sections: cachedSections.data,
          form4: null, // Form 4 data would need separate parsing
          _source: 'db',
        }, {
          headers: {
            ...limiter.headers,
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-Data-Source': 'cache',
          },
        });
      }
    }

    // ── 2. Fallback: fetch from SEC EDGAR ────────────────────────
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

      // Background: cache sections for next time
      if (sections.length > 0) {
        secCacheService.writeFilingSections(accessionNumber, cik, sections).catch(() => {});
      }
    } else if (detail.form === '4' || detail.form === '4/A') {
      form4 = await secApi.parseForm4(detail);
    }

    return NextResponse.json({
      ...detail,
      sections,
      form4,
      _source: 'sec-edgar',
    }, {
      headers: {
        ...limiter.headers,
        'X-Data-Source': 'fresh',
      },
    });
  } catch (error) {
    console.error('[SEC API] Error fetching filing details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filing details' },
      { status: 500 }
    );
  }
}
