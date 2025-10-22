/**
 * Enhanced Market Data Service
 * 
 * Provides real-time market prices and comprehensive asset information
 * with intelligent color assignment for visual consistency.
 */

import { getAssetColor, getAssetInfo } from './asset-color-database';
import { cacheService } from './cache-service';
import { batchMarketService } from './batch-market-service';

export interface MarketAssetData {
  symbol: string;
  name: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  color: string;
  type: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index';
  lastUpdated: number;
  marketCap?: string;
  volume?: string;
  high24h?: number;
  low24h?: number;
  high52Week?: number;
  low52Week?: number;
  peRatio?: number;
  dividendYield?: number;
  avgVolume?: string;
  sector?: string;
  industry?: string;
  dataSource?: string;
}

export interface PriceQuote {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface CryptoSymbol {
  id: number;
  symbol: string;
  name: string;
  slug: string;
  rank: number;
  isActive: boolean;
  firstHistoricalData: string;
  lastHistoricalData: string;
  platform?: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    token_address: string;
  };
}

class EnhancedMarketService {
  private cryptoSymbolsCache: CryptoSymbol[] | null = null;
  private cryptoSymbolsCacheTime = 0;
  private readonly SYMBOLS_CACHE_DURATION = 86400000; // 24 hours for crypto symbols list

  /**
   * Fetch all cryptocurrency symbols from CoinMarketCap API
   * This provides a complete map of all available cryptocurrencies
   */
  async fetchAllCryptoSymbols(): Promise<CryptoSymbol[]> {
    try {
      // Return cached data if still valid
      if (this.cryptoSymbolsCache && Date.now() - this.cryptoSymbolsCacheTime < this.SYMBOLS_CACHE_DURATION) {
        console.log('✅ Returning cached crypto symbols:', this.cryptoSymbolsCache.length);
        return this.cryptoSymbolsCache;
      }

      const apiKey = process.env.NEXT_PUBLIC_CMC_API_KEY;
      if (!apiKey) {
        console.warn('CoinMarketCap API key not configured');
        return [];
      }

      console.log('🔍 Fetching cryptocurrency map from CoinMarketCap...');
      
      // CoinMarketCap cryptocurrency/map endpoint
      // Returns all active cryptocurrencies with their symbols and metadata
      const response = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?listing_status=active&limit=5000',
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json'
          },
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        console.warn('Invalid response from CoinMarketCap map endpoint');
        return [];
      }

      const cryptoSymbols: CryptoSymbol[] = data.data.map((crypto: any) => ({
        id: crypto.id,
        symbol: crypto.symbol,
        name: crypto.name,
        slug: crypto.slug,
        rank: crypto.rank,
        isActive: crypto.is_active === 1,
        firstHistoricalData: crypto.first_historical_data,
        lastHistoricalData: crypto.last_historical_data,
        platform: crypto.platform ? {
          id: crypto.platform.id,
          name: crypto.platform.name,
          symbol: crypto.platform.symbol,
          slug: crypto.platform.slug,
          token_address: crypto.platform.token_address
        } : undefined
      }));

      // Cache the results
      this.cryptoSymbolsCache = cryptoSymbols;
      this.cryptoSymbolsCacheTime = Date.now();

      console.log(`✅ Successfully fetched ${cryptoSymbols.length} cryptocurrency symbols from CoinMarketCap`);
      return cryptoSymbols;
    } catch (error) {
      console.error('Error fetching crypto symbols from CoinMarketCap:', error);
      return [];
    }
  }

  /**
   * Search for a cryptocurrency by symbol or name
   */
  async searchCryptoSymbol(query: string): Promise<CryptoSymbol[]> {
    const allSymbols = await this.fetchAllCryptoSymbols();
    const lowerQuery = query.toLowerCase();
    
    return allSymbols.filter(crypto => 
      crypto.symbol.toLowerCase().includes(lowerQuery) ||
      crypto.name.toLowerCase().includes(lowerQuery) ||
      crypto.slug.includes(lowerQuery)
    ).slice(0, 20); // Return top 20 matches
  }

  /**
   * Get cryptocurrency by exact symbol match
   */
  async getCryptoBySymbol(symbol: string): Promise<CryptoSymbol | null> {
    const allSymbols = await this.fetchAllCryptoSymbols();
    return allSymbols.find(crypto => 
      crypto.symbol.toUpperCase() === symbol.toUpperCase()
    ) || null;
  }

  /**
   * Fetch cryptocurrency data from CoinMarketCap API via Next.js API route
   * This avoids CORS issues by routing through our backend
   */
  private async fetchFromCoinMarketCap(symbol: string): Promise<MarketAssetData | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Use our API route instead of direct CoinMarketCap call
      const response = await fetch(
        `/api/market-data?symbol=${upperSymbol}&type=crypto&source=coinmarketcap`,
        {
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        throw new Error(`Market Data API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.currentPrice) {
        console.warn(`No CoinMarketCap data for ${upperSymbol}`);
        return null;
      }

      const assetInfo = getAssetInfo(upperSymbol);
      const assetData: MarketAssetData = {
        symbol: upperSymbol,
        name: assetInfo?.name || data.name || upperSymbol,
        currentPrice: data.currentPrice,
        change24h: data.change24h || 0,
        changePercent24h: data.changePercent24h || 0,
        color: getAssetColor(upperSymbol, 'crypto'),
        type: 'crypto',
        lastUpdated: data.lastUpdated || Date.now(),
        marketCap: data.marketCap,
        volume: data.volume,
        high24h: data.high24h,
        low24h: data.low24h,
        dataSource: data.dataSource || 'CoinMarketCap Pro API'
      };

      return assetData;
    } catch (error) {
      console.warn(`CoinMarketCap failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch current cryptocurrency prices from CoinGecko
   */
  async fetchCryptoPrice(symbol: string): Promise<MarketAssetData | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Use intelligent caching with TTL
      return await cacheService.wrap(
        `market:price:crypto:${upperSymbol}`,
        async () => {
          // Try CoinMarketCap first (more reliable, professional data)
          const cmcData = await this.fetchFromCoinMarketCap(upperSymbol);
          if (cmcData) {
            console.log(`✅ ${upperSymbol}: Fetched from CoinMarketCap - $${cmcData.currentPrice}`);
            return cmcData;
          }

      // Map common symbols to CoinGecko IDs
      const coinIdMap: { [key: string]: string } = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'SOL': 'solana',
        'USDC': 'usd-coin',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOGE': 'dogecoin',
        'TRX': 'tron',
        'LINK': 'chainlink',
        'MATIC': 'matic-network',
        'DOT': 'polkadot',
        'AVAX': 'avalanche-2',
        'ATOM': 'cosmos',
        'UNI': 'uniswap',
        'LTC': 'litecoin',
        'NEAR': 'near',
        'APT': 'aptos',
        'ARB': 'arbitrum',
        'OP': 'optimism',
        'FIL': 'filecoin',
        'SHIB': 'shiba-inu',
        'BCH': 'bitcoin-cash',
        'XLM': 'stellar',
        'ALGO': 'algorand',
        'VET': 'vechain',
        'ICP': 'internet-computer',
        'APE': 'apecoin',
        'SAND': 'the-sandbox',
        'MANA': 'decentraland',
        'AXS': 'axie-infinity',
      };

      const coinId = coinIdMap[upperSymbol];
      if (!coinId) {
        console.warn(`Unknown crypto symbol: ${upperSymbol}`);
        return null;
      }

      // Use our API route instead of direct CoinGecko call
      const response = await fetch(
        `/api/market-data?symbol=${upperSymbol}&type=crypto`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`Market Data API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.currentPrice) {
        console.warn(`No market data for ${upperSymbol}`);
        return null;
      }

      const currentPrice = data.currentPrice;
      const change24h = data.change24h || 0;
      const changePercent24h = data.changePercent24h || 0;

          const assetInfo = getAssetInfo(upperSymbol);
          const assetData: MarketAssetData = {
            symbol: upperSymbol,
            name: assetInfo?.name || data.name || upperSymbol,
            currentPrice: currentPrice,
            change24h: change24h,
            changePercent24h: changePercent24h,
            color: getAssetColor(upperSymbol, 'crypto'),
            type: 'crypto',
            lastUpdated: data.lastUpdated || Date.now(),
            marketCap: data.marketCap,
            volume: data.volume,
            high24h: data.high24h,
            low24h: data.low24h,
            dataSource: data.dataSource || 'Market Data API'
          };

          console.log(`✅ ${upperSymbol}: Fetched from CoinGecko - $${currentPrice}`);
          return assetData;
        },
        cacheService.getTTL('MARKET_PRICE')
      );
    } catch (error) {
      console.error(`Error fetching crypto price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch stock data via API route (fixes CORS issues)
   */
  private async fetchFromYahooFinance(symbol: string): Promise<MarketAssetData | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Use our API route instead of direct external call
      const quoteResponse = await fetch(
        `/api/market-data?symbol=${upperSymbol}&type=stock`,
        {
          cache: 'no-store'
        }
      );

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${quoteResponse.status}`);
      }

      const data = await quoteResponse.json();

      if (!data || !data.currentPrice) throw new Error('No quote data found');

      const assetInfo = getAssetInfo(upperSymbol);
      const assetData: MarketAssetData = {
        symbol: upperSymbol,
        name: assetInfo?.name || data.name || upperSymbol,
        currentPrice: data.currentPrice,
        change24h: data.change24h,
        changePercent24h: data.changePercent24h,
        color: getAssetColor(upperSymbol, 'stock'),
        type: 'stock',
        lastUpdated: data.lastUpdated || Date.now(),
        marketCap: data.marketCap ? `$${(data.marketCap / 1e9).toFixed(2)}B` : undefined,
        volume: data.volume ? `${(data.volume / 1e6).toFixed(2)}M` : undefined,
        high24h: data.high24h,
        low24h: data.low24h,
        high52Week: data.high52Week,
        low52Week: data.low52Week,
        peRatio: data.peRatio,
        dividendYield: data.dividendYield ? (data.dividendYield * 100) : undefined,
        avgVolume: data.avgVolume ? `${(data.avgVolume / 1e6).toFixed(2)}M` : undefined,
        sector: data.sector,
        industry: data.industry,
        dataSource: data.dataSource || 'Market Data API'
      };

      return assetData;
    } catch (error) {
      console.warn(`Market data API failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch stock data from Finnhub API (Backup Source)
   */
  private async fetchFromFinnhub(symbol: string): Promise<MarketAssetData | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Using authenticated Finnhub API
      const apiKey = process.env.FINNHUB_API_KEY || 'd3nbll9r01qo7510cpf0d3nbll9r01qo7510cpfg';
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${apiKey}`,
        { cache: 'no-store' }
      );

      if (!response.ok) throw new Error(`Finnhub API error: ${response.status}`);

      const data = await response.json();
      
      if (!data.c || data.c === 0) throw new Error('Invalid quote data');

      const currentPrice = data.c; // Current price
      const change = data.d; // Change
      const changePercent = data.dp; // Percent change

      const assetInfo = getAssetInfo(upperSymbol);
      const assetData: MarketAssetData = {
        symbol: upperSymbol,
        name: assetInfo?.name || upperSymbol,
        currentPrice: currentPrice,
        change24h: change,
        changePercent24h: changePercent,
        color: getAssetColor(upperSymbol, 'stock'),
        type: 'stock',
        lastUpdated: Date.now(),
        high24h: data.h,
        low24h: data.l,
        dataSource: 'Finnhub'
      };

      return assetData;
    } catch (error) {
      console.warn(`Finnhub failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch stock data from Twelve Data API (Tertiary Source)
   */
  private async fetchFromTwelveData(symbol: string): Promise<MarketAssetData | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Using free Twelve Data API
      const response = await fetch(
        `https://api.twelvedata.com/price?symbol=${upperSymbol}&apikey=demo`,
        { cache: 'no-store' }
      );

      if (!response.ok) throw new Error(`Twelve Data API error: ${response.status}`);

      const data = await response.json();
      
      if (!data.price || data.status === 'error') throw new Error('Invalid quote data');

      const currentPrice = parseFloat(data.price);

      const assetInfo = getAssetInfo(upperSymbol);
      const assetData: MarketAssetData = {
        symbol: upperSymbol,
        name: assetInfo?.name || upperSymbol,
        currentPrice: currentPrice,
        change24h: 0, // Basic endpoint doesn't provide this
        changePercent24h: 0,
        color: getAssetColor(upperSymbol, 'stock'),
        type: 'stock',
        lastUpdated: Date.now(),
        dataSource: 'Twelve Data'
      };

      return assetData;
    } catch (error) {
      console.warn(`Twelve Data failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch current stock prices with multi-source fallback
   */
  async fetchStockPrice(symbol: string): Promise<MarketAssetData | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Use intelligent caching with TTL
      return await cacheService.wrap(
        `market:price:stock:${upperSymbol}`,
        async () => {
          // Try multiple sources in order of preference
          let assetData: MarketAssetData | null = null;

          // 1. Try Yahoo Finance (most comprehensive)
          assetData = await this.fetchFromYahooFinance(upperSymbol);
          if (assetData) {
            console.log(`✅ ${upperSymbol}: Fetched from Yahoo Finance - $${assetData.currentPrice}`);
            return assetData;
          }

          // 2. Try Finnhub as backup
          assetData = await this.fetchFromFinnhub(upperSymbol);
          if (assetData) {
            console.log(`✅ ${upperSymbol}: Fetched from Finnhub - $${assetData.currentPrice}`);
            return assetData;
          }

          // 3. Try Twelve Data as last resort
          assetData = await this.fetchFromTwelveData(upperSymbol);
          if (assetData) {
            console.log(`✅ ${upperSymbol}: Fetched from Twelve Data - $${assetData.currentPrice}`);
            return assetData;
          }

          console.error(`❌ All sources failed for ${upperSymbol}`);
          return null;
        },
        cacheService.getTTL('MARKET_PRICE')
      );
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Smart fetch that auto-detects asset type
   */
  async fetchAssetPrice(symbol: string, type?: 'crypto' | 'stock'): Promise<MarketAssetData | null> {
    const upperSymbol = symbol.toUpperCase();

    // If type is specified, use the appropriate fetcher
    if (type === 'crypto') {
      return this.fetchCryptoPrice(upperSymbol);
    } else if (type === 'stock') {
      return this.fetchStockPrice(upperSymbol);
    }

    // Auto-detect: try crypto first for common crypto symbols
    const cryptoSymbols = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP', 'ADA', 'DOGE', 'TRX', 'LINK', 'MATIC', 'DOT', 'AVAX', 'ATOM'];
    
    if (cryptoSymbols.includes(upperSymbol)) {
      const cryptoData = await this.fetchCryptoPrice(upperSymbol);
      if (cryptoData) return cryptoData;
    }

    // Try stock
    const stockData = await this.fetchStockPrice(upperSymbol);
    if (stockData) return stockData;

    // Fallback to crypto if stock failed
    return this.fetchCryptoPrice(upperSymbol);
  }

  /**
   * Fetch multiple assets in parallel (uses batch optimization)
   */
  async fetchMultipleAssets(symbols: string[], type?: 'crypto' | 'stock'): Promise<MarketAssetData[]> {
    // If more than 3 assets, use batch fetching for optimization
    if (symbols.length > 3) {
      if (type === 'crypto') {
        const batchResult = await batchMarketService.fetchCryptoBatch(symbols);
        console.log(`📦 Batch fetched ${batchResult.data.length} crypto assets (${batchResult.cached} cached, ${batchResult.fetched} fetched)`);
        return batchResult.data;
      } else if (type === 'stock') {
        const batchResult = await batchMarketService.fetchStockBatch(symbols);
        console.log(`📦 Batch fetched ${batchResult.data.length} stock assets (${batchResult.cached} cached, ${batchResult.fetched} fetched)`);
        return batchResult.data;
      }
    }
    
    // For small requests or mixed types, use individual fetching
    const promises = symbols.map(symbol => this.fetchAssetPrice(symbol, type));
    const results = await Promise.all(promises);
    return results.filter((asset): asset is MarketAssetData => asset !== null);
  }

  /**
   * Get cached price or fetch if not available
   */
  async getPrice(symbol: string, type?: 'crypto' | 'stock'): Promise<number | null> {
    const assetData = await this.fetchAssetPrice(symbol, type);
    return assetData?.currentPrice || null;
  }

  /**
   * Clear cache for specific symbol or all
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      const upperSymbol = symbol.toUpperCase();
      cacheService.delete(`market:price:crypto:${upperSymbol}`);
      cacheService.delete(`market:price:stock:${upperSymbol}`);
    } else {
      cacheService.clearPattern('market:*');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: string; totalHits: number; totalMisses: number } {
    const stats = cacheService.getStats();
    return {
      size: cacheService.getSize(),
      hitRate: stats.hitRate.toFixed(1) + '%',
      totalHits: stats.hits,
      totalMisses: stats.misses,
    };
  }

  /**
   * Search for assets by name or symbol with price data
   */
  async searchAssets(query: string, limit: number = 10): Promise<MarketAssetData[]> {
    // This is a simple search - in production, you'd want a proper search API
    const commonSymbols = [
      // 🪙 Major Cryptocurrencies (Top 30+)
      'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP', 'ADA', 'DOGE', 'TRX',
      'LINK', 'MATIC', 'DOT', 'AVAX', 'ATOM', 'UNI', 'LTC', 'NEAR', 'APT', 'ARB',
      'OP', 'FIL', 'SHIB', 'BCH', 'XLM', 'ALGO', 'VET', 'ICP', 'APE', 'SAND',
      'MANA', 'AXS',
      
      // 📈 Major US Stocks (Top 40+)
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX', 'JPM', 'BAC',
      'WFC', 'V', 'MA', 'PYPL', 'SQ', 'WMT', 'HD', 'COST', 'NKE', 'SBUX',
      'MCD', 'DIS', 'JNJ', 'UNH', 'PFE', 'MRNA', 'XOM', 'CVX', 'COP', 'INTC',
      'AMD', 'CSCO', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'IBM', 'QCOM', 'TXN', 'COIN',
      
      // 📊 Major ETFs & Indices
      'SPY', 'VOO', 'QQQ', 'IVV', 'VTI', 'GLD', 'SLV', 'TLT', 'IWM', 'EEM',
      'SPX', 'DJI', 'IXIC', 'RUT',
      
      // 🌍 International Indices
      'FTSE', 'DAX', 'NKY', 'HSI', 'CAC', 'ASX',
      
      // 💰 Commodities & Forex (via stocks/ETFs)
      'GLD', 'SLV', 'USO', 'UNG', 'COPX', 'DBA', 'DBC',
      
      // 🚀 Popular Growth Stocks
      'PLTR', 'RBLX', 'SHOP', 'SQ', 'HOOD', 'U', 'NET', 'SNOW', 'DDOG', 'ZM',
      
      // 🏦 Banking & Finance
      'GS', 'MS', 'C', 'WFC', 'USB', 'PNC', 'SCHW',
      
      // 🏥 Healthcare
      'ABBV', 'TMO', 'ABT', 'DHR', 'BMY', 'LLY',
      
      // ⚡ Energy
      'NEE', 'DUK', 'SO', 'D', 'AEP', 'ENPH', 'SEDG',
      
      // 🏭 Industrial
      'CAT', 'DE', 'BA', 'HON', 'UPS', 'UNP', 'LMT', 'RTX'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = commonSymbols.filter(s => 
      s.toLowerCase().includes(lowerQuery)
    ).slice(0, limit);

    return this.fetchMultipleAssets(matches);
  }
}

// Singleton instance
export const enhancedMarketService = new EnhancedMarketService();
