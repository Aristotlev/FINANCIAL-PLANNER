/**
 * Master Cache Refresh Cron Job
 * 
 * This endpoint refreshes ALL caches (news + tools) in one call.
 * Perfect for a single cron job that runs every 15-30 minutes.
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
import { createFinnhubClient } from '@/lib/api/finnhub-api';

const CRON_SECRET = process.env.CRON_SECRET;

// Popular symbols to pre-cache for tools
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 
  'V', 'WMT', 'LMT', 'BA', 'RTX', 'GD', 'NOC' // Defense contractors for USA Spending
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
    const finnhub = createFinnhubClient();

    // ==================== NEWS CACHES ====================

    // 1. IPO Calendar (refresh every 6 hours)
    try {
      const needsRefresh = await newsCacheService.needsRefresh('ipo_calendar');
      if (needsRefresh) {
        console.log('[Cron] Refreshing IPO calendar...');
        const today = new Date();
        const from = new Date(today);
        from.setMonth(from.getMonth() - 1);
        const to = new Date(today);
        to.setMonth(to.getMonth() + 6);
        
        const data = await finnhub.getIPOCalendar(
          from.toISOString().split('T')[0],
          to.toISOString().split('T')[0]
        );
        
        if (data.ipoCalendar && data.ipoCalendar.length > 0) {
          const ipoData = data.ipoCalendar.map(ipo => ({
            symbol: ipo.symbol,
            company_name: ipo.name,
            exchange: ipo.exchange,
            ipo_date: ipo.date,
            shares_offered: ipo.numberOfShares,
            market_cap_estimate: ipo.totalSharesValue,
            status: ipo.status as any,
            raw_data: ipo
          }));
          
          const result = await newsCacheService.refreshIPOCalendar(ipoData);
          results.ipo_calendar = { success: true, count: result.count };
        } else {
          results.ipo_calendar = { success: true, count: 0, message: 'No IPOs found' };
        }
      } else {
        results.ipo_calendar = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] IPO calendar error:', error);
      results.ipo_calendar = { error: error.message };
    }

    // 2. Earnings Calendar (refresh every hour)
    try {
      const needsRefresh = await newsCacheService.needsRefresh('earnings_calendar');
      if (needsRefresh) {
        console.log('[Cron] Refreshing earnings calendar...');
        const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
        
        if (apiKey) {
          const today = new Date();
          const from = new Date(today);
          from.setDate(from.getDate() - 7);
          const to = new Date(today);
          to.setDate(to.getDate() + 30);
          
          const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&token=${apiKey}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            if (data.earningsCalendar && data.earningsCalendar.length > 0) {
              const earningsData = data.earningsCalendar.map((e: any) => ({
                symbol: e.symbol,
                company_name: e.symbol,
                report_date: e.date,
                report_time: e.hour as any,
                fiscal_quarter: `Q${e.quarter}`,
                fiscal_year: e.year,
                eps_estimate: e.epsEstimate ?? undefined,
                eps_actual: e.epsActual ?? undefined,
                revenue_estimate: e.revenueEstimate ?? undefined,
                revenue_actual: e.revenueActual ?? undefined,
                raw_data: e
              }));
              
              const result = await newsCacheService.refreshEarningsCalendar(earningsData);
              results.earnings_calendar = { success: true, count: result.count };
            } else {
              results.earnings_calendar = { success: true, count: 0, message: 'No earnings found' };
            }
          } else {
            results.earnings_calendar = { error: `API returned ${response.status}` };
          }
        } else {
          results.earnings_calendar = { skipped: true, reason: 'No API key configured' };
        }
      } else {
        results.earnings_calendar = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] Earnings calendar error:', error);
      results.earnings_calendar = { error: error.message };
    }

    // ==================== TOOLS CACHES ====================

    // 3. Insider Transactions (refresh daily)
    try {
      const needsRefresh = await toolsCacheService.needsRefresh('insider_transactions');
      if (needsRefresh) {
        console.log('[Cron] Refreshing insider transactions...');
        let totalCount = 0;
        
        // Fetch for popular symbols
        for (const symbol of POPULAR_SYMBOLS.slice(0, 10)) {
          try {
            const data = await finnhub.getRecentInsiderTransactions(symbol, 365);
            if (data.data && data.data.length > 0) {
              await toolsCacheService.refreshInsiderTransactions(data.data, symbol);
              totalCount += data.data.length;
            }
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));
          } catch (e) {
            console.warn(`[Cron] Failed to fetch insider transactions for ${symbol}`);
          }
        }
        
        results.insider_transactions = { success: true, count: totalCount };
      } else {
        results.insider_transactions = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] Insider transactions error:', error);
      results.insider_transactions = { error: error.message };
    }

    // 4. Senate Lobbying (refresh weekly)
    try {
      const needsRefresh = await toolsCacheService.needsRefresh('senate_lobbying');
      if (needsRefresh) {
        console.log('[Cron] Refreshing senate lobbying...');
        let totalCount = 0;
        
        for (const symbol of POPULAR_SYMBOLS.slice(0, 8)) {
          try {
            const data = await finnhub.getRecentLobbying(symbol, 2);
            if (data.data && data.data.length > 0) {
              await toolsCacheService.refreshSenateLobbying(data.data, symbol);
              totalCount += data.data.length;
            }
            await new Promise(r => setTimeout(r, 200));
          } catch (e) {
            console.warn(`[Cron] Failed to fetch lobbying for ${symbol}`);
          }
        }
        
        results.senate_lobbying = { success: true, count: totalCount };
      } else {
        results.senate_lobbying = { skipped: true, reason: 'Cache still fresh' };
      }
    } catch (error: any) {
      console.error('[Cron] Senate lobbying error:', error);
      results.senate_lobbying = { error: error.message };
    }

    // 5. USA Spending (refresh weekly)
    try {
      const needsRefresh = await toolsCacheService.needsRefresh('usa_spending');
      if (needsRefresh) {
        console.log('[Cron] Refreshing USA spending...');
        let totalCount = 0;
        
        // Defense contractors get most government contracts
        const defenseSymbols = ['LMT', 'BA', 'RTX', 'GD', 'NOC', 'AAPL', 'MSFT', 'AMZN'];
        
        for (const symbol of defenseSymbols) {
          try {
            const data = await finnhub.getRecentUSASpending(symbol, 2);
            if (data.data && data.data.length > 0) {
              await toolsCacheService.refreshUSASpending(data.data, symbol);
              totalCount += data.data.length;
            }
            await new Promise(r => setTimeout(r, 200));
          } catch (e) {
            console.warn(`[Cron] Failed to fetch USA spending for ${symbol}`);
          }
        }
        
        results.usa_spending = { success: true, count: totalCount };
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
