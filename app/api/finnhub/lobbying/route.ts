import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';
import { toolsCacheService } from '../../../../lib/tools-cache-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const useCache = searchParams.get('cache') !== 'false';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  try {
    // 1. Try to get from cache first if no specific dates are requested
    if (useCache && !from && !to) {
      const cachedData = await toolsCacheService.getSenateLobbying({ symbol });

      if (cachedData && cachedData.length > 0) {
        const needsRefresh = await toolsCacheService.needsRefresh('senate_lobbying');
        if (!needsRefresh) {
          console.log(`[Cache] Returning cached lobbying data for ${symbol}`);
          return NextResponse.json({ data: cachedData, symbol, source: 'cache' });
        }
      }
    }

    const finnhub = createFinnhubClient();
    
    // Default to last 2 years if dates not provided
    let fromDate = from;
    let toDate = to;
    
    if (!fromDate || !toDate) {
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      toDate = toDate || now.toISOString().split('T')[0];
      fromDate = fromDate || twoYearsAgo.toISOString().split('T')[0];
    }
    
    const data = await finnhub.getLobbying(symbol, fromDate, toDate);
    
    // 2. Update cache if standard request
    if (!from && !to && data.data && data.data.length > 0) {
      toolsCacheService.refreshSenateLobbying(data.data, symbol)
        .catch(err => console.error('Failed to update lobbying cache:', err));
    }
    
    return NextResponse.json({ ...data, source: 'api' });
  } catch (error: any) {
    console.error('Error fetching lobbying data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lobbying data' },
      { status: 500 }
    );
  }
}
