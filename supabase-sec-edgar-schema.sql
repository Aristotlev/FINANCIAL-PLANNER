-- SEC EDGAR Data Schema for Supabase
-- Run this migration to create tables for SEC filing tracking

-- =====================================================
-- ENUMS
-- =====================================================

-- Filing types enum
DO $$ BEGIN
  CREATE TYPE sec_filing_type AS ENUM (
    '10-K', '10-Q', '8-K', '4', '13F-HR', '13F-NT', 
    'DEF 14A', 'DEFA14A', 'S-1', 'S-3', '424B', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Filing status enum
DO $$ BEGIN
  CREATE TYPE sec_filing_status AS ENUM (
    'pending', 'processing', 'completed', 'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Insider transaction type enum
DO $$ BEGIN
  CREATE TYPE insider_transaction_type AS ENUM (
    'purchase', 'sale', 'grant', 'exercise', 'gift', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- COMPANIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cik VARCHAR(10) NOT NULL UNIQUE,
  ticker VARCHAR(10),
  company_name TEXT NOT NULL,
  sic_code VARCHAR(4),
  sic_description TEXT,
  fiscal_year_end VARCHAR(4), -- e.g., "1231" for Dec 31
  state_of_incorporation VARCHAR(2),
  exchange VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_filing_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for companies
CREATE INDEX IF NOT EXISTS idx_sec_companies_ticker ON sec_companies(ticker);
CREATE INDEX IF NOT EXISTS idx_sec_companies_cik ON sec_companies(cik);
CREATE INDEX IF NOT EXISTS idx_sec_companies_sic ON sec_companies(sic_code);

-- =====================================================
-- FILINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sec_companies(id) ON DELETE CASCADE,
  cik VARCHAR(10) NOT NULL,
  accession_number VARCHAR(25) NOT NULL UNIQUE,
  form_type sec_filing_type NOT NULL,
  filing_date DATE NOT NULL,
  acceptance_datetime TIMESTAMP WITH TIME ZONE,
  report_date DATE,
  primary_document TEXT,
  primary_document_url TEXT,
  filing_detail_url TEXT,
  file_number VARCHAR(20),
  film_number VARCHAR(20),
  items TEXT, -- For 8-K items
  size_bytes INTEGER,
  status sec_filing_status DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for filings
CREATE INDEX IF NOT EXISTS idx_sec_filings_company ON sec_filings(company_id);
CREATE INDEX IF NOT EXISTS idx_sec_filings_cik ON sec_filings(cik);
CREATE INDEX IF NOT EXISTS idx_sec_filings_form_type ON sec_filings(form_type);
CREATE INDEX IF NOT EXISTS idx_sec_filings_filing_date ON sec_filings(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_filings_status ON sec_filings(status);
CREATE INDEX IF NOT EXISTS idx_sec_filings_accession ON sec_filings(accession_number);

-- =====================================================
-- FINANCIAL STATEMENTS TABLE (XBRL Data)
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES sec_filings(id) ON DELETE CASCADE,
  company_id UUID REFERENCES sec_companies(id) ON DELETE CASCADE,
  cik VARCHAR(10) NOT NULL,
  period_end_date DATE NOT NULL,
  period_type VARCHAR(10) NOT NULL, -- 'annual' or 'quarterly'
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  
  -- Income Statement
  revenue NUMERIC(20, 2),
  cost_of_revenue NUMERIC(20, 2),
  gross_profit NUMERIC(20, 2),
  research_and_development NUMERIC(20, 2),
  selling_general_admin NUMERIC(20, 2),
  operating_expenses NUMERIC(20, 2),
  operating_income NUMERIC(20, 2),
  interest_expense NUMERIC(20, 2),
  interest_income NUMERIC(20, 2),
  other_income NUMERIC(20, 2),
  income_before_tax NUMERIC(20, 2),
  income_tax_expense NUMERIC(20, 2),
  net_income NUMERIC(20, 2),
  basic_eps NUMERIC(10, 4),
  diluted_eps NUMERIC(10, 4),
  basic_shares_outstanding NUMERIC(20, 0),
  diluted_shares_outstanding NUMERIC(20, 0),
  dividend_per_share NUMERIC(10, 4),
  
  -- Balance Sheet
  cash_and_equivalents NUMERIC(20, 2),
  short_term_investments NUMERIC(20, 2),
  accounts_receivable NUMERIC(20, 2),
  inventory NUMERIC(20, 2),
  other_current_assets NUMERIC(20, 2),
  total_current_assets NUMERIC(20, 2),
  property_plant_equipment NUMERIC(20, 2),
  goodwill NUMERIC(20, 2),
  intangible_assets NUMERIC(20, 2),
  other_non_current_assets NUMERIC(20, 2),
  total_assets NUMERIC(20, 2),
  accounts_payable NUMERIC(20, 2),
  short_term_debt NUMERIC(20, 2),
  accrued_liabilities NUMERIC(20, 2),
  deferred_revenue NUMERIC(20, 2),
  other_current_liabilities NUMERIC(20, 2),
  total_current_liabilities NUMERIC(20, 2),
  long_term_debt NUMERIC(20, 2),
  deferred_tax_liabilities NUMERIC(20, 2),
  other_non_current_liabilities NUMERIC(20, 2),
  total_liabilities NUMERIC(20, 2),
  common_stock NUMERIC(20, 2),
  retained_earnings NUMERIC(20, 2),
  accumulated_other_comprehensive_income NUMERIC(20, 2),
  treasury_stock NUMERIC(20, 2),
  total_stockholders_equity NUMERIC(20, 2),
  non_controlling_interest NUMERIC(20, 2),
  total_equity NUMERIC(20, 2),
  
  -- Cash Flow Statement
  net_cash_from_operating NUMERIC(20, 2),
  depreciation_amortization NUMERIC(20, 2),
  stock_based_compensation NUMERIC(20, 2),
  capital_expenditures NUMERIC(20, 2),
  acquisitions NUMERIC(20, 2),
  net_cash_from_investing NUMERIC(20, 2),
  debt_issuance NUMERIC(20, 2),
  debt_repayment NUMERIC(20, 2),
  stock_issuance NUMERIC(20, 2),
  stock_repurchase NUMERIC(20, 2),
  dividends_paid NUMERIC(20, 2),
  net_cash_from_financing NUMERIC(20, 2),
  net_change_in_cash NUMERIC(20, 2),
  free_cash_flow NUMERIC(20, 2),
  
  -- Calculated Metrics
  gross_margin NUMERIC(10, 4),
  operating_margin NUMERIC(10, 4),
  net_margin NUMERIC(10, 4),
  return_on_assets NUMERIC(10, 4),
  return_on_equity NUMERIC(10, 4),
  current_ratio NUMERIC(10, 4),
  quick_ratio NUMERIC(10, 4),
  debt_to_equity NUMERIC(10, 4),
  debt_to_assets NUMERIC(10, 4),
  
  -- Raw XBRL data for additional analysis
  raw_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_financials_period UNIQUE (company_id, period_end_date, period_type)
);

-- Indexes for financials
CREATE INDEX IF NOT EXISTS idx_sec_financials_company ON sec_financials(company_id);
CREATE INDEX IF NOT EXISTS idx_sec_financials_filing ON sec_financials(filing_id);
CREATE INDEX IF NOT EXISTS idx_sec_financials_period ON sec_financials(period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_financials_fiscal_year ON sec_financials(fiscal_year DESC);

-- =====================================================
-- INSIDER TRANSACTIONS TABLE (Form 4)
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_insider_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES sec_filings(id) ON DELETE CASCADE,
  company_id UUID REFERENCES sec_companies(id) ON DELETE CASCADE,
  issuer_cik VARCHAR(10) NOT NULL,
  issuer_ticker VARCHAR(10),
  issuer_name TEXT,
  
  -- Reporting Owner Info
  owner_cik VARCHAR(10) NOT NULL,
  owner_name TEXT NOT NULL,
  is_director BOOLEAN DEFAULT false,
  is_officer BOOLEAN DEFAULT false,
  officer_title TEXT,
  is_ten_percent_owner BOOLEAN DEFAULT false,
  
  -- Transaction Details
  security_title TEXT,
  transaction_date DATE NOT NULL,
  transaction_type insider_transaction_type NOT NULL,
  transaction_code CHAR(1), -- P, S, A, D, etc.
  shares_amount NUMERIC(20, 4),
  price_per_share NUMERIC(20, 4),
  total_value NUMERIC(20, 2),
  shares_owned_after NUMERIC(20, 4),
  direct_or_indirect CHAR(1), -- D or I
  is_acquisition BOOLEAN,
  
  -- Metadata
  filing_date DATE NOT NULL,
  accession_number VARCHAR(25) NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for insider transactions
CREATE INDEX IF NOT EXISTS idx_sec_insider_company ON sec_insider_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_sec_insider_owner ON sec_insider_transactions(owner_cik);
CREATE INDEX IF NOT EXISTS idx_sec_insider_date ON sec_insider_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_insider_type ON sec_insider_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sec_insider_ticker ON sec_insider_transactions(issuer_ticker);

-- =====================================================
-- INSTITUTIONAL HOLDINGS TABLE (13F)
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_institutional_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES sec_filings(id) ON DELETE CASCADE,
  manager_cik VARCHAR(10) NOT NULL,
  manager_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  filing_date DATE NOT NULL,
  
  -- Holding Details
  issuer_name TEXT NOT NULL,
  title_of_class TEXT,
  cusip VARCHAR(9) NOT NULL,
  ticker VARCHAR(10),
  value_thousands NUMERIC(20, 0), -- Value in thousands
  shares NUMERIC(20, 0),
  share_type VARCHAR(3), -- SH or PRN
  investment_discretion VARCHAR(10), -- SOLE, SHARED, NONE
  
  -- Voting Authority
  voting_sole NUMERIC(20, 0) DEFAULT 0,
  voting_shared NUMERIC(20, 0) DEFAULT 0,
  voting_none NUMERIC(20, 0) DEFAULT 0,
  
  -- Change from previous quarter
  shares_change NUMERIC(20, 0),
  value_change NUMERIC(20, 0),
  is_new_position BOOLEAN DEFAULT false,
  is_sold_out BOOLEAN DEFAULT false,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for institutional holdings
CREATE INDEX IF NOT EXISTS idx_sec_holdings_manager ON sec_institutional_holdings(manager_cik);
CREATE INDEX IF NOT EXISTS idx_sec_holdings_cusip ON sec_institutional_holdings(cusip);
CREATE INDEX IF NOT EXISTS idx_sec_holdings_ticker ON sec_institutional_holdings(ticker);
CREATE INDEX IF NOT EXISTS idx_sec_holdings_date ON sec_institutional_holdings(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_holdings_value ON sec_institutional_holdings(value_thousands DESC);

-- =====================================================
-- FILING TEXT SECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_filing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES sec_filings(id) ON DELETE CASCADE,
  company_id UUID REFERENCES sec_companies(id) ON DELETE CASCADE,
  
  section_name VARCHAR(50) NOT NULL,
  section_number VARCHAR(20),
  section_title TEXT,
  
  plain_text TEXT,
  word_count INTEGER,
  character_count INTEGER,
  
  -- Analysis
  keywords JSONB DEFAULT '[]',
  sentiment_score NUMERIC(5, 4),
  sentiment_label VARCHAR(10),
  positive_words TEXT[],
  negative_words TEXT[],
  
  -- For diff comparisons
  text_hash VARCHAR(64), -- SHA-256 hash for quick comparison
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_filing_section UNIQUE (filing_id, section_name)
);

-- Indexes for filing sections
CREATE INDEX IF NOT EXISTS idx_sec_sections_filing ON sec_filing_sections(filing_id);
CREATE INDEX IF NOT EXISTS idx_sec_sections_company ON sec_filing_sections(company_id);
CREATE INDEX IF NOT EXISTS idx_sec_sections_name ON sec_filing_sections(section_name);

-- =====================================================
-- USER WATCHLIST TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- References auth users
  company_id UUID REFERENCES sec_companies(id) ON DELETE CASCADE,
  ticker VARCHAR(10) NOT NULL,
  cik VARCHAR(10) NOT NULL,
  
  -- Preferences
  form_types sec_filing_type[] DEFAULT ARRAY['10-K', '10-Q', '8-K', '4']::sec_filing_type[],
  priority VARCHAR(10) DEFAULT 'medium', -- high, medium, low
  notification_enabled BOOLEAN DEFAULT true,
  email_notification BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_company_watch UNIQUE (user_id, company_id)
);

-- Indexes for watchlist
CREATE INDEX IF NOT EXISTS idx_sec_watchlist_user ON sec_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_watchlist_ticker ON sec_watchlist(ticker);

-- =====================================================
-- FILING ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sec_filing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filing_id UUID REFERENCES sec_filings(id) ON DELETE CASCADE,
  company_id UUID REFERENCES sec_companies(id) ON DELETE CASCADE,
  
  alert_type VARCHAR(20) NOT NULL, -- 'new_filing', 'insider_buy', 'risk_change', etc.
  title TEXT NOT NULL,
  message TEXT,
  priority VARCHAR(10) DEFAULT 'medium',
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_sec_alerts_user ON sec_filing_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_alerts_unread ON sec_filing_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_sec_alerts_created ON sec_filing_alerts(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on user-specific tables
ALTER TABLE sec_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_filing_alerts ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "Users can view their own watchlist"
  ON sec_watchlist FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert to their own watchlist"
  ON sec_watchlist FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own watchlist"
  ON sec_watchlist FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete from their own watchlist"
  ON sec_watchlist FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Alert policies
CREATE POLICY "Users can view their own alerts"
  ON sec_filing_alerts FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own alerts"
  ON sec_filing_alerts FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own alerts"
  ON sec_filing_alerts FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Public read access for SEC data tables
CREATE POLICY "SEC companies are publicly readable"
  ON sec_companies FOR SELECT
  USING (true);

CREATE POLICY "SEC filings are publicly readable"
  ON sec_filings FOR SELECT
  USING (true);

CREATE POLICY "SEC financials are publicly readable"
  ON sec_financials FOR SELECT
  USING (true);

CREATE POLICY "SEC insider transactions are publicly readable"
  ON sec_insider_transactions FOR SELECT
  USING (true);

CREATE POLICY "SEC institutional holdings are publicly readable"
  ON sec_institutional_holdings FOR SELECT
  USING (true);

CREATE POLICY "SEC filing sections are publicly readable"
  ON sec_filing_sections FOR SELECT
  USING (true);

-- Enable RLS on all SEC tables
ALTER TABLE sec_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_insider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_institutional_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_filing_sections ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USEFUL FUNCTIONS
-- =====================================================

-- Function to get latest filing for a company
CREATE OR REPLACE FUNCTION get_latest_filing(p_cik VARCHAR(10), p_form_type sec_filing_type)
RETURNS sec_filings AS $$
  SELECT * FROM sec_filings
  WHERE cik = p_cik AND form_type = p_form_type
  ORDER BY filing_date DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to get insider transaction summary
CREATE OR REPLACE FUNCTION get_insider_summary(p_cik VARCHAR(10), p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  total_purchases NUMERIC,
  total_sales NUMERIC,
  net_activity NUMERIC,
  transaction_count INTEGER,
  unique_insiders INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN total_value ELSE 0 END), 0) as total_purchases,
    COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_value ELSE 0 END), 0) as total_sales,
    COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN total_value ELSE -total_value END), 0) as net_activity,
    COUNT(*)::INTEGER as transaction_count,
    COUNT(DISTINCT owner_cik)::INTEGER as unique_insiders
  FROM sec_insider_transactions
  WHERE issuer_cik = p_cik
    AND transaction_date >= CURRENT_DATE - p_days
    AND transaction_type IN ('purchase', 'sale');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get top institutional holders
CREATE OR REPLACE FUNCTION get_top_holders(p_ticker VARCHAR(10), p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  manager_name TEXT,
  shares NUMERIC,
  value_thousands NUMERIC,
  shares_change NUMERIC,
  report_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (h.manager_cik)
    h.manager_name,
    h.shares,
    h.value_thousands,
    h.shares_change,
    h.report_date
  FROM sec_institutional_holdings h
  WHERE h.ticker = p_ticker
  ORDER BY h.manager_cik, h.report_date DESC, h.value_thousands DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
    AND table_name LIKE 'sec_%'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- =====================================================
-- INITIAL DATA / SEED
-- =====================================================

-- Insert some common company mappings (can be expanded)
-- This will be populated dynamically from SEC's company_tickers.json

COMMENT ON TABLE sec_companies IS 'SEC registered public companies with CIK mapping';
COMMENT ON TABLE sec_filings IS 'SEC EDGAR filings (10-K, 10-Q, 8-K, etc.)';
COMMENT ON TABLE sec_financials IS 'Parsed XBRL financial data from 10-K and 10-Q filings';
COMMENT ON TABLE sec_insider_transactions IS 'Form 4 insider trading transactions';
COMMENT ON TABLE sec_institutional_holdings IS '13F institutional holdings data';
COMMENT ON TABLE sec_filing_sections IS 'Extracted text sections from filings for analysis';
COMMENT ON TABLE sec_watchlist IS 'User watchlists for tracking specific companies';
COMMENT ON TABLE sec_filing_alerts IS 'User alerts for new filings and events';
