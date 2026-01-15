import { NextRequest, NextResponse } from 'next/server';

/**
 * Market Data API Proxy
 * Handles CORS by proxying requests to external APIs server-side
 * Optimized to use free APIs first (Yahoo Finance) before paid APIs (Finnhub)
 */

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const DEFAULT_CACHE_DURATION = 60000; // 1 minute default
const LIVE_CACHE_DURATION = 60000; // 1 minute for live data (matches 60s polling interval)
const STALE_CACHE_DURATION = 3600000; // 1 hour

function getCachedData(key: string, duration: number, allowStale: boolean = false) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp < duration) {
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

async function fetchFromGateIO(symbol: string) {
  try {
    // Skip USDT
    if (symbol === 'USDT') return null;

    const pair = `${symbol}_USDT`;
    const response = await fetch(
      `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`Gate.io API error: ${response.status}`);

    const data = await response.json();
    const ticker = data[0];

    if (!ticker) throw new Error('No Gate.io data');

    return {
      symbol: symbol,
      name: symbol,
      currentPrice: parseFloat(ticker.last),
      change24h: parseFloat(ticker.last) * (parseFloat(ticker.change_percentage) / 100),
      changePercent24h: parseFloat(ticker.change_percentage),
      type: 'crypto',
      lastUpdated: Date.now(),
      high24h: parseFloat(ticker.high_24h),
      low24h: parseFloat(ticker.low_24h),
      volume: parseFloat(ticker.base_volume),
      dataSource: 'Gate.io',
    };
  } catch (error) {
    // console.warn(`Gate.io failed for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'stock';
  const source = searchParams.get('source'); // Optional: specify data source
  const isLive = searchParams.get('live') === 'true';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `market:${upperSymbol}:${type}:${source || 'auto'}`;
  const cacheDuration = isLive ? LIVE_CACHE_DURATION : DEFAULT_CACHE_DURATION;

  try {
    // Check cache first
    const cachedData = getCachedData(cacheKey, cacheDuration);
    if (cachedData) {
      console.log(`✅ Returning cached market data for ${upperSymbol} (TTL: ${cacheDuration}ms)`);
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': `public, s-maxage=${Math.ceil(cacheDuration/1000)}, stale-while-revalidate=60`,
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
            'Cache-Control': `public, s-maxage=${Math.ceil(cacheDuration/1000)}, stale-while-revalidate=60`,
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
      }

      // Try Binance (FREE API - high limits) - Primary source for crypto, fallback for stocks
      const binanceData = await fetchFromBinance(upperSymbol);
      if (binanceData) return binanceData;

      // Try Gate.io (FREE API) - Secondary source for crypto
      const gateData = await fetchFromGateIO(upperSymbol);
      if (gateData) return gateData;
        
      // Fallback to CoinGecko (FREE API with rate limits)
      if (type === 'crypto') {
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
      const staleData = getCachedData(cacheKey, cacheDuration, true);
      if (staleData) {
        console.log(`📦 Returning stale data for ${upperSymbol}`);
        return NextResponse.json(staleData, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
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
        'Cache-Control': `public, s-maxage=${Math.ceil(cacheDuration/1000)}, stale-while-revalidate=60`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Market data API error:', error);
    
    // Clean up pending request
    pendingRequests.delete(cacheKey);
    
    // Try to return stale cached data
    const staleData = getCachedData(cacheKey, cacheDuration, true);
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
  const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
  
  for (const host of hosts) {
    try {
      const response = await fetch(
        `https://${host}/v7/finance/quote?symbols=${symbol}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn(`Yahoo ${host} 401/403 for ${symbol}, trying next host...`);
          continue;
        }
        throw new Error(`Yahoo API error: ${response.status}`);
      }

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
      console.warn(`Yahoo Finance (${host}) failed for ${symbol}:`, error);
    }
  }
  return null;
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

async function fetchFromBinance(symbol: string) {
  try {
    // Skip USDT as it is the base currency
    if (symbol === 'USDT') return null;

    let pair = `${symbol}USDT`;
    if (symbol === 'USDC') pair = 'USDCUSDT';

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);

    const data = await response.json();

    return {
      symbol: symbol,
      name: symbol,
      currentPrice: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      type: 'crypto',
      lastUpdated: Date.now(),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      dataSource: 'Binance',
    };
  } catch (error) {
    // console.warn(`Binance failed for ${symbol}:`, error);
    return null;
  }
}



export const runtime = 'edge';
export const dynamic = 'force-dynamic';
