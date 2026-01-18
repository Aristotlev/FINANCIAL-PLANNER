-- ============================================
-- TOOLS DATA CACHE TABLES FOR OMNIFOLIO
-- ============================================
-- This migration creates cache tables for:
-- 1. Insider Transactions
-- 2. Senate Lobbying
-- 3. USA Spending
-- ============================================

-- ==================== INSIDER TRANSACTIONS CACHE ====================

CREATE TABLE IF NOT EXISTS public.insider_transactions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  share DECIMAL(20, 4),
  change DECIMAL(20, 4),
  filing_date DATE NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_code TEXT,
  transaction_price DECIMAL(12, 4),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates based on a combination of fields
  UNIQUE(symbol, name, filing_date, transaction_date, change)
);

CREATE INDEX IF NOT EXISTS idx_insider_transactions_symbol ON public.insider_transactions_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_insider_transactions_date ON public.insider_transactions_cache(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_transactions_updated ON public.insider_transactions_cache(updated_at);

-- ==================== SENATE LOBBYING CACHE ====================

CREATE TABLE IF NOT EXISTS public.senate_lobbying_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  client_id TEXT,
  registrant_id TEXT,
  senate_id TEXT NOT NULL DEFAULT '',
  house_registrant_id TEXT NOT NULL DEFAULT '',
  year INTEGER,
  period TEXT,
  income DECIMAL(18, 2),
  expenses DECIMAL(18, 2),
  description TEXT,
  document_url TEXT,
  posted_name TEXT,
  date DATE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(symbol, senate_id, house_registrant_id)
);

CREATE INDEX IF NOT EXISTS idx_senate_lobbying_symbol ON public.senate_lobbying_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_senate_lobbying_year ON public.senate_lobbying_cache(year DESC);
CREATE INDEX IF NOT EXISTS idx_senate_lobbying_updated ON public.senate_lobbying_cache(updated_at);

-- ==================== USA SPENDING CACHE ====================

CREATE TABLE IF NOT EXISTS public.usa_spending_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  recipient_name TEXT,
  total_value DECIMAL(18, 2),
  action_date DATE,
  performance_start_date DATE,
  performance_end_date DATE,
  awarding_agency_name TEXT,
  award_description TEXT,
  permalink TEXT NOT NULL DEFAULT '',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(symbol, permalink)
);

CREATE INDEX IF NOT EXISTS idx_usa_spending_symbol ON public.usa_spending_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_usa_spending_date ON public.usa_spending_cache(action_date DESC);
CREATE INDEX IF NOT EXISTS idx_usa_spending_updated ON public.usa_spending_cache(updated_at);

-- ==================== UPDATE CACHE METADATA ====================
-- Extend the existing cache_metadata table to track these tools

INSERT INTO public.cache_metadata (cache_name, refresh_interval_minutes, api_calls_limit)
VALUES 
  ('insider_transactions', 1440, 500), -- Refresh daily (1440m)
  ('senate_lobbying', 10080, 200),     -- Refresh weekly (10080m)
  ('usa_spending', 10080, 200)         -- Refresh weekly (10080m)
ON CONFLICT (cache_name) DO UPDATE SET
  refresh_interval_minutes = EXCLUDED.refresh_interval_minutes,
  api_calls_limit = EXCLUDED.api_calls_limit;

-- Add triggers for automatic updated_at timestamp
DROP TRIGGER IF EXISTS update_insider_transactions_cache_timestamp ON public.insider_transactions_cache;
CREATE TRIGGER update_insider_transactions_cache_timestamp
BEFORE UPDATE ON public.insider_transactions_cache
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

DROP TRIGGER IF EXISTS update_senate_lobbying_cache_timestamp ON public.senate_lobbying_cache;
CREATE TRIGGER update_senate_lobbying_cache_timestamp
BEFORE UPDATE ON public.senate_lobbying_cache
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

DROP TRIGGER IF EXISTS update_usa_spending_cache_timestamp ON public.usa_spending_cache;
CREATE TRIGGER update_usa_spending_cache_timestamp
BEFORE UPDATE ON public.usa_spending_cache
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

-- ==================== ROW LEVEL SECURITY ====================
-- CRITICAL: Without these policies, tables are inaccessible when RLS is enabled

-- Enable RLS
ALTER TABLE public.insider_transactions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senate_lobbying_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usa_spending_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (prevents errors on re-run)
DROP POLICY IF EXISTS "Public read access for insider_transactions_cache" ON public.insider_transactions_cache;
DROP POLICY IF EXISTS "Service role full access for insider_transactions_cache" ON public.insider_transactions_cache;
DROP POLICY IF EXISTS "Public read access for senate_lobbying_cache" ON public.senate_lobbying_cache;
DROP POLICY IF EXISTS "Service role full access for senate_lobbying_cache" ON public.senate_lobbying_cache;
DROP POLICY IF EXISTS "Public read access for usa_spending_cache" ON public.usa_spending_cache;
DROP POLICY IF EXISTS "Service role full access for usa_spending_cache" ON public.usa_spending_cache;

-- Public read access (anyone can read cached data - this is public government data)
CREATE POLICY "Public read access for insider_transactions_cache"
ON public.insider_transactions_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for senate_lobbying_cache"
ON public.senate_lobbying_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for usa_spending_cache"
ON public.usa_spending_cache FOR SELECT
USING (true);

-- Service role can do everything (for background refresh jobs)
CREATE POLICY "Service role full access for insider_transactions_cache"
ON public.insider_transactions_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for senate_lobbying_cache"
ON public.senate_lobbying_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for usa_spending_cache"
ON public.usa_spending_cache FOR ALL
USING (auth.role() = 'service_role');
