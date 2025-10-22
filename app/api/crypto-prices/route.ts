import { NextRequest, NextResponse } from 'next/server';

/**
 * Crypto Prices API Proxy
 * Handles batch crypto price fetching via CoinGecko API server-side to avoid CORS
 * Includes caching to prevent rate limiting
 */

// Crypto symbol mapping to CoinGecko IDs
const cryptoIdMap: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'SOL': 'solana',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'ATOM': 'cosmos',
  'NEAR': 'near',
  'XRP': 'ripple',
  'BNB': 'binancecoin',
  'DOGE': 'dogecoin',
  'UNI': 'uniswap',
  'LTC': 'litecoin',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'XLM': 'stellar',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'AAVE': 'aave',
  'CRO': 'crypto-com-chain',
  'FTM': 'fantom'
};

interface CryptoPriceData {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

// Simple in-memory cache with stale-data fallback
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes (increased to reduce API calls)
const STALE_CACHE_DURATION = 3600000; // 1 hour (keep stale data for rate limit fallback)

function getCachedData(key: string, allowStale: boolean = false) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  // Return fresh data
  if (Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  // Return stale data if allowed (for rate limit recovery)
  if (allowStale && Date.now() - cached.timestamp < STALE_CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'symbols array is required' },
        { status: 400 }
      );
    }

    // Convert symbols to CoinGecko IDs
    const coinIds = symbols
      .map((symbol: string) => cryptoIdMap[symbol.toUpperCase()])
      .filter(Boolean);

    if (coinIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid crypto symbols provided' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `batch:${coinIds.sort().join(',')}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      // Cache hit - silently return cached data
      return NextResponse.json(
        cachedData,
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    // Fetch from CoinGecko with retry logic and rate limit handling
    let response;
    let lastError;
    const maxRetries = 1; // Reduced retries to minimize API calls
    let rateLimited = false;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
          {
            headers: {
              'Accept': 'application/json',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(8000), // 8 second timeout
          }
        );

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // Rate limited - try to use stale cache data
        if (response.status === 429) {
          rateLimited = true;
          console.warn(`⚠️ Rate limited by CoinGecko (429)`);
          
          // Check for stale cached data
          const staleData = getCachedData(cacheKey, true);
          if (staleData) {
            if (process.env.NODE_ENV === 'development') {
              console.debug('Using stale cache due to rate limit');
            }
            return NextResponse.json(
              staleData,
              {
                headers: {
                  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
                  'X-Cache': 'STALE',
                  'X-Rate-Limited': 'true',
                },
              }
            );
          }
          
          // No cache available, don't retry on 429
          lastError = new Error(`Rate limited and no cached data available`);
          break;
        }

        lastError = new Error(`CoinGecko API error: ${response.status}`);
      } catch (fetchError: any) {
        lastError = fetchError;
        console.warn(`Fetch attempt ${attempt + 1} failed:`, fetchError.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
    }

    if (!response || !response.ok) {
      // If rate limited, return fallback data with 200 status (graceful degradation)
      if (rateLimited) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Rate limited - returning fallback data');
        }
        const fallbackResults = symbols.map((symbol: string) => ({
          symbol: symbol.toUpperCase(),
          price: 0,
          change24h: 0,
          changePercent24h: 0,
          lastUpdated: Date.now(),
          success: false,
          error: 'Rate limited'
        }));
        return NextResponse.json(
          { results: fallbackResults },
          { 
            status: 200, // Return 200 to prevent frontend errors
            headers: { 
              'Retry-After': '300',
              'X-Rate-Limited': 'true'
            } 
          }
        );
      }
      throw lastError || new Error('Failed to fetch from CoinGecko after retries');
    }

    const data: CryptoPriceData = await response.json();
    
    // Validate data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from CoinGecko');
    }

    // Map back to symbols
    const results = symbols.map((symbol: string) => {
      const coinId = cryptoIdMap[symbol.toUpperCase()];
      if (coinId && data[coinId]) {
        const coinData = data[coinId];
        return {
          symbol: symbol.toUpperCase(),
          price: coinData.usd,
          change24h: coinData.usd * (coinData.usd_24h_change / 100),
          changePercent24h: coinData.usd_24h_change || 0,
          lastUpdated: Date.now(),
          success: true,
        };
      } else {
        return {
          symbol: symbol.toUpperCase(),
          success: false,
          error: 'Symbol not found',
        };
      }
    });

    const responseData = { results };
    
    // Cache the results
    setCachedData(cacheKey, responseData);

    return NextResponse.json(
      responseData,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error: any) {
    console.error('Crypto prices API error:', error);
    
    // Return empty results with success: false (graceful degradation)
    return NextResponse.json(
      { 
        results: [],
        error: 'Service temporarily unavailable - please try again'
      },
      { status: 200 } // Return 200 to prevent frontend errors
    );
  }
}

// GET for single symbol
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol parameter is required' },
      { status: 400 }
    );
  }

  const coinId = cryptoIdMap[symbol.toUpperCase()];

  if (!coinId) {
    return NextResponse.json(
      { error: 'Invalid crypto symbol' },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cacheKey = `single:${coinId}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      // Cache hit - silently return cached data
      return NextResponse.json(
        cachedData,
        {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        const staleData = getCachedData(cacheKey, true);
        if (staleData) {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`Using stale cache for ${symbol}`);
          }
          return NextResponse.json(
            staleData,
            {
              headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
                'X-Cache': 'STALE',
                'X-Rate-Limited': 'true',
              },
            }
          );
        }
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CryptoPriceData = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      throw new Error('Symbol not found');
    }

    const responseData = {
      symbol: symbol.toUpperCase(),
      price: coinData.usd,
      change24h: coinData.usd * (coinData.usd_24h_change / 100),
      changePercent24h: coinData.usd_24h_change || 0,
      lastUpdated: Date.now(),
    };

    // Cache the result
    setCachedData(cacheKey, responseData);

    return NextResponse.json(
      responseData,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error: any) {
    console.error('Crypto price API error:', error);
    
    // Try to return cached data first
    const cacheKey = `single:${cryptoIdMap[symbol?.toUpperCase() || '']}`;
    const cachedData = getCachedData(cacheKey, true);
    if (cachedData) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Using stale cache after error for ${symbol}`);
      }
      return NextResponse.json(cachedData, { 
        status: 200,
        headers: { 'X-Cache': 'STALE-ERROR' }
      });
    }
    
    // Fallback response
    return NextResponse.json(
      { 
        symbol: symbol?.toUpperCase() || 'UNKNOWN',
        price: 0,
        change24h: 0,
        changePercent24h: 0,
        lastUpdated: Date.now(),
        error: 'Service temporarily unavailable'
      },
      { status: 200 } // Return 200 to prevent frontend errors
    );
  }
}

export const dynamic = 'force-dynamic';
