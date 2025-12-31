/**
 * SEC Insider Trading API (Form 4)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, parseTransactionCode } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

// GET /api/sec/insider?ticker=AAPL&days=90
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const cik = searchParams.get('cik');
    const days = parseInt(searchParams.get('days') || '90');

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

    // Get insider transactions
    const transactions = await secApi.getInsiderTransactions(companyCik!, days);

    // Calculate summary
    let totalBuys = 0;
    let totalSells = 0;
    let buyValue = 0;
    let sellValue = 0;

    transactions.forEach(filing => {
      filing.transactions.forEach(tx => {
        const value = (tx.sharesAmount || 0) * (tx.pricePerShare || 0);
        if (tx.isAcquisition) {
          totalBuys += tx.sharesAmount || 0;
          buyValue += value;
        } else {
          totalSells += tx.sharesAmount || 0;
          sellValue += value;
        }
      });
    });

    // Transform for response
    const formattedTransactions = transactions.flatMap(filing => 
      filing.transactions.map(tx => ({
        date: tx.transactionDate,
        filingDate: filing.filingDate,
        owner: filing.reportingOwner.name,
        title: filing.reportingOwner.officerTitle || 
               (filing.reportingOwner.isDirector ? 'Director' : 'Insider'),
        isOfficer: filing.reportingOwner.isOfficer,
        isDirector: filing.reportingOwner.isDirector,
        transactionType: tx.isAcquisition ? 'Buy' : 'Sell',
        transactionCode: tx.transactionCode,
        transactionDescription: parseTransactionCode(tx.transactionCode),
        shares: tx.sharesAmount,
        price: tx.pricePerShare,
        value: (tx.sharesAmount || 0) * (tx.pricePerShare || 0),
        sharesOwnedAfter: tx.sharesOwnedAfter,
        securityTitle: tx.securityTitle,
        accessionNumber: filing.accessionNumber,
      }))
    );

    return NextResponse.json({
      company: companyInfo,
      summary: {
        totalBuys,
        totalSells,
        buyValue,
        sellValue,
        netShares: totalBuys - totalSells,
        netValue: buyValue - sellValue,
        transactionCount: formattedTransactions.length,
        uniqueInsiders: new Set(transactions.map(t => t.reportingOwner.cik)).size,
      },
      transactions: formattedTransactions,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error fetching insider data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insider trading data' },
      { status: 500 }
    );
  }
}
