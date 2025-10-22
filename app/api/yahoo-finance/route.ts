import { NextRequest, NextResponse } from 'next/server';

// In-memory cache with request deduplication
const cache = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_DURATION = 600000; // 10 minutes
const STALE_CACHE_DURATION = 3600000; // 1 hour

function getCachedData(key: string, allowStale: boolean = false) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  if (allowStale && Date.now() - cached.timestamp < STALE_CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const cacheKey = `yahoo:${symbol}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`✅ Returning cached Yahoo Finance data for ${symbol}`);
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
          'X-Cache': 'HIT',
        },
      });
    }
    
    // Check for pending request (deduplication)
    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log(`⚡ Deduplicating Yahoo Finance request for ${symbol}`);
      try {
        const result = await pendingRequest;
        return NextResponse.json(result, {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            'X-Cache': 'DEDUPLICATED',
          },
        });
      } catch (error) {
        console.warn('Deduplication failed, fetching normally');
      }
    }

    // Fetch from Yahoo Finance API
    const fetchPromise = (async () => {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PriceTracker/1.0)',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance API returned ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data.chart?.result?.[0]) {
        throw new Error('Invalid response from Yahoo Finance');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      
      const currentPrice = meta.regularMarketPrice || meta.previousClose;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      // Return formatted data
      return {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change24h: change,
        changePercent24h: changePercent,
        lastUpdated: Date.now(),
        meta: {
          currency: meta.currency,
          exchangeName: meta.exchangeName,
          instrumentType: meta.instrumentType,
          regularMarketTime: meta.regularMarketTime,
        }
      };
    })();
    
    // Store in pending requests
    pendingRequests.set(cacheKey, fetchPromise);
    
    const responseData = await fetchPromise;
    pendingRequests.delete(cacheKey);
    
    // Cache the result
    setCachedData(cacheKey, responseData);
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('Yahoo Finance API error:', error);
    
    // Clean up pending request
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    if (symbol) {
      const cacheKey = `yahoo:${symbol}`;
      pendingRequests.delete(cacheKey);
      
      // Try to return stale cached data
      const staleData = getCachedData(cacheKey, true);
      if (staleData) {
        console.log(`📦 Returning stale Yahoo data for ${symbol} after error`);
        return NextResponse.json(staleData, {
          status: 200,
          headers: {
            'X-Cache': 'STALE-ERROR',
          },
        });
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Support POST for batch requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbols = body.symbols as string[];

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    // Fetch all symbols in parallel
    const promises = symbols.map(async (symbol) => {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PriceTracker/1.0)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${symbol}`);
        }

        const data = await response.json();
        const result = data.chart.result[0];
        const meta = result.meta;
        
        const currentPrice = meta.regularMarketPrice || meta.previousClose;
        const previousClose = meta.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        return {
          symbol: symbol.toUpperCase(),
          price: currentPrice,
          change24h: change,
          changePercent24h: changePercent,
          lastUpdated: Date.now(),
          success: true,
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return {
          symbol: symbol.toUpperCase(),
          error: error instanceof Error ? error.message : 'Failed to fetch',
          success: false,
        };
      }
    });

    const results = await Promise.all(promises);

    return NextResponse.json({
      results,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Yahoo Finance batch API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
