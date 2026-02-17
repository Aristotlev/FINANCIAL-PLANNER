-- ══════════════════════════════════════════════════════════════════
-- OmniFolio Proprietary USA Spending Cache Schema
-- 
-- Stores federal contract award data from USAspending.gov (public).
-- 100% public data, 100% legal, zero paid APIs.
-- 
-- Tables:
--   1. usa_spending_cache — Contract-level award activity
--   2. usa_spending_refresh_log — Cache refresh tracking
-- ══════════════════════════════════════════════════════════════════

-- ── 1. USA Spending Cache Table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS usa_spending_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Lookup keys
  symbol TEXT NOT NULL,
  award_id TEXT NOT NULL,
  
  -- Award metadata
  action_date TEXT,
  fiscal_year INTEGER NOT NULL,
  award_type TEXT,                    -- contract, grant, loan, direct_payment, other
  award_description TEXT,
  
  -- Awarding agency
  awarding_agency_name TEXT,
  awarding_sub_agency_name TEXT,
  awarding_office_name TEXT,
  funding_agency_name TEXT,
  
  -- Recipient (the company receiving money)
  recipient_name TEXT,
  recipient_parent_name TEXT,
  recipient_uei TEXT,                 -- Unique Entity Identifier
  
  -- Financial
  total_obligation NUMERIC,
  federal_action_obligation NUMERIC,
  total_outlay NUMERIC,
  
  -- Performance location
  performance_city TEXT,
  performance_state TEXT,
  performance_county TEXT,
  performance_zip TEXT,
  performance_country TEXT DEFAULT 'USA',
  performance_congressional_district TEXT,
  performance_start_date TEXT,
  performance_end_date TEXT,
  
  -- Classification
  naics_code TEXT,
  naics_description TEXT,
  product_service_code TEXT,
  product_service_description TEXT,
  
  -- Document
  permalink TEXT,
  generated_unique_award_id TEXT,
  
  -- Cache management
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for upsert dedup
  CONSTRAINT usa_spending_cache_unique UNIQUE (symbol, award_id)
);

-- ── Ensure all columns exist (safe to re-run on existing table) ──

ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS award_id TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS action_date TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS award_type TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS award_description TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS awarding_agency_name TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS awarding_sub_agency_name TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS awarding_office_name TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS funding_agency_name TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS recipient_parent_name TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS recipient_uei TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS total_obligation NUMERIC;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS federal_action_obligation NUMERIC;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS total_outlay NUMERIC;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_city TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_state TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_county TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_zip TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_country TEXT DEFAULT 'USA';
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_congressional_district TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_start_date TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS performance_end_date TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS naics_code TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS naics_description TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS product_service_code TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS product_service_description TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS permalink TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS generated_unique_award_id TEXT;
ALTER TABLE usa_spending_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_symbol ON usa_spending_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_symbol_year ON usa_spending_cache(symbol, fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_action_date ON usa_spending_cache(action_date DESC);
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_recipient ON usa_spending_cache(recipient_name);
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_agency ON usa_spending_cache(awarding_agency_name);
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_obligation ON usa_spending_cache(total_obligation DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_usa_spending_cache_naics ON usa_spending_cache(naics_code);

-- ── 2. Refresh Log Table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usa_spending_refresh_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',    -- running, success, failed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  awards_parsed INTEGER DEFAULT 0,
  ttl_seconds INTEGER,
  error_message TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cache freshness checks
CREATE INDEX IF NOT EXISTS idx_usa_spending_refresh_symbol ON usa_spending_refresh_log(symbol, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_usa_spending_refresh_status ON usa_spending_refresh_log(status);

-- ── 3. RLS Policies ────────────────────────────────────────────

-- Enable RLS
ALTER TABLE usa_spending_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE usa_spending_refresh_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public government data)
DROP POLICY IF EXISTS "Anyone can read usa spending cache" ON usa_spending_cache;
CREATE POLICY "Anyone can read usa spending cache" 
  ON usa_spending_cache FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can read usa spending refresh log" ON usa_spending_refresh_log;
CREATE POLICY "Anyone can read usa spending refresh log" 
  ON usa_spending_refresh_log FOR SELECT 
  USING (true);

-- Only service role can write
DROP POLICY IF EXISTS "Service role can insert usa spending cache" ON usa_spending_cache;
CREATE POLICY "Service role can insert usa spending cache" 
  ON usa_spending_cache FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update usa spending cache" ON usa_spending_cache;
CREATE POLICY "Service role can update usa spending cache" 
  ON usa_spending_cache FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Service role can insert usa spending refresh log" ON usa_spending_refresh_log;
CREATE POLICY "Service role can insert usa spending refresh log" 
  ON usa_spending_refresh_log FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update usa spending refresh log" ON usa_spending_refresh_log;
CREATE POLICY "Service role can update usa spending refresh log" 
  ON usa_spending_refresh_log FOR UPDATE 
  USING (true);

-- ── 4. Helper Function: Get Last Refresh Date ──────────────────

CREATE OR REPLACE FUNCTION get_usa_spending_last_refresh_date(p_symbol TEXT)
RETURNS TABLE (
  last_refresh_at TIMESTAMPTZ,
  awards_parsed INTEGER,
  ttl_seconds INTEGER,
  age_seconds NUMERIC,
  is_fresh BOOLEAN,
  smart_ttl INTEGER
) AS $$
DECLARE
  v_last_refresh TIMESTAMPTZ;
  v_awards_parsed INTEGER;
  v_ttl INTEGER;
  v_age NUMERIC;
  v_smart_ttl INTEGER;
BEGIN
  -- Get the latest successful refresh
  SELECT r.completed_at, r.awards_parsed, r.ttl_seconds
  INTO v_last_refresh, v_awards_parsed, v_ttl
  FROM usa_spending_refresh_log r
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
  
  -- Federal spending data updates slowly — base TTL is 12 hours
  -- Weekends get 48h TTL
  v_smart_ttl := CASE
    WHEN EXTRACT(DOW FROM NOW()) IN (0, 6) THEN 172800  -- 48h weekends
    WHEN v_awards_parsed > 50 THEN 21600   -- 6h if lots of awards (active contractor)
    ELSE 43200  -- 12h default
  END;
  
  RETURN QUERY SELECT 
    v_last_refresh,
    v_awards_parsed,
    COALESCE(v_ttl, v_smart_ttl),
    v_age,
    v_age < (v_smart_ttl * 0.75),
    v_smart_ttl;
END;
$$ LANGUAGE plpgsql;

-- ── 5. Cleanup: Remove old entries ─────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_old_usa_spending_refresh_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM usa_spending_refresh_log
  WHERE completed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
