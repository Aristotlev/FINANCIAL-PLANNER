import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';
import { toolsCacheService } from '../../../../lib/tools-cache-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const useCache = searchParams.get('cache') !== 'false';
  const debug = searchParams.get('debug') === 'true';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const debugInfo: Record<string, any> = {};

  try {
    // 1. Try to get from cache FIRST - return immediately if we have data
    // Don't block on needsRefresh check - cached data is good enough for instant load
    if (useCache && !from && !to) {
      try {
        if (debug) debugInfo.cacheAttempt = true;
        const cachedData = await toolsCacheService.getUSASpending({ symbol });

        if (cachedData && cachedData.length > 0) {
          // Return cached data immediately for instant loads
          console.log(`[Cache] Returning cached USA spending data for ${symbol} (${cachedData.length} items)`);
          return NextResponse.json({ 
            data: cachedData, 
            symbol, 
            source: 'cache',
            ...(debug && { debug: { ...debugInfo, cacheHit: true, count: cachedData.length } })
          });
        }
        if (debug) debugInfo.cacheResult = 'empty';
      } catch (cacheErr: any) {
        // Cache unavailable, continue to API
        console.warn('[USA Spending] Cache unavailable, fetching from API:', cacheErr);
        if (debug) debugInfo.cacheError = cacheErr.message || 'Unknown cache error';
      }
    }

    // 2. Check if Finnhub API key is configured (only if cache miss)
    const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    const hasValidApiKey = apiKey && apiKey !== 'your_finnhub_api_key_here' && apiKey.length > 10;
    
    if (debug) {
      debugInfo.hasApiKey = !!apiKey;
      debugInfo.hasValidApiKey = hasValidApiKey;
      debugInfo.apiKeyPrefix = apiKey ? apiKey.substring(0, 4) + '...' : 'none';
    }

    if (!hasValidApiKey) {
      console.warn('[USA Spending API] Finnhub API key not configured or invalid - returning empty response');
      return NextResponse.json({ 
        data: [], 
        symbol, 
        source: 'none',
        message: 'Finnhub API not configured - feature disabled',
        ...(debug && { debug: debugInfo })
      });
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

    if (debug) {
      debugInfo.fetchingFromApi = true;
      debugInfo.dateRange = { from: fromDate, to: toDate };
    }
    
    const data = await finnhub.getUSASpending(symbol, fromDate, toDate);
    
    if (debug) {
      debugInfo.apiResult = data.data?.length || 0;
    }
    
    // 3. Update cache if standard request and we got data
    if (!from && !to && data.data && data.data.length > 0) {
      toolsCacheService.refreshUSASpending(data.data, symbol)
        .catch(err => console.error('Failed to update USA spending cache:', err));
    }
    
    return NextResponse.json({ 
      ...data, 
      source: 'api',
      ...(debug && { debug: debugInfo })
    });
  } catch (error: any) {
    console.error('Error fetching USA spending data:', error);
    // Return empty data instead of error for graceful degradation
    return NextResponse.json({ 
      data: [], 
      symbol, 
      source: 'error',
      error: error.message || 'Failed to fetch USA spending data',
      ...(debug && { debug: { ...debugInfo, error: error.message } })
    });
  }
}
