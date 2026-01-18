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
    // Check if Finnhub API key is configured
    const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
      console.warn('[USA Spending API] Finnhub API key not configured - returning empty response');
      return NextResponse.json({ 
        data: [], 
        symbol, 
        source: 'none',
        message: 'Finnhub API not configured - feature disabled' 
      });
    }

    // 1. Try to get from cache first if no specific dates are requested
    if (useCache && !from && !to) {
      try {
        const cachedData = await toolsCacheService.getUSASpending({ symbol });

        if (cachedData && cachedData.length > 0) {
          const needsRefresh = await toolsCacheService.needsRefresh('usa_spending');
          if (!needsRefresh) {
            console.log(`[Cache] Returning cached USA spending data for ${symbol}`);
            return NextResponse.json({ data: cachedData, symbol, source: 'cache' });
          }
        }
      } catch (cacheErr) {
        // Cache unavailable, continue to API
        console.warn('[USA Spending] Cache unavailable, fetching from API:', cacheErr);
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
    
    const data = await finnhub.getUSASpending(symbol, fromDate, toDate);
    
    // 2. Update cache if standard request
    if (!from && !to && data.data && data.data.length > 0) {
      toolsCacheService.refreshUSASpending(data.data, symbol)
        .catch(err => console.error('Failed to update USA spending cache:', err));
    }
    
    return NextResponse.json({ ...data, source: 'api' });
  } catch (error: any) {
    console.error('Error fetching USA spending data:', error);
    // Return empty data instead of error for graceful degradation
    return NextResponse.json({ 
      data: [], 
      symbol, 
      source: 'error',
      error: error.message || 'Failed to fetch USA spending data' 
    });
  }
}
