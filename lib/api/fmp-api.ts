/**
 * Financial Modeling Prep (FMP) API Client
 * Provides company profile data by CIK and other financial data
 * 
 * Free tier limits: ~250 API calls/day
 * Strategy: Cache aggressively, use batch where possible
 */

// ==================== TYPES ====================

export interface FMPCompanyProfile {
  symbol: string;
  price: number;
  marketCap: number;
  beta: number;
  lastDividend: number;
  range: string;
  change: number;
  changePercentage: number;
  volume: number;
  averageVolume: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchangeFullName: string;
  exchange: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

export interface FMPSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface FMPAPIError {
  'Error Message'?: string;
  message?: string;
}

// ==================== API CLIENT ====================

export class FMPApi {
  private baseUrl = 'https://financialmodelingprep.com/stable';
  private apiKey: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes cache for free tier optimization

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  }

  /**
   * Get from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build URL - endpoint already includes leading slash
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    url.searchParams.append('apikey', this.apiKey);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5 min cache for Next.js
    });

    if (!response.ok) {
      const error: FMPAPIError = await response.json().catch(() => ({}));
      throw new Error(error['Error Message'] || error.message || `FMP API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for API error in response body
    if (data && data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    this.setCache(cacheKey, data);
    return data as T;
  }

  // ==================== COMPANY PROFILE ====================

  /**
   * Get company profile by CIK (Central Index Key)
   * @param cik - SEC CIK number (e.g., "320193" for Apple)
   */
  async getProfileByCIK(cik: string): Promise<FMPCompanyProfile | null> {
    // Normalize CIK - remove leading zeros for API, but some APIs expect them
    const normalizedCIK = cik.replace(/^0+/, '') || cik;
    
    try {
      const data = await this.request<FMPCompanyProfile[]>('/profile-cik', { cik: normalizedCIK });
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching company profile by CIK:', error);
      return null;
    }
  }

  /**
   * Get company profile by ticker symbol
   * @param symbol - Stock ticker (e.g., "AAPL")
   */
  async getProfile(symbol: string): Promise<FMPCompanyProfile | null> {
    try {
      // Use query param format for stable API
      const data = await this.request<FMPCompanyProfile[]>('/profile', { symbol: symbol.toUpperCase() });
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching company profile:', error);
      return null;
    }
  }

  /**
   * Search for companies by name or ticker
   * @param query - Search query
   * @param limit - Max results (default 10)
   */
  async searchCompanies(query: string, limit: number = 10): Promise<FMPSearchResult[]> {
    try {
      // Use search-name endpoint for stable API
      const data = await this.request<FMPSearchResult[]>('/search-name', {
        query: query,
        limit: limit.toString(),
      });
      return data || [];
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  }

  /**
   * Get real-time quote for a symbol
   * @param symbol - Stock ticker
   */
  async getQuote(symbol: string): Promise<FMPQuote | null> {
    try {
      const data = await this.request<FMPQuote[]>('/quote', { symbol: symbol.toUpperCase() });
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    }
  }

  /**
   * Get bulk quotes for multiple symbols (more efficient for multiple calls)
   * @param symbols - Array of stock tickers
   */
  async getBulkQuotes(symbols: string[]): Promise<FMPQuote[]> {
    if (symbols.length === 0) return [];
    
    try {
      const symbolList = symbols.map(s => s.toUpperCase()).join(',');
      const data = await this.request<FMPQuote[]>('/quote', { symbol: symbolList });
      return data || [];
    } catch (error) {
      console.error('Error fetching bulk quotes:', error);
      return [];
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create FMP API instance with environment credentials
 */
export function createFMPClient(): FMPApi {
  return new FMPApi();
}

/**
 * Format market cap for display
 */
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  }
  if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  }
  if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  }
  return `$${marketCap.toLocaleString()}`;
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toLocaleString();
}

/**
 * Normalize CIK to 10-digit padded format
 */
export function normalizeCIK(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0');
}

/**
 * Validate CIK format
 */
export function isValidCIK(cik: string): boolean {
  // CIK should be numeric and between 1-10 digits
  const cleanCIK = cik.replace(/^0+/, '');
  return /^\d{1,10}$/.test(cleanCIK);
}

// Export singleton instance for convenience
export const fmpApi = createFMPClient();
