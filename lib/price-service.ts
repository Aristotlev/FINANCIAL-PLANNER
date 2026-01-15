export interface AssetPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  lastUpdated: number;
}

export interface CryptoPriceData {
  [symbol: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

class PriceService {
  private cache: Map<string, AssetPrice> = new Map();
  private subscribers: Map<string, Set<(price: AssetPrice) => void>> = new Map();
  private pendingFetches: Map<string, Promise<AssetPrice>> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private updateTimeout: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 60000; // 60 seconds - optimal for avoiding rate limits
  private readonly CACHE_DURATION = 65000; // 65 seconds (slightly longer than update interval)
  
  // Batch request queue for reducing API calls
  private batchQueue: Set<string> = new Set();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // 100ms to batch requests

  // Crypto symbol mapping to CoinGecko IDs
  private readonly cryptoIdMap: { [key: string]: string } = {
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
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'WBTC': 'wrapped-bitcoin',
    'AAVE': 'aave',
    'CRO': 'crypto-com-chain',
    'FTM': 'fantom'
  };

  // Stock symbols don't need a strict list - Yahoo Finance supports most symbols
  private readonly stockSymbols = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'NVDA', 'META', 'BRK.B', 'VOO', 'JNJ', 'SPY', 'QQQ', 'DIA'];

  async fetchCryptoPrices(symbols: string[]): Promise<AssetPrice[]> {
    try {
      // Use our API route to avoid CORS issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (increased)

      const response = await fetch('/api/crypto-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
        signal: controller.signal,
        // Ensure fresh request
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // If rate limited (503/429) or server error (500), try to use cached data
        if (response.status === 503 || response.status === 429 || response.status === 500) {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`API temporarily unavailable (${response.status}), using fallback`);
          }
          return this.getFallbackCryptoPrices(symbols);
        }
        
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Map the results, using fallback for failed symbols
      return symbols.map(symbol => {
        const result = data.results.find((r: any) => r.symbol === symbol.toUpperCase());
        
        if (result && result.success) {
          return {
            symbol: result.symbol,
            price: result.price,
            change24h: result.change24h,
            changePercent24h: result.changePercent24h,
            lastUpdated: result.lastUpdated
          };
        } else {
          // Silently use fallback for failed symbols
          return this.getFallbackCryptoPrices([symbol])[0];
        }
      });
    } catch (error: any) {
      // Only log if it's not an abort error or network failure (which are expected during development)
      if (error?.name !== 'AbortError' && !error?.message?.includes('Failed to fetch')) {
        console.error('Error fetching crypto prices:', error);
      } else if (process.env.NODE_ENV === 'development') {
        console.debug('Crypto price fetch failed, using fallback:', error?.message);
      }
      // Return fallback data instead of failing completely
      return this.getFallbackCryptoPrices(symbols);
    }
  }

  async fetchStockPrices(symbols: string[]): Promise<AssetPrice[]> {
    try {
      // Use our API route to avoid CORS issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch('/api/yahoo-finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch stock prices from API');
      }

      const data = await response.json();
      
      // Map the results, using fallback for failed symbols
      return symbols.map(symbol => {
        const result = data.results.find((r: any) => r.symbol === symbol.toUpperCase());
        
        if (result && result.success) {
          return {
            symbol: result.symbol,
            price: result.price,
            change24h: result.change24h,
            changePercent24h: result.changePercent24h,
            lastUpdated: result.lastUpdated
          };
        } else {
          // Silently use fallback for failed symbols
          return this.getFallbackStockPrice(symbol);
        }
      });
    } catch (error: any) {
      // Only log if it's not an abort error or network failure (which are expected during development)
      if (error?.name !== 'AbortError' && !error?.message?.includes('Failed to fetch')) {
        console.error('Error fetching stock prices:', error);
      } else if (process.env.NODE_ENV === 'development') {
        console.debug('Stock price fetch failed, using fallback:', error?.message);
      }
      return this.getFallbackStockPrices(symbols);
    }
  }

  // Generate a stable pseudo-random number based on symbol (deterministic)
  private getStableChange(symbol: string, multiplier: number = 1): number {
    // Simple hash function to generate stable number from symbol
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      const char = symbol.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Normalize to -0.5 to 0.5 range
    const normalized = ((hash % 1000) / 1000) - 0.5;
    return normalized * multiplier;
  }

  private getFallbackCryptoPrices(symbols: string[]): AssetPrice[] {
    const fallbackPrices: { [key: string]: number } = {
      'BTC': 43250,
      'ETH': 2650,
      'ADA': 0.38,
      'DOT': 6.20,
      'SOL': 78.50,
      'LINK': 14.80,
      'MATIC': 0.92,
      'AVAX': 18.30,
      'ATOM': 11.40,
      'NEAR': 2.10
    };

    return symbols.map(symbol => ({
      symbol,
      price: fallbackPrices[symbol] || 1,
      change24h: this.getStableChange(symbol, 200),
      changePercent24h: this.getStableChange(symbol + '_pct', 10),
      lastUpdated: Date.now()
    }));
  }

  private getFallbackStockPrices(symbols: string[]): AssetPrice[] {
    const fallbackPrices: { [key: string]: number } = {
      'AAPL': 178.50,
      'MSFT': 345.20,
      'AMZN': 412.30,
      'GOOGL': 138.75,
      'TSLA': 248.90,
      'NVDA': 465.20,
      'META': 325.80,
      'BRK.B': 352.40,
      'VOO': 387.90,
      'JNJ': 162.30
    };

    return symbols.map(symbol => ({
      symbol,
      price: fallbackPrices[symbol] || 100,
      change24h: this.getStableChange(symbol, 10),
      changePercent24h: this.getStableChange(symbol + '_pct', 5),
      lastUpdated: Date.now()
    }));
  }

  private getFallbackStockPrice(symbol: string): AssetPrice {
    return this.getFallbackStockPrices([symbol])[0];
  }

  async updatePrices(): Promise<void> {
    try {
      // Get all unique symbols from subscribers
      const allSymbols = Array.from(this.subscribers.keys());
      const cryptoSymbols = allSymbols.filter(symbol => this.cryptoIdMap[symbol]);
      // For stocks, try to fetch any symbol that's not crypto
      const stockSymbols = allSymbols.filter(symbol => !this.cryptoIdMap[symbol]);

      // Fetch prices in parallel
      const [cryptoPrices, stockPrices] = await Promise.all([
        cryptoSymbols.length > 0 ? this.fetchCryptoPrices(cryptoSymbols) : [],
        stockSymbols.length > 0 ? this.fetchStockPrices(stockSymbols) : []
      ]);

      // Update cache and notify subscribers
      const allPrices = [...cryptoPrices, ...stockPrices];
      
      for (const price of allPrices) {
        this.cache.set(price.symbol, price);
        
        // Notify subscribers
        const symbolSubscribers = this.subscribers.get(price.symbol);
        if (symbolSubscribers) {
          symbolSubscribers.forEach(callback => callback(price));
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }

  subscribe(symbol: string, callback: (price: AssetPrice) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol)!.add(callback);

    // Return cached price if available and fresh
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      // Immediately call with cached data
      callback(cached);
    } else {
      // Check if we're already fetching this symbol
      const existingFetch = this.pendingFetches.get(symbol);
      if (existingFetch) {
        existingFetch.then(callback).catch(() => {});
      } else {
        // Add to batch queue for efficient fetching
        this.addToBatchQueue(symbol, callback);
      }
    }

    // Start update interval if not already running
    if (!this.updateInterval && this.subscribers.size > 0) {
      this.startUpdateInterval();
    }

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol);
        }
      }

      // Stop update interval if no subscribers
      if (this.subscribers.size === 0 && this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
        if (this.updateTimeout) {
          clearTimeout(this.updateTimeout);
          this.updateTimeout = null;
        }
      }
    };
  }

  private async fetchPriceForSymbol(symbol: string): Promise<AssetPrice> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      if (this.cryptoIdMap[symbol]) {
        // Use crypto API route
        const response = await fetch(`/api/crypto-prices?symbol=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Check if rate limited or server error - use cached/fallback silently
          if (response.status === 503 || response.status === 429 || response.status === 500) {
            // Check cache first
            const cached = this.cache.get(symbol);
            if (cached) {
              return cached;
            }
            // Silent fallback for rate limits
            return this.getFallbackCryptoPrices([symbol])[0];
          }
          throw new Error(`Failed to fetch ${symbol}`);
        }

        const data = await response.json();
        
        return {
          symbol: data.symbol,
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          lastUpdated: data.lastUpdated
        };
      } else {
        // Use API route for stock symbols to avoid CORS
        const response = await fetch(`/api/yahoo-finance?symbol=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Check if rate limited or server error - use cached/fallback silently
          if (response.status === 503 || response.status === 429 || response.status === 500) {
            const cached = this.cache.get(symbol);
            if (cached) {
              return cached;
            }
            return this.getFallbackStockPrice(symbol);
          }
          throw new Error(`Failed to fetch ${symbol}`);
        }

        const data = await response.json();
        
        return {
          symbol: data.symbol,
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          lastUpdated: data.lastUpdated
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Silently handle network errors and use fallback (don't spam console)
      if (error?.name === 'AbortError' || error?.message?.includes('Failed to fetch')) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Network issue for ${symbol}, using fallback`);
        }
      } else {
        console.warn(`⚠️ Price fetch warning for ${symbol}:`, error?.message);
      }
      
      // Return cached data if available, otherwise fallback
      const cached = this.cache.get(symbol);
      if (cached) {
        return cached;
      }
      return this.cryptoIdMap[symbol] 
        ? this.getFallbackCryptoPrices([symbol])[0]
        : this.getFallbackStockPrice(symbol);
    }
  }

  private startUpdateInterval(): void {
    // Clear any existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, this.UPDATE_INTERVAL);

    // Initial update with slight delay to prevent immediate spam on mount
    this.updateTimeout = setTimeout(() => {
      this.updatePrices();
    }, 2000); // 2 second delay before first fetch
  }

  /**
   * Add symbol to batch queue - batches multiple requests into one API call
   * This significantly reduces API calls when multiple components mount simultaneously
   */
  private addToBatchQueue(symbol: string, callback: (price: AssetPrice) => void): void {
    this.batchQueue.add(symbol);

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set timeout to process batch
    this.batchTimeout = setTimeout(() => {
      this.processBatchQueue();
    }, this.BATCH_DELAY);
  }

  /**
   * Process all queued symbols in a single batch request
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.size === 0) return;

    const symbols = Array.from(this.batchQueue);
    this.batchQueue.clear();
    this.batchTimeout = null;

    // Split into crypto and stock symbols
    const cryptoSymbols = symbols.filter(s => this.cryptoIdMap[s]);
    const stockSymbols = symbols.filter(s => !this.cryptoIdMap[s]);

    try {
      // Fetch all prices in parallel
      const [cryptoPrices, stockPrices] = await Promise.all([
        cryptoSymbols.length > 0 ? this.fetchCryptoPrices(cryptoSymbols) : [],
        stockSymbols.length > 0 ? this.fetchStockPrices(stockSymbols) : []
      ]);

      const allPrices = [...cryptoPrices, ...stockPrices];

      // Update cache and notify all subscribers
      for (const price of allPrices) {
        this.cache.set(price.symbol, price);
        
        const symbolSubscribers = this.subscribers.get(price.symbol);
        if (symbolSubscribers) {
          symbolSubscribers.forEach(callback => callback(price));
        }
      }
    } catch (error) {
      console.error('Error processing batch queue:', error);
      
      // Fallback: notify subscribers with fallback prices
      for (const symbol of symbols) {
        const fallbackPrice = this.cryptoIdMap[symbol]
          ? this.getFallbackCryptoPrices([symbol])[0]
          : this.getFallbackStockPrice(symbol);
        
        this.cache.set(symbol, fallbackPrice);
        
        const symbolSubscribers = this.subscribers.get(symbol);
        if (symbolSubscribers) {
          symbolSubscribers.forEach(callback => callback(fallbackPrice));
        }
      }
    }
  }

  getPrice(symbol: string): AssetPrice | null {
    return this.cache.get(symbol) || null;
  }

  getAllPrices(): AssetPrice[] {
    return Array.from(this.cache.values());
  }
}

// Singleton instance
export const priceService = new PriceService();
