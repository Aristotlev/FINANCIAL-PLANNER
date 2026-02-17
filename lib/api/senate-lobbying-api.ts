/**
 * OmniFolio Proprietary Senate Lobbying API Integration
 * 
 * Fetches lobbying disclosure data from 100% PUBLIC government sources:
 * 
 * 1. US Senate Lobbying Disclosure Act (LDA) Database
 *    URL: https://lda.senate.gov/api/v1/
 *    Format: REST/JSON
 *    Rate Limit: ~2 req/sec (be polite)
 *    Auth: None required
 *    
 * 2. US House of Representatives Lobbying Disclosures
 *    URL: https://disclosurespreview.house.gov/
 *    Format: XML/JSON
 *    
 * 3. OpenSecrets.org (Center for Responsive Politics)
 *    URL: Public lobbying data aggregations
 *    
 * NO third-party paid APIs. 100% legal. 100% proprietary scoring.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { apiGateway, CacheTTL } from './external-api-gateway';

// ══════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════

export interface LobbyingFiling {
  filingUuid: string;
  filingType: 'registration' | 'report' | 'amendment' | 'termination';
  filingYear: number;
  filingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2' | 'annual';
  filingDate: string;
  amount: number | null;
  amountReported: number | null;
  clientName: string;
  clientDescription: string | null;
  clientCountry: string;
  clientState: string | null;
  clientPpbCountry: string | null;
  clientPpbState: string | null;
  registrantName: string;
  registrantDescription: string | null;
  registrantId: string | null;
  registrantCountry: string | null;
  senateId: string | null;
  houseId: string | null;
  lobbyists: LobbyistInfo[];
  issues: LobbyingIssue[];
  governmentEntities: GovernmentEntity[];
  documentUrl: string | null;
  postedDate: string | null;
  effectiveDate: string | null;
  terminationDate: string | null;
  // Computed
  expenses: number | null;
  income: number | null;
}

export interface LobbyistInfo {
  name: string;
  coveredPosition: string | null;
  newLobbyist: boolean;
}

export interface LobbyingIssue {
  code: string;
  description: string;
  specificIssue: string | null;
}

export interface GovernmentEntity {
  name: string;
  id: string | null;
}

export interface LobbyingSearchParams {
  clientName?: string;
  registrantName?: string;
  filingYear?: number;
  filingPeriod?: string;
  filingType?: string;
  issueCode?: string;
  lobbyistName?: string;
  amount_reported_min?: number;
  amount_reported_max?: number;
  ordering?: string;
  page?: number;
  pageSize?: number;
}

export interface LobbyingSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

export interface LobbyingContribution {
  filingUuid: string;
  contributorName: string;
  payeeName: string | null;
  recipientName: string;
  amount: number;
  date: string;
  contributionType: string;
  filerType: string;
}

export interface LobbyingRegistrant {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  country: string | null;
  state: string | null;
  contactName: string | null;
}

export interface LobbyingClient {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  state: string | null;
  generalDescription: string | null;
}

// Issue area code mappings (Senate LDA codes)
export const ISSUE_AREA_CODES: Record<string, string> = {
  'ACC': 'Accounting',
  'ADV': 'Advertising',
  'AER': 'Aerospace',
  'AGR': 'Agriculture',
  'ALC': 'Alcohol & Drug Abuse',
  'ANI': 'Animals',
  'APP': 'Apparel/Clothing Industry/Textiles',
  'ART': 'Arts/Entertainment',
  'AUT': 'Automotive Industry',
  'AVI': 'Aviation/Aircraft/Airlines',
  'BAN': 'Banking',
  'BEV': 'Beverage Industry',
  'BNK': 'Bankruptcy',
  'BUD': 'Budget/Appropriations',
  'CAW': 'Clean Air & Water',
  'CDT': 'Commodities',
  'CHM': 'Chemicals/Chemical Industry',
  'CIV': 'Civil Rights/Civil Liberties',
  'COM': 'Communications/Broadcasting/Radio/TV',
  'CON': 'Constitution',
  'CPI': 'Computer Industry',
  'CPT': 'Copyright/Patent/Trademark',
  'CSP': 'Consumer Issues/Safety/Products',
  'DEF': 'Defense',
  'DIS': 'Disaster Planning/Emergencies',
  'DOC': 'District of Columbia',
  'ECN': 'Economics/Economic Development',
  'EDU': 'Education',
  'ENG': 'Energy/Nuclear',
  'ENV': 'Environment/Superfund',
  'FAM': 'Family Issues/Abortion/Adoption',
  'FIN': 'Financial Institutions/Investments/Securities',
  'FIR': 'Firearms/Guns/Ammunition',
  'FOO': 'Food Industry',
  'FOR': 'Foreign Relations',
  'FUE': 'Fuel/Gas/Oil',
  'GAM': 'Gaming/Gambling/Casino',
  'GOV': 'Government Issues',
  'HCR': 'Health Issues',
  'HOM': 'Homeland Security',
  'HOU': 'Housing',
  'IMM': 'Immigration',
  'IND': 'Indian/Native American Affairs',
  'INS': 'Insurance',
  'INT': 'Intelligence and Surveillance',
  'LAW': 'Law Enforcement/Crime/Criminal Justice',
  'LBR': 'Labor Issues/Antitrust/Workplace',
  'MAN': 'Manufacturing',
  'MAR': 'Marine/Maritime/Boating/Fisheries',
  'MED': 'Media (Information/Publishing)',
  'MIA': 'Medical/Disease Research/Clinical Labs',
  'MMM': 'Medicare/Medicaid',
  'MON': 'Minting/Money/Gold Standard',
  'NAT': 'Natural Resources',
  'PHA': 'Pharmacy',
  'POS': 'Postal',
  'RES': 'Real Estate/Land Use/Conservation',
  'RET': 'Retirement',
  'ROD': 'Roads/Highway',
  'RRR': 'Railroads',
  'SCI': 'Science/Technology',
  'SMB': 'Small Business',
  'SPO': 'Sports/Athletics',
  'TAR': 'Tariff (Customs/International Trade)',
  'TAX': 'Taxation/Internal Revenue Code',
  'TEC': 'Telecommunications',
  'TOB': 'Tobacco',
  'TOR': 'Torts',
  'TRA': 'Transportation',
  'TRD': 'Trade (Domestic & Foreign)',
  'TOU': 'Travel/Tourism',
  'TRU': 'Trucking/Shipping',
  'URB': 'Urban Development/Municipalities',
  'UNM': 'Unemployment',
  'UTI': 'Utilities',
  'VET': 'Veterans',
  'WAS': 'Waste (Hazardous/Solid/Interstate/Nuclear)',
  'WEL': 'Welfare',
};

// Company ticker → known lobbying entity mapping
// Maps publicly-traded companies to their typical lobbying registrant/client names
export const TICKER_TO_LOBBYING_NAME: Record<string, string[]> = {
  'AAPL': ['Apple Inc', 'Apple Inc.'],
  'MSFT': ['Microsoft Corporation', 'Microsoft Corp'],
  'GOOGL': ['Google LLC', 'Alphabet Inc', 'Google Inc'],
  'AMZN': ['Amazon.com', 'Amazon.com Inc', 'Amazon.com Services LLC', 'Amazon Web Services'],
  'META': ['Meta Platforms', 'Facebook', 'Meta Platforms Inc'],
  'NVDA': ['NVIDIA Corporation', 'NVIDIA Corp'],
  'TSLA': ['Tesla Inc', 'Tesla, Inc'],
  'JPM': ['JPMorgan Chase', 'JPMorgan Chase & Co', 'J.P. Morgan'],
  'BAC': ['Bank of America', 'Bank of America Corporation'],
  'GS': ['Goldman Sachs', 'The Goldman Sachs Group'],
  'MS': ['Morgan Stanley'],
  'WFC': ['Wells Fargo', 'Wells Fargo & Company'],
  'JNJ': ['Johnson & Johnson'],
  'PFE': ['Pfizer Inc', 'Pfizer'],
  'ABBV': ['AbbVie Inc', 'AbbVie'],
  'MRK': ['Merck & Co', 'Merck Sharp & Dohme'],
  'LLY': ['Eli Lilly', 'Eli Lilly and Company'],
  'BMY': ['Bristol-Myers Squibb', 'Bristol Myers Squibb'],
  'LMT': ['Lockheed Martin', 'Lockheed Martin Corporation'],
  'RTX': ['Raytheon', 'RTX Corporation', 'Raytheon Technologies'],
  'BA': ['The Boeing Company', 'Boeing Company', 'Boeing'],
  'NOC': ['Northrop Grumman', 'Northrop Grumman Corporation'],
  'GD': ['General Dynamics', 'General Dynamics Corporation'],
  'XOM': ['Exxon Mobil', 'ExxonMobil', 'Exxon Mobil Corporation'],
  'CVX': ['Chevron Corporation', 'Chevron', 'Chevron U.S.A.'],
  'COP': ['ConocoPhillips'],
  'OXY': ['Occidental Petroleum', 'Occidental Petroleum Corporation'],
  'T': ['AT&T Inc', 'AT&T', 'AT&T Services'],
  'VZ': ['Verizon', 'Verizon Communications'],
  'TMUS': ['T-Mobile', 'T-Mobile US'],
  'DIS': ['The Walt Disney Company', 'Walt Disney', 'Disney'],
  'NFLX': ['Netflix Inc', 'Netflix'],
  'INTC': ['Intel Corporation', 'Intel Corp'],
  'AMD': ['Advanced Micro Devices', 'AMD'],
  'CRM': ['Salesforce', 'Salesforce Inc', 'Salesforce.com'],
  'ORCL': ['Oracle Corporation', 'Oracle'],
  'IBM': ['IBM', 'International Business Machines'],
  'CSCO': ['Cisco Systems', 'Cisco'],
  'QCOM': ['Qualcomm', 'Qualcomm Incorporated'],
  'UBER': ['Uber Technologies'],
  'LYFT': ['Lyft Inc', 'Lyft'],
  'ABNB': ['Airbnb Inc', 'Airbnb'],
  'SQ': ['Block Inc', 'Square Inc'],
  'PYPL': ['PayPal Holdings', 'PayPal'],
  'V': ['Visa Inc', 'Visa'],
  'MA': ['Mastercard', 'Mastercard Incorporated'],
  'UNH': ['UnitedHealth Group'],
  'CVS': ['CVS Health', 'CVS Health Corporation'],
  'WMT': ['Walmart Inc', 'Wal-Mart'],
  'HD': ['The Home Depot', 'Home Depot'],
  'COST': ['Costco Wholesale', 'Costco'],
  'TGT': ['Target Corporation', 'Target Corp'],
  'KO': ['The Coca-Cola Company', 'Coca-Cola'],
  'PEP': ['PepsiCo', 'PepsiCo Inc'],
  'MCD': ['McDonald\'s Corporation', 'McDonald\'s'],
  'SBUX': ['Starbucks Corporation', 'Starbucks'],
  'NKE': ['Nike Inc', 'NIKE'],
  'F': ['Ford Motor Company', 'Ford Motor'],
  'GM': ['General Motors', 'General Motors Company'],
  'CAT': ['Caterpillar Inc', 'Caterpillar'],
  'DE': ['Deere & Company', 'John Deere'],
  'GE': ['General Electric', 'GE'],
  'MMM': ['3M Company', '3M'],
  'HON': ['Honeywell International', 'Honeywell'],
  'UPS': ['United Parcel Service', 'UPS'],
  'FDX': ['FedEx Corporation', 'FedEx'],
  'DAL': ['Delta Air Lines'],
  'UAL': ['United Airlines', 'United Airlines Holdings'],
  'AAL': ['American Airlines', 'American Airlines Group'],
  'LUV': ['Southwest Airlines'],
  'COIN': ['Coinbase Global', 'Coinbase'],
};

// ══════════════════════════════════════════════════════════════════
// RATE LIMITER
// ══════════════════════════════════════════════════════════════════

class SenateLDArateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;
  private consecutiveErrors = 0;
  private _queue: Array<() => void> = [];
  private _processing = false;

  constructor(requestsPerSecond: number = 1.5) {
    // Default to 1.5 req/s — well under the ~2/s soft limit
    this.minInterval = 1000 / requestsPerSecond;
  }

  async throttle(): Promise<void> {
    // Serialize all requests through a queue to prevent burst
    return new Promise<void>((resolve) => {
      this._queue.push(resolve);
      if (!this._processing) this._processQueue();
    });
  }

  private async _processQueue(): Promise<void> {
    this._processing = true;
    while (this._queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const backoff = this.consecutiveErrors > 0
        ? Math.min(this.minInterval * Math.pow(2, this.consecutiveErrors), 30000)
        : this.minInterval;

      if (timeSinceLastRequest < backoff) {
        await new Promise(r => setTimeout(r, backoff - timeSinceLastRequest));
      }

      this.lastRequestTime = Date.now();
      const next = this._queue.shift();
      if (next) next();
    }
    this._processing = false;
  }

  onRateLimit() { this.consecutiveErrors = Math.min(this.consecutiveErrors + 1, 5); }
  onSuccess() { this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1); }
}

// ══════════════════════════════════════════════════════════════════
// SENATE LDA API CLASS
// ══════════════════════════════════════════════════════════════════

export class SenateLobbyingAPI {
  private readonly baseUrl = 'https://lda.senate.gov/api/v1';
  private readonly rateLimiter: SenateLDArateLimiter;

  constructor() {
    this.rateLimiter = new SenateLDArateLimiter(1); // 1 req/s — conservative to avoid 429s
  }

  // ── Core Request ─────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    options: { cacheTTL?: number; cacheKey?: string; retries?: number } = {}
  ): Promise<T> {
    await this.rateLimiter.throttle();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const maxRetries = options.retries ?? 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s per request

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'OmniFolio/1.0 (support@omnifolio.app)',
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          this.rateLimiter.onRateLimit();
          if (attempt < maxRetries) {
            // Wait with exponential backoff before retry: 2s, 4s
            const retryDelay = Math.min(2000 * Math.pow(2, attempt), 8000);
            console.warn(`[SenateLDA] 429 on attempt ${attempt + 1}, retrying in ${retryDelay}ms...`);
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          }
          throw new Error('Senate LDA rate limit exceeded after retries');
        }

        if (!response.ok) {
          throw new Error(`Senate LDA API error (${response.status}): ${response.statusText}`);
        }

        this.rateLimiter.onSuccess();
        return await response.json() as T;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (attempt < maxRetries) {
            console.warn(`[SenateLDA] Timeout on attempt ${attempt + 1}, retrying...`);
            continue;
          }
          throw new Error('Senate LDA request timed out after retries');
        }
        if (error.message?.includes('rate limit') && attempt >= maxRetries) {
          throw error;
        }
        if (attempt < maxRetries && !error.message?.includes('rate limit')) {
          console.warn(`[SenateLDA] Error on attempt ${attempt + 1}: ${error.message}, retrying...`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Senate LDA request failed after all retries');
  }

  // ── Filing Search ────────────────────────────────────────────

  /**
   * Search lobbying filings in the Senate LDA database.
   * This is the main endpoint for finding lobbying activity.
   */
  async searchFilings(params: LobbyingSearchParams): Promise<LobbyingSearchResult> {
    const apiParams: Record<string, string | number | undefined> = {
      filing_year: params.filingYear,
      filing_period: params.filingPeriod,
      filing_type: params.filingType,
      client_name: params.clientName,
      registrant_name: params.registrantName,
      issue_area_code: params.issueCode,
      lobbyist_name: params.lobbyistName,
      amount_reported_min: params.amount_reported_min,
      amount_reported_max: params.amount_reported_max,
      ordering: params.ordering || '-dt_posted',
      page: params.page,
      page_size: params.pageSize || 25,
    };

    return this.request<LobbyingSearchResult>('/filings/', apiParams);
  }

  /**
   * Get a specific filing by UUID
   */
  async getFiling(uuid: string): Promise<any> {
    return this.request<any>(`/filings/${uuid}/`);
  }

  // ── Registrant Search ────────────────────────────────────────

  /**
   * Search lobbying registrants (firms that lobby on behalf of clients)
   */
  async searchRegistrants(name: string, page: number = 1): Promise<LobbyingSearchResult> {
    return this.request<LobbyingSearchResult>('/registrants/', {
      registrant_name: name,
      page,
    });
  }

  // ── Client Search ────────────────────────────────────────────

  /**
   * Search lobbying clients (companies that hire lobbyists)
   */
  async searchClients(name: string, page: number = 1): Promise<LobbyingSearchResult> {
    return this.request<LobbyingSearchResult>('/clients/', {
      client_name: name,
      page,
    });
  }

  // ── Lobbyist Search ──────────────────────────────────────────

  /**
   * Search individual lobbyists
   */
  async searchLobbyists(name: string, page: number = 1): Promise<LobbyingSearchResult> {
    return this.request<LobbyingSearchResult>('/lobbyists/', {
      lobbyist_name: name,
      page,
    });
  }

  // ── Contributions ────────────────────────────────────────────

  /**
   * Search lobbying contributions
   */
  async searchContributions(params: {
    filingYear?: number;
    registrantName?: string;
    lobbyistName?: string;
    page?: number;
  }): Promise<LobbyingSearchResult> {
    return this.request<LobbyingSearchResult>('/contributions/', {
      filing_year: params.filingYear,
      registrant_name: params.registrantName,
      lobbyist_name: params.lobbyistName,
      page: params.page,
    });
  }

  // ── Constants ────────────────────────────────────────────────

  /**
   * Get filing types
   */
  async getFilingTypes(): Promise<any[]> {
    return this.request<any[]>('/constants/filing/filingtypes/');
  }

  /**
   * Get lobbying activity issue codes
   */
  async getLobbyingActivityIssueCodes(): Promise<any[]> {
    return this.request<any[]>('/constants/filing/lobbyingactivityissues/');
  }

  /**
   * Get government entities
   */
  async getGovernmentEntities(): Promise<any[]> {
    return this.request<any[]>('/constants/filing/governmententities/');
  }

  // ── High-Level Methods ───────────────────────────────────────

  /**
   * Get lobbying activity for a company by ticker symbol.
   * Resolves ticker → company name → Senate LDA filing search.
   * 
   * PERFORMANCE: Uses only the FIRST (most canonical) company name to minimise
   * API calls.  One name is enough — Senate LDA search is fuzzy.
   * Caps total external calls to ~6-8 regardless of years requested.
   */
  async getByTicker(
    ticker: string,
    options: { years?: number; maxResults?: number } = {}
  ): Promise<LobbyingFiling[]> {
    const { years = 3, maxResults = 150 } = options;
    const upperTicker = ticker.toUpperCase();

    // Use ONLY the first (canonical) company name — avoid N×years requests
    const companyNames = TICKER_TO_LOBBYING_NAME[upperTicker];
    const searchName = companyNames?.[0] || upperTicker;

    try {
      return await this.searchByClientName(searchName, years, maxResults);
    } catch (error) {
      console.warn(`[SenateLDA] Failed to search for "${searchName}":`, error);
      // If canonical name failed, fall back to ticker itself
      if (searchName !== upperTicker) {
        try {
          return await this.searchByClientName(upperTicker, years, maxResults);
        } catch { /* give up */ }
      }
      return [];
    }
  }

  /**
   * Search filings by client name with pagination support.
   * 
   * RATE LIMIT SAFETY:
   *   - Max 2 pages per year (50 results/year is plenty)
   *   - Max 6 total API calls regardless of year range
   *   - Early exit when we hit enough results
   *   - Uses page_size=25 (Senate LDA max is 25)
   */
  async searchByClientName(
    clientName: string,
    years: number = 3,
    maxResults: number = 150
  ): Promise<LobbyingFiling[]> {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;
    const allFilings: LobbyingFiling[] = [];
    let totalApiCalls = 0;
    const MAX_API_CALLS = 8; // hard cap on external requests
    const MAX_PAGES_PER_YEAR = 2; // max 50 filings per year
    const operationStart = Date.now();
    const TOTAL_TIMEOUT_MS = 40000; // 40s hard cap on entire operation

    for (let year = currentYear; year >= startYear; year--) {
      if (totalApiCalls >= MAX_API_CALLS || allFilings.length >= maxResults) break;

      // Check total operation timeout — return what we have so far
      if (Date.now() - operationStart > TOTAL_TIMEOUT_MS) {
        console.warn(`[SenateLDA] Operation timeout after ${totalApiCalls} API calls, returning ${allFilings.length} filings`);
        break;
      }

      let page = 1;
      let hasMore = true;

      while (hasMore && page <= MAX_PAGES_PER_YEAR && totalApiCalls < MAX_API_CALLS && allFilings.length < maxResults) {
        // Check timeout inside inner loop too
        if (Date.now() - operationStart > TOTAL_TIMEOUT_MS) {
          console.warn(`[SenateLDA] Operation timeout mid-year, returning ${allFilings.length} filings`);
          hasMore = false;
          break;
        }

        try {
          totalApiCalls++;
          const result = await this.searchFilings({
            clientName,
            filingYear: year,
            page,
            pageSize: 25,
            ordering: '-dt_posted',
          });

          if (!result.results || result.results.length === 0) {
            hasMore = false;
            break;
          }

          const filings = result.results.map((r: any) => this.transformFiling(r));
          allFilings.push(...filings);

          // Stop paginating if we got fewer than pageSize (last page)
          hasMore = result.next !== null && result.results.length >= 25;
          page++;
        } catch (error) {
          console.warn(`[SenateLDA] Error fetching page ${page} for year ${year}:`, error);
          hasMore = false;
          // If we already have some filings, don't let errors stop us
          if (allFilings.length > 0) break;
        }
      }
    }

    console.log(`[SenateLDA] "${clientName}" → ${allFilings.length} filings in ${totalApiCalls} API calls (${Date.now() - operationStart}ms)`);
    return allFilings.slice(0, maxResults);
  }

  /**
   * Get top lobbying spenders across all companies for a given period
   */
  async getTopSpenders(
    year: number,
    period?: string,
    limit: number = 50
  ): Promise<LobbyingFiling[]> {
    const result = await this.searchFilings({
      filingYear: year,
      filingPeriod: period,
      ordering: '-amount_reported',
      pageSize: limit,
    });

    return (result.results || []).map((r: any) => this.transformFiling(r));
  }

  /**
   * Get lobbying filings by issue area (e.g., 'DEF' for defense, 'HCR' for healthcare)
   */
  async getByIssueArea(
    issueCode: string,
    year?: number,
    limit: number = 50
  ): Promise<LobbyingFiling[]> {
    const result = await this.searchFilings({
      issueCode,
      filingYear: year || new Date().getFullYear(),
      ordering: '-amount_reported',
      pageSize: limit,
    });

    return (result.results || []).map((r: any) => this.transformFiling(r));
  }

  // ── Data Transformation ──────────────────────────────────────

  /**
   * Transform raw Senate LDA API response to our normalized format
   */
  private transformFiling(raw: any): LobbyingFiling {
    const amount = raw.amount_reported != null
      ? parseFloat(raw.amount_reported)
      : (raw.income != null ? parseFloat(raw.income)
        : (raw.expenses != null ? parseFloat(raw.expenses) : null));

    // Determine if income or expense based on filing type
    const isRegistrantFiling = raw.filing_type === 'RA' || raw.filing_type === 'RR';
    const expenses = !isRegistrantFiling ? amount : null;
    const income = isRegistrantFiling ? amount : null;

    // Parse period
    let period: LobbyingFiling['filingPeriod'] = 'annual';
    const rawPeriod = raw.filing_period || '';
    if (rawPeriod.includes('1') || rawPeriod.toLowerCase().includes('first') || rawPeriod.toLowerCase().includes('q1') || rawPeriod === 'first_quarter') {
      period = 'Q1';
    } else if (rawPeriod.includes('2') || rawPeriod.toLowerCase().includes('second') || rawPeriod.toLowerCase().includes('q2') || rawPeriod === 'second_quarter') {
      period = 'Q2';
    } else if (rawPeriod.includes('3') || rawPeriod.toLowerCase().includes('third') || rawPeriod.toLowerCase().includes('q3') || rawPeriod === 'third_quarter') {
      period = 'Q3';
    } else if (rawPeriod.includes('4') || rawPeriod.toLowerCase().includes('fourth') || rawPeriod.toLowerCase().includes('q4') || rawPeriod === 'fourth_quarter') {
      period = 'Q4';
    } else if (rawPeriod.toLowerCase().includes('mid') || rawPeriod === 'mid_year' || rawPeriod.toLowerCase().includes('h1')) {
      period = 'H1';
    } else if (rawPeriod.toLowerCase().includes('year') || rawPeriod === 'year_end' || rawPeriod.toLowerCase().includes('h2')) {
      period = 'H2';
    }

    // Parse lobbyists
    // Senate LDA API returns: { lobbyist: { first_name, last_name, id, ... }, covered_position, new }
    // There is NO "name" field — we must construct it from first_name + last_name
    const seenLobbyistIds = new Set<string>();
    const lobbyists: LobbyistInfo[] = (raw.lobbying_activities || []).flatMap(
      (activity: any) => (activity.lobbyists || []).map((l: any) => {
        const firstName = (l.lobbyist?.first_name || '').trim();
        const lastName = (l.lobbyist?.last_name || '').trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || l.name || 'Unknown';
        // Deduplicate by lobbyist ID (same person appears in multiple activities)
        const lobbyistId = l.lobbyist?.id ? String(l.lobbyist.id) : fullName;
        if (seenLobbyistIds.has(lobbyistId)) return null;
        seenLobbyistIds.add(lobbyistId);
        return {
          name: fullName,
          coveredPosition: l.covered_position || l.lobbyist?.covered_position || null,
          newLobbyist: l.new || false,
        };
      })
    ).filter(Boolean) as LobbyistInfo[];

    // Parse issues
    const issues: LobbyingIssue[] = (raw.lobbying_activities || []).map(
      (activity: any) => ({
        code: activity.general_issue_code || '',
        description: activity.general_issue_code
          ? (ISSUE_AREA_CODES[activity.general_issue_code] || activity.general_issue_code)
          : '',
        specificIssue: activity.description || null,
      })
    );

    // Parse government entities
    const governmentEntities: GovernmentEntity[] = (raw.lobbying_activities || []).flatMap(
      (activity: any) => (activity.government_entities || []).map((ge: any) => ({
        name: ge.name || '',
        id: ge.id || null,
      }))
    );

    // Parse filing type
    let filingType: LobbyingFiling['filingType'] = 'report';
    const rawType = raw.filing_type || '';
    if (rawType === 'RA' || rawType === 'RN') filingType = 'registration';
    else if (rawType === 'TA' || rawType === 'TN') filingType = 'termination';
    else if (rawType.includes('A')) filingType = 'amendment';

    // Build document URL
    const documentUrl = raw.filing_document_url || raw.url || null;

    return {
      filingUuid: raw.filing_uuid || raw.id || `${raw.registrant?.id}-${raw.filing_year}-${rawPeriod}`,
      filingType,
      filingYear: raw.filing_year || new Date().getFullYear(),
      filingPeriod: period,
      filingDate: raw.dt_posted || raw.filing_date || '',
      amount,
      amountReported: raw.amount_reported != null ? parseFloat(raw.amount_reported) : null,
      clientName: raw.client?.name || raw.client_name || '',
      clientDescription: raw.client?.general_description || null,
      clientCountry: raw.client?.country || raw.client_country || 'USA',
      clientState: raw.client?.state || raw.client_state || null,
      clientPpbCountry: raw.client?.ppb_country || null,
      clientPpbState: raw.client?.ppb_state || null,
      registrantName: raw.registrant?.name || raw.registrant_name || '',
      registrantDescription: raw.registrant?.description || null,
      registrantId: raw.registrant?.id || raw.registrant_id || null,
      registrantCountry: raw.registrant?.country || null,
      senateId: raw.registrant?.senate_id || raw.senate_id || null,
      houseId: raw.registrant?.house_id || raw.house_id || null,
      lobbyists,
      issues,
      governmentEntities,
      documentUrl,
      postedDate: raw.dt_posted || null,
      effectiveDate: raw.effective_date || null,
      terminationDate: raw.termination_date || null,
      expenses,
      income,
    };
  }

  // ── Utility ──────────────────────────────────────────────────

  /**
   * Verify API connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const result = await this.searchFilings({
        filingYear: new Date().getFullYear(),
        pageSize: 1,
      });
      return result.count !== undefined;
    } catch {
      return false;
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════

let _instance: SenateLobbyingAPI | null = null;

export function createSenateLobbyingClient(): SenateLobbyingAPI {
  if (!_instance) {
    _instance = new SenateLobbyingAPI();
  }
  return _instance;
}

export default SenateLobbyingAPI;
