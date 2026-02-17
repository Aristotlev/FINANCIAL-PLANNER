-- ══════════════════════════════════════════════════════════════════
-- OmniFolio Proprietary Senate Lobbying Cache Schema
-- 
-- Stores lobbying filing data from the US Senate LDA database.
-- 100% public data, 100% legal, zero paid APIs.
-- 
-- Tables:
--   1. senate_lobbying_cache — Filing-level lobbying activity
--   2. senate_lobbying_refresh_log — Cache refresh tracking
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Lobbying Cache Table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS senate_lobbying_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Lookup keys
  symbol TEXT NOT NULL,
  filing_uuid TEXT NOT NULL,
  
  -- Filing metadata
  filing_date TEXT,
  filing_year INTEGER NOT NULL,
  filing_period TEXT,           -- Q1, Q2, Q3, Q4, H1, H2, annual
  filing_type TEXT,             -- registration, report, amendment, termination
  
  -- Client (the company spending on lobbying)
  client_name TEXT,
  client_description TEXT,
  
  -- Registrant (the lobbying firm hired)
  registrant_name TEXT,
  
  -- Financial
  amount NUMERIC,
  expenses NUMERIC,
  income NUMERIC,
  
  -- Array fields (stored as JSONB arrays)
  lobbyist_names JSONB DEFAULT '[]'::jsonb,
  issue_areas JSONB DEFAULT '[]'::jsonb,
  issue_descriptions JSONB DEFAULT '[]'::jsonb,
  government_entities JSONB DEFAULT '[]'::jsonb,
  specific_issues JSONB DEFAULT '[]'::jsonb,
  
  -- Document
  document_url TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Cache management
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for upsert dedup
  CONSTRAINT senate_lobbying_cache_unique UNIQUE (symbol, filing_uuid)
);

-- ── Ensure all columns exist (safe to re-run on existing table) ──

ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS filing_uuid TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS filing_date TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS filing_year INTEGER;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS filing_period TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS filing_type TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS client_description TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS registrant_name TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS expenses NUMERIC;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS income NUMERIC;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS lobbyist_names JSONB DEFAULT '[]'::jsonb;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS issue_areas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS issue_descriptions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS government_entities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS specific_issues JSONB DEFAULT '[]'::jsonb;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';
ALTER TABLE senate_lobbying_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lobbying_cache_symbol ON senate_lobbying_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_lobbying_cache_symbol_year ON senate_lobbying_cache(symbol, filing_year DESC);
CREATE INDEX IF NOT EXISTS idx_lobbying_cache_filing_date ON senate_lobbying_cache(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_lobbying_cache_client ON senate_lobbying_cache(client_name);
CREATE INDEX IF NOT EXISTS idx_lobbying_cache_registrant ON senate_lobbying_cache(registrant_name);
CREATE INDEX IF NOT EXISTS idx_lobbying_cache_amount ON senate_lobbying_cache(amount DESC NULLS LAST);

-- ── 2. Refresh Log Table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS senate_lobbying_refresh_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',    -- running, success, failed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  filings_parsed INTEGER DEFAULT 0,
  ttl_seconds INTEGER,
  error_message TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cache freshness checks
CREATE INDEX IF NOT EXISTS idx_lobbying_refresh_symbol ON senate_lobbying_refresh_log(symbol, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobbying_refresh_status ON senate_lobbying_refresh_log(status);

-- ── 3. RLS Policies ────────────────────────────────────────────

-- Enable RLS
ALTER TABLE senate_lobbying_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE senate_lobbying_refresh_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public lobbying data)
DROP POLICY IF EXISTS "Anyone can read lobbying cache" ON senate_lobbying_cache;
CREATE POLICY "Anyone can read lobbying cache" 
  ON senate_lobbying_cache FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can read lobbying refresh log" ON senate_lobbying_refresh_log;
CREATE POLICY "Anyone can read lobbying refresh log" 
  ON senate_lobbying_refresh_log FOR SELECT 
  USING (true);

-- Only service role can write
DROP POLICY IF EXISTS "Service role can insert lobbying cache" ON senate_lobbying_cache;
CREATE POLICY "Service role can insert lobbying cache" 
  ON senate_lobbying_cache FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update lobbying cache" ON senate_lobbying_cache;
CREATE POLICY "Service role can update lobbying cache" 
  ON senate_lobbying_cache FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Service role can insert lobbying refresh log" ON senate_lobbying_refresh_log;
CREATE POLICY "Service role can insert lobbying refresh log" 
  ON senate_lobbying_refresh_log FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update lobbying refresh log" ON senate_lobbying_refresh_log;
CREATE POLICY "Service role can update lobbying refresh log" 
  ON senate_lobbying_refresh_log FOR UPDATE 
  USING (true);

-- ── 4. Helper Function: Get Last Refresh Date ──────────────────

CREATE OR REPLACE FUNCTION get_lobbying_last_refresh_date(p_symbol TEXT)
RETURNS TABLE (
  last_refresh_at TIMESTAMPTZ,
  filings_parsed INTEGER,
  ttl_seconds INTEGER,
  age_seconds NUMERIC,
  is_fresh BOOLEAN,
  smart_ttl INTEGER
) AS $$
DECLARE
  v_last_refresh TIMESTAMPTZ;
  v_filings_parsed INTEGER;
  v_ttl INTEGER;
  v_age NUMERIC;
  v_smart_ttl INTEGER;
BEGIN
  -- Get the latest successful refresh
  SELECT r.completed_at, r.filings_parsed, r.ttl_seconds
  INTO v_last_refresh, v_filings_parsed, v_ttl
  FROM senate_lobbying_refresh_log r
  WHERE r.symbol = p_symbol AND r.status = 'success'
  ORDER BY r.completed_at DESC
  LIMIT 1;
  
  IF v_last_refresh IS NULL THEN
    RETURN QUERY SELECT 
      NULL::TIMESTAMPTZ,
      0::INTEGER,
      0::INTEGER,
      999999::NUMERIC,
      FALSE::BOOLEAN,
      43200::INTEGER;  -- 12 hours default
    RETURN;
  END IF;
  
  v_age := EXTRACT(EPOCH FROM (NOW() - v_last_refresh));
  
  -- Lobbying data updates slowly — base TTL is 12 hours
  -- Weekends get 48h TTL
  v_smart_ttl := CASE
    WHEN EXTRACT(DOW FROM NOW()) IN (0, 6) THEN 172800  -- 48h weekends
    WHEN v_filings_parsed > 20 THEN 21600  -- 6h if lots of filings (active company)
    ELSE 43200  -- 12h default
  END;
  
  RETURN QUERY SELECT 
    v_last_refresh,
    v_filings_parsed,
    COALESCE(v_ttl, v_smart_ttl),
    v_age,
    v_age < (v_smart_ttl * 0.75),
    v_smart_ttl;
END;
$$ LANGUAGE plpgsql;

-- ── 5. Cleanup: Remove old entries ─────────────────────────────

-- Auto-clean refresh logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_lobbying_refresh_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM senate_lobbying_refresh_log
  WHERE completed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
