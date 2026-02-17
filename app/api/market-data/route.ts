import { NextRequest, NextResponse } from 'next/server';

/**
 * Market Data API Proxy
 * Handles CORS by proxying requests to external APIs server-side
 * Optimized to use free APIs (Yahoo Finance v8/chart, CoinGecko, Binance)
 * 
 * Architecture:
 * - Yahoo Finance v8/chart API (v7/quote is DEAD — returns 401)
 * - Built-in circuit breaker: backs off when Yahoo returns 401/403/429
 * - Fallback stock prices when all providers fail
 * - In-memory cache with stale-while-revalidate
 */

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const DEFAULT_CACHE_DURATION = 60000; // 1 minute default
const LIVE_CACHE_DURATION = 30000; // 30 seconds for live data (matches polling interval)
const STALE_CACHE_DURATION = 3600000; // 1 hour

// Circuit breaker for Yahoo Finance
let yahooCircuitOpen = false;
let yahooCircuitOpenedAt = 0;
let yahooConsecutiveErrors = 0;
const YAHOO_CIRCUIT_RESET_MS = 300000; // 5 minutes
const YAHOO_CIRCUIT_THRESHOLD = 3;

// Fallback stock prices for when ALL providers fail
const FALLBACK_STOCK_PRICES: Record<string, { price: number; change: number; name: string }> = {
  'AAPL': { price: 198.50, change: 1.25, name: 'Apple Inc.' },
  'MSFT': { price: 425.20, change: 2.10, name: 'Microsoft Corporation' },
  'AMZN': { price: 185.30, change: -1.80, name: 'Amazon.com Inc.' },
  'GOOGL': { price: 175.75, change: 0.95, name: 'Alphabet Inc.' },
  'TSLA': { price: 248.90, change: -3.20, name: 'Tesla Inc.' },
  'NVDA': { price: 130.20, change: 5.40, name: 'NVIDIA Corporation' },
  'META': { price: 505.80, change: 2.75, name: 'Meta Platforms Inc.' },
  'VOO': { price: 487.90, change: 1.50, name: 'Vanguard S&P 500 ETF' },
  'SPY': { price: 530.50, change: 1.80, name: 'SPDR S&P 500 ETF Trust' },
  'QQQ': { price: 460.25, change: 2.30, name: 'Invesco QQQ Trust' },
  'NFLX': { price: 685.60, change: 3.15, name: 'Netflix Inc.' },
  'AMD': { price: 165.30, change: -0.85, name: 'Advanced Micro Devices' },
  'INTC': { price: 30.80, change: -0.45, name: 'Intel Corporation' },
  'DIS': { price: 112.40, change: 0.55, name: 'The Walt Disney Company' },
  'V': { price: 285.20, change: 1.40, name: 'Visa Inc.' },
  'JPM': { price: 208.90, change: 0.95, name: 'JPMorgan Chase & Co.' },
  'WMT': { price: 85.40, change: 0.60, name: 'Walmart Inc.' },
  'PG': { price: 168.70, change: 0.35, name: 'Procter & Gamble Co.' },
  'JNJ': { price: 155.30, change: 0.80, name: 'Johnson & Johnson' },
  'UNH': { price: 540.20, change: 2.85, name: 'UnitedHealth Group' },
};

function getFallbackPrice(symbol: string) {
  const fallback = FALLBACK_STOCK_PRICES[symbol.toUpperCase()];
  if (fallback) {
    return {
      symbol: symbol.toUpperCase(),
      name: fallback.name,
      currentPrice: fallback.price,
      change24h: fallback.change,
      changePercent24h: (fallback.change / fallback.price) * 100,
      type: 'stock',
      lastUpdated: Date.now(),
      dataSource: 'fallback',
    };
  }
  return null;
}

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
  const isLive = searchParams.get('live') === 'true';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `market:${upperSymbol}:${type}`;
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
      if (type === 'stock' || type === 'forex' || type === 'index' || type === 'commodity') {
        // Try Investing.com for Forex/Indices/Commodities first as requested
        if (type !== 'stock') {
             const investingData = await fetchFromInvestingCom(upperSymbol, type);
             if (investingData) return investingData;
        }

        const yahooData = await fetchFromYahooFinance(upperSymbol);
        if (yahooData) return yahooData;
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

      // For stocks, return fallback price instead of 404
      if (type === 'stock' || type === 'index' || type === 'forex' || type === 'commodity') {
        const fallbackData = getFallbackPrice(upperSymbol);
        if (fallbackData) {
          console.log(`⚠️ Returning fallback price for ${upperSymbol}`);
          setCachedData(cacheKey, fallbackData); // Cache the fallback so we don't spam
          return NextResponse.json(fallbackData, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
              'X-Cache': 'FALLBACK',
            },
          });
        }
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

    // Fallback price for stocks
    if (type === 'stock') {
      const fallbackData = getFallbackPrice(upperSymbol);
      if (fallbackData) {
        return NextResponse.json(fallbackData, {
          status: 200,
          headers: { 'X-Cache': 'FALLBACK-ERROR' },
        });
      }
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

async function fetchFromYahooFinance(symbol: string) {
  // Circuit breaker check
  const now = Date.now();
  if (yahooCircuitOpen) {
    if (now - yahooCircuitOpenedAt > YAHOO_CIRCUIT_RESET_MS) {
      yahooCircuitOpen = false;
      yahooConsecutiveErrors = 0;
      console.log('[market-data] Yahoo circuit breaker reset, trying again...');
    } else {
      const remainingSec = Math.ceil((YAHOO_CIRCUIT_RESET_MS - (now - yahooCircuitOpenedAt)) / 1000);
      console.log(`[market-data] Yahoo circuit OPEN, skipping. Retry in ${remainingSec}s`);
      return null;
    }
  }

  // Map common symbols to Yahoo Finance format
  const yahooSymbolMap: Record<string, string> = {
    'SPX': '^GSPC', 'NDX': '^NDX', 'DJI': '^DJI', 'VIX': '^VIX',
    'RUT': '^RUT', 'UKX': '^FTSE', 'DAX': '^GDAXI', 'NKY': '^N225',
    'HSI': '^HSI', 'SHCOMP': '000001.SS', 'CAC': '^FCHI', 'STOXX50E': '^STOXX50E',
    'GC': 'GC=F', 'SI': 'SI=F', 'PL': 'PL=F', 'PA': 'PA=F',
    'CL': 'CL=F', 'BRN': 'BZ=F', 'NG': 'NG=F', 'RB': 'RB=F',
    'HO': 'HO=F', 'HG': 'HG=F', 'ZC': 'ZC=F', 'ZS': 'ZS=F',
    'ZW': 'ZW=F', 'KC': 'KC=F', 'SB': 'SB=F', 'CC': 'CC=F', 'CT': 'CT=F',
  };

  let querySymbol = yahooSymbolMap[symbol] || symbol;

  // Forex detection
  const forexPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'AUDCAD', 'AUDNZD', 'EURCHF',
    'CADJPY', 'CHFJPY', 'AUDJPY', 'NZDJPY'
  ];
  const isForex = forexPairs.includes(symbol) ||
    (!yahooSymbolMap[symbol] && symbol.length === 6 && /^[A-Z]{6}$/.test(symbol) &&
      ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'].includes(symbol.slice(3)));
  if (isForex) {
    querySymbol = `${symbol}=X`;
  }

  try {
    // Use v8/finance/chart API — v7/finance/quote is DEAD (returns 401)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        yahooConsecutiveErrors++;
        console.warn(`[market-data] Yahoo v8 chart returned ${response.status} for ${symbol} (errors: ${yahooConsecutiveErrors}/${YAHOO_CIRCUIT_THRESHOLD})`);
        if (yahooConsecutiveErrors >= YAHOO_CIRCUIT_THRESHOLD) {
          yahooCircuitOpen = true;
          yahooCircuitOpenedAt = Date.now();
          console.error(`[market-data] 🔴 Yahoo circuit breaker OPEN! Will retry in ${YAHOO_CIRCUIT_RESET_MS / 1000}s`);
        }
        return null;
      }
      throw new Error(`Yahoo v8 API error: ${response.status}`);
    }

    const data = await response.json();
    const chartResult = data?.chart?.result?.[0];
    if (!chartResult) throw new Error('No chart data');

    const meta = chartResult.meta;
    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    // Reset error count on success
    yahooConsecutiveErrors = 0;

    return {
      symbol: symbol,
      name: meta.longName || meta.shortName || symbol,
      currentPrice: currentPrice,
      change24h: change,
      changePercent24h: changePercent,
      type: 'stock',
      lastUpdated: Date.now(),
      high24h: meta.regularMarketDayHigh,
      low24h: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      dataSource: 'Yahoo Finance',
    };
  } catch (error) {
    yahooConsecutiveErrors++;
    console.warn(`[market-data] Yahoo v8 chart failed for ${symbol}:`, error instanceof Error ? error.message : error);
    if (yahooConsecutiveErrors >= YAHOO_CIRCUIT_THRESHOLD) {
      yahooCircuitOpen = true;
      yahooCircuitOpenedAt = Date.now();
      console.error(`[market-data] 🔴 Yahoo circuit breaker OPEN! Will retry in ${YAHOO_CIRCUIT_RESET_MS / 1000}s`);
    }
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
