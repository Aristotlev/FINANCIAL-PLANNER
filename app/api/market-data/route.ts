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
const LIVE_CACHE_DURATION = 30000; // 30 seconds for live data (matches polling interval)
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
        // const cmcData = await fetchFromCoinMarketCap(upperSymbol);
        // if (cmcData) return cmcData;
        
        // Stop using CoinMarketCap for live prices as requested
        return NextResponse.json(
          { error: 'CoinMarketCap price API is disabled' },
          { status: 400 }
        );
      }

      if (type === 'stock' || type === 'forex' || type === 'index' || type === 'commodity') {
        // Try Investing.com for Forex/Indices/Commodities first as requested
        if (type !== 'stock') {
             const investingData = await fetchFromInvestingCom(upperSymbol, type);
             if (investingData) return investingData;
        }

        const yahooData = await fetchFromYahooFinance(upperSymbol);
        if (yahooData) return yahooData;
      }

      // Try CoinMarketCap for crypto (PAID API - use if configured)
      // if (type === 'crypto') {
      //   const cmcData = await fetchFromCoinMarketCap(upperSymbol);
      //   if (cmcData) return cmcData;
      // }

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

  // Handle Forex pairs suffix
  // If it looks like a forex pair (6 chars, not in map), append =X
  if (!yahooSymbolMap[symbol] && /^[A-Z]{3}[A-Z]{3}$/.test(symbol) && !['NVDA', 'AMZN', 'GOOG', 'MSFT', 'TSLA'].includes(symbol)) {
     // Check if it's a known forex pair or just a 6 letter ticker (e.g. GOOGL is 5, NVDA 4)
     // Most forex pairs are 6 chars. But there are stocks with 6 chars?
     // Better to verify if it's requested as forex type, but here we just have symbol.
     // However, in this function context we don't know the requested type explicitly unless we pass it.
     // But we can enable this heuristic for symbols that look like pairs.
     // Or rely on the caller passing 'type'.
     // Let's rely on the explicit map or just try appending =X if the first try fails? 
     // No, Yahoo returns empty result if not found.
     
     // Let's add common forex pairs to the map dynamically if needed or just handle the suffix logic if we are sure.
     // Since this function is called for stock/index/forex, distinguishing 6-letter stock from forex is hard without 'type'.
     // But standard forex pairs like EURUSD are distinct enough. 
     // Let's just use the explicit map for now or updated list.
  }
  
  // Explicitly handle all major forex pairs from our DB
  const forexPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'AUDCAD', 'AUDNZD', 'EURCHF',
      'CADJPY', 'CHFJPY', 'AUDJPY', 'NZDJPY' // Add other common JPY pairs
  ];
  
  // Robust Forex Detection:
  // 1. Check if in explicit list
  // 2. OR if it looks like a currency pair (6 chars) and ends in a major currency
  const isForex = forexPairs.includes(symbol) || 
                 (!yahooSymbolMap[symbol] && 
                  symbol.length === 6 && 
                  /^[A-Z]{6}$/.test(symbol) && 
                  ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'].includes(symbol.slice(3)));

  if (isForex) {
      querySymbol = `${symbol}=X`;
  }

  for (const host of hosts) {
    try {
      const response = await fetch(
        `https://${host}/v7/finance/quote?symbols=${querySymbol}`,
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

async function fetchFromInvestingCom(symbol: string, type: string) {
    try {
        // Map symbols to Investing.com pair IDs or slugs
        // This is a simplified mapping logic.
        const investingMap: Record<string, string> = {
            // Forex
            'EURUSD': 'currencies/eur-usd',
            'GBPUSD': 'currencies/gbp-usd',
            'USDJPY': 'currencies/usd-jpy',
            'USDCHF': 'currencies/usd-chf',
            'AUDUSD': 'currencies/aud-usd',
            'USDCAD': 'currencies/usd-cad',
            'NZDUSD': 'currencies/nzd-usd',
            'EURGBP': 'currencies/eur-gbp',
            'EURJPY': 'currencies/eur-jpy',
            'GBPJPY': 'currencies/gbp-jpy',
            'AUDCAD': 'currencies/aud-cad',
            'AUDNZD': 'currencies/aud-nzd',
            'EURCHF': 'currencies/eur-chf',
            'SPX': 'indices/us-spx-500',
            'NDX': 'indices/nq-100',
            'DJI': 'indices/us-30',
            'VIX': 'indices/volatility-s-p-500',
            'UKX': 'indices/uk-100',
            'DAX': 'indices/germany-30',
            'CAC': 'indices/france-40',
            
            // Commodities
            'GC': 'commodities/gold',
            'SI': 'commodities/silver',
            'CL': 'commodities/crude-oil',
            'BRN': 'commodities/brent-oil',
            'NG': 'commodities/natural-gas',
            'HG': 'commodities/copper',
            'ZC': 'commodities/corn',
            'ZS': 'commodities/us-soybeans',
            'ZW': 'commodities/us-wheat',
        };

        const slug = investingMap[symbol];
        if (!slug && type !== 'forex' && type !== 'index' && type !== 'commodity') return null;

        // If no slug found but type is supported, try to guess or return null
        // For now only support explicit map + common patterns if risky
        if (!slug) return null;

        const response = await fetch(`https://www.investing.com/${slug}`, {
             headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
             },
             cache: 'no-store'
        });

        if (!response.ok) {
             throw new Error(`Investing.com returned ${response.status}`);
        }

        const html = await response.text();
        
        // Use Regex to find price data (Looking for data-test attribute often used in investing.com)
        // Example: <div class="text-5xl/9 font-bold text-[#232526] md:text-[42px] md:leading-[60px]" data-test="instrument-price-last">1.0345</div>
        // Pattern: data-test="instrument-price-last">([\d,.]+)</div>
        const priceMatch = html.match(/data-test="instrument-price-last"[^>]*>([\d,.]+)</);
        const changeMatch = html.match(/data-test="instrument-price-change"[^>]*>([+\-]?[\d,.]+)</);
        const changePercentMatch = html.match(/data-test="instrument-price-change-percent"[^>]*>\(([+\-]?[\d,.]+)%\)</);
        
        if (priceMatch && priceMatch[1]) {
            const price = parseFloat(priceMatch[1].replace(/,/g, ''));
            const change = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
            const changePercent = changePercentMatch ? parseFloat(changePercentMatch[1].replace(/,/g, '')) : 0;
            
            return {
                symbol: symbol,
                name: symbol, // Could parse name too but symbol is enough
                currentPrice: price,
                change24h: change,
                changePercent24h: changePercent,
                type: type,
                lastUpdated: Date.now(),
                dataSource: 'Investing.com',
            };
        }
        
        // Fallback or old layout pattern?
        // Sometimes JSON is embedded in scripts.
        return null;
        
    } catch (e) {
        // console.warn(`Investing.com fetch failed for ${symbol}:`, e);
        return null;
    }
}



export const runtime = 'edge';
export const dynamic = 'force-dynamic';
