import { NextRequest, NextResponse } from 'next/server';

/**
 * Crypto Prices API Proxy
 * Handles batch crypto price fetching via CoinGecko API server-side to avoid CORS
 * Includes caching to prevent rate limiting
 */

// Crypto symbol mapping to CoinGecko IDs (Static fallback)
const staticCryptoIdMap: { [key: string]: string } = {
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
  'FTM': 'fantom',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'PEPE': 'pepe',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'APT': 'aptos',
  'SUI': 'sui',
  'RUNE': 'thorchain',
  'INJ': 'injective-protocol',
  'FIL': 'filecoin',
  'ICP': 'internet-computer',
  'HBAR': 'hedera-hashgraph',
  'XMR': 'monero',
  'GRT': 'the-graph',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'GALA': 'gala',
  'EOS': 'eos',
  'MKR': 'maker',
  'AXS': 'axie-infinity',
  'STX': 'blockstack',
  'QNT': 'quant-network',
  'FLOW': 'flow',
  'IMX': 'immutable-x',
  'SNX': 'havven',
  'CRV': 'curve-dao-token',
  'LDO': 'lido-dao',
  'RPL': 'rocket-pool',
  'FXS': 'frax-share',
  'COMP': 'compound-governance-token',
  'ZRX': '0x',
  'BAT': 'basic-attention-token',
  'CHZ': 'chiliz',
  'ENJ': 'enjincoin',
  'DASH': 'dash',
  'ZEC': 'zcash',
  'XEM': 'nem',
  'NEO': 'neo',
  'IOTA': 'iota',
  'WAVES': 'waves',
  'KSM': 'kusama',
  'ZIL': 'zilliqa',
  'ONT': 'ontology',
  'QTUM': 'qtum',
  'OMG': 'omg',
  'ICX': 'icon',
  'SC': 'siacoin',
  'DGB': 'digibyte',
  'XVG': 'verge',
  'LSK': 'lisk',
  'NANO': 'nano',
  'RVN': 'ravencoin',
  'ZEN': 'zencash',
  'IOST': 'iostoken',
  'SNT': 'status',
  'REP': 'augur',
  'GNO': 'gnosis',
  'KNC': 'kyber-network',
  'LOOM': 'loom-network',
  'CVC': 'civic',
  'STORJ': 'storj',
  'RLC': 'iexec-rlc',
  'ANT': 'aragon',
  'BAND': 'band-protocol',
  'OCEAN': 'ocean-protocol',
  'NMR': 'numeraire',
  'OXT': 'orchid-protocol',
  'BAL': 'balancer',
  'YFI': 'yearn-finance',
  'SUSHI': 'sushi',
  '1INCH': '1inch',
  'ANKR': 'ankr',
  'REN': 'republic-protocol',
  'UMA': 'uma',
  'LRC': 'loopring',
  'KAVA': 'kava',
  'EGLD': 'elrond-erd-2',
  'THETA': 'theta-token',
  'XTZ': 'tezos',
  'BCH': 'bitcoin-cash',
  'BSV': 'bitcoin-sv',
  'LEO': 'leo-token',
  'OKB': 'okb',
  'ETC': 'ethereum-classic',
  'TON': 'the-open-network',
  'RNDR': 'render-token',
  'FLOKI': 'floki',
  'BONK': 'bonk',
  'WIF': 'dogwifhat',
  'JUP': 'jupiter-exchange-solana',
  'PYTH': 'pyth-network',
  'TIA': 'celestia',
  'SEI': 'sei-network',
  'BLUR': 'blur',
  'MEME': 'memecoin',
  'ORDI': 'ordinals',
  'SATS': 'sats-ordinals',
  'RATS': 'rats-ordinals',
  'MUBI': 'multibit',
  'TURT': 'turtsat',
  'BSSB': 'bitstable',
  'AUCTION': 'bounce-token',
  'BAKE': 'bakerytoken',
  'LEVER': 'lever-network',
  'BEL': 'bella-protocol',
  'FLM': 'flamingo-finance',
  'WING': 'wing-finance',
  'UNFI': 'unifi-protocol-dao',
  'BOND': 'barnbridge',
  'TRB': 'tellor',
  'KP3R': 'keep3rv1',
  'API3': 'api3',
  'DIA': 'dia-data',
  'FRONT': 'frontier-token',
  'LIT': 'litentry',
  'PHA': 'phala-network',
  'POND': 'marlin',
  'PERP': 'perpetual-protocol',
  'SUPER': 'superfarm',
  'ERN': 'ethernity-chain',
  'CFX': 'conflux-token',
  'ACH': 'alchemy-pay',
  'AMP': 'amp-token',
  'PLA': 'playdapp',
  'RARE': 'superrare',
  'BADGER': 'badger-dao',
  'RARI': 'rarible',
  'GHST': 'aavegotchi',
  'DPI': 'defi-pulse-index',
  'INDEX': 'index-cooperative',
  'MVI': 'metaverse-index',
  'BED': 'bankless-bed-index',
  'GTC': 'gitcoin',
  'ENS': 'ethereum-name-service',
  'PEOPLE': 'constitutiondao',
  'SPELL': 'spell-token',
  'MIM': 'magic-internet-money',
  'TIME': 'wonderland',
  'JOE': 'joe',
  'PNG': 'pangolin',
  'BOBA': 'boba-network',
  'METIS': 'metis-token',
  'GLMR': 'moonbeam',
  'MOVR': 'moonriver',
  'ASTR': 'astar',
  'ACA': 'acala',
  'KDA': 'kadena',
  'ROSE': 'oasis-network',
  'SYS': 'syscoin',
  'CKB': 'nervos-network'
};

// Dynamic ID map cache
let dynamicCryptoIdMap: { [key: string]: string } = { ...staticCryptoIdMap };
let coinListCache: { id: string; symbol: string; name: string }[] | null = null;
let coinListLastUpdated = 0;
const COIN_LIST_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getCoinId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();
  
  // 1. Check in-memory map
  if (dynamicCryptoIdMap[upperSymbol]) {
    return dynamicCryptoIdMap[upperSymbol];
  }

  // 2. Fetch full coin list if needed
  if (!coinListCache || Date.now() - coinListLastUpdated > COIN_LIST_CACHE_DURATION) {
    try {
      console.log('Fetching full coin list from CoinGecko...');
      const response = await fetch('https://api.coingecko.com/api/v3/coins/list', {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 86400 } // Cache for 24h
      });
      
      if (response.ok) {
        coinListCache = await response.json();
        coinListLastUpdated = Date.now();
      }
    } catch (error) {
      console.error('Failed to fetch coin list:', error);
    }
  }

  // 3. Search in coin list
  if (coinListCache) {
    // Exact match on symbol
    const match = coinListCache.find(c => c.symbol.toUpperCase() === upperSymbol);
    if (match) {
      dynamicCryptoIdMap[upperSymbol] = match.id;
      return match.id;
    }
  }

  return null;
}

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
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      lastUpdated: Date.now(),
      success: true,
      dataSource: 'Binance',
    };
  } catch (error) {
    return null;
  }
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
      price: parseFloat(ticker.last),
      change24h: parseFloat(ticker.last) * (parseFloat(ticker.change_percentage) / 100),
      changePercent24h: parseFloat(ticker.change_percentage),
      lastUpdated: Date.now(),
      success: true,
      dataSource: 'Gate.io',
    };
  } catch (error) {
    return null;
  }
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
    const coinIds = (await Promise.all(symbols.map(async (symbol: string) => {
      return await getCoinId(symbol);
    }))).filter(Boolean) as string[];

    // Check cache first
    const cacheKey = `batch:${coinIds.sort().join(',')}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
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

    // Fetch from CoinGecko
    let coingeckoData: CryptoPriceData = {};
    let coingeckoSuccess = false;

    if (coinIds.length > 0) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
          {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000), // 5 second timeout
          }
        );

        if (response.ok) {
          coingeckoData = await response.json();
          coingeckoSuccess = true;
        } else if (response.status === 429) {
          console.warn('⚠️ CoinGecko rate limit (429)');
          // Try to use stale cache if available
          const staleData = getCachedData(cacheKey, true);
          if (staleData) {
            return NextResponse.json(staleData, {
              headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
                'X-Cache': 'STALE',
                'X-Rate-Limited': 'true',
              },
            });
          }
        }
      } catch (error) {
        console.warn('CoinGecko fetch failed:', error);
      }
    }

    // Process results - use CoinGecko data if available, otherwise try fallbacks
    const results = await Promise.all(symbols.map(async (symbol: string) => {
      const upperSymbol = symbol.toUpperCase();
      const coinId = await getCoinId(symbol);
      
      // 1. Try CoinGecko data
      if (coinId && coingeckoData[coinId]) {
        const coinData = coingeckoData[coinId];
        return {
          symbol: upperSymbol,
          price: coinData.usd,
          change24h: coinData.usd * (coinData.usd_24h_change / 100),
          changePercent24h: coinData.usd_24h_change || 0,
          lastUpdated: Date.now(),
          success: true,
          dataSource: 'CoinGecko'
        };
      }

      // 2. Try Binance fallback
      const binanceData = await fetchFromBinance(upperSymbol);
      if (binanceData) return binanceData;

      // 3. Try Gate.io fallback
      const gateData = await fetchFromGateIO(upperSymbol);
      if (gateData) return gateData;

      return {
        symbol: upperSymbol,
        success: false,
        error: 'Symbol not found',
      };
    }));

    const responseData = { results };
    
    // Cache the results if we got at least some data
    if (results.some(r => r.success)) {
      setCachedData(cacheKey, responseData);
    }

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
    return NextResponse.json(
      { 
        results: [],
        error: 'Service temporarily unavailable'
      },
      { status: 200 }
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

  const coinId = await getCoinId(symbol);

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
    const coinId = await getCoinId(symbol);
    const cacheKey = coinId ? `single:${coinId}` : '';
    const cachedData = cacheKey ? getCachedData(cacheKey, true) : null;
    
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
