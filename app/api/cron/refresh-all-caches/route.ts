/**
 * Master Cache Refresh Cron Job — INCREMENTAL SYNC
 * 
 * This endpoint syncs ALL caches with their external data sources.
 * SEC EDGAR syncs are INCREMENTAL: only fetches data newer than what's
 * already stored in the DB. Existing data is permanent, never re-fetched.
 * 
 * Call this from:
 * - Google Cloud Scheduler
 * - Vercel Cron
 * - Any external cron service
 * 
 * POST /api/cron/refresh-all-caches
 * Header: x-cron-secret: <CRON_SECRET>
 * 
 * Or GET for status check (no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { newsCacheService } from '@/lib/news-cache-service';
import { toolsCacheService } from '@/lib/tools-cache-service';
import { secCacheService } from '@/lib/sec-cache-service';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';

const CRON_SECRET = process.env.CRON_SECRET;

// Popular symbols to pre-cache for tools
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 
  'V', 'WMT', 'LMT', 'BA', 'RTX', 'GD', 'NOC' // Defense contractors for USA Spending
];

// Top institutional investors to pre-cache 13F holdings
const TOP_FUND_CIKS = [
  '0001067983', // Berkshire Hathaway
  '0001336528', // Bridgewater Associates
  '0001649339', // Citadel Advisors
];

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret (skip in development)
    const cronSecret = req.headers.get('x-cron-secret');
    if (process.env.NODE_ENV === 'production' && CRON_SECRET && cronSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: Record<string, any> = {};
    const secApi = createSECEdgarClient();

    // ==================== SEC EDGAR CACHES (incremental sync) ====================

    // 0. SEC Company Tickers (refresh daily — populates sec_companies table)
    try {
      console.log('[Cron] Refreshing SEC company tickers...');
      const mapping = await secApi.loadCIKMapping();
      const companies = Array.from(mapping.values());
      
      if (companies.length > 0) {
        const result = await secCacheService.upsertCompanies(companies);
        results.sec_company_tickers = { success: true, count: result.count };
      } else {
        results.sec_company_tickers = { success: true, count: 0, message: 'No companies loaded' };
      }
    } catch (error: any) {
      console.error('[Cron] SEC company tickers error:', error);
      results.sec_company_tickers = { error: error.message };
    }

    // 0b. SEC Filings — INCREMENTAL: only fetch filings newer than what's in DB
    try {
      console.log('[Cron] Syncing SEC filings (incremental)...');
      let totalNew = 0;

      for (const symbol of POPULAR_SYMBOLS.slice(0, 10)) {
        try {
          const company = await secApi.getCIKByTicker(symbol);
          if (company) {
            const latestDate = await secCacheService.getLatestFilingDate(company.cik);
            const allFilings = await secApi.getCompanyFilings(company.cik);

            // Only write truly new filings
            const newFilings = latestDate
              ? allFilings.filter(f => f.filingDate > latestDate)
              : allFilings;

            if (newFilings.length > 0) {
              await secCacheService.writeFilings(company.cik, newFilings);
              totalNew += newFilings.length;
              console.log(`[Cron] ${symbol}: ${newFilings.length} new filings (had data since ${latestDate})`);
            } else {
              // Update refresh log even if no new filings (resets TTL)
              await secCacheService.writeFilings(company.cik, []);
            }
          }
          // Respect SEC rate limits (4 req/s via gateway)
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.warn(`[Cron] Failed to sync filings for ${symbol}`);
        }
      }

      results.sec_filings = { success: true, newCount: totalNew, mode: 'incremental' };
    } catch (error: any) {
      console.error('[Cron] SEC filings error:', error);
      results.sec_filings = { error: error.message };
    }

    // 0c. SEC Financials — INCREMENTAL: upsert handles dedup via unique constraint
    try {
      console.log('[Cron] Syncing SEC financials (incremental)...');
      let totalNew = 0;

      for (const symbol of POPULAR_SYMBOLS.slice(0, 8)) {
        try {
          const company = await secApi.getCIKByTicker(symbol);
          if (company) {
            const financials = await secApi.getFinancials(company.cik);
            if (financials.length > 0) {
              // writeFinancials uses upsert on (company_id, period_end_date, period_type)
              // so only truly new periods get inserted, existing ones get updated
              await secCacheService.writeFinancials(company.cik, financials);
              totalNew += financials.length;
            }
          }
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.warn(`[Cron] Failed to sync financials for ${symbol}`);
        }
      }

      results.sec_financials = { success: true, count: totalNew, mode: 'incremental' };
    } catch (error: any) {
      console.error('[Cron] SEC financials error:', error);
      results.sec_financials = { error: error.message };
    }

    // 0d. SEC 13F Holdings — INCREMENTAL: only fetch if new report exists
    try {
      console.log('[Cron] Syncing SEC 13F holdings (incremental)...');
      let totalNew = 0;

      for (const fundCik of TOP_FUND_CIKS) {
        try {
          const holdings = await secApi.get13FHoldings(fundCik);
          if (holdings && holdings.holdings.length > 0) {
            const latestReport = await secCacheService.getLatestHoldingsReportDate(fundCik);
            
            // Only write if this is a newer report than what we have
            if (!latestReport || holdings.reportDate > latestReport) {
              await secCacheService.writeHoldings(fundCik, holdings);
              totalNew += holdings.holdings.length;
              console.log(`[Cron] CIK ${fundCik}: new 13F report (${holdings.reportDate})`);
            } else {
              console.log(`[Cron] CIK ${fundCik}: 13F up to date (${latestReport})`);
            }
          }
          await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          console.warn(`[Cron] Failed to sync 13F for CIK ${fundCik}`);
        }
      }

      results.sec_holdings = { success: true, newCount: totalNew, mode: 'incremental' };
    } catch (error: any) {
      console.error('[Cron] SEC 13F holdings error:', error);
      results.sec_holdings = { error: error.message };
    }

    // ==================== NEWS CACHES ====================

    // 1. IPO Calendar (refresh every 6 hours — uses proprietary SEC EDGAR data)
    try {
      const needsRefresh = await newsCacheService.needsRefresh('ipo_calendar');
      if (needsRefresh) {
        console.log('[Cron] Refreshing IPO calendar via SEC EDGAR...');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        const ipoResponse = await fetch(`${baseUrl}/api/calendar/ipo?refresh=true`);
        if (ipoResponse.ok) {
          const ipoJson = await ipoResponse.json();
          results.ipo_calendar = {
            success: true,
            count: ipoJson.data?.length || 0,
            source: 'sec-edgar',
          };
        } else {
          results.ipo_calendar = { error: `IPO API returned ${ipoResponse.status}` };
        }
      } else {
        results.ipo_calendar = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] IPO calendar error:', error);
      results.ipo_calendar = { error: error.message };
    }

    // 2. Earnings Calendar (proprietary SEC EDGAR data — refresh handled by API route)
    try {
      console.log('[Cron] Triggering earnings calendar SEC refresh...');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const earningsResponse = await fetch(`${baseUrl}/api/calendar/earnings?refresh=true`);
      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json();
        results.earnings_calendar = {
          success: true,
          count: earningsData.data?.length || 0,
          source: 'sec-edgar',
        };
      } else {
        results.earnings_calendar = { error: `Earnings API returned ${earningsResponse.status}` };
      }
    } catch (error: any) {
      console.error('[Cron] Earnings calendar error:', error);
      results.earnings_calendar = { error: error.message };
    }

    // ==================== TOOLS CACHES ====================
    // These use proprietary services that fetch from public government data sources

    // 3. Insider Transactions (refresh daily — uses SEC EDGAR insider data)
    try {
      const needsRefresh = await toolsCacheService.needsRefresh('insider_transactions');
      if (needsRefresh) {
        console.log('[Cron] Refreshing insider transactions via proprietary service...');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        let totalCount = 0;

        for (const symbol of POPULAR_SYMBOLS.slice(0, 10)) {
          try {
            const response = await fetch(`${baseUrl}/api/insider-sentiment?symbol=${symbol}`);
            if (response.ok) {
              const data = await response.json();
              totalCount += data.transactions?.length || 0;
            }
            await new Promise(r => setTimeout(r, 300));
          } catch (e) {
            console.warn(`[Cron] Failed to refresh insider data for ${symbol}`);
          }
        }

        results.insider_transactions = { success: true, count: totalCount, source: 'sec-edgar' };
      } else {
        results.insider_transactions = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] Insider transactions error:', error);
      results.insider_transactions = { error: error.message };
    }

    // 4. Senate Lobbying (refresh weekly — uses Senate lobbying disclosure data)
    try {
      const needsRefresh = await toolsCacheService.needsRefresh('senate_lobbying');
      if (needsRefresh) {
        console.log('[Cron] Refreshing senate lobbying via proprietary service...');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        let totalCount = 0;

        for (const symbol of POPULAR_SYMBOLS.slice(0, 8)) {
          try {
            const response = await fetch(`${baseUrl}/api/senate-lobbying?symbol=${symbol}`);
            if (response.ok) {
              const data = await response.json();
              totalCount += data.activities?.length || 0;
            }
            await new Promise(r => setTimeout(r, 300));
          } catch (e) {
            console.warn(`[Cron] Failed to refresh lobbying for ${symbol}`);
          }
        }

        results.senate_lobbying = { success: true, count: totalCount, source: 'senate-disclosures' };
      } else {
        results.senate_lobbying = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] Senate lobbying error:', error);
      results.senate_lobbying = { error: error.message };
    }

    // 5. USA Spending (refresh weekly — uses USASpending.gov public data)
    try {
      const needsRefresh = await toolsCacheService.needsRefresh('usa_spending');
      if (needsRefresh) {
        console.log('[Cron] Refreshing USA spending via proprietary service...');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        let totalCount = 0;

        const defenseSymbols = ['LMT', 'BA', 'RTX', 'GD', 'NOC', 'AAPL', 'MSFT', 'AMZN'];

        for (const symbol of defenseSymbols) {
          try {
            const response = await fetch(`${baseUrl}/api/usa-spending?symbol=${symbol}&years=2`);
            if (response.ok) {
              const data = await response.json();
              totalCount += data.activities?.length || 0;
            }
            await new Promise(r => setTimeout(r, 300));
          } catch (e) {
            console.warn(`[Cron] Failed to refresh USA spending for ${symbol}`);
          }
        }

        results.usa_spending = { success: true, count: totalCount, source: 'usaspending.gov' };
      } else {
        results.usa_spending = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] USA spending error:', error);
      results.usa_spending = { error: error.message };
    }

    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      results,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Cron] Master cache refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh caches' },
      { status: 500 }
    );
  }
}

// GET endpoint to check all cache statuses
export async function GET() {
  try {
    const [newsStatus, toolsStatus] = await Promise.all([
      newsCacheService.getCacheStatus(),
      toolsCacheService.getCacheStatus()
    ]);

    return NextResponse.json({
      news_caches: newsStatus,
      tools_caches: toolsStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
