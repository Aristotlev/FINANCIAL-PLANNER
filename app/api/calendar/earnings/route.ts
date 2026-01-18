/**
 * Earnings Calendar API Route Handler
 * Fetches upcoming and historical earnings releases from Finnhub
 * Uses database cache to reduce API calls
 * API Documentation: https://finnhub.io/docs/api/earnings-calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { newsCacheService } from '@/lib/news-cache-service';

interface EarningsEvent {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh'; // Before market open, After market close, During market hours
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface EarningsCalendarResponse {
  earningsCalendar: EarningsEvent[];
}

// Helper to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get date range for the request
const getDateRange = (daysBack: number = 30, daysForward: number = 30) => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - daysBack);
  const to = new Date(now);
  to.setDate(to.getDate() + daysForward);
  
  return {
    from: formatDate(from),
    to: formatDate(to)
  };
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const international = searchParams.get('international') === 'true';
    const useCache = searchParams.get('cache') !== 'false';

    // 1. Try to get from cache first (unless explicitly disabled)
    if (useCache) {
      try {
        const needsRefresh = await newsCacheService.needsRefresh('earnings_calendar');
        
        if (!needsRefresh) {
          const cachedData = await newsCacheService.getEarnings({
            fromDate: from || undefined,
            toDate: to || undefined,
            symbol: symbol || undefined,
            limit: 500
          });

          if (cachedData && cachedData.length > 0) {
            console.log(`[Cache] Returning ${cachedData.length} cached earnings events`);
            // Transform to match expected format
            const earnings = cachedData.map(e => ({
              date: e.report_date,
              epsActual: e.eps_actual,
              epsEstimate: e.eps_estimate,
              hour: e.report_time || 'dmh',
              quarter: parseInt(e.fiscal_quarter?.replace('Q', '') || '0') || 0,
              revenueActual: e.revenue_actual,
              revenueEstimate: e.revenue_estimate,
              symbol: e.symbol,
              year: e.fiscal_year || new Date(e.report_date).getFullYear()
            }));
            
            return NextResponse.json({
              success: true,
              data: earnings,
              source: 'cache',
              isMock: false
            });
          }
        }
      } catch (cacheError) {
        console.warn('[Cache] Earnings cache read failed, falling back to API:', cacheError);
      }
    }

    // 2. Check for API key
    const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      // Return mock data if no API key
      const mockData = generateMockEarningsData();
      return NextResponse.json({
        success: true,
        data: mockData,
        isMock: true
      });
    }

    // 3. Build the Finnhub URL
    const finnhubUrl = new URL('https://finnhub.io/api/v1/calendar/earnings');
    finnhubUrl.searchParams.append('token', apiKey);
    
    // Use provided dates or default to 30 days back and forward
    const fromDate = from || getDateRange().from;
    const toDate = to || getDateRange().to;
    
    finnhubUrl.searchParams.append('from', fromDate);
    finnhubUrl.searchParams.append('to', toDate);
    
    if (symbol) {
      finnhubUrl.searchParams.append('symbol', symbol.toUpperCase());
    }
    
    if (international) {
      finnhubUrl.searchParams.append('international', 'true');
    }

    const response = await fetch(finnhubUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle 403 - try to return stale cache
      if (response.status === 403) {
        console.warn('Finnhub returned 403:', errorText);
        
        // Try to return stale cache
        try {
          const staleCache = await newsCacheService.getEarnings({ limit: 500 });
          if (staleCache && staleCache.length > 0) {
            console.log('[Cache] Returning stale earnings cache due to API 403');
            const earnings = staleCache.map(e => ({
              date: e.report_date,
              epsActual: e.eps_actual,
              epsEstimate: e.eps_estimate,
              hour: e.report_time || 'dmh',
              quarter: parseInt(e.fiscal_quarter?.replace('Q', '') || '0') || 0,
              revenueActual: e.revenue_actual,
              revenueEstimate: e.revenue_estimate,
              symbol: e.symbol,
              year: e.fiscal_year || new Date(e.report_date).getFullYear()
            }));
            
            return NextResponse.json({
              success: true,
              data: earnings,
              source: 'stale-cache',
              isMock: false,
              warning: 'Finnhub API rate limited. Showing cached results.'
            });
          }
        } catch {}
        
        return NextResponse.json({
          success: true,
          data: [],
          isMock: false,
          warning: 'Finnhub API rate limited or requires premium access. Showing empty results.'
        });
      }
      
      throw new Error(`Finnhub API error (${response.status}): ${errorText}`);
    }

    const data: EarningsCalendarResponse = await response.json();

    // Sort by date
    const sortedData = data.earningsCalendar?.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }) || [];

    // 4. Update cache in background
    if (sortedData.length > 0) {
      const earningsData = sortedData.map(e => ({
        symbol: e.symbol,
        company_name: e.symbol, // Will be enriched later
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
      
      newsCacheService.refreshEarningsCalendar(earningsData)
        .catch(err => console.error('Failed to update earnings cache:', err));
    }

    return NextResponse.json({
      success: true,
      data: sortedData,
      source: 'api',
      isMock: false
    });

  } catch (error: any) {
    console.error('Earnings Calendar API error:', error);
    
    // Try to return stale cache on error
    try {
      const staleCache = await newsCacheService.getEarnings({ limit: 500 });
      if (staleCache && staleCache.length > 0) {
        console.log('[Cache] Returning stale earnings cache due to API error');
        const earnings = staleCache.map(e => ({
          date: e.report_date,
          epsActual: e.eps_actual,
          epsEstimate: e.eps_estimate,
          hour: e.report_time || 'dmh',
          quarter: parseInt(e.fiscal_quarter?.replace('Q', '') || '0') || 0,
          revenueActual: e.revenue_actual,
          revenueEstimate: e.revenue_estimate,
          symbol: e.symbol,
          year: e.fiscal_year || new Date(e.report_date).getFullYear()
        }));
        
        return NextResponse.json({
          success: true,
          data: earnings,
          source: 'stale-cache',
          isMock: false
        });
      }
    } catch {}
    
    return NextResponse.json({
      success: false,
      data: [],
      isMock: false,
      error: error.message
    }, { status: 500 });
  }
}

// Generate mock earnings data for development/demo
function generateMockEarningsData(): EarningsEvent[] {
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'UNH', name: 'UnitedHealth Group' },
    { symbol: 'HD', name: 'Home Depot Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble' },
    { symbol: 'BAC', name: 'Bank of America' },
  ];

  const hours: ('bmo' | 'amc' | 'dmh')[] = ['bmo', 'amc', 'dmh'];
  const events: EarningsEvent[] = [];
  const today = new Date();

  // Generate events for the past 30 days and next 30 days
  for (let dayOffset = -30; dayOffset <= 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Random number of earnings per day (0-5)
    const numEarnings = Math.floor(Math.random() * 6);
    
    for (let i = 0; i < numEarnings; i++) {
      const stock = popularStocks[Math.floor(Math.random() * popularStocks.length)];
      const isPast = dayOffset < 0;
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const year = date.getFullYear();
      
      // Generate realistic EPS values
      const epsEstimate = parseFloat((Math.random() * 5 + 0.5).toFixed(2));
      const epsSurprise = (Math.random() - 0.3) * 0.5; // Slight positive bias
      const epsActual = isPast ? parseFloat((epsEstimate + epsSurprise).toFixed(2)) : null;
      
      // Generate realistic revenue values (in millions)
      const revenueEstimate = Math.round((Math.random() * 50000 + 5000) * 1000000);
      const revenueSurprise = (Math.random() - 0.3) * 0.1; // Slight positive bias
      const revenueActual = isPast ? Math.round(revenueEstimate * (1 + revenueSurprise)) : null;

      events.push({
        date: formatDate(date),
        epsActual,
        epsEstimate,
        hour: hours[Math.floor(Math.random() * hours.length)],
        quarter,
        revenueActual,
        revenueEstimate,
        symbol: stock.symbol,
        year,
      });
    }
  }

  // Sort by date
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
