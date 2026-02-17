/**
 * OmniFolio Earnings Data Library
 *
 * Proprietary earnings calendar data sourced from SEC EDGAR public data.
 *
 * Strategy:
 * ─────────
 * 1. Search SEC EDGAR EFTS for 8-K filings with "Results of Operations" (Item 2.02)
 *    — these are the earnings announcements companies file with the SEC
 * 2. Search for 10-Q (quarterly) and 10-K (annual) filings for scheduled reports
 * 3. Deduplicate by CIK to get one entry per company per quarter
 * 4. Extract ticker & company name from display_names
 * 5. Enrich top candidates via SEC submissions API for sector/exchange info
 * 6. Cross-reference filing dates to infer report timing (BMO/AMC)
 *
 * All data is publicly available under SEC's fair access policy.
 * User-Agent header required per SEC guidelines.
 *
 * Copyright OmniFolio. All rights reserved.
 */

// ─── Types ────────────────────────────────────────────────────────────

export type EarningsReportTime = 'bmo' | 'amc' | 'dmh' | 'unknown';

export interface ProprietaryEarnings {
  id: string;
  companyName: string;
  symbol: string | null;
  exchange: string | null;
  reportDate: string;
  reportTime: EarningsReportTime;
  fiscalQuarter: string | null;     // "Q1", "Q2", "Q3", "Q4"
  fiscalYear: number | null;
  filingType: string;               // "8-K", "10-Q", "10-K", "10-Q/A", "10-K/A"
  sector: string | null;
  industry: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  surprisePercent: number | null;
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

// ─── SEC EDGAR Client ─────────────────────────────────────────────────

// SEC Fair Access Policy compliance:
// - https://www.sec.gov/os/webmaster-faq#code-support
// - Max 10 requests/second — we use 4/sec (250ms) to be well under the limit
// - User-Agent MUST include company name and contact email
// - All SEC EDGAR data is public domain and free to use
const SEC_USER_AGENT = 'OmniFolio/1.0 (support@omnifolio.app)';
const SEC_EFTS_BASE = 'https://efts.sec.gov/LATEST';
const SEC_EDGAR_BASE = 'https://data.sec.gov';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 250; // 4 req/sec — well under SEC's 10/s limit
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

async function secThrottle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const backoff = consecutiveErrors > 0
    ? Math.min(MIN_REQUEST_INTERVAL * Math.pow(2, consecutiveErrors), 10000)
    : MIN_REQUEST_INTERVAL;
  if (elapsed < backoff) {
    await new Promise(resolve => setTimeout(resolve, backoff - elapsed));
  }
  lastRequestTime = Date.now();
}

async function secFetch(url: string): Promise<Response> {
  await secThrottle();

  const response = await fetch(url, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
  });

  if (response.status === 429) {
    consecutiveErrors++;
    console.warn(`[SEC] Rate limited (429). Backing off ${Math.pow(2, consecutiveErrors)}x...`);
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      throw new Error('SEC rate limit exceeded — aborting to comply with fair access policy');
    }
    await new Promise(resolve => setTimeout(resolve, 5000 * consecutiveErrors));
    return secFetch(url);
  }

  if (response.ok) {
    consecutiveErrors = 0;
  }

  return response;
}

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
  const match = displayName.match(/\(([A-Z]{1,5}(?:,\s*[A-Z]{1,6})*)\)\s+\(CIK/);
  if (match) {
    const tickers = match[1].split(',').map(t => t.trim());
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

// ─── SIC codes to EXCLUDE (not real companies with earnings) ──────────

const EXCLUDED_SIC_CODES = new Set([
  '6770', // Blank Checks / SPACs
  '6726', // Investment Management (mutual funds)
]);

// ─── Name patterns to exclude ────────────────────────────────────────

const EXCLUDED_NAME_PATTERNS = [
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

// ─── Infer fiscal quarter from filing date ───────────────────────────

function inferFiscalQuarter(filingDate: string, formType: string): { quarter: string | null; year: number | null } {
  const d = new Date(filingDate);
  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();

  if (formType === '10-K' || formType === '10-K/A') {
    // 10-K is annual — report for the fiscal year, typically filed 60-90 days after FY end
    // Most companies have Dec FY end, filed in Feb-Mar
    return { quarter: 'FY', year: month <= 2 ? year - 1 : year };
  }

  // 10-Q covers the prior quarter, typically filed 40-45 days after quarter end
  // Jan-Mar filings → Q4 (Oct-Dec) of prior year or Q3 (Jul-Sep)
  // Apr-Jun filings → Q1 (Jan-Mar) of current year
  // Jul-Sep filings → Q2 (Apr-Jun) of current year
  // Oct-Dec filings → Q3 (Jul-Sep) of current year
  if (month >= 0 && month <= 2) {
    // Jan-Mar: likely Q3 or Q4 of prior year
    return { quarter: 'Q4', year: year - 1 };
  } else if (month >= 3 && month <= 5) {
    // Apr-Jun: Q1 current year
    return { quarter: 'Q1', year };
  } else if (month >= 6 && month <= 8) {
    // Jul-Sep: Q2 current year
    return { quarter: 'Q2', year };
  } else {
    // Oct-Dec: Q3 current year
    return { quarter: 'Q3', year };
  }
}

// ─── Infer report time from filing metadata ──────────────────────────

function inferReportTime(filingDate: string): EarningsReportTime {
  // SEC filings with timestamps: if filed early AM → likely BMO, PM → AMC
  // Without time data, default to unknown
  return 'unknown';
}

// ─── Fetch earnings filings from SEC EDGAR ────────────────────────────

/**
 * Search EFTS for 10-Q, 10-K, and 8-K (Item 2.02) filings in a date range.
 * 8-K Item 2.02 = "Results of Operations and Financial Condition" = earnings announcement.
 * 10-Q/10-K = the actual quarterly/annual report filings.
 *
 * Returns deduplicated company-level results with smart filtering.
 */
export async function fetchEarningsFilings(
  startDate: string,
  endDate: string,
  maxResults = 400,
): Promise<ProprietaryEarnings[]> {
  const allEarnings: ProprietaryEarnings[] = [];
  const seenKeys = new Set<string>(); // CIK+quarter dedup key

  // 8-K with Item 2.02 is the primary earnings announcement form
  // 10-Q and 10-K are the detailed quarterly/annual reports
  const formTypes = ['8-K', '10-Q', '10-K', '10-Q/A', '10-K/A'];

  for (const formType of formTypes) {
    try {
      // For 8-K, search specifically for "Results of Operations" to get earnings-related 8-Ks
      const queryText = formType === '8-K' ? '"Results of Operations"' : '';

      const url = `${SEC_EFTS_BASE}/search-index?q=${encodeURIComponent(queryText)}&forms=${encodeURIComponent(formType)}&dateRange=custom&startdt=${startDate}&enddt=${endDate}&from=0&size=${maxResults}`;

      const response = await secFetch(url);
      if (!response.ok) {
        console.error(`[Earnings] EFTS ${formType} error: ${response.status}`);
        continue;
      }

      const data: EFTSResponse = await response.json();
      if (!data.hits?.hits?.length) continue;

      for (const hit of data.hits.hits) {
        const src = hit._source;

        // Only primary documents
        const fileType = src.file_type || src.form || '';
        const isPrimary =
          fileType === '8-K' || fileType === '10-Q' || fileType === '10-K' ||
          fileType === '10-Q/A' || fileType === '10-K/A';
        if (!isPrimary && formType !== '8-K') continue;

        // Need CIK for deduplication
        const cik = src.ciks?.[0];
        if (!cik) continue;

        // Exclude bad SIC codes
        const sic = src.sics?.[0] || '';
        if (EXCLUDED_SIC_CODES.has(sic)) continue;

        // Extract company info
        const displayName = src.display_names?.[0] || '';
        const companyName = parseCompanyNameFromDisplayName(displayName);
        if (!companyName || companyName.length < 2) continue;
        if (EXCLUDED_NAME_PATTERNS.some(pat => pat.test(companyName))) continue;

        // Extract ticker
        const ticker = parseTickerFromDisplayName(displayName);

        // Infer fiscal quarter
        const { quarter, year } = inferFiscalQuarter(src.file_date, formType);
        const dedupKey = `${cik}-${quarter}-${year}`;

        // Dedup by CIK + quarter — prefer 8-K (earliest announcement), then 10-Q/10-K
        if (seenKeys.has(dedupKey)) {
          // If we already have this company+quarter, skip unless this is a more specific form
          const existing = allEarnings.find(e => e.id === dedupKey);
          if (existing) {
            // 8-K takes precedence as the actual earnings announcement date
            if (formType === '8-K' && existing.filingType !== '8-K') {
              existing.reportDate = src.file_date;
              existing.filingType = '8-K';
            }
          }
          continue;
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

        seenKeys.add(dedupKey);
        allEarnings.push({
          id: dedupKey,
          companyName,
          symbol: ticker,
          exchange: null,
          reportDate: src.file_date,
          reportTime: inferReportTime(src.file_date),
          fiscalQuarter: quarter,
          fiscalYear: year,
          filingType: formType,
          sector: sectorInfo.sector,
          industry: sectorInfo.industry,
          epsEstimate: null,
          epsActual: null,
          revenueEstimate: null,
          revenueActual: null,
          surprisePercent: null,
          secFilingUrl,
          cik,
          country: isForeign ? 'INTL' : 'US',
          source: 'sec-edgar',
        });
      }
    } catch (error) {
      console.error(`[Earnings] Error fetching form ${formType}:`, error);
    }
  }

  return allEarnings;
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
 * Enrich earnings entries with company data from the SEC submissions API.
 * Adds ticker, exchange, sector info, and validates the filing is a real
 * operating company (not a shell/fund).
 */
export async function enrichEarnings(
  earnings: ProprietaryEarnings[],
  maxEnrich: number = 75,
): Promise<ProprietaryEarnings[]> {
  const enriched: ProprietaryEarnings[] = [];

  // Prioritize companies with tickers (more likely to be well-known)
  const sorted = [...earnings].sort((a, b) => {
    if (a.symbol && !b.symbol) return -1;
    if (!a.symbol && b.symbol) return 1;
    return b.reportDate.localeCompare(a.reportDate);
  });

  let enrichCount = 0;
  for (const earning of sorted) {
    if (enrichCount >= maxEnrich || !earning.cik) {
      enriched.push(earning);
      continue;
    }

    try {
      const paddedCIK = earning.cik.padStart(10, '0');
      const url = `${SEC_EDGAR_BASE}/submissions/CIK${paddedCIK}.json`;
      const response = await secFetch(url);
      enrichCount++;

      if (!response.ok) {
        enriched.push(earning);
        continue;
      }

      const data: SubmissionsData = await response.json();

      // Skip shell companies / funds
      if (data.sic && EXCLUDED_SIC_CODES.has(data.sic)) continue;
      if (data.entityType === 'operating' || !data.entityType) {
        // Good — operating company
      }

      // Enrich
      const updated = { ...earning };
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

      enriched.push(updated);
    } catch (error) {
      console.error(`[Earnings] Enrich error CIK ${earning.cik}:`, error);
      enriched.push(earning);
    }
  }

  return enriched;
}

// ─── Upcoming Earnings Estimator ──────────────────────────────────────

/**
 * For companies that have historically filed 10-Q/10-K on a regular schedule,
 * estimate when their next earnings report will be filed.
 *
 * Uses the SEC submissions API to look at past filing patterns.
 */
export async function estimateUpcomingEarnings(
  ciks: string[],
  maxEstimate: number = 50,
): Promise<ProprietaryEarnings[]> {
  const upcoming: ProprietaryEarnings[] = [];
  const now = new Date();
  const nowStr = now.toISOString().split('T')[0];

  let count = 0;
  for (const cik of ciks) {
    if (count >= maxEstimate) break;

    try {
      const paddedCIK = cik.padStart(10, '0');
      const url = `${SEC_EDGAR_BASE}/submissions/CIK${paddedCIK}.json`;
      const response = await secFetch(url);
      count++;

      if (!response.ok) continue;

      const data: SubmissionsData = await response.json();
      if (!data.filings?.recent?.form?.length) continue;

      const forms = data.filings.recent.form;
      const dates = data.filings.recent.filingDate;

      // Find the last 4 10-Q filings to establish a pattern
      const tenQDates: Date[] = [];
      for (let i = 0; i < forms.length && tenQDates.length < 8; i++) {
        if (forms[i] === '10-Q' && dates[i]) {
          tenQDates.push(new Date(dates[i]));
        }
      }

      if (tenQDates.length < 2) continue;

      // Calculate average days between filings
      const intervals: number[] = [];
      for (let i = 0; i < tenQDates.length - 1; i++) {
        const diff = tenQDates[i].getTime() - tenQDates[i + 1].getTime();
        intervals.push(Math.abs(diff) / (1000 * 60 * 60 * 24));
      }
      const avgInterval = intervals.reduce((sum, d) => sum + d, 0) / intervals.length;

      // Estimate next filing date
      const lastFiling = tenQDates[0];
      const nextEstimated = new Date(lastFiling.getTime() + avgInterval * 24 * 60 * 60 * 1000);

      // Only include if estimated date is in the future (within next 90 days)
      const nextStr = nextEstimated.toISOString().split('T')[0];
      const ninetyDaysOut = new Date(now);
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);

      if (nextEstimated > now && nextEstimated <= ninetyDaysOut) {
        const ticker = data.tickers?.[0] || null;
        const sectorInfo = data.sic ? getSectorFromSIC(data.sic) : { sector: null, industry: null };
        const { quarter, year } = inferFiscalQuarter(nextStr, '10-Q');

        upcoming.push({
          id: `est-${cik}-${nextStr}`,
          companyName: data.name || `CIK ${cik}`,
          symbol: ticker,
          exchange: data.exchanges?.[0] || null,
          reportDate: nextStr,
          reportTime: 'unknown',
          fiscalQuarter: quarter,
          fiscalYear: year,
          filingType: 'estimated',
          sector: sectorInfo.sector,
          industry: sectorInfo.industry,
          epsEstimate: null,
          epsActual: null,
          revenueEstimate: null,
          revenueActual: null,
          surprisePercent: null,
          secFilingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-Q&dateb=&owner=include&count=10`,
          cik,
          country: 'US',
          source: 'sec-edgar-estimated',
        });
      }
    } catch (error) {
      console.error(`[Earnings] Estimate error CIK ${cik}:`, error);
    }
  }

  return upcoming;
}
