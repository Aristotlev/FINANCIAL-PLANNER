/**
 * SEC EDGAR API Integration
 * Access SEC filings, company data, and financial information
 * API Documentation: https://www.sec.gov/developer
 * 
 * Features:
 * - Real-time RSS feed monitoring for new filings
 * - CIK (Central Index Key) to ticker mapping
 * - 10-K, 10-Q, 8-K, Form 4, 13F parsing
 * - XBRL financial data extraction
 * - Rate limiting (SEC limit: ~10 requests/second)
 * - Text extraction for risk factors, MD&A, etc.
 */

import { XMLParser } from 'fast-xml-parser';

// ==================== TYPES & INTERFACES ====================

export interface SECCredentials {
  userAgent: string; // Required by SEC: "Company Name admin@company.com"
}

export interface CompanyCIKMapping {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
  primaryDocumentUrl: string;
  filingDetailUrl: string;
  size: number;
  cik: string;
  ticker?: string;
  companyName: string;
}

export interface SECFilingDetail extends SECFiling {
  acceptanceDateTime: string;
  reportDate?: string;
  act?: string;
  fileNumber?: string;
  filmNumber?: string;
  items?: string; // For 8-K items
  documents: SECDocument[];
}

export interface SECDocument {
  sequence: string;
  description: string;
  documentUrl: string;
  type: string;
  size: number;
}

export interface SECRSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  enclosure?: {
    url: string;
    type: string;
    length: number;
  };
}

export interface Form4Transaction {
  securityTitle: string;
  transactionDate: string;
  transactionCode: string; // P=Purchase, S=Sale, A=Award, etc.
  sharesAmount: number;
  pricePerShare?: number;
  sharesOwnedAfter: number;
  directOrIndirect: 'D' | 'I';
  isAcquisition: boolean;
}

export interface Form4Filing {
  issuerCik: string;
  issuerName: string;
  issuerTicker?: string;
  reportingOwner: {
    cik: string;
    name: string;
    isDirector: boolean;
    isOfficer: boolean;
    officerTitle?: string;
    isTenPercentOwner: boolean;
  };
  transactions: Form4Transaction[];
  filingDate: string;
  accessionNumber: string;
}

export interface Filing13F {
  cik: string;
  managerName: string;
  reportDate: string;
  filingDate: string;
  holdings: Holding13F[];
  totalValue: number;
}

export interface Holding13F {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number; // In thousands
  shares: number;
  shareType: 'SH' | 'PRN';
  investmentDiscretion: 'SOLE' | 'SHARED' | 'NONE';
  votingAuthority: {
    sole: number;
    shared: number;
    none: number;
  };
}

export interface XBRLFinancials {
  // Income Statement
  revenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  operatingExpenses?: number;
  operatingIncome?: number;
  netIncome?: number;
  earningsPerShareBasic?: number;
  earningsPerShareDiluted?: number;
  
  // Balance Sheet
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  cash?: number;
  shortTermInvestments?: number;
  accountsReceivable?: number;
  inventory?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  longTermDebt?: number;
  
  // Cash Flow
  operatingCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  freeCashFlow?: number;
  capitalExpenditures?: number;
  dividendsPaid?: number;
  
  // Metadata
  periodEndDate?: string;
  fiscalYear?: string;
  fiscalPeriod?: string;
  documentType?: string;
  
  // Raw data for additional analysis
  rawTags?: Record<string, number | string>;
}

export interface FilingTextSection {
  sectionName: string;
  sectionNumber?: string;
  content: string;
  wordCount: number;
}

export type FilingType = '10-K' | '10-Q' | '8-K' | '4' | '13F-HR' | '13F-NT' | 'DEF 14A' | 'S-1' | 'DEFA14A';

// ==================== RATE LIMITER ====================

class SECRateLimiter {
  private queue: Array<{ resolve: () => void; timestamp: number }> = [];
  private lastRequestTime = 0;
  private readonly minInterval: number; // milliseconds between requests

  constructor(requestsPerSecond: number = 8) {
    // SEC allows ~10 req/sec, we use 8 to be safe
    this.minInterval = 1000 / requestsPerSecond;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      const delay = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
}

// ==================== CIK MAPPING CACHE ====================

interface CIKCache {
  data: Map<string, CompanyCIKMapping>;
  lastUpdated: number;
}

const cikCache: CIKCache = {
  data: new Map(),
  lastUpdated: 0,
};

// ==================== SEC EDGAR API CLASS ====================

export class SECEdgarAPI {
  private readonly baseUrl: string = 'https://www.sec.gov';
  private readonly dataUrl: string = 'https://data.sec.gov';
  private readonly eftsUrl: string = 'https://efts.sec.gov';
  private readonly credentials: SECCredentials;
  private readonly rateLimiter: SECRateLimiter;
  private readonly xmlParser: XMLParser;

  constructor(credentials: SECCredentials) {
    this.credentials = credentials;
    this.rateLimiter = new SECRateLimiter(8);
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });
  }

  // ==================== CORE REQUEST METHOD ====================

  private async request<T>(
    url: string, 
    options: { parseXML?: boolean; parseJSON?: boolean } = { parseJSON: true }
  ): Promise<T> {
    await this.rateLimiter.throttle();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.credentials.userAgent,
          'Accept-Encoding': 'gzip, deflate',
          'Host': new URL(url).hostname,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          console.warn('[SEC] Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          return this.request(url, options);
        }
        throw new Error(`SEC API error (${response.status}): ${response.statusText}`);
      }

      const text = await response.text();

      if (options.parseXML) {
        return this.xmlParser.parse(text) as T;
      } else if (options.parseJSON) {
        return JSON.parse(text) as T;
      }
      
      return text as unknown as T;
    } catch (error) {
      console.error(`[SEC] Request failed for ${url}:`, error);
      throw error;
    }
  }

  // ==================== CIK MAPPING ====================

  /**
   * Load company ticker to CIK mapping from SEC
   * This file maps all US public company tickers to their CIK numbers
   */
  async loadCIKMapping(): Promise<Map<string, CompanyCIKMapping>> {
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    
    if (cikCache.data.size > 0 && Date.now() - cikCache.lastUpdated < CACHE_DURATION) {
      return cikCache.data;
    }

    const url = `${this.baseUrl}/files/company_tickers.json`;
    
    const data = await this.request<Record<string, { cik_str: number; ticker: string; title: string }>>(url);
    
    cikCache.data.clear();
    
    Object.values(data).forEach(company => {
      const cik = String(company.cik_str).padStart(10, '0');
      const ticker = company.ticker.toUpperCase();
      
      cikCache.data.set(ticker, {
        cik,
        ticker,
        name: company.title,
      });
    });
    
    cikCache.lastUpdated = Date.now();
    console.log(`[SEC] Loaded ${cikCache.data.size} CIK mappings`);
    
    return cikCache.data;
  }

  /**
   * Get CIK for a ticker symbol
   */
  async getCIKByTicker(ticker: string): Promise<CompanyCIKMapping | null> {
    const mapping = await this.loadCIKMapping();
    return mapping.get(ticker.toUpperCase()) || null;
  }

  /**
   * Get ticker for a CIK
   */
  async getTickerByCIK(cik: string): Promise<CompanyCIKMapping | null> {
    const mapping = await this.loadCIKMapping();
    const normalizedCIK = cik.padStart(10, '0');
    
    for (const company of mapping.values()) {
      if (company.cik === normalizedCIK) {
        return company;
      }
    }
    return null;
  }

  /**
   * Search companies by name or ticker
   */
  async searchCompanies(query: string, limit: number = 10): Promise<CompanyCIKMapping[]> {
    const mapping = await this.loadCIKMapping();
    const results: CompanyCIKMapping[] = [];
    const queryLower = query.toLowerCase();
    
    for (const company of mapping.values()) {
      if (
        company.ticker.toLowerCase().includes(queryLower) ||
        company.name.toLowerCase().includes(queryLower)
      ) {
        results.push(company);
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }

  // ==================== RSS FEED ====================

  /**
   * Get latest filings from SEC RSS feed
   * Use this for real-time monitoring of new filings
   */
  async getLatestFilings(formType?: FilingType): Promise<SECRSSItem[]> {
    let url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcurrent&type=`;
    
    if (formType) {
      url += encodeURIComponent(formType);
    }
    
    url += '&company=&dateb=&owner=include&count=40&output=atom';
    
    const data = await this.request<any>(url, { parseXML: true });
    
    const entries = data?.feed?.entry || [];
    const items: SECRSSItem[] = [];
    
    (Array.isArray(entries) ? entries : [entries]).forEach((entry: any) => {
      if (entry) {
        items.push({
          title: entry.title?.['#text'] || entry.title || '',
          link: entry.link?.['@_href'] || '',
          description: entry.summary?.['#text'] || entry.summary || '',
          pubDate: entry.updated || entry.published || '',
        });
      }
    });
    
    return items;
  }

  /**
   * Get RSS feed for a specific company
   */
  async getCompanyFilingsFeed(cik: string): Promise<SECRSSItem[]> {
    const normalizedCIK = cik.replace(/^0+/, '');
    const url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcompany&CIK=${normalizedCIK}&type=&dateb=&owner=include&count=40&output=atom`;
    
    const data = await this.request<any>(url, { parseXML: true });
    
    const entries = data?.feed?.entry || [];
    const items: SECRSSItem[] = [];
    
    (Array.isArray(entries) ? entries : [entries]).forEach((entry: any) => {
      if (entry) {
        items.push({
          title: entry.title?.['#text'] || entry.title || '',
          link: entry.link?.['@_href'] || '',
          description: entry.summary?.['#text'] || entry.summary || '',
          pubDate: entry.updated || entry.published || '',
        });
      }
    });
    
    return items;
  }

  // ==================== COMPANY FILINGS ====================

  /**
   * Get company filings from SEC Data API
   */
  async getCompanyFilings(
    cik: string, 
    formTypes?: FilingType[]
  ): Promise<SECFiling[]> {
    const normalizedCIK = cik.padStart(10, '0');
    const url = `${this.dataUrl}/submissions/CIK${normalizedCIK}.json`;
    
    const data = await this.request<any>(url);
    
    const filings: SECFiling[] = [];
    const recentFilings = data.filings?.recent;
    
    if (!recentFilings) return filings;
    
    const count = recentFilings.accessionNumber?.length || 0;
    const directoryCIK = String(data.cik).replace(/^0+/, '');
    
    for (let i = 0; i < count; i++) {
      const form = recentFilings.form[i];
      
      // Filter by form type if specified
      if (formTypes && !formTypes.includes(form as FilingType)) {
        continue;
      }
      
      const accessionNumber = recentFilings.accessionNumber[i];
      const accessionPath = accessionNumber.replace(/-/g, '');
      
      filings.push({
        accessionNumber,
        filingDate: recentFilings.filingDate[i],
        form,
        primaryDocument: recentFilings.primaryDocument[i],
        primaryDocumentUrl: `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${recentFilings.primaryDocument[i]}`,
        filingDetailUrl: `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${accessionNumber}-index.htm`,
        size: recentFilings.size[i],
        cik: normalizedCIK,
        ticker: data.tickers?.[0],
        companyName: data.name,
      });
    }
    
    return filings;
  }

  /**
   * Get filing detail including all documents
   */
  async getFilingDetail(cik: string, accessionNumber: string): Promise<SECFilingDetail | null> {
    const normalizedCIK = cik.padStart(10, '0');
    const directoryCIK = cik.replace(/^0+/, '');
    const accessionPath = accessionNumber.replace(/-/g, '');
    
    // First, try to get filing info from the submissions API (more reliable)
    try {
      const submissionsUrl = `${this.dataUrl}/submissions/CIK${normalizedCIK}.json`;
      const submissionsData = await this.request<any>(submissionsUrl);
      const companyName = submissionsData.name || '';
      const ticker = submissionsData.tickers?.[0] || '';
      
      // Find the filing in recent filings
      const recentFilings = submissionsData.filings?.recent;
      if (recentFilings) {
        const idx = recentFilings.accessionNumber?.indexOf(accessionNumber);
        if (idx !== -1 && idx !== undefined) {
          // Try to get documents from index.json if available
          let documents: SECDocument[] = [];
          try {
            const indexUrl = `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${accessionNumber}-index.json`;
            const indexData = await this.request<any>(indexUrl);
            documents = indexData.directory?.item?.map((item: any) => ({
              sequence: item.sequence || '',
              description: item.description || item.name,
              documentUrl: `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${item.name}`,
              type: item.type || '',
              size: item.size || 0,
            })) || [];
          } catch {
            // index.json not available, that's fine
          }
          
          return {
            accessionNumber,
            filingDate: recentFilings.filingDate[idx],
            form: recentFilings.form[idx],
            primaryDocument: recentFilings.primaryDocument[idx],
            primaryDocumentUrl: `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${recentFilings.primaryDocument[idx]}`,
            filingDetailUrl: `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${accessionNumber}-index.htm`,
            size: recentFilings.size[idx],
            cik: normalizedCIK,
            ticker,
            companyName,
            acceptanceDateTime: recentFilings.filingDate[idx],
            documents,
          };
        }
      }
      
      // Not found in recent filings
      console.warn(`[SEC] Filing ${accessionNumber} not found in recent filings for CIK ${cik}`);
      return null;
    } catch (error) {
      console.error(`[SEC] Failed to get filing detail:`, error);
      return null;
    }
  }

  // ==================== XBRL FINANCIAL DATA ====================

  /**
   * Get XBRL financial facts for a company
   * This provides structured financial data from 10-K and 10-Q filings
   */
  async getCompanyFacts(cik: string): Promise<any> {
    const normalizedCIK = cik.padStart(10, '0');
    const url = `${this.dataUrl}/api/xbrl/companyfacts/CIK${normalizedCIK}.json`;
    
    return this.request<any>(url);
  }

  /**
   * Extract key financials from company facts
   */
  async getFinancials(cik: string): Promise<XBRLFinancials[]> {
    const facts = await this.getCompanyFacts(cik);
    const financials: XBRLFinancials[] = [];
    
    const usGaap = facts?.facts?.['us-gaap'];
    if (!usGaap) return financials;
    
    // Map of XBRL tags to our field names
    const tagMapping: Record<string, keyof XBRLFinancials> = {
      'Revenues': 'revenue',
      'RevenueFromContractWithCustomerExcludingAssessedTax': 'revenue',
      'SalesRevenueNet': 'revenue',
      'CostOfRevenue': 'costOfRevenue',
      'CostOfGoodsAndServicesSold': 'costOfRevenue',
      'GrossProfit': 'grossProfit',
      'OperatingExpenses': 'operatingExpenses',
      'OperatingIncomeLoss': 'operatingIncome',
      'NetIncomeLoss': 'netIncome',
      'EarningsPerShareBasic': 'earningsPerShareBasic',
      'EarningsPerShareDiluted': 'earningsPerShareDiluted',
      'Assets': 'totalAssets',
      'Liabilities': 'totalLiabilities',
      'StockholdersEquity': 'totalEquity',
      'CashAndCashEquivalentsAtCarryingValue': 'cash',
      'ShortTermInvestments': 'shortTermInvestments',
      'AccountsReceivableNetCurrent': 'accountsReceivable',
      'InventoryNet': 'inventory',
      'AssetsCurrent': 'currentAssets',
      'LiabilitiesCurrent': 'currentLiabilities',
      'LongTermDebt': 'longTermDebt',
      'NetCashProvidedByUsedInOperatingActivities': 'operatingCashFlow',
      'NetCashProvidedByUsedInInvestingActivities': 'investingCashFlow',
      'NetCashProvidedByUsedInFinancingActivities': 'financingCashFlow',
      'PaymentsToAcquirePropertyPlantAndEquipment': 'capitalExpenditures',
      'PaymentsOfDividends': 'dividendsPaid',
    };
    
    // Group by period end date (10-K filings)
    const periodData: Record<string, XBRLFinancials> = {};
    
    Object.entries(tagMapping).forEach(([tag, field]) => {
      const tagData = usGaap[tag]?.units?.USD;
      if (!tagData) return;
      
      tagData.forEach((item: any) => {
        // Only get 10-K (annual) data
        if (item.form !== '10-K') return;
        
        const endDate = item.end;
        if (!periodData[endDate]) {
          periodData[endDate] = {
            periodEndDate: endDate,
            fiscalYear: item.fy?.toString(),
            fiscalPeriod: item.fp,
            documentType: item.form,
            rawTags: {},
          };
        }
        
        (periodData[endDate] as any)[field] = item.val;
        periodData[endDate].rawTags![tag] = item.val;
      });
    });
    
    // Convert to array and sort by date
    return Object.values(periodData)
      .sort((a, b) => (b.periodEndDate || '').localeCompare(a.periodEndDate || ''));
  }

  /**
   * Get specific XBRL concept data
   */
  async getXBRLConcept(cik: string, concept: string): Promise<any[]> {
    const normalizedCIK = cik.padStart(10, '0');
    const url = `${this.dataUrl}/api/xbrl/companyconcept/CIK${normalizedCIK}/us-gaap/${concept}.json`;
    
    try {
      const data = await this.request<any>(url);
      return data.units?.USD || data.units?.shares || [];
    } catch {
      return [];
    }
  }

  // ==================== FORM 4 (INSIDER TRADING) ====================

  /**
   * Get Form 4 insider trading data
   */
  async getInsiderTransactions(cik: string, days: number = 90): Promise<Form4Filing[]> {
    const filings = await this.getCompanyFilings(cik, ['4' as FilingType]);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentFilings = filings.filter(f => new Date(f.filingDate) >= cutoffDate);
    const form4Filings: Form4Filing[] = [];
    
    for (const filing of recentFilings.slice(0, 20)) {
      try {
        const form4 = await this.parseForm4(filing);
        if (form4) {
          form4Filings.push(form4);
        }
      } catch (error) {
        console.warn(`[SEC] Failed to parse Form 4: ${filing.accessionNumber}`);
      }
    }
    
    return form4Filings;
  }

  /**
   * Parse Form 4 XML document
   */
  public async parseForm4(filing: SECFiling | SECFilingDetail): Promise<Form4Filing | null> {
    // Find XML document in filing
    const normalizedCIK = filing.cik.padStart(10, '0');
    const directoryCIK = filing.cik.replace(/^0+/, '');
    const accessionPath = filing.accessionNumber.replace(/-/g, '');
    
    let data: any;
    let success = false;

    // Strategy 1: If we have documents list (from SECFilingDetail), look for the XML
    if ('documents' in filing && filing.documents) {
      // Look for the XML document
      // Usually has type '4' or '4/A' and ends in .xml, or description contains 'XML'
      const xmlDoc = filing.documents.find(d => 
        d.documentUrl.endsWith('.xml') && 
        (d.type === '4' || d.type === '4/A' || d.description.includes('XML'))
      );
      
      if (xmlDoc) {
        try {
          data = await this.request<any>(xmlDoc.documentUrl, { parseXML: true });
          success = true;
        } catch (e) {
          console.warn(`[SEC] Failed to fetch Form 4 XML from document list: ${xmlDoc.documentUrl}`);
        }
      }
    }

    // Strategy 2: Try standard naming convention (primary_doc.xml)
    if (!success) {
      try {
        // If primaryDocument has xsl prefix path (like xslF345X05/file.xml), strip the prefix
        let primaryXml = filing.primaryDocument;
        if (primaryXml.includes('/')) {
          // Extract just the filename from paths like "xslF345X05/tm2534544-1_4seq1.xml"
          primaryXml = primaryXml.split('/').pop() || primaryXml;
        }
        if (primaryXml.endsWith('.htm')) primaryXml = primaryXml.replace('.htm', '.xml');
        else if (primaryXml.endsWith('.html')) primaryXml = primaryXml.replace('.html', '.xml');

        const url = `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/${primaryXml}`;
        data = await this.request<any>(url, { parseXML: true });
        success = true;
      } catch {
        // Ignore
      }
    }

    // Strategy 3: Try common XSL path
    if (!success) {
      try {
        const xmlUrl = `${this.baseUrl}/Archives/edgar/data/${directoryCIK}/${accessionPath}/xslForm4X01/primary_doc.xml`;
        data = await this.request<any>(xmlUrl, { parseXML: true });
        success = true;
      } catch {
        // Ignore
      }
    }

    if (!success || !data) return null;
    
    const ownership = data?.ownershipDocument;
    if (!ownership) return null;
    
    const issuer = ownership.issuer || {};
    const owner = ownership.reportingOwner || {};
    const ownerRelation = owner.reportingOwnerRelationship || {};
    
    const transactions: Form4Transaction[] = [];
    
    // Non-derivative transactions
    const nonDerivative = ownership.nonDerivativeTable?.nonDerivativeTransaction;
    if (nonDerivative) {
      const items = Array.isArray(nonDerivative) ? nonDerivative : [nonDerivative];
      items.forEach((tx: any) => {
        const coding = tx.transactionCoding || {};
        const amounts = tx.transactionAmounts || {};
        const postAmounts = tx.postTransactionAmounts || {};
        const ownership = tx.ownershipNature || {};
        
        transactions.push({
          securityTitle: tx.securityTitle?.value || '',
          transactionDate: tx.transactionDate?.value || '',
          transactionCode: coding.transactionCode || '',
          sharesAmount: parseFloat(amounts.transactionShares?.value) || 0,
          pricePerShare: parseFloat(amounts.transactionPricePerShare?.value) || undefined,
          sharesOwnedAfter: parseFloat(postAmounts.sharesOwnedFollowingTransaction?.value) || 0,
          directOrIndirect: ownership.directOrIndirectOwnership?.value === 'D' ? 'D' : 'I',
          isAcquisition: coding.transactionAcquiredDisposedCode?.value === 'A',
        });
      });
    }
    
    return {
      issuerCik: issuer.issuerCik || filing.cik,
      issuerName: issuer.issuerName || filing.companyName,
      issuerTicker: issuer.issuerTradingSymbol || filing.ticker,
      reportingOwner: {
        cik: owner.reportingOwnerId?.rptOwnerCik || '',
        name: owner.reportingOwnerId?.rptOwnerName || '',
        isDirector: ownerRelation.isDirector === '1' || ownerRelation.isDirector === true,
        isOfficer: ownerRelation.isOfficer === '1' || ownerRelation.isOfficer === true,
        officerTitle: ownerRelation.officerTitle,
        isTenPercentOwner: ownerRelation.isTenPercentOwner === '1' || ownerRelation.isTenPercentOwner === true,
      },
      transactions,
      filingDate: filing.filingDate,
      accessionNumber: filing.accessionNumber,
    };
  }

  // ==================== 13F (INSTITUTIONAL HOLDINGS) ====================

  /**
   * Get 13F institutional holdings
   */
  async get13FHoldings(cik: string): Promise<Filing13F | null> {
    const filings = await this.getCompanyFilings(cik, ['13F-HR' as FilingType]);
    
    if (filings.length === 0) return null;
    
    const latestFiling = filings[0];
    return this.parse13F(latestFiling);
  }

  /**
   * Parse 13F XML document
   */
  private async parse13F(filing: SECFiling): Promise<Filing13F | null> {
    const normalizedCIK = filing.cik.padStart(10, '0');
    const accessionPath = filing.accessionNumber.replace(/-/g, '');
    
    // Get filing detail to find the information table
    const detail = await this.getFilingDetail(filing.cik, filing.accessionNumber);
    if (!detail) return null;
    
    // Find the XML information table
    const infoTableDoc = detail.documents.find(
      d => d.description.toLowerCase().includes('information table') || 
           d.type.includes('INFORMATION') ||
           d.documentUrl.includes('infotable')
    );
    
    if (!infoTableDoc) return null;
    
    try {
      const data = await this.request<any>(infoTableDoc.documentUrl, { parseXML: true });
      
      const infoTable = data?.informationTable?.infoTable;
      if (!infoTable) return null;
      
      const items = Array.isArray(infoTable) ? infoTable : [infoTable];
      const holdings: Holding13F[] = [];
      let totalValue = 0;
      
      items.forEach((item: any) => {
        const value = parseFloat(item.value) || 0;
        totalValue += value;
        
        holdings.push({
          nameOfIssuer: item.nameOfIssuer || '',
          titleOfClass: item.titleOfClass || '',
          cusip: item.cusip || '',
          value: value,
          shares: parseFloat(item.shrsOrPrnAmt?.sshPrnamt) || 0,
          shareType: item.shrsOrPrnAmt?.sshPrnamtType || 'SH',
          investmentDiscretion: item.investmentDiscretion || 'SOLE',
          votingAuthority: {
            sole: parseFloat(item.votingAuthority?.Sole) || 0,
            shared: parseFloat(item.votingAuthority?.Shared) || 0,
            none: parseFloat(item.votingAuthority?.None) || 0,
          },
        });
      });
      
      return {
        cik: filing.cik,
        managerName: filing.companyName,
        reportDate: '', // Would need to parse from cover page
        filingDate: filing.filingDate,
        holdings,
        totalValue,
      };
    } catch (error) {
      console.error(`[SEC] Failed to parse 13F:`, error);
      return null;
    }
  }

  // ==================== TEXT EXTRACTION ====================

  /**
   * Extract text sections from filing HTML
   */
  async extractFilingSections(filing: SECFiling): Promise<FilingTextSection[]> {
    try {
      const html = await this.request<string>(filing.primaryDocumentUrl, { parseJSON: false, parseXML: false });
      return this.parseFilingSections(html as string, filing.form);
    } catch (error) {
      console.error(`[SEC] Failed to extract sections:`, error);
      return [];
    }
  }

  /**
   * Parse filing HTML into sections
   */
  private parseFilingSections(html: string, formType: string): FilingTextSection[] {
    const sections: FilingTextSection[] = [];
    
    // Remove scripts and styles
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // Section patterns for different form types
    const sectionPatterns = this.getSectionPatterns(formType);
    
    sectionPatterns.forEach(pattern => {
      const regex = new RegExp(pattern.start, 'i');
      const endRegex = pattern.end ? new RegExp(pattern.end, 'i') : null;
      
      const startMatch = text.match(regex);
      if (startMatch && startMatch.index !== undefined) {
        const startIndex = startMatch.index;
        let endIndex = text.length;
        
        if (endRegex) {
          const endMatch = text.substring(startIndex + startMatch[0].length).match(endRegex);
          if (endMatch && endMatch.index !== undefined) {
            endIndex = startIndex + startMatch[0].length + endMatch.index;
          }
        }
        
        let content = text.substring(startIndex, endIndex);
        
        // Strip HTML tags for word count
        const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        sections.push({
          sectionName: pattern.name,
          sectionNumber: pattern.number,
          content: plainText,
          wordCount: plainText.split(/\s+/).length,
        });
      }
    });
    
    return sections;
  }

  /**
   * Get section patterns based on form type
   */
  private getSectionPatterns(formType: string): Array<{ name: string; number?: string; start: string; end?: string }> {
    if (formType === '10-K' || formType === '10-Q') {
      return [
        { name: 'Business', number: 'Item 1', start: 'Item\\s*1[^A].*?Business', end: 'Item\\s*1A|Item\\s*2' },
        { name: 'Risk Factors', number: 'Item 1A', start: 'Item\\s*1A.*?Risk\\s*Factors', end: 'Item\\s*1B|Item\\s*2' },
        { name: 'Properties', number: 'Item 2', start: 'Item\\s*2.*?Properties', end: 'Item\\s*3' },
        { name: 'Legal Proceedings', number: 'Item 3', start: 'Item\\s*3.*?Legal\\s*Proceedings', end: 'Item\\s*4' },
        { name: "Management's Discussion", number: 'Item 7', start: 'Item\\s*7[^A].*?Management.*?Discussion', end: 'Item\\s*7A|Item\\s*8' },
        { name: 'Financial Statements', number: 'Item 8', start: 'Item\\s*8.*?Financial\\s*Statements', end: 'Item\\s*9' },
      ];
    }
    
    if (formType === '8-K') {
      return [
        { name: 'Item 1.01', number: '1.01', start: 'Item\\s*1\\.01', end: 'Item\\s*\\d+\\.\\d+|SIGNATURE' },
        { name: 'Item 2.01', number: '2.01', start: 'Item\\s*2\\.01', end: 'Item\\s*\\d+\\.\\d+|SIGNATURE' },
        { name: 'Item 5.02', number: '5.02', start: 'Item\\s*5\\.02', end: 'Item\\s*\\d+\\.\\d+|SIGNATURE' },
        { name: 'Item 7.01', number: '7.01', start: 'Item\\s*7\\.01', end: 'Item\\s*\\d+\\.\\d+|SIGNATURE' },
        { name: 'Item 8.01', number: '8.01', start: 'Item\\s*8\\.01', end: 'Item\\s*\\d+\\.\\d+|SIGNATURE' },
      ];
    }
    
    return [];
  }

  // ==================== 8-K CURRENT REPORTS ====================

  /**
   * Get recent 8-K filings (breaking news)
   */
  async get8KFilings(cik: string, days: number = 30): Promise<SECFiling[]> {
    const filings = await this.getCompanyFilings(cik, ['8-K' as FilingType]);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return filings.filter(f => new Date(f.filingDate) >= cutoffDate);
  }

  // ==================== DIFF TOOL ====================

  /**
   * Compare two filing sections and highlight differences
   */
  async compareFilings(
    filing1: SECFiling,
    filing2: SECFiling,
    sectionName: string
  ): Promise<{ added: string[]; removed: string[]; similarity: number }> {
    const sections1 = await this.extractFilingSections(filing1);
    const sections2 = await this.extractFilingSections(filing2);
    
    const section1 = sections1.find(s => s.sectionName === sectionName);
    const section2 = sections2.find(s => s.sectionName === sectionName);
    
    if (!section1 || !section2) {
      return { added: [], removed: [], similarity: 0 };
    }
    
    // Simple word-based diff
    const words1 = new Set(section1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(section2.content.toLowerCase().split(/\s+/));
    
    const added: string[] = [];
    const removed: string[] = [];
    
    words2.forEach(word => {
      if (!words1.has(word) && word.length > 3) {
        added.push(word);
      }
    });
    
    words1.forEach(word => {
      if (!words2.has(word) && word.length > 3) {
        removed.push(word);
      }
    });
    
    // Calculate Jaccard similarity
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    const similarity = union > 0 ? intersection / union : 0;
    
    return { added, removed, similarity };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Verify API connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.loadCIKMapping();
      return true;
    } catch (error) {
      console.error('[SEC] Connection verification failed:', error);
      return false;
    }
  }

  /**
   * Get company overview
   */
  async getCompanyOverview(tickerOrCik: string): Promise<{
    company: CompanyCIKMapping | null;
    recentFilings: SECFiling[];
    financials: XBRLFinancials[];
  }> {
    let cik: string;
    let company: CompanyCIKMapping | null = null;
    
    // Determine if input is ticker or CIK
    if (/^\d+$/.test(tickerOrCik)) {
      cik = tickerOrCik;
      company = await this.getTickerByCIK(cik);
    } else {
      company = await this.getCIKByTicker(tickerOrCik);
      if (!company) {
        return { company: null, recentFilings: [], financials: [] };
      }
      cik = company.cik;
    }
    
    const [recentFilings, financials] = await Promise.all([
      this.getCompanyFilings(cik).then(f => f.slice(0, 10)),
      this.getFinancials(cik),
    ]);
    
    return { company, recentFilings, financials };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create SEC EDGAR API instance with environment configuration
 */
export function createSECEdgarClient(): SECEdgarAPI {
  const userAgent = process.env.SEC_USER_AGENT || 'MoneyHub admin@moneyhub.app';
  
  return new SECEdgarAPI({ userAgent });
}

/**
 * Format filing date for display
 */
export function formatFilingDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get form type description
 */
export function getFormTypeDescription(formType: string): string {
  const descriptions: Record<string, string> = {
    '10-K': 'Annual Report',
    '10-Q': 'Quarterly Report',
    '8-K': 'Current Report',
    '4': 'Insider Trading',
    '13F-HR': 'Institutional Holdings',
    '13F-NT': 'Institutional Holdings Notice',
    'DEF 14A': 'Proxy Statement',
    'DEFA14A': 'Additional Proxy Materials',
    'S-1': 'Registration Statement',
    'S-3': 'Shelf Registration',
    '424B': 'Prospectus',
  };
  
  return descriptions[formType] || formType;
}

/**
 * Parse transaction code from Form 4
 */
export function parseTransactionCode(code: string): string {
  const codes: Record<string, string> = {
    'P': 'Open Market Purchase',
    'S': 'Open Market Sale',
    'A': 'Grant/Award',
    'D': 'Disposition to Issuer',
    'F': 'Payment of Exercise Price',
    'I': 'Discretionary Transaction',
    'M': 'Exercise of Derivative',
    'C': 'Conversion',
    'E': 'Expiration',
    'G': 'Gift',
    'L': 'Small Acquisition',
    'W': 'Acquisition/Disposition by Will',
    'Z': 'Deposit/Withdrawal from Voting Trust',
  };
  
  return codes[code.toUpperCase()] || code;
}

export default SECEdgarAPI;
