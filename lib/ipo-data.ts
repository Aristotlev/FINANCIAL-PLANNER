/**
 * OmniFolio IPO Data Library
 * 
 * Proprietary IPO data sourcing from SEC EDGAR public data.
 * 
 * Strategy:
 * ─────────
 * 1. Search SEC EDGAR EFTS for S-1/F-1 filings (primary documents only)
 * 2. Deduplicate by CIK to get one entry per company
 * 3. Extract ticker from display_names where available
 * 4. Aggressively filter out noise:
 *    - SPACs (SIC 6770)
 *    - ETFs / Trusts / Funds (name matching)
 *    - Insurance registrations (SIC 6311/6321/6331/6411)
 * 5. Enrich top candidates via SEC submissions API
 * 6. Filter out companies that are already public (have 10-K/10-Q before S-1)
 * 
 * All data is publicly available under SEC's fair access policy.
 * User-Agent header required per SEC guidelines.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

// ─── Types ────────────────────────────────────────────────────────────

export type IPOStatus = 'filed' | 'expected' | 'priced' | 'withdrawn';

export interface ProprietaryIPO {
  id: string;
  companyName: string;
  symbol: string | null;
  exchange: string | null;
  filingDate: string;
  expectedDate: string | null;
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  offerPrice: number | null;
  sharesOffered: number | null;
  dealSize: number | null;
  status: IPOStatus;
  filingType: string;
  sector: string | null;
  industry: string | null;
  leadUnderwriters: string | null;
  description: string | null;
  secFilingUrl: string | null;
  cik: string | null;
  country: string;
  source: string;
}

// ─── Raw EFTS hit shape ───────────────────────────────────────────────

interface EFTSHitSource {
  ciks?: string[];
  display_names?: string[];
  file_date: string;
  form: string;
  file_type?: string;
  sics?: string[];
  biz_locations?: string[];
  adsh?: string;
  file_description?: string;
}

interface EFTSHit {
  _id: string;
  _source: EFTSHitSource;
}

interface EFTSResponse {
  hits: {
    hits: EFTSHit[];
    total: { value: number };
  };
}

// ─── SEC EDGAR Client (via centralized API Gateway) ───────────────────

import { apiGateway, CacheTTL } from '@/lib/api/external-api-gateway';

// SEC Fair Access Policy compliance:
// - https://www.sec.gov/os/webmaster-faq#code-support
// - Max 10 requests/second — gateway enforces 4/sec (250ms)
// - User-Agent MUST include company name and contact email
// - All SEC EDGAR data is public domain and free to use
const SEC_USER_AGENT = 'OmniFolio/1.0 (support@omnifolio.app)';
const SEC_EFTS_BASE = 'https://efts.sec.gov/LATEST';
const SEC_EDGAR_BASE = 'https://data.sec.gov';

/**
 * Fetch from SEC EDGAR via the centralized API gateway.
 * Gateway handles rate limiting, circuit breaking, and exponential backoff.
 */
async function secFetchJSON<T = any>(
  url: string,
  provider: 'sec-edgar' | 'sec-efts',
  cacheKey: string,
  ttl: number,
): Promise<T | null> {
  try {
    const result = await apiGateway.cachedFetch<T>(
      provider,
      cacheKey,
      async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': SEC_USER_AGENT,
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
        });

        if (response.status === 429) {
          throw new Error(`SEC rate limit (429) on ${url}`);
        }

        if (!response.ok) {
          throw new Error(`SEC ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      ttl,
    );

    return result.data;
  } catch (error) {
    console.error(`[IPO] secFetchJSON failed for ${cacheKey}:`, error);
    return null;
  }
}

// ─── SIC codes to EXCLUDE (not real IPOs) ─────────────────────────────

const EXCLUDED_SIC_CODES = new Set([
  '6770', // Blank Checks / SPACs
  '6411', // Insurance Agents & Brokers
  '6311', // Life Insurance
  '6321', // Accident & Health Insurance
  '6331', // Fire, Marine & Casualty Insurance
  '6399', // Insurance Services
]);

// ─── Name patterns that indicate non-IPO registrations ────────────────

const NON_IPO_NAME_PATTERNS = [
  /\betf\b/i,
  /\btrust\b/i,
  /\bfund\b/i,
  /\bacquisition\s+corp/i,
  /\bspac\b/i,
  /\bblank\s+check/i,
  /\bspecial\s+purpose/i,
  /\bholdings?\s+trust/i,
  /\bcapital\s+acquisition/i,
  /\bmerger\s+(sub|corp)/i,
];

// ─── SIC → Sector mapping ────────────────────────────────────────────

const SIC_SECTORS: Record<string, { sector: string; industry: string }> = {
  '7372': { sector: 'Technology', industry: 'Software' },
  '7371': { sector: 'Technology', industry: 'IT Services' },
  '7374': { sector: 'Technology', industry: 'Data Processing' },
  '7370': { sector: 'Technology', industry: 'Computer Services' },
  '3674': { sector: 'Technology', industry: 'Semiconductors' },
  '3672': { sector: 'Technology', industry: 'Circuit Boards' },
  '5045': { sector: 'Technology', industry: 'Computer Hardware' },
  '3577': { sector: 'Technology', industry: 'Computer Peripherals' },
  '3679': { sector: 'Technology', industry: 'Electronic Components' },
  '3669': { sector: 'Technology', industry: 'Communications Equipment' },
  '3661': { sector: 'Technology', industry: 'Communications Equipment' },
  '4813': { sector: 'Technology', industry: 'Telecommunications' },
  '2836': { sector: 'Healthcare', industry: 'Biotechnology' },
  '2835': { sector: 'Healthcare', industry: 'Diagnostics' },
  '2834': { sector: 'Healthcare', industry: 'Pharmaceuticals' },
  '2833': { sector: 'Healthcare', industry: 'Pharmaceuticals' },
  '3841': { sector: 'Healthcare', industry: 'Medical Devices' },
  '3842': { sector: 'Healthcare', industry: 'Medical Devices' },
  '3845': { sector: 'Healthcare', industry: 'Medical Instruments' },
  '8071': { sector: 'Healthcare', industry: 'Health Services' },
  '8049': { sector: 'Healthcare', industry: 'Health Services' },
  '8731': { sector: 'Healthcare', industry: 'R&D Services' },
  '6022': { sector: 'Financial Services', industry: 'Banking' },
  '6020': { sector: 'Financial Services', industry: 'Banking' },
  '6035': { sector: 'Financial Services', industry: 'Savings Institutions' },
  '6199': { sector: 'Financial Services', industry: 'Financial Services' },
  '6211': { sector: 'Financial Services', industry: 'Securities Brokerage' },
  '6153': { sector: 'Financial Services', industry: 'Credit Services' },
  '6163': { sector: 'Financial Services', industry: 'Loan Services' },
  '6726': { sector: 'Financial Services', industry: 'Investment Management' },
  '6798': { sector: 'Financial Services', industry: 'REITs' },
  '6794': { sector: 'Financial Services', industry: 'Patent Owners' },
  '6799': { sector: 'Financial Services', industry: 'Investment Services' },
  '5812': { sector: 'Consumer', industry: 'Restaurants' },
  '5411': { sector: 'Consumer', industry: 'Grocery Stores' },
  '5651': { sector: 'Consumer', industry: 'Retail' },
  '5961': { sector: 'Consumer', industry: 'E-Commerce' },
  '7011': { sector: 'Consumer', industry: 'Hotels & Lodging' },
  '7812': { sector: 'Consumer', industry: 'Entertainment' },
  '7900': { sector: 'Consumer', industry: 'Entertainment' },
  '7941': { sector: 'Consumer', industry: 'Sports & Recreation' },
  '2741': { sector: 'Consumer', industry: 'Publishing' },
  '2510': { sector: 'Consumer', industry: 'Furniture' },
  '2111': { sector: 'Consumer', industry: 'Consumer Goods' },
  '2070': { sector: 'Consumer', industry: 'Food Products' },
  '3949': { sector: 'Consumer', industry: 'Sporting Goods' },
  '3490': { sector: 'Consumer', industry: 'Consumer Products' },
  '1311': { sector: 'Energy', industry: 'Oil & Gas' },
  '1381': { sector: 'Energy', industry: 'Oil & Gas Services' },
  '2911': { sector: 'Energy', industry: 'Petroleum Refining' },
  '4911': { sector: 'Energy', industry: 'Electric Utilities' },
  '4924': { sector: 'Energy', industry: 'Natural Gas' },
  '3714': { sector: 'Industrial', industry: 'Motor Vehicle Parts' },
  '3711': { sector: 'Industrial', industry: 'Motor Vehicles' },
  '3559': { sector: 'Industrial', industry: 'Machinery' },
  '3812': { sector: 'Industrial', industry: 'Aerospace & Defense' },
  '3760': { sector: 'Industrial', industry: 'Aerospace & Defense' },
  '3523': { sector: 'Industrial', industry: 'Farm Machinery' },
  '3690': { sector: 'Industrial', industry: 'Electronic Manufacturing' },
  '3620': { sector: 'Industrial', industry: 'Electrical Equipment' },
  '1000': { sector: 'Materials', industry: 'Mining' },
  '4841': { sector: 'Technology', industry: 'Cable & Media' },
  '8742': { sector: 'Technology', industry: 'IT Consulting' },
  '7389': { sector: 'Technology', industry: 'Business Services' },
  '8090': { sector: 'Healthcare', industry: 'Health Services' },
  '4700': { sector: 'Consumer', industry: 'Travel Services' },
  '6531': { sector: 'Real Estate', industry: 'Real Estate Services' },
  '6500': { sector: 'Real Estate', industry: 'Real Estate' },
};

function getSectorFromSIC(sic: string): { sector: string; industry: string } {
  return SIC_SECTORS[sic] || { sector: 'Other', industry: 'Diversified' };
}

// ─── Parse ticker from EFTS display_name ──────────────────────────────

function parseTickerFromDisplayName(displayName: string): string | null {
  // Format: "Company Name  (TIKR)  (CIK 0001234567)"
  // or: "Company Name  (TIKR, TIKRW)  (CIK 0001234567)"
  const match = displayName.match(/\(([A-Z]{1,5}(?:,\s*[A-Z]{1,6})*)\)\s+\(CIK/);
  if (match) {
    const tickers = match[1].split(',').map(t => t.trim());
    // Return first non-warrant ticker
    for (const t of tickers) {
      if (!t.endsWith('W') && !t.endsWith('WS') && !t.endsWith('R') && !t.endsWith('U')) {
        return t;
      }
    }
    return tickers[0] || null;
  }
  return null;
}

function parseCompanyNameFromDisplayName(displayName: string): string {
  return displayName
    .replace(/\s+\([A-Z0-9,\s]+\)\s+\(CIK\s+\d+\)$/i, '')
    .replace(/\s+\(CIK\s+\d+\)$/i, '')
    .trim();
}

// ─── Fetch IPO filings from SEC EDGAR ─────────────────────────────────

/**
 * Search EFTS for S-1/F-1 primary filing documents in a date range.
 * Returns deduplicated company-level results with smart filtering.
 */
export async function fetchIPOFilings(
  startDate: string,
  endDate: string,
  maxResults = 200,
): Promise<ProprietaryIPO[]> {
  const allIPOs: ProprietaryIPO[] = [];
  const seenCIKs = new Set<string>();

  const formTypes = ['S-1', 'S-1/A', 'F-1', 'F-1/A', '424B4'];

  for (const formType of formTypes) {
    try {
      const url = `${SEC_EFTS_BASE}/search-index?q=&forms=${encodeURIComponent(formType)}&dateRange=custom&startdt=${startDate}&enddt=${endDate}&from=0&size=${maxResults}`;

      const cacheKey = `ipo-efts:${formType}:${startDate}:${endDate}`;
      const data = await secFetchJSON<EFTSResponse>(url, 'sec-efts', cacheKey, CacheTTL.SEC_IPO_FILINGS);
      if (!data?.hits?.hits?.length) continue;

      for (const hit of data.hits.hits) {
        const src = hit._source;

        // Only primary documents (skip exhibits like EX-4.1, EX-10.9, etc.)
        const fileType = src.file_type || '';
        const isPrimary = fileType === 'S-1' || fileType === 'S-1/A' ||
          fileType === 'F-1' || fileType === 'F-1/A' || fileType === '424B4';
        if (!isPrimary) continue;

        // Need CIK for deduplication
        const cik = src.ciks?.[0];
        if (!cik) continue;

        // Dedup — update status if newer form found
        if (seenCIKs.has(cik)) {
          const existing = allIPOs.find(ipo => ipo.cik === cik);
          if (existing) {
            if (formType === '424B4' && existing.status !== 'priced') {
              existing.status = 'priced';
              existing.filingType = formType;
            } else if ((formType === 'S-1/A' || formType === 'F-1/A') && existing.status === 'filed') {
              existing.status = 'expected';
              existing.filingType = formType;
              const d = new Date(src.file_date);
              d.setDate(d.getDate() + 28);
              existing.expectedDate = d.toISOString().split('T')[0];
            }
          }
          continue;
        }

        // Exclude bad SIC codes
        const sic = src.sics?.[0] || '';
        if (EXCLUDED_SIC_CODES.has(sic)) continue;

        // Exclude by name pattern
        const displayName = src.display_names?.[0] || '';
        const companyName = parseCompanyNameFromDisplayName(displayName);
        if (!companyName || companyName.length < 2) continue;
        if (NON_IPO_NAME_PATTERNS.some(pat => pat.test(companyName))) continue;

        // Extract ticker
        const ticker = parseTickerFromDisplayName(displayName);

        // Determine status
        let status: IPOStatus = 'filed';
        if (formType === '424B4') status = 'priced';
        else if (formType.includes('/A')) status = 'expected';

        // Estimate expected date
        let expectedDate: string | null = null;
        const filingDate = new Date(src.file_date);
        if (formType === '424B4') {
          const d = new Date(filingDate);
          d.setDate(d.getDate() + 2);
          expectedDate = d.toISOString().split('T')[0];
        } else if (formType.includes('/A')) {
          const d = new Date(filingDate);
          d.setDate(d.getDate() + 28);
          expectedDate = d.toISOString().split('T')[0];
        } else {
          const d = new Date(filingDate);
          d.setMonth(d.getMonth() + 3);
          expectedDate = d.toISOString().split('T')[0];
        }

        // Sector from SIC
        const sectorInfo = sic ? getSectorFromSIC(sic) : { sector: null, industry: null };

        // Location → country hint
        const location = src.biz_locations?.[0] || '';
        const foreignKeywords = ['London', 'Singapore', 'Toronto', 'Hong Kong', 'George Town', 'Grand Cayman', 'Shanghai', 'Beijing'];
        const isForeign = foreignKeywords.some(k => location.includes(k));

        // SEC filing URL
        const accession = src.adsh;
        const secFilingUrl = accession
          ? `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accession.replace(/-/g, '')}/${accession}-index.htm`
          : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${encodeURIComponent(formType)}&dateb=&owner=include&count=10`;

        const id = `sec-${cik}-${src.file_date}`.toLowerCase();

        seenCIKs.add(cik);
        allIPOs.push({
          id,
          companyName,
          symbol: ticker,
          exchange: null,
          filingDate: src.file_date,
          expectedDate,
          priceRangeLow: null,
          priceRangeHigh: null,
          offerPrice: null,
          sharesOffered: null,
          dealSize: null,
          status,
          filingType: formType,
          sector: sectorInfo.sector,
          industry: sectorInfo.industry,
          leadUnderwriters: null,
          description: null,
          secFilingUrl,
          cik,
          country: isForeign ? 'INTL' : 'US',
          source: 'sec-edgar',
        });
      }
    } catch (error) {
      console.error(`[IPO] Error fetching form ${formType}:`, error);
    }
  }

  return allIPOs;
}

// ─── Enrich via SEC Submissions API ───────────────────────────────────

interface SubmissionsData {
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  category: string;
  entityType: string;
  stateOfIncorporation: string;
  description?: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      primaryDocument: string[];
      accessionNumber: string[];
    };
  };
}

/**
 * Enrich IPO entries with data from the submissions API.
 * Also filters out companies that are clearly already public
 * (they have 10-K/10-Q reports before their S-1 filing).
 */
export async function enrichAndFilterIPOs(
  ipos: ProprietaryIPO[],
  maxEnrich: number = 50,
): Promise<ProprietaryIPO[]> {
  const enriched: ProprietaryIPO[] = [];

  // Prioritize recent filings
  const sorted = [...ipos].sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  let enrichCount = 0;
  for (const ipo of sorted) {
    if (enrichCount >= maxEnrich || !ipo.cik) {
      enriched.push(ipo);
      continue;
    }

    try {
      const paddedCIK = ipo.cik.padStart(10, '0');
      const url = `${SEC_EDGAR_BASE}/submissions/CIK${paddedCIK}.json`;
      const cacheKey = `ipo-submissions:${paddedCIK}`;
      const data = await secFetchJSON<SubmissionsData>(url, 'sec-edgar', cacheKey, CacheTTL.SEC_COMPANY_PROFILE);
      enrichCount++;

      if (!data) {
        enriched.push(ipo);
        continue;
      }

      // Check if already public (has 10-K/10-Q before the S-1 filing)
      const forms = data.filings?.recent?.form || [];
      const dates = data.filings?.recent?.filingDate || [];

      // Find earliest S-1/F-1 filing
      let earliestIPOFiling = ipo.filingDate;
      forms.forEach((f, i) => {
        if ((f === 'S-1' || f === 'F-1') && dates[i] && dates[i] < earliestIPOFiling) {
          earliestIPOFiling = dates[i];
        }
      });

      // If they had 10-K or 10-Q BEFORE their first S-1, skip — secondary offering
      let isSecondaryOffering = false;
      forms.forEach((f, i) => {
        if ((f === '10-K' || f === '10-Q') && dates[i] && dates[i] < earliestIPOFiling) {
          isSecondaryOffering = true;
        }
      });

      if (isSecondaryOffering) continue;

      // Also check for SPAC-like SICs from the submissions data
      if (data.sic && EXCLUDED_SIC_CODES.has(data.sic)) continue;

      // Enrich
      const updated = { ...ipo };
      if (data.tickers?.length && !updated.symbol) {
        updated.symbol = data.tickers[0];
      }
      if (data.exchanges?.length) {
        updated.exchange = data.exchanges[0];
      }
      if (data.sic) {
        const info = getSectorFromSIC(data.sic);
        updated.sector = info.sector;
        updated.industry = info.industry;
      }
      if (data.name && data.name.length > 1) {
        updated.companyName = data.name;
      }
      if (data.sicDescription) {
        updated.description = data.sicDescription;
      }

      // Check for 424B4 (priced prospectus) — indicates IPO was priced
      const has424B4 = forms.some((f, i) => f === '424B4' && dates[i] >= earliestIPOFiling);
      if (has424B4 && updated.status !== 'priced') {
        updated.status = 'priced';
      }

      // Check for S-1/A (amended) — indicates expected
      const hasAmendment = forms.some((f, i) =>
        (f === 'S-1/A' || f === 'F-1/A') && dates[i] >= earliestIPOFiling
      );
      if (hasAmendment && updated.status === 'filed') {
        updated.status = 'expected';
        // Update expected date based on latest amendment
        let latestAmendmentIdx = -1;
        for (let idx = forms.length - 1; idx >= 0; idx--) {
          const f = forms[idx];
          if ((f === 'S-1/A' || f === 'F-1/A') && dates[idx] >= earliestIPOFiling) {
            latestAmendmentIdx = idx;
            break;
          }
        }
        if (latestAmendmentIdx >= 0) {
          const d = new Date(dates[latestAmendmentIdx]);
          d.setDate(d.getDate() + 21); // IPOs typically price ~3 weeks after last amendment
          updated.expectedDate = d.toISOString().split('T')[0];
        }
      }

      // Check for RW (withdrawal) filings
      const hasWithdrawal = forms.some(f => f === 'RW' || f === 'RW/A');
      if (hasWithdrawal) {
        updated.status = 'withdrawn';
      }

      enriched.push(updated);
    } catch (error) {
      console.error(`[IPO] Enrich error CIK ${ipo.cik}:`, error);
      enriched.push(ipo);
    }
  }

  return enriched;
}
