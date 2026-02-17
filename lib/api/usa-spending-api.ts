/**
 * OmniFolio Proprietary USA Spending API Integration
 *
 * Fetches federal contract/award data from 100% PUBLIC government sources:
 *
 * 1. USAspending.gov API v2
 *    URL: https://api.usaspending.gov/api/v2/
 *    Format: REST/JSON (POST for search, GET for lookups)
 *    Rate Limit: ~120 req/min (generous)
 *    Auth: None required
 *
 * NO third-party paid APIs. 100% legal. 100% proprietary scoring.
 *
 * Copyright OmniFolio. All rights reserved.
 */

// ══════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════

export interface SpendingAward {
  awardId: string;
  awardType: string;
  actionDate: string;
  fiscalYear: number;
  awardDescription: string | null;
  totalObligation: number | null;
  federalActionObligation: number | null;
  totalOutlay: number | null;
  recipientName: string;
  recipientParentName: string | null;
  recipientUei: string | null;
  awardingAgencyName: string;
  awardingSubAgencyName: string | null;
  awardingOfficeName: string | null;
  fundingAgencyName: string | null;
  performanceCity: string | null;
  performanceState: string | null;
  performanceCounty: string | null;
  performanceZip: string | null;
  performanceCountry: string;
  performanceCongressionalDistrict: string | null;
  performanceStartDate: string | null;
  performanceEndDate: string | null;
  naicsCode: string | null;
  naicsDescription: string | null;
  productServiceCode: string | null;
  productServiceDescription: string | null;
  permalink: string | null;
  generatedUniqueAwardId: string | null;
}

export interface SpendingSearchParams {
  recipientName?: string;
  awardingAgency?: string;
  naicsCode?: string;
  productServiceCode?: string;
  awardType?: string[];
  dateRange?: { startDate: string; endDate: string };
  page?: number;
  limit?: number;
  ordering?: string;
}

export interface SpendingSearchResult {
  results: any[];
  page_metadata: {
    page: number;
    total: number;
    limit: number;
    next: number | null;
    previous: number | null;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// NAICS sector code mappings (top-level)
export const NAICS_SECTORS: Record<string, string> = {
  '11': 'Agriculture & Farming',
  '21': 'Mining & Oil/Gas',
  '22': 'Utilities',
  '23': 'Construction',
  '31': 'Manufacturing',
  '32': 'Manufacturing',
  '33': 'Manufacturing',
  '42': 'Wholesale Trade',
  '44': 'Retail Trade',
  '45': 'Retail Trade',
  '48': 'Transportation',
  '49': 'Warehousing',
  '51': 'Information & Tech',
  '52': 'Finance & Insurance',
  '53': 'Real Estate',
  '54': 'Professional/Scientific/Technical Services',
  '55': 'Management',
  '56': 'Waste Management',
  '61': 'Education',
  '62': 'Healthcare & Social',
  '71': 'Arts & Entertainment',
  '72': 'Accommodation & Food',
  '81': 'Other Services',
  '92': 'Public Administration',
};

// Federal agency category colors (for UI)
export const AGENCY_CATEGORIES: Record<string, string> = {
  'DEPARTMENT OF DEFENSE': 'defense',
  'DEPARTMENT OF THE ARMY': 'defense',
  'DEPARTMENT OF THE NAVY': 'defense',
  'DEPARTMENT OF THE AIR FORCE': 'defense',
  'DEFENSE LOGISTICS AGENCY': 'defense',
  'NATIONAL AERONAUTICS AND SPACE ADMINISTRATION': 'aerospace',
  'DEPARTMENT OF ENERGY': 'energy',
  'DEPARTMENT OF HEALTH AND HUMAN SERVICES': 'health',
  'DEPARTMENT OF VETERANS AFFAIRS': 'veterans',
  'DEPARTMENT OF HOMELAND SECURITY': 'homeland',
  'GENERAL SERVICES ADMINISTRATION': 'admin',
  'DEPARTMENT OF STATE': 'diplomacy',
  'DEPARTMENT OF JUSTICE': 'justice',
  'DEPARTMENT OF TRANSPORTATION': 'transport',
  'DEPARTMENT OF THE INTERIOR': 'interior',
  'DEPARTMENT OF AGRICULTURE': 'agriculture',
  'DEPARTMENT OF COMMERCE': 'commerce',
  'DEPARTMENT OF EDUCATION': 'education',
  'DEPARTMENT OF THE TREASURY': 'treasury',
  'DEPARTMENT OF LABOR': 'labor',
  'ENVIRONMENTAL PROTECTION AGENCY': 'environment',
  'NATIONAL SCIENCE FOUNDATION': 'science',
  'SMALL BUSINESS ADMINISTRATION': 'business',
  'SOCIAL SECURITY ADMINISTRATION': 'social',
};

// Company ticker → known federal contractor name mapping
export const TICKER_TO_CONTRACTOR_NAME: Record<string, string[]> = {
  'LMT': ['LOCKHEED MARTIN', 'LOCKHEED MARTIN CORPORATION', 'LOCKHEED MARTIN CORP'],
  'RTX': ['RAYTHEON', 'RTX CORPORATION', 'RAYTHEON TECHNOLOGIES', 'RAYTHEON COMPANY', 'RAYTHEON MISSILES'],
  'BA': ['BOEING', 'THE BOEING COMPANY', 'BOEING COMPANY'],
  'NOC': ['NORTHROP GRUMMAN', 'NORTHROP GRUMMAN CORPORATION'],
  'GD': ['GENERAL DYNAMICS', 'GENERAL DYNAMICS CORPORATION', 'GENERAL DYNAMICS LAND SYSTEMS'],
  'LHX': ['L3HARRIS', 'L3HARRIS TECHNOLOGIES', 'L3 TECHNOLOGIES'],
  'HII': ['HUNTINGTON INGALLS', 'HUNTINGTON INGALLS INDUSTRIES'],
  'LDOS': ['LEIDOS', 'LEIDOS HOLDINGS', 'LEIDOS INC'],
  'SAIC': ['SCIENCE APPLICATIONS INTERNATIONAL', 'SAIC'],
  'BAH': ['BOOZ ALLEN HAMILTON', 'BOOZ ALLEN HAMILTON INC'],
  'PLTR': ['PALANTIR TECHNOLOGIES', 'PALANTIR USG'],
  'MSFT': ['MICROSOFT', 'MICROSOFT CORPORATION'],
  'AMZN': ['AMAZON', 'AMAZON.COM', 'AMAZON WEB SERVICES'],
  'GOOGL': ['GOOGLE', 'GOOGLE LLC', 'GOOGLE CLOUD'],
  'ORCL': ['ORACLE', 'ORACLE CORPORATION', 'ORACLE AMERICA'],
  'IBM': ['IBM', 'INTERNATIONAL BUSINESS MACHINES', 'IBM CORPORATION'],
  'CRM': ['SALESFORCE', 'SALESFORCE.COM', 'SALESFORCE INC'],
  'UNH': ['UNITEDHEALTH', 'UNITEDHEALTH GROUP'],
  'HUM': ['HUMANA', 'HUMANA INC'],
  'CVS': ['CVS HEALTH', 'CVS HEALTH CORPORATION'],
  'CI': ['CIGNA', 'THE CIGNA GROUP', 'CIGNA HEALTHCARE'],
  'MCK': ['MCKESSON', 'MCKESSON CORPORATION'],
  'FLR': ['FLUOR', 'FLUOR CORPORATION'],
  'KBR': ['KBR', 'KBR INC'],
  'J': ['JACOBS', 'JACOBS ENGINEERING', 'JACOBS SOLUTIONS'],
  'TXT': ['TEXTRON', 'TEXTRON INC', 'TEXTRON SYSTEMS'],
  'TDG': ['TRANSDIGM', 'TRANSDIGM GROUP'],
  'AAPL': ['APPLE', 'APPLE INC'],
  'INTC': ['INTEL', 'INTEL CORPORATION'],
  'AMD': ['ADVANCED MICRO DEVICES', 'AMD'],
  'NVDA': ['NVIDIA', 'NVIDIA CORPORATION'],
  'CSCO': ['CISCO', 'CISCO SYSTEMS'],
  'HPQ': ['HP INC', 'HEWLETT-PACKARD'],
  'HPE': ['HEWLETT PACKARD ENTERPRISE'],
  'DELL': ['DELL', 'DELL TECHNOLOGIES'],
  'PFE': ['PFIZER', 'PFIZER INC'],
  'JNJ': ['JOHNSON & JOHNSON'],
  'MRK': ['MERCK', 'MERCK & CO', 'MERCK SHARP & DOHME'],
  'ABBV': ['ABBVIE', 'ABBVIE INC'],
  'LLY': ['ELI LILLY', 'ELI LILLY AND COMPANY'],
  'BMY': ['BRISTOL-MYERS SQUIBB', 'BRISTOL MYERS SQUIBB'],
  'CAT': ['CATERPILLAR', 'CATERPILLAR INC'],
  'GE': ['GENERAL ELECTRIC', 'GE AEROSPACE'],
  'HON': ['HONEYWELL', 'HONEYWELL INTERNATIONAL'],
  'MMM': ['3M', '3M COMPANY'],
  'XOM': ['EXXON MOBIL', 'EXXONMOBIL'],
  'CVX': ['CHEVRON', 'CHEVRON CORPORATION'],
  'F': ['FORD', 'FORD MOTOR COMPANY'],
  'GM': ['GENERAL MOTORS', 'GENERAL MOTORS LLC'],
  'TSLA': ['TESLA', 'TESLA INC'],
  'T': ['AT&T', 'AT&T INC'],
  'VZ': ['VERIZON', 'VERIZON COMMUNICATIONS'],
  'TMUS': ['T-MOBILE', 'T-MOBILE US'],
};

// ══════════════════════════════════════════════════════════════════
// RATE LIMITER
// ══════════════════════════════════════════════════════════════════

class USASpendingRateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;
  private consecutiveErrors = 0;
  private _queue: Array<() => void> = [];
  private _processing = false;

  constructor(requestsPerSecond: number = 2) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async throttle(): Promise<void> {
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
// USA SPENDING API CLASS
// ══════════════════════════════════════════════════════════════════

export class USASpendingAPI {
  private readonly baseUrl = 'https://api.usaspending.gov/api/v2';
  private readonly rateLimiter: USASpendingRateLimiter;

  constructor() {
    this.rateLimiter = new USASpendingRateLimiter(2); // 2 req/s — well within limits
  }

  // ── Core Request (POST — USAspending uses POST for searches) ──

  private async postRequest<T>(
    endpoint: string,
    body: Record<string, any>,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<T> {
    await this.rateLimiter.throttle();

    const url = `${this.baseUrl}${endpoint}`;
    const maxRetries = options.retries ?? 2;
    const timeoutMs = options.timeout ?? 20000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'OmniFolio/1.0 (support@omnifolio.app)',
          },
          body: JSON.stringify(body),
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          this.rateLimiter.onRateLimit();
          if (attempt < maxRetries) {
            const retryDelay = Math.min(2000 * Math.pow(2, attempt), 8000);
            console.warn(`[USASpending] 429 on attempt ${attempt + 1}, retrying in ${retryDelay}ms...`);
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          }
          throw new Error('USAspending.gov rate limit exceeded after retries');
        }

        if (!response.ok) {
          throw new Error(`USAspending.gov API error (${response.status}): ${response.statusText}`);
        }

        this.rateLimiter.onSuccess();
        return await response.json() as T;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (attempt < maxRetries) {
            console.warn(`[USASpending] Timeout on attempt ${attempt + 1}, retrying...`);
            continue;
          }
          throw new Error('USAspending.gov request timed out after retries');
        }
        if (attempt < maxRetries && !error.message?.includes('rate limit')) {
          console.warn(`[USASpending] Error on attempt ${attempt + 1}: ${error.message}, retrying...`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    throw new Error('USAspending.gov request failed after all retries');
  }

  // ── GET request for simple endpoints ──

  private async getRequest<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    options: { retries?: number } = {}
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
        const timeout = setTimeout(() => controller.abort(), 15000);

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
            const retryDelay = Math.min(2000 * Math.pow(2, attempt), 8000);
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          }
          throw new Error('USAspending.gov rate limit exceeded');
        }

        if (!response.ok) {
          throw new Error(`USAspending.gov API error (${response.status}): ${response.statusText}`);
        }

        this.rateLimiter.onSuccess();
        return await response.json() as T;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (attempt < maxRetries) continue;
          throw new Error('USAspending.gov request timed out');
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    throw new Error('USAspending.gov request failed after all retries');
  }

  // ══════════════════════════════════════════════════════════════
  // HIGH-LEVEL METHODS
  // ══════════════════════════════════════════════════════════════

  /**
   * Search for federal spending awards by recipient (company) name.
   * Uses the /search/spending_by_award/ endpoint.
   */
  async searchAwardsByRecipient(
    recipientName: string,
    options: {
      dateRange?: { startDate: string; endDate: string };
      awardTypes?: string[];
      page?: number;
      limit?: number;
      ordering?: string;
    } = {}
  ): Promise<SpendingSearchResult> {
    const {
      dateRange,
      awardTypes = ['A', 'B', 'C', 'D'],  // Contracts (A-D), Grants (02-06), Loans (07-09), etc.
      page = 1,
      limit = 100,
      ordering = 'Award Amount',
    } = options;

    const filters: any = {
      recipient_search_text: [recipientName],
      award_type_codes: awardTypes,
    };

    if (dateRange) {
      filters.time_period = [{
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }];
    }

    const body = {
      filters,
      fields: [
        'Award ID',
        'Recipient Name',
        'recipient_id',
        'Start Date',
        'End Date',
        'Award Amount',
        'Total Outlays',
        'Description',
        'def_codes',
        'COVID-19 Obligations',
        'COVID-19 Outlays',
        'Infrastructure Obligations',
        'Infrastructure Outlays',
        'Awarding Agency',
        'Awarding Sub Agency',
        'Contract Award Type',
        'Award Type',
        'Funding Agency',
        'Funding Sub Agency',
        'Place of Performance City Code',
        'Place of Performance State Code',
        'Place of Performance Country Code',
        'recipient_uei',
        'prime_award_recipient_id',
        'generated_unique_award_id',
        'Last Date to Order',
      ],
      page,
      limit,
      sort: ordering,
      order: 'desc',
      subawards: false,
    };

    return this.postRequest<SpendingSearchResult>(
      '/search/spending_by_award/',
      body,
      { timeout: 25000 }
    );
  }

  /**
   * Get award details (individual award lookup)
   */
  async getAwardDetails(awardId: string): Promise<any> {
    return this.getRequest<any>(`/awards/${awardId}/`);
  }

  /**
   * Search spending by category (agency, NAICS, etc.)
   * Uses /search/spending_by_category/
   */
  async getSpendingByCategory(
    category: 'awarding_agency' | 'awarding_subagency' | 'recipient' | 'naics' | 'psc',
    options: {
      recipientName?: string;
      dateRange?: { startDate: string; endDate: string };
      awardTypes?: string[];
      page?: number;
      limit?: number;
    } = {}
  ): Promise<any> {
    const {
      recipientName,
      dateRange,
      awardTypes = ['A', 'B', 'C', 'D'],
      page = 1,
      limit = 10,
    } = options;

    const filters: any = {
      award_type_codes: awardTypes,
    };

    if (recipientName) {
      filters.recipient_search_text = [recipientName];
    }

    if (dateRange) {
      filters.time_period = [{
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }];
    }

    return this.postRequest<any>(
      `/search/spending_by_category/${category}/`,
      { filters, page, limit, subawards: false },
      { timeout: 20000 }
    );
  }

  /**
   * Get spending over time for a recipient
   */
  async getSpendingOverTime(
    recipientName: string,
    options: {
      group?: 'fiscal_year' | 'quarter' | 'month';
      dateRange?: { startDate: string; endDate: string };
      awardTypes?: string[];
    } = {}
  ): Promise<any> {
    const {
      group = 'fiscal_year',
      dateRange,
      awardTypes = ['A', 'B', 'C', 'D'],
    } = options;

    const filters: any = {
      recipient_search_text: [recipientName],
      award_type_codes: awardTypes,
    };

    if (dateRange) {
      filters.time_period = [{
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }];
    }

    return this.postRequest<any>(
      '/search/spending_over_time/',
      { filters, group, subawards: false },
      { timeout: 20000 }
    );
  }

  /**
   * Get federal spending awards for a company by ticker symbol.
   * Resolves ticker → company name → USAspending award search.
   *
   * Caps total external calls to ~6-8 regardless of years requested.
   */
  async getByTicker(
    ticker: string,
    options: { years?: number; maxResults?: number } = {}
  ): Promise<SpendingAward[]> {
    const { years = 3, maxResults = 200 } = options;
    const upperTicker = ticker.toUpperCase();

    const companyNames = TICKER_TO_CONTRACTOR_NAME[upperTicker];
    const searchName = companyNames?.[0] || upperTicker;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - years);

    try {
      return await this.searchByRecipientName(searchName, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      }, maxResults);
    } catch (error) {
      console.warn(`[USASpending] Failed to search for "${searchName}":`, error);
      if (searchName !== upperTicker) {
        try {
          return await this.searchByRecipientName(upperTicker, {
            startDate: startDate.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
          }, maxResults);
        } catch { /* give up */ }
      }
      return [];
    }
  }

  /**
   * Search awards by recipient name with pagination.
   *
   * RATE LIMIT SAFETY:
   *   - Max 3 pages (300 results is plenty)
   *   - Max 6 total API calls
   *   - Early exit when we hit enough results
   */
  private async searchByRecipientName(
    recipientName: string,
    dateRange: { startDate: string; endDate: string },
    maxResults: number = 200
  ): Promise<SpendingAward[]> {
    const allAwards: SpendingAward[] = [];
    let totalApiCalls = 0;
    const MAX_API_CALLS = 6;
    const MAX_PAGES = 3;
    const operationStart = Date.now();
    const TOTAL_TIMEOUT_MS = 40000;

    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES && totalApiCalls < MAX_API_CALLS && allAwards.length < maxResults) {
      if (Date.now() - operationStart > TOTAL_TIMEOUT_MS) {
        console.warn(`[USASpending] Operation timeout after ${totalApiCalls} API calls, returning ${allAwards.length} awards`);
        break;
      }

      try {
        totalApiCalls++;
        const result = await this.searchAwardsByRecipient(recipientName, {
          dateRange,
          page,
          limit: 100,
        });

        if (!result.results || result.results.length === 0) {
          hasMore = false;
          break;
        }

        const awards = result.results.map((r: any) => this.transformAward(r));
        allAwards.push(...awards);

        hasMore = result.page_metadata?.hasNext === true && result.results.length >= 100;
        page++;
      } catch (error) {
        console.warn(`[USASpending] Error fetching page ${page}:`, error);
        hasMore = false;
        if (allAwards.length > 0) break;
      }
    }

    console.log(`[USASpending] "${recipientName}" → ${allAwards.length} awards in ${totalApiCalls} API calls (${Date.now() - operationStart}ms)`);
    return allAwards.slice(0, maxResults);
  }

  // ── Data Transformation ──────────────────────────────────────

  /**
   * Transform raw USAspending API response to our normalized format
   */
  private transformAward(raw: any): SpendingAward {
    const amount = raw['Award Amount'] != null
      ? parseFloat(String(raw['Award Amount']))
      : null;

    const totalOutlay = raw['Total Outlays'] != null
      ? parseFloat(String(raw['Total Outlays']))
      : null;

    // Build permalink
    const generatedId = raw['generated_unique_award_id'] || '';
    const permalink = generatedId
      ? `https://www.usaspending.gov/award/${generatedId}`
      : null;

    // Determine fiscal year from action/start date
    const startDate = raw['Start Date'] || '';
    let fiscalYear = new Date().getFullYear();
    if (startDate) {
      const d = new Date(startDate);
      // Federal fiscal year starts Oct 1
      fiscalYear = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
    }

    // Award type mapping
    let awardType = 'contract';
    const rawType = raw['Award Type'] || raw['Contract Award Type'] || '';
    const typeStr = String(rawType).toLowerCase();
    if (typeStr.includes('grant')) awardType = 'grant';
    else if (typeStr.includes('loan')) awardType = 'loan';
    else if (typeStr.includes('direct payment') || typeStr.includes('direct_payment')) awardType = 'direct_payment';
    else if (typeStr.includes('other')) awardType = 'other';

    return {
      awardId: raw['Award ID'] || generatedId || `${raw['Recipient Name']}-${startDate}-${Math.random().toString(36).slice(2, 8)}`,
      awardType,
      actionDate: startDate,
      fiscalYear,
      awardDescription: raw['Description'] || null,
      totalObligation: amount,
      federalActionObligation: amount,
      totalOutlay,
      recipientName: raw['Recipient Name'] || '',
      recipientParentName: null,
      recipientUei: raw['recipient_uei'] || null,
      awardingAgencyName: raw['Awarding Agency'] || '',
      awardingSubAgencyName: raw['Awarding Sub Agency'] || null,
      awardingOfficeName: null,
      fundingAgencyName: raw['Funding Agency'] || null,
      performanceCity: null,
      performanceState: raw['Place of Performance State Code'] || null,
      performanceCounty: null,
      performanceZip: null,
      performanceCountry: raw['Place of Performance Country Code'] || 'USA',
      performanceCongressionalDistrict: null,
      performanceStartDate: startDate,
      performanceEndDate: raw['End Date'] || raw['Last Date to Order'] || null,
      naicsCode: null,
      naicsDescription: null,
      productServiceCode: null,
      productServiceDescription: null,
      permalink,
      generatedUniqueAwardId: generatedId || null,
    };
  }

  // ── Utility ──────────────────────────────────────────────────

  /**
   * Verify API connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const result = await this.searchAwardsByRecipient('LOCKHEED MARTIN', {
        dateRange: {
          startDate: oneMonthAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
        },
        limit: 1,
      });
      return result.results !== undefined;
    } catch {
      return false;
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════

let _instance: USASpendingAPI | null = null;

export function createUSASpendingClient(): USASpendingAPI {
  if (!_instance) {
    _instance = new USASpendingAPI();
  }
  return _instance;
}

export default USASpendingAPI;
