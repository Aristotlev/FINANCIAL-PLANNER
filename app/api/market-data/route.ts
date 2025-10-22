import { NextRequest, NextResponse } from 'next/server';

/**
 * Market Data API Proxy
 * Handles CORS by proxying requests to external APIs server-side
 * Optimized to use free APIs first (Yahoo Finance) before paid APIs (Finnhub)
 */

// In-memory cache
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
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'stock';
  const source = searchParams.get('source'); // Optional: specify data source

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `market:${upperSymbol}:${type}:${source || 'auto'}`;

  try {
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`✅ Returning cached market data for ${upperSymbol}`);
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
      console.log(`⚡ Deduplicating request for ${upperSymbol}`);
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
    
    let data = null;
    
    // Create fetch promise for deduplication
    const fetchPromise = (async () => {
      // If specific source is requested, use it
      if (source === 'coinmarketcap' && type === 'crypto') {
        const cmcData = await fetchFromCoinMarketCap(upperSymbol);
        if (cmcData) return cmcData;
      }

      // Try Yahoo Finance first (FREE API - prioritize this)
      if (type === 'stock' || type === 'forex' || type === 'index') {
        const yahooData = await fetchFromYahooFinance(upperSymbol);
        if (yahooData) return yahooData;
      }

      // Try CoinMarketCap for crypto (PAID API - use if configured)
      if (type === 'crypto') {
        const cmcData = await fetchFromCoinMarketCap(upperSymbol);
        if (cmcData) return cmcData;
        
        // Fallback to CoinGecko (FREE API with rate limits)
        const cryptoData = await fetchFromCoinGecko(symbol);
        if (cryptoData) return cryptoData;
      }

      // Fallback to Finnhub only if free APIs fail (PAID API - use sparingly)
      if (type === 'stock') {
        console.warn(`⚠️ Using Finnhub fallback for ${upperSymbol}`);
        const finnhubData = await fetchFromFinnhub(upperSymbol);
        if (finnhubData) return finnhubData;
      }
      
      return null;
    })();
    
    // Store in pending requests
    pendingRequests.set(cacheKey, fetchPromise);
    
    data = await fetchPromise;
    pendingRequests.delete(cacheKey);

    if (!data) {
      // Try stale cache as last resort
      const staleData = getCachedData(cacheKey, true);
      if (staleData) {
        console.log(`📦 Returning stale data for ${upperSymbol}`);
        return NextResponse.json(staleData, {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            'X-Cache': 'STALE',
          },
        });
      }
      
      return NextResponse.json(
        { error: `No data found for ${symbol}` },
        { status: 404 }
      );
    }
    
    // Cache the successful result
    setCachedData(cacheKey, data);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Market data API error:', error);
    
    // Clean up pending request
    pendingRequests.delete(cacheKey);
    
    // Try to return stale cached data
    const staleData = getCachedData(cacheKey, true);
    if (staleData) {
      console.log(`📦 Returning stale data for ${upperSymbol} after error`);
      return NextResponse.json(staleData, {
        status: 200,
        headers: {
          'X-Cache': 'STALE-ERROR',
        },
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

async function fetchFromYahooFinance(symbol: string) {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) throw new Error(`Yahoo API error: ${response.status}`);

    const data = await response.json();
    const quote = data?.quoteResponse?.result?.[0];

    if (!quote) throw new Error('No quote data');

    const currentPrice = quote.regularMarketPrice || quote.currentPrice || quote.ask;
    const previousClose = quote.regularMarketPreviousClose || quote.previousClose;
    const change = quote.regularMarketChange || (currentPrice - previousClose);
    const changePercent = quote.regularMarketChangePercent || ((change / previousClose) * 100);

    return {
      symbol: symbol,
      name: quote.longName || quote.shortName || symbol,
      currentPrice: currentPrice,
      change24h: change,
      changePercent24h: changePercent,
      type: 'stock',
      lastUpdated: Date.now(),
      marketCap: quote.marketCap,
      volume: quote.regularMarketVolume,
      high24h: quote.regularMarketDayHigh,
      low24h: quote.regularMarketDayLow,
      high52Week: quote.fiftyTwoWeekHigh,
      low52Week: quote.fiftyTwoWeekLow,
      peRatio: quote.trailingPE || quote.forwardPE,
      dividendYield: quote.dividendYield,
      avgVolume: quote.averageDailyVolume3Month,
      sector: quote.sector,
      industry: quote.industry,
      dataSource: 'Yahoo Finance',
    };
  } catch (error) {
    console.warn(`Yahoo Finance failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchFromCoinMarketCap(symbol: string) {
  try {
    const apiKey = process.env.CMC_API_KEY || process.env.NEXT_PUBLIC_CMC_API_KEY;
    if (!apiKey) {
      console.warn('CoinMarketCap API key not configured');
      return null;
    }

    const upperSymbol = symbol.toUpperCase();
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${upperSymbol}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) throw new Error(`CoinMarketCap API error: ${response.status}`);

    const data = await response.json();
    const cryptoData = data.data[upperSymbol]?.[0];

    if (!cryptoData) throw new Error('No CoinMarketCap data');

    const quote = cryptoData.quote.USD;

    return {
      symbol: upperSymbol,
      name: cryptoData.name || upperSymbol,
      currentPrice: quote.price,
      change24h: quote.price - (quote.price / (1 + quote.percent_change_24h / 100)),
      changePercent24h: quote.percent_change_24h,
      type: 'crypto',
      lastUpdated: Date.now(),
      marketCap: quote.market_cap,
      volume: quote.volume_24h,
      high24h: undefined,
      low24h: undefined,
      dataSource: 'CoinMarketCap Pro API',
    };
  } catch (error) {
    console.warn(`CoinMarketCap failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchFromCoinGecko(symbol: string) {
  try {
    const coinId = symbol.toLowerCase() === 'btc' ? 'bitcoin' : 
                   symbol.toLowerCase() === 'eth' ? 'ethereum' : 
                   symbol.toLowerCase();

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) throw new Error('No coin data');

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      currentPrice: coinData.usd,
      change24h: coinData.usd_24h_change,
      changePercent24h: coinData.usd_24h_change,
      type: 'crypto',
      lastUpdated: Date.now(),
      marketCap: coinData.usd_market_cap,
      volume: coinData.usd_24h_vol,
      dataSource: 'CoinGecko',
    };
  } catch (error) {
    console.warn(`CoinGecko failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchFromFinnhub(symbol: string) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY || 'd3nbll9r01qo7510cpf0d3nbll9r01qo7510cpfg';
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`Finnhub API error: ${response.status}`);

    const data = await response.json();

    if (!data.c || data.c === 0) throw new Error('Invalid quote data');

    const currentPrice = data.c;
    const previousClose = data.pc;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: symbol,
      name: symbol,
      currentPrice: currentPrice,
      change24h: change,
      changePercent24h: changePercent,
      type: 'stock',
      lastUpdated: Date.now(),
      high24h: data.h,
      low24h: data.l,
      dataSource: 'Finnhub',
    };
  } catch (error) {
    console.warn(`Finnhub failed for ${symbol}:`, error);
    return null;
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
