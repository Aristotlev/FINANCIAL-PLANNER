/**
 * SEC Filing Comparison/Diff API
 *
 * DB-first for CIK resolution and filing lookups.
 * Text extraction still hits SEC directly (immutable filings).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, SECFiling } from '@/lib/api/sec-edgar-api';
import { createSECTextExtractor } from '@/lib/sec/sec-text-extractor';
import { secCacheService } from '@/lib/sec-cache-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();
const textExtractor = createSECTextExtractor();

// POST /api/sec/compare
// Body: { ticker: "AAPL", section: "risk_factors" }
// or { currentAccession: "...", previousAccession: "..." }
export async function POST(request: NextRequest) {
  const limiter = withRateLimit(request, { ...RateLimitPresets.STANDARD, limit: 10 });
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const body = await request.json();
    const { 
      ticker, 
      cik, 
      section = 'risk_factors',
      currentAccession,
      previousAccession,
      formType = '10-K'
    } = body;

    let currentFiling: SECFiling;
    let previousFiling: SECFiling;

    if (currentAccession && previousAccession) {
      // Compare specific filings by accession number
      const companyCik = cik || ticker;
      if (!companyCik) {
        return NextResponse.json(
          { error: 'Ticker or CIK required when using accession numbers' },
          { status: 400 }
        );
      }

      let resolvedCik = companyCik;
      if (ticker) {
        // DB-first CIK lookup
        const cached = await secCacheService.getCompanyByTicker(ticker);
        const company = cached.data || await secApi.getCIKByTicker(ticker);
        if (!company) {
          return NextResponse.json(
            { error: `Company not found: ${ticker}` },
            { status: 404 }
          );
        }
        resolvedCik = company.cik;
      }

      const filings = await secApi.getCompanyFilings(resolvedCik);
      currentFiling = filings.find(f => f.accessionNumber === currentAccession)!;
      previousFiling = filings.find(f => f.accessionNumber === previousAccession)!;

      if (!currentFiling || !previousFiling) {
        return NextResponse.json(
          { error: 'One or both filings not found' },
          { status: 404 }
        );
      }
    } else if (ticker || cik) {
      // Auto-compare last two filings of the specified type
      let resolvedCik = cik;
      let companyInfo = null;

      if (ticker) {
        // DB-first CIK lookup
        const cached = await secCacheService.getCompanyByTicker(ticker);
        companyInfo = cached.data;
        if (!companyInfo) {
          companyInfo = await secApi.getCIKByTicker(ticker);
        }
        if (!companyInfo) {
          return NextResponse.json(
            { error: `Company not found: ${ticker}` },
            { status: 404 }
          );
        }
        resolvedCik = companyInfo.cik;
      }

      const filings = await secApi.getCompanyFilings(resolvedCik!, [formType]);
      
      if (filings.length < 2) {
        return NextResponse.json(
          { error: `Need at least 2 ${formType} filings to compare` },
          { status: 400 }
        );
      }

      currentFiling = filings[0];
      previousFiling = filings[1];
    } else {
      return NextResponse.json(
        { error: 'Provide ticker/cik or accession numbers' },
        { status: 400 }
      );
    }

    // Perform comparison
    const comparison = await textExtractor.compareFilings(currentFiling, previousFiling);

    // Get specific section diff
    const sectionDiff = comparison.sections[section];

    return NextResponse.json({
      currentFiling: {
        accessionNumber: currentFiling.accessionNumber,
        filingDate: currentFiling.filingDate,
        form: currentFiling.form,
      },
      previousFiling: {
        accessionNumber: previousFiling.accessionNumber,
        filingDate: previousFiling.filingDate,
        form: previousFiling.form,
      },
      section,
      diff: sectionDiff || null,
      overallSimilarity: comparison.overallSimilarity,
      significantChanges: comparison.significantChanges.slice(0, 10),
      newRisks: comparison.newRisks,
      removedRisks: comparison.removedRisks,
      allSections: Object.keys(comparison.sections).map(name => ({
        name,
        similarity: comparison.sections[name].similarity,
        addedTerms: comparison.sections[name].added.length,
        removedTerms: comparison.sections[name].removed.length,
      })),
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error comparing filings:', error);
    return NextResponse.json(
      { error: 'Failed to compare filings' },
      { status: 500 }
    );
  }
}
