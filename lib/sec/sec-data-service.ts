/**
 * SEC Data Service
 * Database operations for SEC filing data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  SECFiling, 
  Form4Filing, 
  Form4Transaction,
} from '../api/sec-edgar-api';
import { ParsedFinancialStatement } from './xbrl-parser';
import { ExtractedSection } from './sec-text-extractor';

// ==================== SUPABASE CLIENT ====================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let secSupabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!secSupabase) {
    secSupabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return secSupabase;
}

// ==================== TYPES ====================

export interface StoredCompany {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StoredFiling {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItem {
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

// ==================== COMPANY OPERATIONS ====================

export async function upsertCompany(
  cik: string,
  ticker: string | null,
  name: string,
  metadata: Record<string, unknown> = {}
): Promise<StoredCompany | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('sec_companies')
    .upsert({
      cik,
      ticker,
      company_name: name,
      metadata,
    } as Record<string, unknown>, {
      onConflict: 'cik',
    })
    .select()
    .single();

  if (error) {
    console.error('[SEC DB] Error upserting company:', error);
    return null;
  }

  return data as StoredCompany;
}

export async function getCompanyByCIK(cik: string): Promise<StoredCompany | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('sec_companies')
    .select('*')
    .eq('cik', cik)
    .single();

  if (error) {
    console.error('[SEC DB] Error fetching company:', error);
    return null;
  }

  return data as StoredCompany;
}

export async function getCompanyByTicker(ticker: string): Promise<StoredCompany | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('sec_companies')
    .select('*')
    .ilike('ticker', ticker)
    .single();

  if (error) {
    console.error('[SEC DB] Error fetching company:', error);
    return null;
  }

  return data as StoredCompany;
}

// ==================== FILING OPERATIONS ====================

export async function storeFiling(filing: SECFiling): Promise<StoredFiling | null> {
  const client = getClient();
  if (!client) return null;

  // First, ensure company exists
  const company = await upsertCompany(filing.cik, filing.ticker || null, filing.companyName);

  const { data, error } = await client
    .from('sec_filings')
    .upsert({
      company_id: company?.id,
      cik: filing.cik,
      accession_number: filing.accessionNumber,
      form_type: filing.form,
      filing_date: filing.filingDate,
      primary_document: filing.primaryDocument,
      primary_document_url: filing.primaryDocumentUrl,
      filing_detail_url: filing.filingDetailUrl,
      size_bytes: filing.size,
      status: 'pending',
    } as Record<string, unknown>, {
      onConflict: 'accession_number',
    })
    .select()
    .single();

  if (error) {
    console.error('[SEC DB] Error storing filing:', error);
    return null;
  }

  return data as StoredFiling;
}

export async function getFilingByAccession(accessionNumber: string): Promise<StoredFiling | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('sec_filings')
    .select('*')
    .eq('accession_number', accessionNumber)
    .single();

  if (error) {
    return null;
  }

  return data as StoredFiling;
}

export async function getCompanyFilings(
  cik: string,
  formTypes?: string[],
  limit: number = 50
): Promise<StoredFiling[]> {
  const client = getClient();
  if (!client) return [];

  let query = client
    .from('sec_filings')
    .select('*')
    .eq('cik', cik)
    .order('filing_date', { ascending: false })
    .limit(limit);

  if (formTypes && formTypes.length > 0) {
    query = query.in('form_type', formTypes);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SEC DB] Error fetching filings:', error);
    return [];
  }

  return (data as StoredFiling[]) || [];
}

export async function updateFilingStatus(
  accessionNumber: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const updateData: Record<string, unknown> = { status };
  
  if (status === 'completed') {
    updateData.processed_at = new Date().toISOString();
  }
  
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await client
    .from('sec_filings')
    .update(updateData)
    .eq('accession_number', accessionNumber);

  if (error) {
    console.error('[SEC DB] Error updating filing status:', error);
    return false;
  }

  return true;
}

// ==================== FINANCIAL DATA OPERATIONS ====================

export async function storeFinancials(
  filingId: string,
  companyId: string,
  cik: string,
  statement: ParsedFinancialStatement
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { error } = await client
    .from('sec_financials')
    .upsert({
      filing_id: filingId,
      company_id: companyId,
      cik,
      period_end_date: statement.periodEndDate,
      period_type: statement.periodType,
      fiscal_year: statement.fiscalYear,
      fiscal_quarter: statement.fiscalQuarter,
      
      // Income Statement
      revenue: statement.incomeStatement.revenue,
      cost_of_revenue: statement.incomeStatement.costOfRevenue,
      gross_profit: statement.incomeStatement.grossProfit,
      research_and_development: statement.incomeStatement.researchAndDevelopment,
      selling_general_admin: statement.incomeStatement.sellingGeneralAdmin,
      operating_expenses: statement.incomeStatement.operatingExpenses,
      operating_income: statement.incomeStatement.operatingIncome,
      interest_expense: statement.incomeStatement.interestExpense,
      interest_income: statement.incomeStatement.interestIncome,
      income_before_tax: statement.incomeStatement.incomeBeforeTax,
      income_tax_expense: statement.incomeStatement.incomeTaxExpense,
      net_income: statement.incomeStatement.netIncome,
      basic_eps: statement.incomeStatement.basicEPS,
      diluted_eps: statement.incomeStatement.dilutedEPS,
      basic_shares_outstanding: statement.incomeStatement.basicSharesOutstanding,
      diluted_shares_outstanding: statement.incomeStatement.dilutedSharesOutstanding,
      
      // Balance Sheet
      cash_and_equivalents: statement.balanceSheet.cashAndEquivalents,
      short_term_investments: statement.balanceSheet.shortTermInvestments,
      accounts_receivable: statement.balanceSheet.accountsReceivable,
      inventory: statement.balanceSheet.inventory,
      total_current_assets: statement.balanceSheet.totalCurrentAssets,
      property_plant_equipment: statement.balanceSheet.propertyPlantEquipment,
      goodwill: statement.balanceSheet.goodwill,
      intangible_assets: statement.balanceSheet.intangibleAssets,
      total_assets: statement.balanceSheet.totalAssets,
      accounts_payable: statement.balanceSheet.accountsPayable,
      short_term_debt: statement.balanceSheet.shortTermDebt,
      total_current_liabilities: statement.balanceSheet.totalCurrentLiabilities,
      long_term_debt: statement.balanceSheet.longTermDebt,
      total_liabilities: statement.balanceSheet.totalLiabilities,
      common_stock: statement.balanceSheet.commonStock,
      retained_earnings: statement.balanceSheet.retainedEarnings,
      total_stockholders_equity: statement.balanceSheet.totalStockholdersEquity,
      total_equity: statement.balanceSheet.totalEquity,
      
      // Cash Flow
      net_cash_from_operating: statement.cashFlow.netCashFromOperating,
      depreciation_amortization: statement.cashFlow.depreciation,
      capital_expenditures: statement.cashFlow.capitalExpenditures,
      net_cash_from_investing: statement.cashFlow.netCashFromInvesting,
      net_cash_from_financing: statement.cashFlow.netCashFromFinancing,
      dividends_paid: statement.cashFlow.dividendsPaid,
      free_cash_flow: statement.cashFlow.freeCashFlow,
      
      // Metrics
      gross_margin: statement.metrics.grossMargin,
      operating_margin: statement.metrics.operatingMargin,
      net_margin: statement.metrics.netMargin,
      return_on_assets: statement.metrics.returnOnAssets,
      return_on_equity: statement.metrics.returnOnEquity,
      current_ratio: statement.metrics.currentRatio,
      quick_ratio: statement.metrics.quickRatio,
      debt_to_equity: statement.metrics.debtToEquity,
      debt_to_assets: statement.metrics.debtToAssets,
    } as Record<string, unknown>, {
      onConflict: 'company_id,period_end_date,period_type',
    });

  if (error) {
    console.error('[SEC DB] Error storing financials:', error);
    return false;
  }

  return true;
}

export async function getFinancialHistory(
  cik: string,
  periods: number = 10
): Promise<unknown[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('sec_financials')
    .select('*')
    .eq('cik', cik)
    .eq('period_type', 'annual')
    .order('period_end_date', { ascending: false })
    .limit(periods);

  if (error) {
    console.error('[SEC DB] Error fetching financials:', error);
    return [];
  }

  return data || [];
}

// ==================== INSIDER TRADING OPERATIONS ====================

export async function storeInsiderTransaction(
  filingId: string,
  companyId: string,
  filing: Form4Filing,
  transaction: Form4Transaction
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const transactionType = transaction.isAcquisition ? 'purchase' : 'sale';
  const totalValue = (transaction.sharesAmount || 0) * (transaction.pricePerShare || 0);

  const { error } = await client
    .from('sec_insider_transactions')
    .insert({
      filing_id: filingId,
      company_id: companyId,
      issuer_cik: filing.issuerCik,
      issuer_ticker: filing.issuerTicker,
      issuer_name: filing.issuerName,
      owner_cik: filing.reportingOwner.cik,
      owner_name: filing.reportingOwner.name,
      is_director: filing.reportingOwner.isDirector,
      is_officer: filing.reportingOwner.isOfficer,
      officer_title: filing.reportingOwner.officerTitle,
      is_ten_percent_owner: filing.reportingOwner.isTenPercentOwner,
      security_title: transaction.securityTitle,
      transaction_date: transaction.transactionDate,
      transaction_type: transactionType,
      transaction_code: transaction.transactionCode,
      shares_amount: transaction.sharesAmount,
      price_per_share: transaction.pricePerShare,
      total_value: totalValue,
      shares_owned_after: transaction.sharesOwnedAfter,
      direct_or_indirect: transaction.directOrIndirect,
      is_acquisition: transaction.isAcquisition,
      filing_date: filing.filingDate,
      accession_number: filing.accessionNumber,
    } as Record<string, unknown>);

  if (error) {
    console.error('[SEC DB] Error storing insider transaction:', error);
    return false;
  }

  return true;
}

export async function getInsiderTransactions(
  cik: string,
  days: number = 90
): Promise<unknown[]> {
  const client = getClient();
  if (!client) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await client
    .from('sec_insider_transactions')
    .select('*')
    .eq('issuer_cik', cik)
    .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('[SEC DB] Error fetching insider transactions:', error);
    return [];
  }

  return data || [];
}

// ==================== FILING SECTIONS OPERATIONS ====================

export async function storeFilingSection(
  filingId: string,
  companyId: string,
  section: ExtractedSection
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  // Calculate text hash for comparison
  const encoder = new TextEncoder();
  const textData = encoder.encode(section.plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', textData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const textHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { error } = await client
    .from('sec_filing_sections')
    .upsert({
      filing_id: filingId,
      company_id: companyId,
      section_name: section.name,
      section_number: section.number,
      section_title: section.title,
      plain_text: section.plainText,
      word_count: section.wordCount,
      character_count: section.characterCount,
      keywords: section.keywords,
      sentiment_score: section.sentiment?.score,
      sentiment_label: section.sentiment?.label,
      positive_words: section.sentiment?.positiveWords,
      negative_words: section.sentiment?.negativeWords,
      text_hash: textHash,
    } as Record<string, unknown>, {
      onConflict: 'filing_id,section_name',
    });

  if (error) {
    console.error('[SEC DB] Error storing filing section:', error);
    return false;
  }

  return true;
}

// ==================== WATCHLIST OPERATIONS ====================

export async function getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('sec_watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SEC DB] Error fetching watchlist:', error);
    return [];
  }

  return (data as WatchlistItem[]) || [];
}

export async function addToWatchlist(
  userId: string,
  ticker: string,
  cik: string,
  companyId?: string,
  formTypes: string[] = ['10-K', '10-Q', '8-K', '4']
): Promise<WatchlistItem | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('sec_watchlist')
    .upsert({
      user_id: userId,
      company_id: companyId,
      ticker: ticker.toUpperCase(),
      cik,
      form_types: formTypes,
      priority: 'medium',
      notification_enabled: true,
    } as Record<string, unknown>, {
      onConflict: 'user_id,company_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[SEC DB] Error adding to watchlist:', error);
    return null;
  }

  return data as WatchlistItem;
}

export async function removeFromWatchlist(
  userId: string,
  ticker: string
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { error } = await client
    .from('sec_watchlist')
    .delete()
    .eq('user_id', userId)
    .ilike('ticker', ticker);

  if (error) {
    console.error('[SEC DB] Error removing from watchlist:', error);
    return false;
  }

  return true;
}

// ==================== ALERT OPERATIONS ====================

export async function createFilingAlert(
  userId: string,
  filingId: string,
  companyId: string,
  alertType: string,
  title: string,
  message?: string,
  priority: string = 'medium'
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { error } = await client
    .from('sec_filing_alerts')
    .insert({
      user_id: userId,
      filing_id: filingId,
      company_id: companyId,
      alert_type: alertType,
      title,
      message,
      priority,
    } as Record<string, unknown>);

  if (error) {
    console.error('[SEC DB] Error creating alert:', error);
    return false;
  }

  return true;
}

export async function getUserAlerts(
  userId: string,
  unreadOnly: boolean = false
): Promise<unknown[]> {
  const client = getClient();
  if (!client) return [];

  let query = client
    .from('sec_filing_alerts')
    .select('*, filing:sec_filings(*), company:sec_companies(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('[SEC DB] Error fetching alerts:', error);
    return [];
  }

  return data || [];
}

export async function markAlertAsRead(alertId: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { error } = await client
    .from('sec_filing_alerts')
    .update({ is_read: true, read_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', alertId);

  if (error) {
    console.error('[SEC DB] Error marking alert as read:', error);
    return false;
  }

  return true;
}

// ==================== BULK OPERATIONS ====================

export async function storeMultipleFilings(filings: SECFiling[]): Promise<number> {
  let stored = 0;
  for (const filing of filings) {
    const result = await storeFiling(filing);
    if (result) stored++;
  }
  return stored;
}

export async function processFilingWithSections(
  filing: SECFiling,
  sections: ExtractedSection[]
): Promise<boolean> {
  const storedFiling = await storeFiling(filing);
  if (!storedFiling) return false;

  await updateFilingStatus(filing.accessionNumber, 'processing');

  try {
    for (const section of sections) {
      await storeFilingSection(storedFiling.id, storedFiling.company_id || '', section);
    }
    await updateFilingStatus(filing.accessionNumber, 'completed');
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateFilingStatus(filing.accessionNumber, 'failed', errorMsg);
    return false;
  }
}

// ==================== SEARCH OPERATIONS ====================

export async function searchCompanies(query: string, limit: number = 20): Promise<StoredCompany[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('sec_companies')
    .select('*')
    .or(`company_name.ilike.%${query}%,ticker.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('[SEC DB] Error searching companies:', error);
    return [];
  }

  return (data as StoredCompany[]) || [];
}

export async function getRecentFilings(
  formTypes?: string[],
  limit: number = 50
): Promise<StoredFiling[]> {
  const client = getClient();
  if (!client) return [];

  let query = client
    .from('sec_filings')
    .select('*')
    .order('filing_date', { ascending: false })
    .limit(limit);

  if (formTypes && formTypes.length > 0) {
    query = query.in('form_type', formTypes);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SEC DB] Error fetching recent filings:', error);
    return [];
  }

  return (data as StoredFiling[]) || [];
}
