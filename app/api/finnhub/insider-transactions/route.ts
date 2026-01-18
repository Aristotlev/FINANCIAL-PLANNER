import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';
import { toolsCacheService } from '../../../../lib/tools-cache-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = searchParams.get('limit');
  const useCache = searchParams.get('cache') !== 'false';

  try {
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 100;

    // 1. Try to get from cache first if no specific dates are requested
    if (useCache && symbol && !from && !to) {
      try {
        const cachedData = await toolsCacheService.getInsiderTransactions({
          symbol,
          limit: limitNum
        });

        if (cachedData && cachedData.length > 0) {
          // Only return if cache is fresh enough (checked via needsRefresh)
          const needsRefresh = await toolsCacheService.needsRefresh('insider_transactions');
          if (!needsRefresh) {
            console.log(`[Cache] Returning cached insider transactions for ${symbol}`);
            return NextResponse.json({ data: cachedData, symbol, source: 'cache' });
          }
        }
      } catch (cacheErr) {
        // Cache unavailable, continue to API
        console.warn('[Insider Transactions] Cache unavailable, fetching from API:', cacheErr);
      }
    }

    // 2. Fetch fresh data
    const finnhub = createFinnhubClient();
    
    const data = await finnhub.getInsiderTransactions(
      symbol || undefined,
      from || undefined,
      to || undefined,
      limitNum
    );
    
    // 3. Update cache in background if it's a standard symbol request
    if (symbol && !from && !to && data.data && data.data.length > 0) {
      toolsCacheService.refreshInsiderTransactions(data.data, symbol)
        .catch(err => console.error('Failed to update insider transactions cache:', err));
    }
    
    return NextResponse.json({ ...data, source: 'api' });
  } catch (error: any) {
    console.error('Error fetching insider transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insider transactions' },
      { status: 500 }
    );
  }
}
