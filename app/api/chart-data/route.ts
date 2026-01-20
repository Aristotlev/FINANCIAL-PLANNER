import { NextRequest, NextResponse } from 'next/server';

/**
 * Chart Data API
 * Fetches historical OHLCV data for charting
 * Uses Binance for crypto and Yahoo Finance for stocks (same as live prices)
 */

// In-memory cache with shorter duration for intraday
const cache = new Map<string, { data: any; timestamp: number }>();

function getCacheDuration(range: string): number {
  // Shorter cache for intraday data
  if (range === '1D') return 60000;  // 1 minute for 1D
  if (range === '1W') return 120000; // 2 minutes for 1W
  return 300000; // 5 minutes for longer ranges
}

function getCachedData(key: string, range: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  const duration = getCacheDuration(range);
  if (Date.now() - cached.timestamp < duration) {
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
    const type = searchParams.get('type') || 'stock';
    const range = searchParams.get('range') || '1M';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `chart:${upperSymbol}:${type}:${range}`;

    // Check cache
    const cachedData = getCachedData(cacheKey, range);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    let chartData;
    
    if (type === 'crypto') {
      chartData = await fetchBinanceKlines(upperSymbol, range);
    } else {
      chartData = await fetchYahooChart(upperSymbol, range);
    }

    if (!chartData || chartData.length === 0) {
      return NextResponse.json(
        { error: `No chart data available for ${symbol}` },
        { status: 404 }
      );
    }

    const response = {
      symbol: upperSymbol,
      type,
      range,
      data: chartData,
      lastUpdated: Date.now(),
    };

    setCachedData(cacheKey, response);

    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' },
    });

  } catch (error: any) {
    console.error('Chart data API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

/**
 * Fetch klines from Binance API
 */
async function fetchBinanceKlines(symbol: string, range: string) {
  try {
    // Handle USDT as base currency
    if (symbol === 'USDT') {
      return generateUSDTData(range);
    }

    // Map range to Binance interval and limit
    const rangeConfig: Record<string, { interval: string; limit: number }> = {
      '1D': { interval: '5m', limit: 288 },      // 5min candles, 24h
      '1W': { interval: '1h', limit: 168 },      // 1h candles, 7 days
      '1M': { interval: '4h', limit: 180 },      // 4h candles, 30 days
      '3M': { interval: '1d', limit: 90 },       // 1d candles, 90 days
      '1Y': { interval: '1d', limit: 365 },      // 1d candles, 365 days
      'ALL': { interval: '1w', limit: 260 },     // 1w candles, 5 years
    };

    const config = rangeConfig[range] || rangeConfig['1M'];
    let pair = `${symbol}USDT`;
    if (symbol === 'USDC') pair = 'USDCUSDT';

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${config.interval}&limit=${config.limit}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
    // Use Unix timestamp (seconds) for TradingView lightweight-charts
    return data.map((kline: any[]) => ({
      time: Math.floor(kline[0] / 1000), // Convert ms to seconds
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      value: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }));

  } catch (error) {
    console.error(`Binance klines error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Generate static USDT data (always $1)
 */
function generateUSDTData(range: string) {
  const countMap: Record<string, number> = {
    '1D': 288,
    '1W': 168,
    '1M': 30,
    '3M': 90,
    '1Y': 365,
    'ALL': 260,
  };
  const count = countMap[range] || 30;
  const data = [];
  const now = Date.now();
  const step = range === '1D' ? 5 * 60 * 1000 : 
               range === '1W' ? 60 * 60 * 1000 : 
               24 * 60 * 60 * 1000;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * step;
    data.push({
      time: Math.floor(timestamp / 1000), // Unix timestamp in seconds
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      value: 1,
    });
  }
  return data;
}

/**
 * Fetch chart data from Yahoo Finance
 */
async function fetchYahooChart(symbol: string, range: string) {
  try {
    // Map common symbols to Yahoo Finance format
    const yahooSymbolMap: Record<string, string> = {
      // Indices
      'SPX': '^GSPC',
      'NDX': '^NDX',
      'DJI': '^DJI',
      'VIX': '^VIX',
      'RUT': '^RUT',
      'UKX': '^FTSE',
      'DAX': '^GDAXI',
      'NKY': '^N225',
      'HSI': '^HSI',
      'SHCOMP': '000001.SS',
      'CAC': '^FCHI',
      'STOXX50E': '^STOXX50E',

      // Commodities (Futures)
      'GC': 'GC=F',
      'SI': 'SI=F',
      'PL': 'PL=F',
      'PA': 'PA=F',
      'CL': 'CL=F',
      'BRN': 'BZ=F',
      'NG': 'NG=F',
      'RB': 'RB=F',
      'HO': 'HO=F',
      'HG': 'HG=F',
      'ZC': 'ZC=F',
      'ZS': 'ZS=F',
      'ZW': 'ZW=F',
      'KC': 'KC=F',
      'SB': 'SB=F',
      'CC': 'CC=F',
      'CT': 'CT=F',
    };

    let querySymbol = yahooSymbolMap[symbol] || symbol;

    // Handle Forex pairs
    // Check if it matches typical forex pair format (6 chars) and not a known stock
    if (!yahooSymbolMap[symbol]) {
        if (/^[A-Z]{6}$/.test(symbol) && !['GOOGL'].includes(symbol)) { 
             // Determine if it is likely a forex pair
             const majorCurrencies = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'];
             const quoteCurrency = symbol.slice(3);
             
             // Common forex check logic.
             // If explicit check fails, try heuristic based on quote currency
             const forexPairs = [
                'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
                'EURGBP', 'EURJPY', 'GBPJPY', 'AUDCAD', 'AUDNZD', 'EURCHF',
                'CADJPY', 'CHFJPY', 'AUDJPY', 'NZDJPY' 
            ];
            
            if (forexPairs.includes(symbol) || majorCurrencies.includes(quoteCurrency)) {
                querySymbol = `${symbol}=X`;
            }
        }
    }

    // Yahoo Finance chart ranges and intervals
    const rangeConfig: Record<string, { range: string; interval: string }> = {
      '1D': { range: '1d', interval: '5m' },
      '1W': { range: '5d', interval: '15m' },
      '1M': { range: '1mo', interval: '1d' },
      '3M': { range: '3mo', interval: '1d' },
      '1Y': { range: '1y', interval: '1wk' },
      'ALL': { range: '5y', interval: '1mo' },
    };
    
    const config = rangeConfig[range] || rangeConfig['1M'];
    
    const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
    
    for (const host of hosts) {
      try {
        const response = await fetch(
          `https://${host}/v8/finance/chart/${querySymbol}?range=${config.range}&interval=${config.interval}`,
          {
            cache: 'no-store',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            continue; // Try next host
          }
          throw new Error(`Yahoo Finance error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];
        
        if (!result || !result.timestamp) {
          continue; // Try next host
        }

        const { timestamp, indicators } = result;
        const quote = indicators?.quote?.[0];
        
        if (!quote) {
          continue;
        }

        // Build chart data - use Unix timestamps for TradingView
        const chartData = [];
        for (let i = 0; i < timestamp.length; i++) {
          const ts = timestamp[i];
          const open = quote.open?.[i];
          const high = quote.high?.[i];
          const low = quote.low?.[i];
          const close = quote.close?.[i];
          const volume = quote.volume?.[i];
          
          // Skip null values
          if (close === null || close === undefined) continue;
          
          chartData.push({
            time: ts, // Already Unix timestamp in seconds from Yahoo
            open: open ?? close,
            high: high ?? close,
            low: low ?? close,
            close: close,
            value: close,
            volume: volume ?? 0,
          });
        }

        if (chartData.length > 0) {
          return chartData;
        }
      } catch (hostError) {
        console.warn(`Yahoo ${host} failed:`, hostError);
      }
    }

    return null;

  } catch (error) {
    console.error(`Yahoo chart error for ${symbol}:`, error);
    return null;
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
