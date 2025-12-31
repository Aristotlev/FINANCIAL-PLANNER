/**
 * SEC EDGAR Integration Library
 * Exports all SEC-related functionality
 */

// API Client
export { 
  SECEdgarAPI,
  createSECEdgarClient,
  formatFilingDate,
  getFormTypeDescription,
  parseTransactionCode,
  type SECCredentials,
  type CompanyCIKMapping,
  type SECFiling,
  type SECFilingDetail,
  type SECDocument,
  type SECRSSItem,
  type Form4Transaction,
  type Form4Filing,
  type Filing13F,
  type Holding13F,
  type XBRLFinancials,
  type FilingTextSection,
  type FilingType,
} from '../api/sec-edgar-api';

// Filing Watcher
export {
  SECFilingWatcher,
  getSECFilingWatcher,
  resetSECFilingWatcher,
  type WatchlistItem as WatcherWatchlistItem,
  type FilingEvent,
  type WatcherConfig,
  type FilingQueueItem,
} from './sec-filing-watcher';

// XBRL Parser
export {
  XBRLParser,
  createXBRLParser,
  formatCurrency,
  formatLargeNumber,
  formatPercentage,
  type XBRLContext,
  type XBRLFact,
  type ParsedFinancialStatement,
  type IncomeStatementData,
  type BalanceSheetData,
  type CashFlowData,
  type CalculatedMetrics,
} from './xbrl-parser';

// Text Extractor
export {
  SECTextExtractor,
  createSECTextExtractor,
  type ExtractedSection,
  type KeywordResult,
  type SentimentResult,
  type TextDiff,
  type DiffChange,
  type FilingComparison,
} from './sec-text-extractor';

// Database Service
export {
  upsertCompany,
  getCompanyByCIK,
  getCompanyByTicker,
  storeFiling,
  getFilingByAccession,
  getCompanyFilings,
  updateFilingStatus,
  storeFinancials,
  getFinancialHistory,
  storeInsiderTransaction,
  getInsiderTransactions,
  storeFilingSection,
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  createFilingAlert,
  getUserAlerts,
  markAlertAsRead,
  storeMultipleFilings,
  processFilingWithSections,
  searchCompanies,
  getRecentFilings,
  type StoredCompany,
  type StoredFiling,
  type WatchlistItem,
} from './sec-data-service';

// Configuration
export {
  getSECConfig,
  validateSECConfig,
  logSECConfig,
  type SECConfig,
} from './sec-config';

// Background Monitor
export {
  getSECBackgroundMonitor,
  resetSECBackgroundMonitor,
  type MonitorStatus,
  type MonitoringSubscription,
} from './sec-background-monitor';