import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';
import { newsCacheService } from '../../../../lib/news-cache-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const useCache = searchParams.get('cache') !== 'false';

  try {
    // 1. Try to get from cache first (unless explicitly disabled)
    if (useCache) {
      try {
        const needsRefresh = await newsCacheService.needsRefresh('ipo_calendar');
        
        if (!needsRefresh) {
          const cachedData = await newsCacheService.getAllIPOs({
            fromDate: from || undefined,
            toDate: to || undefined,
            limit: 200
          });

          if (cachedData && cachedData.length > 0) {
            console.log(`[Cache] Returning ${cachedData.length} cached IPO events`);
            // Transform to match Finnhub format
            const ipoCalendar = cachedData.map(ipo => ({
              date: ipo.ipo_date || ipo.expected_ipo_date || '',
              exchange: ipo.exchange || '',
              name: ipo.company_name,
              numberOfShares: ipo.shares_offered || 0,
              price: ipo.offer_price ? `$${ipo.offer_price}` : (ipo.price_range_low && ipo.price_range_high ? `$${ipo.price_range_low}-$${ipo.price_range_high}` : ''),
              status: ipo.status || 'expected',
              symbol: ipo.symbol,
              totalSharesValue: ipo.market_cap_estimate || 0
            }));
            return NextResponse.json({ ipoCalendar, source: 'cache' });
          }
        }
      } catch (cacheError) {
        console.warn('[Cache] IPO cache read failed, falling back to API:', cacheError);
      }
    }

    // 2. Fetch from Finnhub API
    const finnhub = createFinnhubClient();
    
    // Default to 6 months back and 6 months forward if dates not provided
    let fromDate = from;
    let toDate = to;
    
    if (!fromDate || !toDate) {
      const today = new Date();
      const defaultFrom = new Date(today);
      defaultFrom.setMonth(defaultFrom.getMonth() - 6);
      const defaultTo = new Date(today);
      defaultTo.setMonth(defaultTo.getMonth() + 6);
      
      fromDate = fromDate || defaultFrom.toISOString().split('T')[0];
      toDate = toDate || defaultTo.toISOString().split('T')[0];
    }
    
    const data = await finnhub.getIPOCalendar(fromDate, toDate);
    
    // 3. Update cache in background
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
      
      newsCacheService.refreshIPOCalendar(ipoData)
        .catch(err => console.error('Failed to update IPO cache:', err));
    }
    
    return NextResponse.json({ ...data, source: 'api' });
  } catch (error: any) {
    console.error('Error fetching IPO calendar:', error);
    
    // Try to return stale cache on error
    try {
      const staleCache = await newsCacheService.getAllIPOs({ limit: 200 });
      if (staleCache && staleCache.length > 0) {
        console.log('[Cache] Returning stale IPO cache due to API error');
        const ipoCalendar = staleCache.map(ipo => ({
          date: ipo.ipo_date || ipo.expected_ipo_date || '',
          exchange: ipo.exchange || '',
          name: ipo.company_name,
          numberOfShares: ipo.shares_offered || 0,
          price: ipo.offer_price ? `$${ipo.offer_price}` : '',
          status: ipo.status || 'expected',
          symbol: ipo.symbol,
          totalSharesValue: ipo.market_cap_estimate || 0
        }));
        return NextResponse.json({ ipoCalendar, source: 'stale-cache' });
      }
    } catch {}
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch IPO calendar', ipoCalendar: [] },
      { status: 500 }
    );
  }
}
