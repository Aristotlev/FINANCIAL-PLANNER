/**
 * SEC EDGAR Cache Service — PERMANENT STORAGE MODEL
 *
 * Architecture:
 *   - DB stores ALL data PERMANENTLY (data is never "stale" or discarded)
 *   - API calls ONLY fetch NEW/incremental data → store into DB
 *   - Users ALWAYS read from DB
 *
 * Smart Sync TTLs (market-hours aware):
 *   TTLs control WHEN to trigger a background sync for new data,
 *   NOT whether existing data is valid. Existing data is always valid.
 *
 * Flow:
 *   1. User requests data → ALWAYS return DB rows (permanent)
 *   2. If TTL has expired → trigger background sync to fetch NEW data
 *   3. Background sync fetches only data NEWER than what's in DB
 *   4. New data is stored → available on next request
 *
 * Tables used:
 *   - sec_companies      → company CIK/ticker/name lookups
 *   - sec_filings        → 10-K, 10-Q, 8-K, Form 4, etc.
 *   - sec_financials     → XBRL parsed financial statements
 *   - sec_institutional_holdings → 13F holdings
 *   - sec_filing_sections → extracted text (risk factors, MD&A, etc.)
 *   - sec_cache_refresh_log → tracks last sync time per cache key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CompanyCIKMapping,
  SECFiling,
  XBRLFinancials,
  Filing13F,
  Holding13F,
  FilingTextSection,
  FilingType,
  SECFilingDetail,
} from './api/sec-edgar-api';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CacheResult<T> {
  data: T;
  source: 'db' | 'fresh';
  cachedAt?: string;
  ageSeconds?: number;
  ttlSeconds?: number;
  /**
   * True when DB data exists but the sync TTL has expired.
   * The route should serve the existing data AND trigger a
   * background API call to fetch NEW/incremental data.
   */
  needsBackgroundRefresh: boolean;
}

interface RefreshLog {
  cache_key: string;
  last_refresh_at: string;
  ttl_seconds: number;
  status: string;
  item_count?: number;
}

// ═══════════════════════════════════════════════════════════════════
// SYNC TTLs — control when to CHECK for new data, NOT data validity
// Data in DB is always valid. These TTLs only decide when the next
// background sync to SEC EDGAR should be triggered.
// ═══════════════════════════════════════════════════════════════════

export const SEC_CACHE_TTL = {
  /** Company profile (CIK, ticker, name, SIC) — rarely changes */
  COMPANY_PROFILE: () => 24 * 60 * 60, // 24h always

  /** Filing list — changes when new filings are submitted */
  FILINGS_LIST: () => {
    const { isMarketHours, isWeekend } = getMarketState();
    if (isWeekend) return 12 * 60 * 60;   // 12h weekends
    if (isMarketHours) return 15 * 60;     // 15min market hours
    return 2 * 60 * 60;                     // 2h off hours
  },

  /** XBRL financials — only updates with new 10-K/10-Q */
  FINANCIALS: () => 6 * 60 * 60, // 6h always

  /** 13F holdings — quarterly, very stable */
  HOLDINGS: () => 24 * 60 * 60, // 24h always

  /** Filing sections (risk factors, MD&A) — immutable once filed */
  FILING_SECTIONS: () => 7 * 24 * 60 * 60, // 7 days (filed docs don't change)

  /** Company tickers JSON — global mapping, refreshed by cron */
  COMPANY_TICKERS: () => 24 * 60 * 60, // 24h
};

function getMarketState() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const mins = et.getMinutes();
  const timeInMins = hours * 60 + mins;

  return {
    isWeekend: day === 0 || day === 6,
    isMarketHours: day >= 1 && day <= 5 && timeInMins >= 570 && timeInMins <= 960,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SEC CACHE SERVICE
// ═══════════════════════════════════════════════════════════════════

class SECCacheService {
  private _supabase: SupabaseClient | null = null;

  /** Lazy Supabase client — uses service_role for server-side writes */
  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Supabase environment variables not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are set.');
      }
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  // ─────────────────────────────────────────────────────────────────
  // REFRESH LOG — tracks when each cache key was last refreshed
  // ─────────────────────────────────────────────────────────────────

  private async getRefreshLog(cacheKey: string): Promise<RefreshLog | null> {
    try {
      const { data } = await this.supabase
        .from('sec_cache_refresh_log')
        .select('*')
        .eq('cache_key', cacheKey)
        .order('last_refresh_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    } catch {
      return null;
    }
  }

  private async updateRefreshLog(
    cacheKey: string,
    ttlSeconds: number,
    itemCount: number,
    status: string = 'success'
  ): Promise<void> {
    try {
      await this.supabase
        .from('sec_cache_refresh_log')
        .upsert({
          cache_key: cacheKey,
          last_refresh_at: new Date().toISOString(),
          ttl_seconds: ttlSeconds,
          item_count: itemCount,
          status,
        }, { onConflict: 'cache_key' });
    } catch (err) {
      console.warn('[SEC Cache] Failed to update refresh log:', err);
    }
  }

  private isCacheFresh(log: RefreshLog | null, ttlSeconds: number): boolean {
    if (!log) return false;
    const age = (Date.now() - new Date(log.last_refresh_at).getTime()) / 1000;
    return age < ttlSeconds;
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPANIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get company by ticker — checks sec_companies first
   */
  async getCompanyByTicker(ticker: string): Promise<CacheResult<CompanyCIKMapping | null>> {
    const upperTicker = ticker.toUpperCase().trim();

    try {
      const { data } = await this.supabase
        .from('sec_companies')
        .select('cik, ticker, company_name, exchange')
        .eq('ticker', upperTicker)
        .maybeSingle();

      if (data) {
        return {
          data: { cik: data.cik, ticker: data.ticker, name: data.company_name, exchange: data.exchange },
          source: 'db',
          needsBackgroundRefresh: false,
        };
      }
    } catch (err) {
      console.warn('[SEC Cache] Company lookup error:', err);
    }

    return { data: null, source: 'db', needsBackgroundRefresh: false };
  }

  /**
   * Get company by CIK
   */
  async getCompanyByCIK(cik: string): Promise<CacheResult<CompanyCIKMapping | null>> {
    const normalizedCIK = cik.padStart(10, '0');

    try {
      const { data } = await this.supabase
        .from('sec_companies')
        .select('cik, ticker, company_name, exchange')
        .eq('cik', normalizedCIK)
        .maybeSingle();

      if (data) {
        return {
          data: { cik: data.cik, ticker: data.ticker, name: data.company_name, exchange: data.exchange },
          source: 'db',
          needsBackgroundRefresh: false,
        };
      }
    } catch (err) {
      console.warn('[SEC Cache] Company CIK lookup error:', err);
    }

    return { data: null, source: 'db', needsBackgroundRefresh: false };
  }

  /**
   * Search companies from sec_companies table
   */
  async searchCompanies(query: string, limit: number = 10): Promise<CacheResult<CompanyCIKMapping[]>> {
    const q = query.trim().toLowerCase();
    if (!q) return { data: [], source: 'db', needsBackgroundRefresh: false };

    try {
      // Try exact ticker match first
      const { data: exactMatch } = await this.supabase
        .from('sec_companies')
        .select('cik, ticker, company_name, exchange')
        .ilike('ticker', q)
        .limit(1);

      // Then prefix match on ticker
      const { data: tickerPrefix } = await this.supabase
        .from('sec_companies')
        .select('cik, ticker, company_name, exchange')
        .ilike('ticker', `${q}%`)
        .limit(limit);

      // Then name search
      const { data: nameMatch } = await this.supabase
        .from('sec_companies')
        .select('cik, ticker, company_name, exchange')
        .ilike('company_name', `%${q}%`)
        .limit(limit);

      // Merge and deduplicate
      const seen = new Set<string>();
      const results: CompanyCIKMapping[] = [];

      for (const row of [...(exactMatch || []), ...(tickerPrefix || []), ...(nameMatch || [])]) {
        if (seen.has(row.cik)) continue;
        seen.add(row.cik);
        results.push({
          cik: row.cik,
          ticker: row.ticker,
          name: row.company_name,
          exchange: row.exchange,
        });
        if (results.length >= limit) break;
      }

      return { data: results, source: 'db', needsBackgroundRefresh: false };
    } catch (err) {
      console.warn('[SEC Cache] Company search error:', err);
      return { data: [], source: 'db', needsBackgroundRefresh: false };
    }
  }

  /**
   * Bulk upsert companies (used by cron to refresh company_tickers.json)
   */
  async upsertCompanies(companies: CompanyCIKMapping[]): Promise<{ success: boolean; count: number }> {
    const batchSize = 500;
    let totalUpserted = 0;

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize).map(c => ({
        cik: c.cik,
        ticker: c.ticker,
        company_name: c.name,
        exchange: c.exchange || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('sec_companies')
        .upsert(batch, { onConflict: 'cik' });

      if (error) {
        console.error(`[SEC Cache] Company upsert batch error:`, error);
      } else {
        totalUpserted += batch.length;
      }
    }

    await this.updateRefreshLog('companies:all', SEC_CACHE_TTL.COMPANY_TICKERS(), totalUpserted);
    return { success: true, count: totalUpserted };
  }

  // ═══════════════════════════════════════════════════════════════
  // FILINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get filings for a company — ALWAYS returns DB data if rows exist.
   * Sets needsBackgroundRefresh=true when sync TTL has expired.
   */
  async getFilings(
    cik: string,
    options?: { formTypes?: FilingType[]; limit?: number }
  ): Promise<CacheResult<SECFiling[]>> {
    const normalizedCIK = cik.padStart(10, '0');
    const cacheKey = `filings:${normalizedCIK}`;
    const ttl = SEC_CACHE_TTL.FILINGS_LIST();

    // Check if a background refresh is needed (TTL expired)
    const log = await this.getRefreshLog(cacheKey);
    const needsBackgroundRefresh = !this.isCacheFresh(log, ttl);

    try {
      let query = this.supabase
        .from('sec_filings')
        .select('*')
        .eq('cik', normalizedCIK)
        .order('filing_date', { ascending: false });

      if (options?.formTypes && options.formTypes.length > 0) {
        query = query.in('form_type', options.formTypes);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SEC Cache] Filings read error:', error);
        return { data: [], source: 'db', needsBackgroundRefresh: true };
      }

      const filings: SECFiling[] = (data || []).map(row => ({
        accessionNumber: row.accession_number,
        filingDate: row.filing_date,
        form: row.form_type,
        primaryDocument: row.primary_document || '',
        primaryDocumentUrl: row.primary_document_url || '',
        filingDetailUrl: row.filing_detail_url || '',
        size: row.size_bytes || 0,
        cik: row.cik,
        ticker: row.metadata?.ticker || '',
        companyName: row.metadata?.company_name || '',
      }));

      return {
        data: filings,
        source: 'db',
        cachedAt: log?.last_refresh_at,
        ageSeconds: log ? Math.round((Date.now() - new Date(log.last_refresh_at).getTime()) / 1000) : undefined,
        ttlSeconds: ttl,
        needsBackgroundRefresh,
      };
    } catch (err) {
      console.warn('[SEC Cache] Filings read error:', err);
      return { data: [], source: 'db', needsBackgroundRefresh: true };
    }
  }

  /**
   * Write filings to cache (used after fresh SEC fetch)
   */
  async writeFilings(cik: string, filings: SECFiling[]): Promise<void> {
    const normalizedCIK = cik.padStart(10, '0');
    if (filings.length === 0) return;

    try {
      // Ensure company exists
      const companyName = filings[0]?.companyName || '';
      const ticker = filings[0]?.ticker || '';
      if (ticker || companyName) {
        await this.supabase.from('sec_companies').upsert({
          cik: normalizedCIK,
          ticker: ticker || null,
          company_name: companyName || 'Unknown',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'cik' });
      }

      // Map form types to enum-safe values
      const formTypeMap: Record<string, string> = {
        '10-K': '10-K', '10-Q': '10-Q', '8-K': '8-K', '4': '4',
        '13F-HR': '13F-HR', '13F-NT': '13F-NT', 'DEF 14A': 'DEF 14A',
        'DEFA14A': 'DEFA14A', 'S-1': 'S-1', 'S-3': 'S-3', '424B': '424B',
      };

      const rows = filings.map(f => ({
        cik: normalizedCIK,
        accession_number: f.accessionNumber,
        form_type: formTypeMap[f.form] || 'OTHER',
        filing_date: f.filingDate,
        primary_document: f.primaryDocument,
        primary_document_url: f.primaryDocumentUrl,
        filing_detail_url: f.filingDetailUrl,
        size_bytes: f.size,
        metadata: { ticker: f.ticker, company_name: f.companyName },
        updated_at: new Date().toISOString(),
      }));

      // Batch upsert
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await this.supabase
          .from('sec_filings')
          .upsert(batch, { onConflict: 'accession_number' });
      }

      const ttl = SEC_CACHE_TTL.FILINGS_LIST();
      await this.updateRefreshLog(`filings:${normalizedCIK}`, ttl, filings.length);
      console.log(`[SEC Cache] Cached ${filings.length} filings for CIK ${normalizedCIK}`);
    } catch (err) {
      console.error('[SEC Cache] Filings write error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FINANCIALS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get XBRL financials — ALWAYS returns DB data if rows exist.
   * Sets needsBackgroundRefresh=true when sync TTL has expired.
   */
  async getFinancials(
    cik: string,
    options?: { periods?: number }
  ): Promise<CacheResult<XBRLFinancials[]>> {
    const normalizedCIK = cik.padStart(10, '0');
    const cacheKey = `financials:${normalizedCIK}`;
    const ttl = SEC_CACHE_TTL.FINANCIALS();

    const log = await this.getRefreshLog(cacheKey);
    const needsBackgroundRefresh = !this.isCacheFresh(log, ttl);

    try {
      let query = this.supabase
        .from('sec_financials')
        .select('*')
        .eq('cik', normalizedCIK)
        .order('period_end_date', { ascending: false });

      if (options?.periods) {
        query = query.limit(options.periods);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SEC Cache] Financials read error:', error);
        return { data: [], source: 'db', needsBackgroundRefresh: true };
      }

      const financials: XBRLFinancials[] = (data || []).map(row => ({
        revenue: row.revenue ? parseFloat(row.revenue) : undefined,
        costOfRevenue: row.cost_of_revenue ? parseFloat(row.cost_of_revenue) : undefined,
        grossProfit: row.gross_profit ? parseFloat(row.gross_profit) : undefined,
        operatingExpenses: row.operating_expenses ? parseFloat(row.operating_expenses) : undefined,
        operatingIncome: row.operating_income ? parseFloat(row.operating_income) : undefined,
        netIncome: row.net_income ? parseFloat(row.net_income) : undefined,
        earningsPerShareBasic: row.basic_eps ? parseFloat(row.basic_eps) : undefined,
        earningsPerShareDiluted: row.diluted_eps ? parseFloat(row.diluted_eps) : undefined,
        totalAssets: row.total_assets ? parseFloat(row.total_assets) : undefined,
        totalLiabilities: row.total_liabilities ? parseFloat(row.total_liabilities) : undefined,
        totalEquity: row.total_equity ? parseFloat(row.total_equity) : undefined,
        cash: row.cash_and_equivalents ? parseFloat(row.cash_and_equivalents) : undefined,
        shortTermInvestments: row.short_term_investments ? parseFloat(row.short_term_investments) : undefined,
        accountsReceivable: row.accounts_receivable ? parseFloat(row.accounts_receivable) : undefined,
        inventory: row.inventory ? parseFloat(row.inventory) : undefined,
        currentAssets: row.total_current_assets ? parseFloat(row.total_current_assets) : undefined,
        currentLiabilities: row.total_current_liabilities ? parseFloat(row.total_current_liabilities) : undefined,
        longTermDebt: row.long_term_debt ? parseFloat(row.long_term_debt) : undefined,
        operatingCashFlow: row.net_cash_from_operating ? parseFloat(row.net_cash_from_operating) : undefined,
        investingCashFlow: row.net_cash_from_investing ? parseFloat(row.net_cash_from_investing) : undefined,
        financingCashFlow: row.net_cash_from_financing ? parseFloat(row.net_cash_from_financing) : undefined,
        capitalExpenditures: row.capital_expenditures ? parseFloat(row.capital_expenditures) : undefined,
        freeCashFlow: row.free_cash_flow ? parseFloat(row.free_cash_flow) : undefined,
        dividendsPaid: row.dividends_paid ? parseFloat(row.dividends_paid) : undefined,
        periodEndDate: row.period_end_date,
        fiscalYear: row.fiscal_year?.toString(),
        fiscalPeriod: row.period_type === 'annual' ? 'FY' : `Q${row.fiscal_quarter || ''}`,
        documentType: row.period_type === 'annual' ? '10-K' : '10-Q',
        rawTags: row.raw_data || {},
      }));

      return {
        data: financials,
        source: 'db',
        cachedAt: log?.last_refresh_at,
        ageSeconds: log ? Math.round((Date.now() - new Date(log.last_refresh_at).getTime()) / 1000) : undefined,
        ttlSeconds: ttl,
        needsBackgroundRefresh,
      };
    } catch (err) {
      console.warn('[SEC Cache] Financials read error:', err);
      return { data: [], source: 'db', needsBackgroundRefresh: true };
    }
  }

  /**
   * Write XBRL financials to cache
   */
  async writeFinancials(cik: string, financials: XBRLFinancials[]): Promise<void> {
    const normalizedCIK = cik.padStart(10, '0');
    if (financials.length === 0) return;

    try {
      // Look up company_id
      const { data: company } = await this.supabase
        .from('sec_companies')
        .select('id')
        .eq('cik', normalizedCIK)
        .maybeSingle();

      const rows = financials.map(f => ({
        cik: normalizedCIK,
        company_id: company?.id || null,
        period_end_date: f.periodEndDate,
        period_type: f.documentType === '10-K' ? 'annual' : 'quarterly',
        fiscal_year: f.fiscalYear ? parseInt(f.fiscalYear) : null,
        fiscal_quarter: f.fiscalPeriod?.startsWith('Q') ? parseInt(f.fiscalPeriod.slice(1)) : null,
        revenue: f.revenue,
        cost_of_revenue: f.costOfRevenue,
        gross_profit: f.grossProfit,
        operating_expenses: f.operatingExpenses,
        operating_income: f.operatingIncome,
        net_income: f.netIncome,
        basic_eps: f.earningsPerShareBasic,
        diluted_eps: f.earningsPerShareDiluted,
        total_assets: f.totalAssets,
        total_liabilities: f.totalLiabilities,
        total_equity: f.totalEquity,
        cash_and_equivalents: f.cash,
        short_term_investments: f.shortTermInvestments,
        accounts_receivable: f.accountsReceivable,
        inventory: f.inventory,
        total_current_assets: f.currentAssets,
        total_current_liabilities: f.currentLiabilities,
        long_term_debt: f.longTermDebt,
        net_cash_from_operating: f.operatingCashFlow,
        net_cash_from_investing: f.investingCashFlow,
        net_cash_from_financing: f.financingCashFlow,
        capital_expenditures: f.capitalExpenditures,
        free_cash_flow: f.freeCashFlow,
        dividends_paid: f.dividendsPaid,
        raw_data: f.rawTags || {},
        updated_at: new Date().toISOString(),
      }));

      for (const row of rows) {
        await this.supabase
          .from('sec_financials')
          .upsert(row, { onConflict: 'company_id,period_end_date,period_type' });
      }

      const ttl = SEC_CACHE_TTL.FINANCIALS();
      await this.updateRefreshLog(`financials:${normalizedCIK}`, ttl, financials.length);
      console.log(`[SEC Cache] Cached ${financials.length} financial periods for CIK ${normalizedCIK}`);
    } catch (err) {
      console.error('[SEC Cache] Financials write error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 13F INSTITUTIONAL HOLDINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get 13F holdings — ALWAYS returns DB data if rows exist.
   * Sets needsBackgroundRefresh=true when sync TTL has expired.
   */
  async getHoldings(cik: string): Promise<CacheResult<Filing13F | null>> {
    const normalizedCIK = cik.padStart(10, '0');
    const cacheKey = `holdings:${normalizedCIK}`;
    const ttl = SEC_CACHE_TTL.HOLDINGS();

    const log = await this.getRefreshLog(cacheKey);
    const needsBackgroundRefresh = !this.isCacheFresh(log, ttl);

    try {
      // Get the most recent report_date first
      const { data: latestReport } = await this.supabase
        .from('sec_institutional_holdings')
        .select('report_date, filing_date, manager_name')
        .eq('manager_cik', normalizedCIK)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestReport) {
        return { data: null, source: 'db', needsBackgroundRefresh: true };
      }

      // Get all holdings for that report date
      const { data: holdingsData, error } = await this.supabase
        .from('sec_institutional_holdings')
        .select('*')
        .eq('manager_cik', normalizedCIK)
        .eq('report_date', latestReport.report_date)
        .order('value_thousands', { ascending: false });

      if (error || !holdingsData || holdingsData.length === 0) {
        return { data: null, source: 'db', needsBackgroundRefresh: true };
      }

      let totalValue = 0;
      const holdings: Holding13F[] = holdingsData.map(row => {
        const val = parseFloat(row.value_thousands) || 0;
        totalValue += val;
        return {
          nameOfIssuer: row.issuer_name,
          titleOfClass: row.title_of_class || '',
          cusip: row.cusip,
          value: val,
          shares: parseFloat(row.shares) || 0,
          shareType: (row.share_type as 'SH' | 'PRN') || 'SH',
          investmentDiscretion: (row.investment_discretion as 'SOLE' | 'SHARED' | 'NONE') || 'SOLE',
          votingAuthority: {
            sole: parseFloat(row.voting_sole) || 0,
            shared: parseFloat(row.voting_shared) || 0,
            none: parseFloat(row.voting_none) || 0,
          },
        };
      });

      const filing13F: Filing13F = {
        cik: normalizedCIK,
        managerName: latestReport.manager_name,
        reportDate: latestReport.report_date,
        filingDate: latestReport.filing_date,
        holdings,
        totalValue,
      };

      return {
        data: filing13F,
        source: 'db',
        cachedAt: log?.last_refresh_at,
        ageSeconds: log ? Math.round((Date.now() - new Date(log.last_refresh_at).getTime()) / 1000) : undefined,
        ttlSeconds: ttl,
        needsBackgroundRefresh,
      };
    } catch (err) {
      console.warn('[SEC Cache] Holdings read error:', err);
      return { data: null, source: 'db', needsBackgroundRefresh: true };
    }
  }

  /**
   * Write 13F holdings to cache
   */
  async writeHoldings(cik: string, filing: Filing13F): Promise<void> {
    const normalizedCIK = cik.padStart(10, '0');
    if (!filing || filing.holdings.length === 0) return;

    try {
      const rows = filing.holdings.map(h => ({
        manager_cik: normalizedCIK,
        manager_name: filing.managerName,
        report_date: filing.reportDate || filing.filingDate,
        filing_date: filing.filingDate,
        issuer_name: h.nameOfIssuer,
        title_of_class: h.titleOfClass,
        cusip: h.cusip,
        value_thousands: h.value,
        shares: h.shares,
        share_type: h.shareType,
        investment_discretion: h.investmentDiscretion,
        voting_sole: h.votingAuthority.sole,
        voting_shared: h.votingAuthority.shared,
        voting_none: h.votingAuthority.none,
        metadata: {},
        updated_at: new Date().toISOString(),
      }));

      // Batch upsert
      const batchSize = 200;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await this.supabase
          .from('sec_institutional_holdings')
          .upsert(batch, {
            onConflict: 'manager_cik,cusip,report_date',
          });
      }

      const ttl = SEC_CACHE_TTL.HOLDINGS();
      await this.updateRefreshLog(`holdings:${normalizedCIK}`, ttl, filing.holdings.length);
      console.log(`[SEC Cache] Cached ${filing.holdings.length} holdings for CIK ${normalizedCIK}`);
    } catch (err) {
      console.error('[SEC Cache] Holdings write error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FILING SECTIONS (text extraction)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get cached filing sections — immutable once filed, no TTL needed
   */
  async getFilingSections(
    accessionNumber: string
  ): Promise<CacheResult<FilingTextSection[]>> {
    try {
      const { data, error } = await this.supabase
        .from('sec_filing_sections')
        .select('*')
        .eq('filing_id', accessionNumber); // We'll match via metadata

      // If no data via filing_id, try metadata
      if (error || !data || data.length === 0) {
        return { data: [], source: 'db', needsBackgroundRefresh: false };
      }

      const sections: FilingTextSection[] = data.map(row => ({
        sectionName: row.section_name,
        sectionNumber: row.section_number,
        content: row.plain_text || '',
        wordCount: row.word_count || 0,
      }));

      return { data: sections, source: 'db', needsBackgroundRefresh: false };
    } catch {
      return { data: [], source: 'db', needsBackgroundRefresh: false };
    }
  }

  /**
   * Write filing sections to cache
   */
  async writeFilingSections(
    accessionNumber: string,
    cik: string,
    sections: FilingTextSection[]
  ): Promise<void> {
    if (sections.length === 0) return;
    const normalizedCIK = cik.padStart(10, '0');

    try {
      // Look up filing_id and company_id
      const { data: filing } = await this.supabase
        .from('sec_filings')
        .select('id, company_id')
        .eq('accession_number', accessionNumber)
        .maybeSingle();

      const rows = sections.map(s => ({
        filing_id: filing?.id || null,
        company_id: filing?.company_id || null,
        section_name: s.sectionName,
        section_number: s.sectionNumber || null,
        section_title: s.sectionName,
        plain_text: s.content,
        word_count: s.wordCount,
        character_count: s.content.length,
        updated_at: new Date().toISOString(),
      }));

      for (const row of rows) {
        if (row.filing_id) {
          await this.supabase
            .from('sec_filing_sections')
            .upsert(row, { onConflict: 'filing_id,section_name' });
        }
      }
    } catch (err) {
      console.error('[SEC Cache] Filing sections write error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FILING DETAIL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a single filing by accession number — immutable once filed
   */
  async getFilingDetail(
    cik: string,
    accessionNumber: string
  ): Promise<CacheResult<SECFilingDetail | null>> {
    const normalizedCIK = cik.padStart(10, '0');

    try {
      const { data } = await this.supabase
        .from('sec_filings')
        .select('*')
        .eq('accession_number', accessionNumber)
        .maybeSingle();

      if (!data) return { data: null, source: 'db', needsBackgroundRefresh: false };

      const detail: SECFilingDetail = {
        accessionNumber: data.accession_number,
        filingDate: data.filing_date,
        form: data.form_type,
        primaryDocument: data.primary_document || '',
        primaryDocumentUrl: data.primary_document_url || '',
        filingDetailUrl: data.filing_detail_url || '',
        size: data.size_bytes || 0,
        cik: data.cik,
        ticker: data.metadata?.ticker || '',
        companyName: data.metadata?.company_name || '',
        acceptanceDateTime: data.acceptance_datetime || data.filing_date,
        documents: data.metadata?.documents || [],
      };

      return { data: detail, source: 'db', needsBackgroundRefresh: false };
    } catch {
      return { data: null, source: 'db', needsBackgroundRefresh: false };
    }
  }
  // ═══════════════════════════════════════════════════════════════
  // INCREMENTAL SYNC HELPERS
  // Used by routes and cron to fetch only NEW data from SEC EDGAR
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get the most recent filing date for a CIK in our DB.
   * Used for incremental fetching — only request filings newer than this.
   */
  async getLatestFilingDate(cik: string): Promise<string | null> {
    const normalizedCIK = cik.padStart(10, '0');
    try {
      const { data } = await this.supabase
        .from('sec_filings')
        .select('filing_date')
        .eq('cik', normalizedCIK)
        .order('filing_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.filing_date || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the most recent financial period end date for a CIK in our DB.
   */
  async getLatestFinancialDate(cik: string): Promise<string | null> {
    const normalizedCIK = cik.padStart(10, '0');
    try {
      const { data } = await this.supabase
        .from('sec_financials')
        .select('period_end_date')
        .eq('cik', normalizedCIK)
        .order('period_end_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.period_end_date || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the most recent 13F report date for a manager CIK in our DB.
   */
  async getLatestHoldingsReportDate(managerCik: string): Promise<string | null> {
    const normalizedCIK = managerCik.padStart(10, '0');
    try {
      const { data } = await this.supabase
        .from('sec_institutional_holdings')
        .select('report_date')
        .eq('manager_cik', normalizedCIK)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.report_date || null;
    } catch {
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════

export const secCacheService = new SECCacheService();
export default secCacheService;
