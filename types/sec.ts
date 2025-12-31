/**
 * SEC EDGAR Type Definitions
 * TypeScript types for SEC filing data
 */

// ==================== API RESPONSE TYPES ====================

export interface SECFilingResponse {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  insiderTransactionForOwnerExists: number;
  insiderTransactionForIssuerExists: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing: SECAddress;
    business: SECAddress;
  };
  phone: string;
  flags: string;
  formerNames: SECFormerName[];
  filings: {
    recent: SECRecentFilings;
    files: SECFilingFile[];
  };
}

export interface SECAddress {
  street1: string;
  street2: string | null;
  city: string;
  stateOrCountry: string;
  zipCode: string;
  stateOrCountryDescription: string;
}

export interface SECFormerName {
  name: string;
  from: string;
  to: string;
}

export interface SECRecentFilings {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  act: string[];
  form: string[];
  fileNumber: string[];
  filmNumber: string[];
  items: string[];
  size: number[];
  isXBRL: number[];
  isInlineXBRL: number[];
  primaryDocument: string[];
  primaryDocDescription: string[];
}

export interface SECFilingFile {
  name: string;
  filingCount: number;
  filingFrom: string;
  filingTo: string;
}

// ==================== COMPANY TYPES ====================

export interface SECCompany {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  entityType: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
}

export interface SECCompanySearchResult {
  cik: string;
  name: string;
  ticker?: string;
  exchange?: string;
}

// ==================== FILING TYPES ====================

export interface SECFiling {
  accessionNumber: string;
  cik: string;
  companyName: string;
  ticker?: string;
  form: string;
  filingDate: string;
  reportDate?: string;
  acceptanceDateTime?: string;
  primaryDocument: string;
  primaryDocumentUrl: string;
  filingDetailUrl: string;
  size: number;
  isXBRL: boolean;
  isInlineXBRL: boolean;
  items?: string;
  description?: string;
}

export interface SECFilingDocument {
  sequence: string;
  description: string;
  documentUrl: string;
  type: string;
  size: number;
}

export interface SECFilingDetail {
  accessionNumber: string;
  filingDate: string;
  form: string;
  documents: SECFilingDocument[];
}

// ==================== FORM 4 TYPES ====================

export interface Form4Filing {
  accessionNumber: string;
  filingDate: string;
  issuerCik: string;
  issuerName: string;
  issuerTicker?: string;
  reportingOwner: Form4ReportingOwner;
  transactions: Form4Transaction[];
  nonDerivativeHoldings: Form4Holding[];
  derivativeTransactions: Form4DerivativeTransaction[];
}

export interface Form4ReportingOwner {
  cik: string;
  name: string;
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  isOther: boolean;
  officerTitle?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Form4Transaction {
  securityTitle: string;
  transactionDate: string;
  transactionCode: string;
  transactionCodeDescription?: string;
  sharesAmount: number;
  pricePerShare?: number;
  totalValue?: number;
  sharesOwnedAfter: number;
  directOrIndirect: 'D' | 'I';
  isAcquisition: boolean;
  footnotes?: string[];
}

export interface Form4Holding {
  securityTitle: string;
  sharesOwned: number;
  directOrIndirect: 'D' | 'I';
  nature?: string;
}

export interface Form4DerivativeTransaction {
  securityTitle: string;
  conversionOrExercisePrice?: number;
  transactionDate: string;
  transactionCode: string;
  sharesAmount: number;
  expirationDate?: string;
  underlyingSecurityTitle: string;
  underlyingSecurityShares: number;
  sharesOwnedAfter: number;
  directOrIndirect: 'D' | 'I';
}

// ==================== 13F TYPES ====================

export interface Filing13F {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  filerCik: string;
  filerName: string;
  totalValue: number;
  holdingsCount: number;
  holdings: Holding13F[];
}

export interface Holding13F {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number;
  sharesOrPrincipalAmount: number;
  sharesOrPrincipalAmountType: 'SH' | 'PRN';
  putCall?: 'PUT' | 'CALL';
  investmentDiscretion: 'SOLE' | 'DFND' | 'OTR';
  otherManager?: string;
  votingAuthoritySole: number;
  votingAuthorityShared: number;
  votingAuthorityNone: number;
}

// ==================== XBRL TYPES ====================

export interface XBRLFinancials {
  cik: string;
  entityName: string;
  accessionNumber: string;
  periodEndDate: string;
  form: string;
  facts: XBRLFacts;
}

export interface XBRLFacts {
  [namespace: string]: {
    [concept: string]: XBRLFactValue;
  };
}

export interface XBRLFactValue {
  label: string;
  description: string;
  units: {
    [unit: string]: XBRLUnit[];
  };
}

export interface XBRLUnit {
  start?: string;
  end: string;
  val: number | string;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

// ==================== PARSED FINANCIAL TYPES ====================

export interface ParsedFinancialStatement {
  periodEndDate: string;
  periodType: 'annual' | 'quarterly' | 'instant';
  fiscalYear?: number;
  fiscalQuarter?: number;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlowStatement;
  metrics: FinancialMetrics;
}

export interface IncomeStatement {
  revenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  researchAndDevelopment?: number;
  sellingGeneralAdmin?: number;
  operatingExpenses?: number;
  operatingIncome?: number;
  interestExpense?: number;
  interestIncome?: number;
  otherIncome?: number;
  incomeBeforeTax?: number;
  incomeTaxExpense?: number;
  netIncome?: number;
  basicEPS?: number;
  dilutedEPS?: number;
  basicSharesOutstanding?: number;
  dilutedSharesOutstanding?: number;
  ebitda?: number;
}

export interface BalanceSheet {
  cashAndEquivalents?: number;
  shortTermInvestments?: number;
  accountsReceivable?: number;
  inventory?: number;
  prepaidExpenses?: number;
  otherCurrentAssets?: number;
  totalCurrentAssets?: number;
  propertyPlantEquipment?: number;
  goodwill?: number;
  intangibleAssets?: number;
  longTermInvestments?: number;
  otherNonCurrentAssets?: number;
  totalAssets?: number;
  accountsPayable?: number;
  shortTermDebt?: number;
  accruedLiabilities?: number;
  deferredRevenue?: number;
  otherCurrentLiabilities?: number;
  totalCurrentLiabilities?: number;
  longTermDebt?: number;
  deferredTaxLiabilities?: number;
  otherNonCurrentLiabilities?: number;
  totalLiabilities?: number;
  commonStock?: number;
  preferredStock?: number;
  additionalPaidInCapital?: number;
  retainedEarnings?: number;
  treasuryStock?: number;
  accumulatedOtherComprehensiveIncome?: number;
  totalStockholdersEquity?: number;
  noncontrollingInterest?: number;
  totalEquity?: number;
}

export interface CashFlowStatement {
  netIncome?: number;
  depreciation?: number;
  amortization?: number;
  stockBasedCompensation?: number;
  deferredTaxes?: number;
  accountsReceivableChange?: number;
  inventoryChange?: number;
  accountsPayableChange?: number;
  otherOperatingChanges?: number;
  netCashFromOperating?: number;
  capitalExpenditures?: number;
  acquisitions?: number;
  investmentsPurchases?: number;
  investmentsSales?: number;
  otherInvestingActivities?: number;
  netCashFromInvesting?: number;
  debtRepayment?: number;
  debtIssuance?: number;
  stockRepurchases?: number;
  dividendsPaid?: number;
  stockIssuance?: number;
  otherFinancingActivities?: number;
  netCashFromFinancing?: number;
  netChangeInCash?: number;
  freeCashFlow?: number;
}

export interface FinancialMetrics {
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  debtToAssets?: number;
  assetTurnover?: number;
  inventoryTurnover?: number;
  receivablesTurnover?: number;
  daysSalesOutstanding?: number;
  daysPayableOutstanding?: number;
}

// ==================== TEXT EXTRACTION TYPES ====================

export interface ExtractedSection {
  name: string;
  number: string;
  title: string;
  plainText: string;
  wordCount: number;
  characterCount: number;
  keywords: KeywordResult[];
  sentiment?: SentimentResult;
}

export interface KeywordResult {
  term: string;
  count: number;
  frequency: number;
}

export interface SentimentResult {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  positiveWords: string[];
  negativeWords: string[];
}

export interface FilingComparison {
  sections: SectionComparison[];
  summary: {
    sectionsAdded: string[];
    sectionsRemoved: string[];
    sectionsChanged: string[];
    sectionsUnchanged: string[];
    overallSimilarity: number;
  };
}

export interface SectionComparison {
  sectionName: string;
  oldText?: string;
  newText?: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  similarity?: number;
  additions?: string[];
  removals?: string[];
  wordCountChange?: number;
}

// ==================== RSS FEED TYPES ====================

export interface SECRSSFeed {
  title: string;
  link: string;
  description: string;
  lastBuildDate: string;
  items: SECRSSItem[];
}

export interface SECRSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  company?: string;
  form?: string;
  cik?: string;
  accessionNumber?: string;
}

// ==================== DATABASE TYPES ====================

export interface DBSECCompany {
  id: string;
  cik: string;
  ticker: string | null;
  company_name: string;
  sic_code: string | null;
  sic_description: string | null;
  fiscal_year_end: string | null;
  state_of_incorporation: string | null;
  exchange: string | null;
  is_active: boolean;
  last_filing_date: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DBSECFiling {
  id: string;
  company_id: string | null;
  cik: string;
  accession_number: string;
  form_type: string;
  filing_date: string;
  acceptance_datetime: string | null;
  report_date: string | null;
  primary_document: string | null;
  primary_document_url: string | null;
  filing_detail_url: string | null;
  file_number: string | null;
  film_number: string | null;
  items: string | null;
  size_bytes: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DBSECWatchlistItem {
  id: string;
  user_id: string;
  company_id: string | null;
  ticker: string;
  cik: string;
  form_types: string[];
  priority: string;
  notification_enabled: boolean;
  email_notification: boolean;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DBSECFilingAlert {
  id: string;
  user_id: string;
  filing_id: string;
  company_id: string;
  alert_type: string;
  title: string;
  message: string | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ==================== COMPONENT PROP TYPES ====================

export interface SECFilingFeedProps {
  ticker?: string;
  formTypes?: string[];
  maxItems?: number;
  showCompanyInfo?: boolean;
  onFilingClick?: (filing: SECFiling) => void;
}

export interface InsiderTradingProps {
  ticker: string;
  days?: number;
  showChart?: boolean;
  onTransactionClick?: (transaction: Form4Transaction) => void;
}

export interface FilingDiffToolProps {
  ticker: string;
  formType?: string;
  onComparisonComplete?: (comparison: FilingComparison) => void;
}

export interface SECScreenerProps {
  onCompanySelect?: (company: SECCompanySearchResult) => void;
  defaultFormTypes?: string[];
}

// ==================== UTILITY TYPES ====================

export type FilingFormType = 
  | '10-K' 
  | '10-Q' 
  | '8-K' 
  | '4' 
  | '13F-HR' 
  | 'DEF 14A' 
  | 'S-1' 
  | 'S-3' 
  | '424B4'
  | '6-K'
  | '20-F'
  | 'SC 13G'
  | 'SC 13D';

export type TransactionCode = 
  | 'P' // Purchase
  | 'S' // Sale
  | 'A' // Award/Grant
  | 'M' // Exercise of Derivative
  | 'C' // Conversion
  | 'G' // Gift
  | 'F' // Tax Withholding
  | 'X' // Expiration
  | 'I' // Discretionary Transaction
  | 'J' // Other Acquisition/Disposition;

export interface SECAPIError {
  code: string;
  message: string;
  status: number;
  retryable: boolean;
}

export interface SECRateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}
