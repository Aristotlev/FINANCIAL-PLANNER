import { NextRequest, NextResponse } from 'next/server';
import { apiGateway, CacheTTL } from '@/lib/api/external-api-gateway';

// ── Shared Yahoo Finance fetch helper (via gateway) ───────────────────

async function fetchYahooQuoteViaGateway(symbol: string): Promise<{
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  lastUpdated: number;
  meta: {
    currency: string;
    exchangeName: string;
    instrumentType: string;
    regularMarketTime: number;
  };
}> {
  const result = await apiGateway.cachedFetch(
    'yahoo-finance',
    `chart:${symbol.toUpperCase()}`,
    async () => {
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
      if (!data.chart?.result?.[0]) {
        throw new Error('Invalid response from Yahoo Finance');
      }

      const chartResult = data.chart.result[0];
      const meta = chartResult.meta;

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
        meta: {
          currency: meta.currency,
          exchangeName: meta.exchangeName,
          instrumentType: meta.instrumentType,
          regularMarketTime: meta.regularMarketTime,
        },
      };
    },
    CacheTTL.YAHOO_QUOTE,
  );

  return result.data;
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

    const responseData = await fetchYahooQuoteViaGateway(symbol);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'GATEWAY',
      },
    });

  } catch (error) {
    console.error('Yahoo Finance API error:', error);

    // Try to return stale cached data from gateway
    const symbol = request.nextUrl.searchParams.get('symbol');
    if (symbol) {
      const staleData = apiGateway.getCached('yahoo-finance', `chart:${symbol.toUpperCase()}`);
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

// Fallback stock prices for when Yahoo Finance API fails
const FALLBACK_STOCK_PRICES: Record<string, { price: number; change: number }> = {
  'AAPL': { price: 178.50, change: 1.25 },
  'MSFT': { price: 345.20, change: 2.10 },
  'AMZN': { price: 412.30, change: -1.80 },
  'GOOGL': { price: 138.75, change: 0.95 },
  'TSLA': { price: 248.90, change: -3.20 },
  'NVDA': { price: 465.20, change: 5.40 },
  'META': { price: 325.80, change: 2.75 },
  'VOO': { price: 387.90, change: 1.50 },
  'SPY': { price: 470.50, change: 1.80 },
  'QQQ': { price: 400.25, change: 2.30 },
  'NFLX': { price: 485.60, change: 3.15 },
  'AMD': { price: 145.30, change: -0.85 },
  'INTC': { price: 42.80, change: -0.45 },
  'DIS': { price: 92.40, change: 0.55 },
  'V': { price: 265.20, change: 1.40 },
  'JPM': { price: 178.90, change: 0.95 },
  'WMT': { price: 165.40, change: 0.60 },
  'PG': { price: 158.70, change: 0.35 },
  'JNJ': { price: 162.30, change: 0.80 },
  'UNH': { price: 540.20, change: 2.85 },
};

function getStockFallbackPrice(symbol: string): { price: number; change: number; changePercent: number } {
  const fallback = FALLBACK_STOCK_PRICES[symbol.toUpperCase()];
  if (fallback) {
    return {
      price: fallback.price,
      change: fallback.change,
      changePercent: (fallback.change / fallback.price) * 100,
    };
  }
  // For unknown stocks, return a default price of $100
  return {
    price: 100,
    change: 0.5,
    changePercent: 0.5,
  };
}

// Support POST for batch requests — now fully rate-limited and cached via gateway
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

    // Cap batch size to prevent abuse
    const cappedSymbols = symbols.slice(0, 50);

    // Fetch all symbols through gateway (handles rate limiting, caching, dedup)
    // Gateway enforces 2 req/s for yahoo-finance, so large batches will
    // be naturally throttled rather than hammering Yahoo with 50+ simultaneous calls
    const promises = cappedSymbols.map(async (symbol) => {
      try {
        const data = await fetchYahooQuoteViaGateway(symbol);
        return {
          ...data,
          success: true,
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        // Return fallback price instead of error
        const fallback = getStockFallbackPrice(symbol);
        return {
          symbol: symbol.toUpperCase(),
          price: fallback.price,
          change24h: fallback.change,
          changePercent24h: fallback.changePercent,
          lastUpdated: Date.now(),
          success: true,
          source: 'fallback',
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
