/**
 * Finnhub API Integration
 * Real-time Stock Market Data, Forex, Crypto, and Economic Data
 * API Documentation: https://finnhub.io/docs/api
 * 
 * Features:
 * - Real-time quotes
 * - Historical data (candles)
 * - Company profiles
 * - Financial statements
 * - News sentiment
 * - Technical indicators
 * - Forex rates
 * - Crypto prices
 */

export interface FinnhubCredentials {
  apiKey: string;
  webhookSecret?: string;
}

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubCandle {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volume data
}

export interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubMetric {
  metric: {
    '52WeekHigh': number;
    '52WeekLow': number;
    '52WeekPriceReturnDaily': number;
    beta: number;
    marketCapitalization: number;
    peBasicExclExtraTTM: number;
    eps: number;
    dividendYieldIndicatedAnnual: number;
  };
  series: {
    annual: any;
    quarterly: any;
  };
}

export interface FinnhubForexRate {
  a: number;  // Ask price
  b: number;  // Bid price
  t: number;  // Timestamp
}

export interface FinnhubCryptoCandle {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volume data
}

export interface FinnhubTechnicalIndicator {
  indicator: string;
  signal: 'buy' | 'sell' | 'neutral';
  value: number;
}

export interface FinnhubEarnings {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

export class FinnhubAPI {
  private readonly baseUrl: string = 'https://finnhub.io/api/v1';
  private readonly credentials: FinnhubCredentials;

  constructor(credentials: FinnhubCredentials) {
    this.credentials = credentials;
  }

  /**
   * Build API URL with authentication
   */
  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('token', this.credentials.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Finnhub API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Finnhub API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // ==================== STOCK QUOTES ====================

  /**
   * Get real-time quote for a symbol
   * Example: getQuote('AAPL')
   */
  async getQuote(symbol: string): Promise<FinnhubQuote> {
    return this.request<FinnhubQuote>('/quote', { symbol: symbol.toUpperCase() });
  }

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(symbols: string[]): Promise<Map<string, FinnhubQuote>> {
    const quotes = new Map<string, FinnhubQuote>();
    
    // Fetch quotes in parallel
    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getQuote(symbol);
        quotes.set(symbol.toUpperCase(), quote);
      } catch (error) {
        console.warn(`Failed to fetch quote for ${symbol}:`, error);
      }
    });
    
    await Promise.all(promises);
    return quotes;
  }

  // ==================== HISTORICAL DATA (CANDLES) ====================

  /**
   * Get historical candle data
   * @param symbol Stock symbol
   * @param resolution Supported values: 1, 5, 15, 30, 60, D, W, M
   * @param from UNIX timestamp
   * @param to UNIX timestamp
   */
  async getCandles(
    symbol: string,
    resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M',
    from: number,
    to: number
  ): Promise<FinnhubCandle> {
    return this.request<FinnhubCandle>('/stock/candle', {
      symbol: symbol.toUpperCase(),
      resolution,
      from,
      to,
    });
  }

  /**
   * Get recent candle data (last N days)
   */
  async getRecentCandles(
    symbol: string,
    resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M',
    days: number = 30
  ): Promise<FinnhubCandle> {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (days * 24 * 60 * 60);
    return this.getCandles(symbol, resolution, from, to);
  }

  // ==================== COMPANY INFORMATION ====================

  /**
   * Get company profile
   */
  async getCompanyProfile(symbol: string): Promise<FinnhubCompanyProfile> {
    return this.request<FinnhubCompanyProfile>('/stock/profile2', {
      symbol: symbol.toUpperCase(),
    });
  }

  /**
   * Get company metrics and financial ratios
   */
  async getMetrics(symbol: string): Promise<FinnhubMetric> {
    return this.request<FinnhubMetric>('/stock/metric', {
      symbol: symbol.toUpperCase(),
      metric: 'all',
    });
  }

  // ==================== NEWS ====================

  /**
   * Get company news
   * @param symbol Stock symbol
   * @param from Date in YYYY-MM-DD format
   * @param to Date in YYYY-MM-DD format
   */
  async getCompanyNews(symbol: string, from: string, to: string): Promise<FinnhubNews[]> {
    return this.request<FinnhubNews[]>('/company-news', {
      symbol: symbol.toUpperCase(),
      from,
      to,
    });
  }

  /**
   * Get recent company news (last N days)
   */
  async getRecentNews(symbol: string, days: number = 7): Promise<FinnhubNews[]> {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    
    return this.getCompanyNews(
      symbol,
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );
  }

  /**
   * Get market news by category
   * @param category Supported values: general, forex, crypto, merger
   */
  async getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<FinnhubNews[]> {
    return this.request<FinnhubNews[]>('/news', { category });
  }

  // ==================== EARNINGS ====================

  /**
   * Get earnings data
   */
  async getEarnings(symbol: string): Promise<FinnhubEarnings[]> {
    return this.request<FinnhubEarnings[]>('/stock/earnings', {
      symbol: symbol.toUpperCase(),
    });
  }

  // ==================== FOREX ====================

  /**
   * Get forex rates
   * @param base Base currency (e.g., 'USD')
   * @param quote Quote currency (e.g., 'EUR')
   */
  async getForexRate(base: string, quote: string): Promise<FinnhubForexRate> {
    const symbol = `OANDA:${base}_${quote}`;
    return this.request<FinnhubForexRate>('/forex/rates', { base });
  }

  /**
   * Get forex candles
   */
  async getForexCandles(
    base: string,
    quote: string,
    resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M',
    from: number,
    to: number
  ): Promise<FinnhubCandle> {
    const symbol = `OANDA:${base}_${quote}`;
    return this.request<FinnhubCandle>('/forex/candle', {
      symbol,
      resolution,
      from,
      to,
    });
  }

  // ==================== CRYPTO ====================

  /**
   * Get crypto candles
   * @param symbol Crypto symbol (e.g., 'BINANCE:BTCUSDT')
   */
  async getCryptoCandles(
    symbol: string,
    resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M',
    from: number,
    to: number
  ): Promise<FinnhubCryptoCandle> {
    return this.request<FinnhubCryptoCandle>('/crypto/candle', {
      symbol: symbol.toUpperCase(),
      resolution,
      from,
      to,
    });
  }

  /**
   * Get crypto exchanges
   */
  async getCryptoExchanges(): Promise<string[]> {
    return this.request<string[]>('/crypto/exchange');
  }

  /**
   * Get crypto symbols for an exchange
   */
  async getCryptoSymbols(exchange: string): Promise<any[]> {
    return this.request<any[]>('/crypto/symbol', { exchange });
  }

  // ==================== TECHNICAL INDICATORS ====================

  /**
   * Get RSI (Relative Strength Index)
   */
  async getRSI(
    symbol: string,
    resolution: 'D' | 'W' | 'M',
    from: number,
    to: number,
    period: number = 14
  ): Promise<any> {
    return this.request('/indicator', {
      symbol: symbol.toUpperCase(),
      resolution,
      from,
      to,
      indicator: 'rsi',
      timeperiod: period,
    });
  }

  /**
   * Get MACD (Moving Average Convergence Divergence)
   */
  async getMACD(
    symbol: string,
    resolution: 'D' | 'W' | 'M',
    from: number,
    to: number
  ): Promise<any> {
    return this.request('/indicator', {
      symbol: symbol.toUpperCase(),
      resolution,
      from,
      to,
      indicator: 'macd',
      fastperiod: 12,
      slowperiod: 26,
      signalperiod: 9,
    });
  }

  /**
   * Get EMA (Exponential Moving Average)
   */
  async getEMA(
    symbol: string,
    resolution: 'D' | 'W' | 'M',
    from: number,
    to: number,
    period: number = 20
  ): Promise<any> {
    return this.request('/indicator', {
      symbol: symbol.toUpperCase(),
      resolution,
      from,
      to,
      indicator: 'ema',
      timeperiod: period,
    });
  }

  // ==================== MARKET STATUS ====================

  /**
   * Get market status (open/closed)
   * @param exchange Exchange code (e.g., 'US', 'UK', 'HK')
   */
  async getMarketStatus(exchange: string = 'US'): Promise<any> {
    return this.request('/stock/market-status', { exchange });
  }

  // ==================== SEARCH ====================

  /**
   * Search for symbols
   */
  async searchSymbols(query: string): Promise<any> {
    return this.request('/search', { q: query });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Verify API credentials
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getQuote('AAPL');
      return true;
    } catch (error) {
      console.error('Finnhub credentials verification failed:', error);
      return false;
    }
  }

  /**
   * Get comprehensive asset data (quote + profile + metrics)
   */
  async getAssetData(symbol: string): Promise<{
    quote: FinnhubQuote;
    profile?: FinnhubCompanyProfile;
    metrics?: FinnhubMetric;
  }> {
    const [quote, profile, metrics] = await Promise.allSettled([
      this.getQuote(symbol),
      this.getCompanyProfile(symbol),
      this.getMetrics(symbol),
    ]);

    return {
      quote: quote.status === 'fulfilled' ? quote.value : {} as FinnhubQuote,
      profile: profile.status === 'fulfilled' ? profile.value : undefined,
      metrics: metrics.status === 'fulfilled' ? metrics.value : undefined,
    };
  }

  /**
   * Get market overview (multiple symbols)
   */
  async getMarketOverview(symbols: string[]): Promise<Map<string, any>> {
    const overview = new Map<string, any>();

    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.getAssetData(symbol);
        overview.set(symbol.toUpperCase(), data);
      } catch (error) {
        console.warn(`Failed to fetch data for ${symbol}:`, error);
      }
    });

    await Promise.all(promises);
    return overview;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create Finnhub API instance with environment credentials
 */
export function createFinnhubClient(): FinnhubAPI {
  const apiKey = process.env.FINNHUB_API_KEY || '';
  const webhookSecret = process.env.FINNHUB_WEBHOOK_SECRET || '';

  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    console.warn('⚠️ Finnhub API key not configured. Using demo key (limited functionality).');
    return new FinnhubAPI({ apiKey: 'demo' });
  }

  return new FinnhubAPI({
    apiKey,
    webhookSecret,
  });
}

/**
 * Format Finnhub quote for display
 */
export function formatFinnhubQuote(quote: FinnhubQuote) {
  return {
    price: quote.c,
    change: quote.d,
    changePercent: quote.dp,
    high: quote.h,
    low: quote.l,
    open: quote.o,
    previousClose: quote.pc,
    timestamp: new Date(quote.t * 1000).toISOString(),
  };
}

/**
 * Convert resolution to Finnhub format
 */
export function convertResolution(interval: string): '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M' {
  const mapping: Record<string, any> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '1d': 'D',
    '1w': 'W',
    '1M': 'M',
  };
  return mapping[interval] || 'D';
}

export default FinnhubAPI;
