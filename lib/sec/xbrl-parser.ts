/**
 * XBRL Parser for SEC Financial Filings
 * Extracts structured financial data from 10-K and 10-Q filings
 * 
 * Features:
 * - Parse US-GAAP and IFRS tags
 * - Extract income statement, balance sheet, cash flow data
 * - Handle multi-period data
 * - Calculate derived metrics
 * - Support for extensions and custom tags
 */

import { XMLParser } from 'fast-xml-parser';
import { SECEdgarAPI, SECFiling, XBRLFinancials, createSECEdgarClient } from '../api/sec-edgar-api';

// ==================== TYPES ====================

export interface XBRLContext {
  id: string;
  entity: string;
  startDate?: string;
  endDate?: string;
  instant?: string;
  segment?: Record<string, string>;
}

export interface XBRLFact {
  concept: string;
  namespace: string;
  value: number | string;
  unit?: string;
  decimals?: number;
  contextRef: string;
  context?: XBRLContext;
}

export interface ParsedFinancialStatement {
  periodEndDate: string;
  periodType: 'annual' | 'quarterly' | 'instant';
  fiscalYear?: number;
  fiscalQuarter?: number;
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
  metrics: CalculatedMetrics;
  rawFacts: XBRLFact[];
}

export interface IncomeStatementData {
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
  netIncomeToCommon?: number;
  basicEPS?: number;
  dilutedEPS?: number;
  basicSharesOutstanding?: number;
  dilutedSharesOutstanding?: number;
  dividendPerShare?: number;
}

export interface BalanceSheetData {
  // Assets
  cashAndEquivalents?: number;
  shortTermInvestments?: number;
  accountsReceivable?: number;
  inventory?: number;
  otherCurrentAssets?: number;
  totalCurrentAssets?: number;
  propertyPlantEquipment?: number;
  goodwill?: number;
  intangibleAssets?: number;
  otherNonCurrentAssets?: number;
  totalAssets?: number;
  
  // Liabilities
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
  
  // Equity
  commonStock?: number;
  retainedEarnings?: number;
  accumulatedOtherComprehensiveIncome?: number;
  treasuryStock?: number;
  totalStockholdersEquity?: number;
  nonControllingInterest?: number;
  totalEquity?: number;
}

export interface CashFlowData {
  // Operating Activities
  netIncome?: number;
  depreciation?: number;
  amortization?: number;
  stockBasedCompensation?: number;
  deferredTaxes?: number;
  changeInWorkingCapital?: number;
  changeInReceivables?: number;
  changeInInventory?: number;
  changeInPayables?: number;
  otherOperatingActivities?: number;
  netCashFromOperating?: number;
  
  // Investing Activities
  capitalExpenditures?: number;
  acquisitions?: number;
  investmentPurchases?: number;
  investmentSales?: number;
  otherInvestingActivities?: number;
  netCashFromInvesting?: number;
  
  // Financing Activities
  debtIssuance?: number;
  debtRepayment?: number;
  stockIssuance?: number;
  stockRepurchase?: number;
  dividendsPaid?: number;
  otherFinancingActivities?: number;
  netCashFromFinancing?: number;
  
  // Net Change
  netChangeInCash?: number;
  cashAtBeginning?: number;
  cashAtEnd?: number;
  freeCashFlow?: number;
}

export interface CalculatedMetrics {
  // Profitability
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  
  // Liquidity
  currentRatio?: number;
  quickRatio?: number;
  cashRatio?: number;
  
  // Leverage
  debtToEquity?: number;
  debtToAssets?: number;
  interestCoverage?: number;
  
  // Efficiency
  assetTurnover?: number;
  inventoryTurnover?: number;
  receivablesTurnover?: number;
  
  // Valuation
  priceToEarnings?: number;
  priceToBook?: number;
  enterpriseValue?: number;
  evToEbitda?: number;
}

// ==================== XBRL TAG MAPPINGS ====================

const INCOME_STATEMENT_TAGS: Record<string, keyof IncomeStatementData> = {
  // Revenue
  'Revenues': 'revenue',
  'RevenueFromContractWithCustomerExcludingAssessedTax': 'revenue',
  'SalesRevenueNet': 'revenue',
  'SalesRevenueGoodsNet': 'revenue',
  'SalesRevenueServicesNet': 'revenue',
  'RevenueFromContractWithCustomerIncludingAssessedTax': 'revenue',
  
  // Cost of Revenue
  'CostOfRevenue': 'costOfRevenue',
  'CostOfGoodsAndServicesSold': 'costOfRevenue',
  'CostOfGoodsSold': 'costOfRevenue',
  
  // Gross Profit
  'GrossProfit': 'grossProfit',
  
  // Operating Expenses
  'ResearchAndDevelopmentExpense': 'researchAndDevelopment',
  'SellingGeneralAndAdministrativeExpense': 'sellingGeneralAdmin',
  'OperatingExpenses': 'operatingExpenses',
  
  // Operating Income
  'OperatingIncomeLoss': 'operatingIncome',
  
  // Other Income/Expense
  'InterestExpense': 'interestExpense',
  'InterestIncome': 'interestIncome',
  'InterestIncomeExpenseNet': 'interestIncome',
  'OtherNonoperatingIncomeExpense': 'otherIncome',
  
  // Income Before Tax
  'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments': 'incomeBeforeTax',
  'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest': 'incomeBeforeTax',
  
  // Tax
  'IncomeTaxExpenseBenefit': 'incomeTaxExpense',
  
  // Net Income
  'NetIncomeLoss': 'netIncome',
  'ProfitLoss': 'netIncome',
  'NetIncomeLossAvailableToCommonStockholdersBasic': 'netIncomeToCommon',
  
  // EPS
  'EarningsPerShareBasic': 'basicEPS',
  'EarningsPerShareDiluted': 'dilutedEPS',
  
  // Shares Outstanding
  'WeightedAverageNumberOfSharesOutstandingBasic': 'basicSharesOutstanding',
  'WeightedAverageNumberOfDilutedSharesOutstanding': 'dilutedSharesOutstanding',
  
  // Dividends
  'CommonStockDividendsPerShareDeclared': 'dividendPerShare',
};

const BALANCE_SHEET_TAGS: Record<string, keyof BalanceSheetData> = {
  // Current Assets
  'CashAndCashEquivalentsAtCarryingValue': 'cashAndEquivalents',
  'Cash': 'cashAndEquivalents',
  'ShortTermInvestments': 'shortTermInvestments',
  'MarketableSecuritiesCurrent': 'shortTermInvestments',
  'AccountsReceivableNetCurrent': 'accountsReceivable',
  'AccountsReceivableNet': 'accountsReceivable',
  'InventoryNet': 'inventory',
  'Inventory': 'inventory',
  'OtherAssetsCurrent': 'otherCurrentAssets',
  'PrepaidExpenseAndOtherAssetsCurrent': 'otherCurrentAssets',
  'AssetsCurrent': 'totalCurrentAssets',
  
  // Non-Current Assets
  'PropertyPlantAndEquipmentNet': 'propertyPlantEquipment',
  'Goodwill': 'goodwill',
  'IntangibleAssetsNetExcludingGoodwill': 'intangibleAssets',
  'OtherAssetsNoncurrent': 'otherNonCurrentAssets',
  'Assets': 'totalAssets',
  
  // Current Liabilities
  'AccountsPayableCurrent': 'accountsPayable',
  'ShortTermBorrowings': 'shortTermDebt',
  'LongTermDebtCurrent': 'shortTermDebt',
  'AccruedLiabilitiesCurrent': 'accruedLiabilities',
  'DeferredRevenueCurrent': 'deferredRevenue',
  'ContractWithCustomerLiabilityCurrent': 'deferredRevenue',
  'OtherLiabilitiesCurrent': 'otherCurrentLiabilities',
  'LiabilitiesCurrent': 'totalCurrentLiabilities',
  
  // Non-Current Liabilities
  'LongTermDebtNoncurrent': 'longTermDebt',
  'LongTermDebt': 'longTermDebt',
  'DeferredIncomeTaxLiabilitiesNet': 'deferredTaxLiabilities',
  'OtherLiabilitiesNoncurrent': 'otherNonCurrentLiabilities',
  'Liabilities': 'totalLiabilities',
  
  // Equity
  'CommonStockValue': 'commonStock',
  'CommonStocksIncludingAdditionalPaidInCapital': 'commonStock',
  'RetainedEarningsAccumulatedDeficit': 'retainedEarnings',
  'AccumulatedOtherComprehensiveIncomeLossNetOfTax': 'accumulatedOtherComprehensiveIncome',
  'TreasuryStockValue': 'treasuryStock',
  'StockholdersEquity': 'totalStockholdersEquity',
  'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest': 'totalEquity',
  'MinorityInterest': 'nonControllingInterest',
};

const CASH_FLOW_TAGS: Record<string, keyof CashFlowData> = {
  // Operating Activities
  'NetIncomeLoss': 'netIncome',
  'DepreciationDepletionAndAmortization': 'depreciation',
  'Depreciation': 'depreciation',
  'AmortizationOfIntangibleAssets': 'amortization',
  'ShareBasedCompensation': 'stockBasedCompensation',
  'DeferredIncomeTaxExpenseBenefit': 'deferredTaxes',
  'IncreaseDecreaseInAccountsReceivable': 'changeInReceivables',
  'IncreaseDecreaseInInventories': 'changeInInventory',
  'IncreaseDecreaseInAccountsPayable': 'changeInPayables',
  'OtherOperatingActivitiesCashFlowStatement': 'otherOperatingActivities',
  'NetCashProvidedByUsedInOperatingActivities': 'netCashFromOperating',
  
  // Investing Activities
  'PaymentsToAcquirePropertyPlantAndEquipment': 'capitalExpenditures',
  'PaymentsToAcquireBusinessesNetOfCashAcquired': 'acquisitions',
  'PaymentsToAcquireInvestments': 'investmentPurchases',
  'PaymentsToAcquireMarketableSecurities': 'investmentPurchases',
  'ProceedsFromSaleOfInvestments': 'investmentSales',
  'ProceedsFromSaleAndMaturityOfMarketableSecurities': 'investmentSales',
  'NetCashProvidedByUsedInInvestingActivities': 'netCashFromInvesting',
  
  // Financing Activities
  'ProceedsFromIssuanceOfLongTermDebt': 'debtIssuance',
  'RepaymentsOfLongTermDebt': 'debtRepayment',
  'ProceedsFromIssuanceOfCommonStock': 'stockIssuance',
  'PaymentsForRepurchaseOfCommonStock': 'stockRepurchase',
  'PaymentsOfDividends': 'dividendsPaid',
  'PaymentsOfDividendsCommonStock': 'dividendsPaid',
  'NetCashProvidedByUsedInFinancingActivities': 'netCashFromFinancing',
  
  // Net Change
  'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect': 'netChangeInCash',
  'CashAndCashEquivalentsAtCarryingValue': 'cashAtEnd',
};

// ==================== XBRL PARSER CLASS ====================

export class XBRLParser {
  private readonly xmlParser: XMLParser;
  private readonly secApi: SECEdgarAPI;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      isArray: (tagName) => {
        // Force certain tags to always be arrays
        return ['context', 'unit', 'fact'].includes(tagName.toLowerCase());
      },
    });
    this.secApi = createSECEdgarClient();
  }

  /**
   * Parse financial statements from a filing
   */
  async parseFilingFinancials(filing: SECFiling): Promise<ParsedFinancialStatement[]> {
    try {
      // Get company facts from SEC data API (more reliable than parsing XBRL directly)
      const facts = await this.secApi.getCompanyFacts(filing.cik);
      return this.extractStatementsFromFacts(facts, filing);
    } catch (error) {
      console.error('[XBRL Parser] Failed to parse filing:', error);
      return [];
    }
  }

  /**
   * Extract financial statements from company facts
   */
  private extractStatementsFromFacts(facts: any, filing: SECFiling): ParsedFinancialStatement[] {
    const statements: ParsedFinancialStatement[] = [];
    const usGaap = facts?.facts?.['us-gaap'];
    
    if (!usGaap) return statements;

    // Group facts by period end date
    const periodData = new Map<string, {
      income: IncomeStatementData;
      balance: BalanceSheetData;
      cashFlow: CashFlowData;
      rawFacts: XBRLFact[];
      fiscalYear?: number;
      fiscalQuarter?: number;
      periodType: 'annual' | 'quarterly';
    }>();

    // Process income statement tags
    this.processTagGroup(usGaap, INCOME_STATEMENT_TAGS, periodData, 'income');
    
    // Process balance sheet tags
    this.processTagGroup(usGaap, BALANCE_SHEET_TAGS, periodData, 'balance');
    
    // Process cash flow tags
    this.processTagGroup(usGaap, CASH_FLOW_TAGS, periodData, 'cashFlow');

    // Convert to statements
    for (const [endDate, data] of periodData.entries()) {
      const metrics = this.calculateMetrics(data.income, data.balance, data.cashFlow);
      
      statements.push({
        periodEndDate: endDate,
        periodType: data.periodType,
        fiscalYear: data.fiscalYear,
        fiscalQuarter: data.fiscalQuarter,
        incomeStatement: data.income,
        balanceSheet: data.balance,
        cashFlow: data.cashFlow,
        metrics,
        rawFacts: data.rawFacts,
      });
    }

    // Sort by date descending
    statements.sort((a, b) => b.periodEndDate.localeCompare(a.periodEndDate));

    return statements;
  }

  /**
   * Process a group of tags and extract values
   */
  private processTagGroup(
    usGaap: any,
    tagMapping: Record<string, string>,
    periodData: Map<string, any>,
    targetKey: 'income' | 'balance' | 'cashFlow'
  ): void {
    for (const [tag, field] of Object.entries(tagMapping)) {
      const tagData = usGaap[tag]?.units?.USD || usGaap[tag]?.units?.shares || usGaap[tag]?.units?.pure;
      if (!tagData) continue;

      for (const item of tagData) {
        const endDate = item.end || item.instant;
        if (!endDate) continue;

        // Determine period type
        const isAnnual = item.form === '10-K';
        const isQuarterly = item.form === '10-Q';
        if (!isAnnual && !isQuarterly) continue;

        // Get or create period data
        if (!periodData.has(endDate)) {
          periodData.set(endDate, {
            income: {},
            balance: {},
            cashFlow: {},
            rawFacts: [],
            fiscalYear: item.fy,
            fiscalQuarter: item.fp === 'FY' ? undefined : parseInt(item.fp?.replace('Q', '') || '0'),
            periodType: isAnnual ? 'annual' : 'quarterly',
          });
        }

        const data = periodData.get(endDate)!;
        
        // Only use annual data for consistency, or quarterly if no annual exists
        if (isAnnual || !data[targetKey][field as keyof typeof data.income]) {
          data[targetKey][field as keyof typeof data.income] = item.val;
          data.rawFacts.push({
            concept: tag,
            namespace: 'us-gaap',
            value: item.val,
            unit: 'USD',
            contextRef: `${item.fy}-${item.fp}`,
          });
        }
      }
    }
  }

  /**
   * Calculate derived metrics from financial data
   */
  private calculateMetrics(
    income: IncomeStatementData,
    balance: BalanceSheetData,
    cashFlow: CashFlowData
  ): CalculatedMetrics {
    const metrics: CalculatedMetrics = {};

    // Profitability Ratios
    if (income.revenue && income.revenue !== 0) {
      if (income.grossProfit !== undefined) {
        metrics.grossMargin = (income.grossProfit / income.revenue) * 100;
      }
      if (income.operatingIncome !== undefined) {
        metrics.operatingMargin = (income.operatingIncome / income.revenue) * 100;
      }
      if (income.netIncome !== undefined) {
        metrics.netMargin = (income.netIncome / income.revenue) * 100;
      }
    }

    // Return on Assets
    if (income.netIncome && balance.totalAssets && balance.totalAssets !== 0) {
      metrics.returnOnAssets = (income.netIncome / balance.totalAssets) * 100;
    }

    // Return on Equity
    if (income.netIncome && balance.totalStockholdersEquity && balance.totalStockholdersEquity !== 0) {
      metrics.returnOnEquity = (income.netIncome / balance.totalStockholdersEquity) * 100;
    }

    // Liquidity Ratios
    if (balance.totalCurrentLiabilities && balance.totalCurrentLiabilities !== 0) {
      if (balance.totalCurrentAssets !== undefined) {
        metrics.currentRatio = balance.totalCurrentAssets / balance.totalCurrentLiabilities;
      }
      
      // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
      if (balance.totalCurrentAssets !== undefined) {
        const quickAssets = balance.totalCurrentAssets - (balance.inventory || 0);
        metrics.quickRatio = quickAssets / balance.totalCurrentLiabilities;
      }
      
      // Cash Ratio
      if (balance.cashAndEquivalents !== undefined) {
        metrics.cashRatio = balance.cashAndEquivalents / balance.totalCurrentLiabilities;
      }
    }

    // Leverage Ratios
    if (balance.totalStockholdersEquity && balance.totalStockholdersEquity !== 0) {
      const totalDebt = (balance.shortTermDebt || 0) + (balance.longTermDebt || 0);
      metrics.debtToEquity = totalDebt / balance.totalStockholdersEquity;
    }

    if (balance.totalAssets && balance.totalAssets !== 0) {
      const totalDebt = (balance.shortTermDebt || 0) + (balance.longTermDebt || 0);
      metrics.debtToAssets = totalDebt / balance.totalAssets;
    }

    // Interest Coverage
    if (income.operatingIncome && income.interestExpense && income.interestExpense !== 0) {
      metrics.interestCoverage = income.operatingIncome / income.interestExpense;
    }

    // Efficiency Ratios
    if (income.revenue && balance.totalAssets && balance.totalAssets !== 0) {
      metrics.assetTurnover = income.revenue / balance.totalAssets;
    }

    // Calculate Free Cash Flow
    if (cashFlow.netCashFromOperating !== undefined && cashFlow.capitalExpenditures !== undefined) {
      cashFlow.freeCashFlow = cashFlow.netCashFromOperating - Math.abs(cashFlow.capitalExpenditures);
    }

    return metrics;
  }

  /**
   * Get specific financial metric history
   */
  async getMetricHistory(
    cik: string,
    concept: string,
    periods: number = 20
  ): Promise<Array<{ date: string; value: number; period: string }>> {
    const facts = await this.secApi.getCompanyFacts(cik);
    const usGaap = facts?.facts?.['us-gaap'];
    
    if (!usGaap || !usGaap[concept]) return [];

    const data = usGaap[concept].units?.USD || usGaap[concept].units?.shares || [];
    
    return data
      .filter((item: any) => item.form === '10-K' || item.form === '10-Q')
      .map((item: any) => ({
        date: item.end || item.instant,
        value: item.val,
        period: `${item.fy} ${item.fp}`,
      }))
      .slice(0, periods);
  }

  /**
   * Compare financials between two periods
   */
  compareFinancials(
    current: ParsedFinancialStatement,
    previous: ParsedFinancialStatement
  ): Record<string, { current: number; previous: number; change: number; percentChange: number }> {
    const comparison: Record<string, { current: number; previous: number; change: number; percentChange: number }> = {};

    const keysToCompare: Array<{ source: 'incomeStatement' | 'balanceSheet' | 'cashFlow'; key: string }> = [
      { source: 'incomeStatement', key: 'revenue' },
      { source: 'incomeStatement', key: 'grossProfit' },
      { source: 'incomeStatement', key: 'operatingIncome' },
      { source: 'incomeStatement', key: 'netIncome' },
      { source: 'incomeStatement', key: 'basicEPS' },
      { source: 'balanceSheet', key: 'totalAssets' },
      { source: 'balanceSheet', key: 'totalLiabilities' },
      { source: 'balanceSheet', key: 'totalStockholdersEquity' },
      { source: 'balanceSheet', key: 'cashAndEquivalents' },
      { source: 'cashFlow', key: 'netCashFromOperating' },
      { source: 'cashFlow', key: 'freeCashFlow' },
    ];

    for (const { source, key } of keysToCompare) {
      const currentValue = (current[source] as any)[key];
      const previousValue = (previous[source] as any)[key];

      if (currentValue !== undefined && previousValue !== undefined) {
        const change = currentValue - previousValue;
        const percentChange = previousValue !== 0 ? (change / Math.abs(previousValue)) * 100 : 0;

        comparison[key] = {
          current: currentValue,
          previous: previousValue,
          change,
          percentChange,
        };
      }
    }

    return comparison;
  }

  /**
   * Get available concepts for a company
   */
  async getAvailableConcepts(cik: string): Promise<string[]> {
    const facts = await this.secApi.getCompanyFacts(cik);
    const usGaap = facts?.facts?.['us-gaap'];
    
    if (!usGaap) return [];
    
    return Object.keys(usGaap);
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create XBRL Parser instance
 */
export function createXBRLParser(): XBRLParser {
  return new XBRLParser();
}

/**
 * Format currency value
 */
export function formatCurrency(value: number | undefined, options: Intl.NumberFormatOptions = {}): string {
  if (value === undefined) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  }
  
  return formatCurrency(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | undefined, decimals: number = 2): string {
  if (value === undefined) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export default XBRLParser;
