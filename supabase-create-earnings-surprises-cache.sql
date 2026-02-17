-- ══════════════════════════════════════════════════════════════════════
-- OmniFolio Proprietary Earnings Surprises Cache
-- 
-- Stores computed earnings surprise scores derived from SEC EDGAR
-- XBRL financial data (10-Q/10-K filings) cross-referenced with
-- analyst consensus estimates. All actual EPS data is sourced from
-- public SEC filings — no third-party earnings APIs required.
--
-- Smart TTL Strategy:
--   • Fresh data (< 12 hours): Serve from cache, no refresh
--   • Stale data (12-48 hours): Serve stale, refresh in background
--   • Expired data (> 48 hours): Refresh before serving
--   • Earnings season (Jan/Apr/Jul/Oct): Shorter TTL (6h)
--   • Off-season: Longer TTL (48h) to save API calls
--   • Near known report dates: Shortest TTL (2h)
--
-- Proprietary Scoring: OmniFolio Earnings Surprise (OES) Score
--   Range: -100 (catastrophic miss) to +100 (massive beat)
--   Factors: surprise magnitude, consistency, revenue vs EPS,
--            guidance direction, sequential improvement
--
-- Copyright OmniFolio. All rights reserved.
-- ══════════════════════════════════════════════════════════════════════

-- ── Quarterly Earnings Surprises ─────────────────────────────────────
-- One row per symbol per quarter, storing actual vs estimate EPS data
-- and our proprietary OES score

CREATE TABLE IF NOT EXISTS earnings_surprises_cache (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol              TEXT NOT NULL,
  cik                 TEXT,
  company_name        TEXT,
  
  -- Time period
  fiscal_year         INT NOT NULL,
  fiscal_quarter      INT NOT NULL,          -- 1, 2, 3, 4
  period_end_date     DATE,                  -- End of fiscal quarter
  report_date         DATE,                  -- When earnings were reported
  
  -- EPS Data (from SEC XBRL filings)
  eps_actual          NUMERIC(12,4),         -- Actual EPS from 10-Q/10-K
  eps_estimate        NUMERIC(12,4),         -- Consensus estimate
  eps_surprise        NUMERIC(12,4),         -- actual - estimate
  eps_surprise_pct    NUMERIC(12,4),         -- ((actual - estimate) / |estimate|) * 100
  eps_basic           NUMERIC(12,4),         -- Basic EPS (from XBRL)
  eps_diluted         NUMERIC(12,4),         -- Diluted EPS (from XBRL)
  
  -- Revenue Data (from SEC XBRL filings)
  revenue_actual      NUMERIC(18,2),         -- Actual revenue from filing
  revenue_estimate    NUMERIC(18,2),         -- Consensus estimate
  revenue_surprise    NUMERIC(18,2),         -- actual - estimate
  revenue_surprise_pct NUMERIC(12,4),        -- ((actual - estimate) / |estimate|) * 100
  
  -- Additional Financials (from XBRL)
  net_income          NUMERIC(18,2),
  gross_profit        NUMERIC(18,2),
  operating_income    NUMERIC(18,2),
  gross_margin_pct    NUMERIC(8,4),          -- (gross_profit / revenue) * 100
  operating_margin_pct NUMERIC(8,4),         -- (operating_income / revenue) * 100
  net_margin_pct      NUMERIC(8,4),          -- (net_income / revenue) * 100
  
  -- Year-over-Year Comparisons
  revenue_yoy_pct     NUMERIC(12,4),         -- Revenue change vs same quarter last year
  eps_yoy_pct         NUMERIC(12,4),         -- EPS change vs same quarter last year
  net_income_yoy_pct  NUMERIC(12,4),         -- Net income change vs same quarter last year
  
  -- Sequential (Quarter-over-Quarter) Comparisons
  revenue_qoq_pct     NUMERIC(12,4),
  eps_qoq_pct         NUMERIC(12,4),
  
  -- Proprietary OmniFolio Earnings Surprise (OES) Score
  -- Range: -100 (catastrophic miss) to +100 (massive beat)
  oes_score           NUMERIC(8,4) NOT NULL DEFAULT 0,
  
  -- Surprise Classification
  surprise_label      TEXT DEFAULT 'In Line',  -- 'Massive Beat', 'Beat', 'In Line', 'Miss', 'Massive Miss'
  beat_count_last_4   INT DEFAULT 0,           -- How many of last 4 quarters were beats
  miss_count_last_4   INT DEFAULT 0,           -- How many of last 4 quarters were misses
  streak_type         TEXT DEFAULT 'none',     -- 'beat_streak', 'miss_streak', 'mixed', 'none'
  streak_length       INT DEFAULT 0,
  
  -- Filing Info
  filing_type         TEXT DEFAULT '10-Q',     -- '10-Q' or '10-K'
  filing_url          TEXT,                    -- Link to SEC filing
  accession_number    TEXT,
  
  -- Sector/Industry for peer comparison
  sector              TEXT,
  industry            TEXT,
  exchange            TEXT,
  market_cap_at_report NUMERIC(18,2),
  
  -- Cache metadata
  source              TEXT DEFAULT 'sec-edgar',
  data_quality        TEXT DEFAULT 'verified', -- 'verified', 'estimated', 'preliminary'
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  
  -- Unique constraint: one row per symbol per quarter
  CONSTRAINT earnings_surprises_symbol_quarter UNIQUE (symbol, fiscal_year, fiscal_quarter)
);

-- ── Analyst Estimates Tracking ───────────────────────────────────────
-- Tracks consensus estimates over time for each quarter
-- This allows us to show estimate revisions (important signal)

CREATE TABLE IF NOT EXISTS earnings_estimates_history (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol              TEXT NOT NULL,
  fiscal_year         INT NOT NULL,
  fiscal_quarter      INT NOT NULL,
  
  -- Estimate snapshot
  eps_estimate        NUMERIC(12,4),
  revenue_estimate    NUMERIC(18,2),
  num_analysts        INT DEFAULT 0,
  eps_high            NUMERIC(12,4),
  eps_low             NUMERIC(12,4),
  
  -- When this estimate was recorded
  recorded_at         TIMESTAMPTZ DEFAULT NOW(),
  source              TEXT DEFAULT 'aggregated',
  
  CONSTRAINT earnings_est_unique UNIQUE (symbol, fiscal_year, fiscal_quarter, recorded_at)
);

-- ── Cache Refresh Tracking ───────────────────────────────────────────
-- Tracks when each symbol was last refreshed to implement smart TTL

CREATE TABLE IF NOT EXISTS earnings_surprises_refresh_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol          TEXT NOT NULL,
  refresh_type    TEXT DEFAULT 'full',  -- 'full' | 'incremental' | 'background'
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'running' | 'success' | 'failed'
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  quarters_parsed INT DEFAULT 0,
  error_message   TEXT,
  ttl_seconds     INT DEFAULT 43200,  -- Default 12 hours
  
  CONSTRAINT earnings_refresh_unique UNIQUE (symbol, started_at)
);

-- ══════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_symbol
  ON earnings_surprises_cache(symbol);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_period
  ON earnings_surprises_cache(fiscal_year DESC, fiscal_quarter DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_symbol_period
  ON earnings_surprises_cache(symbol, fiscal_year DESC, fiscal_quarter DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_expires
  ON earnings_surprises_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_oes
  ON earnings_surprises_cache(oes_score DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_label
  ON earnings_surprises_cache(surprise_label);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_report_date
  ON earnings_surprises_cache(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_sector
  ON earnings_surprises_cache(sector);

CREATE INDEX IF NOT EXISTS idx_earnings_surprises_streak
  ON earnings_surprises_cache(streak_type, streak_length DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_est_symbol
  ON earnings_estimates_history(symbol, fiscal_year DESC, fiscal_quarter DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_refresh_symbol
  ON earnings_surprises_refresh_log(symbol, started_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE earnings_surprises_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_estimates_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_surprises_refresh_log ENABLE ROW LEVEL SECURITY;

-- Public read access (market data is public)
DROP POLICY IF EXISTS "Allow public read on earnings_surprises_cache" ON earnings_surprises_cache;
CREATE POLICY "Allow public read on earnings_surprises_cache"
  ON earnings_surprises_cache FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow public read on earnings_estimates_history" ON earnings_estimates_history;
CREATE POLICY "Allow public read on earnings_estimates_history"
  ON earnings_estimates_history FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow public read on earnings_surprises_refresh_log" ON earnings_surprises_refresh_log;
CREATE POLICY "Allow public read on earnings_surprises_refresh_log"
  ON earnings_surprises_refresh_log FOR SELECT
  TO authenticated, anon
  USING (true);

-- Service role can write (server-side only)
DROP POLICY IF EXISTS "Allow service role write on earnings_surprises_cache" ON earnings_surprises_cache;
CREATE POLICY "Allow service role write on earnings_surprises_cache"
  ON earnings_surprises_cache FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role write on earnings_estimates_history" ON earnings_estimates_history;
CREATE POLICY "Allow service role write on earnings_estimates_history"
  ON earnings_estimates_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role write on earnings_surprises_refresh_log" ON earnings_surprises_refresh_log;
CREATE POLICY "Allow service role write on earnings_surprises_refresh_log"
  ON earnings_surprises_refresh_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════
-- SMART TTL FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════

-- ── Helper function: Get smart TTL based on earnings season + data ───
-- TTL adapts to:
--   1. Earnings season: Jan/Apr/Jul/Oct → shorter TTL (lots of reports)
--   2. Market hours: during trading → shorter TTL
--   3. Report date proximity: near known dates → even shorter
--   4. Data freshness: recently reported → can cache longer

CREATE OR REPLACE FUNCTION get_earnings_surprises_cache_ttl(p_symbol TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_latest_report_age_days INT;
  v_is_earnings_season BOOLEAN;
  v_is_market_hours BOOLEAN;
  v_is_weekend BOOLEAN;
  v_current_month INT;
  v_base_ttl INT := 43200; -- 12 hours default
BEGIN
  -- Current month (earnings seasons: Jan, Feb, Apr, May, Jul, Aug, Oct, Nov)
  v_current_month := EXTRACT(MONTH FROM NOW());
  v_is_earnings_season := v_current_month IN (1, 2, 4, 5, 7, 8, 10, 11);

  -- Check if during market hours (Mon-Fri 9:30-16:00 ET)
  v_is_market_hours := (
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/New_York') BETWEEN 1 AND 5
    AND (NOW() AT TIME ZONE 'America/New_York')::TIME BETWEEN '09:30' AND '16:00'
  );

  v_is_weekend := (
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/New_York') IN (0, 6)
  );

  -- How old is the latest report for this symbol?
  SELECT EXTRACT(DAY FROM (NOW() - MAX(report_date)))::INT
  INTO v_latest_report_age_days
  FROM earnings_surprises_cache
  WHERE symbol = p_symbol AND report_date IS NOT NULL;

  -- ── Dynamic TTL calculation ────────────────────────────────

  -- VERY RECENT REPORT (< 3 days): Data just changed, cache longer now
  IF v_latest_report_age_days IS NOT NULL AND v_latest_report_age_days < 3 THEN
    v_base_ttl := 86400;   -- 24 hours (data is fresh, won't change soon)
  
  -- EARNINGS SEASON + MARKET HOURS: Data could be reported any time
  ELSIF v_is_earnings_season AND v_is_market_hours THEN
    v_base_ttl := 21600;   -- 6 hours
  
  -- EARNINGS SEASON + OFF HOURS
  ELSIF v_is_earnings_season THEN
    v_base_ttl := 43200;   -- 12 hours
  
  -- OFF SEASON: reports are sparse
  ELSE
    v_base_ttl := 86400;   -- 24 hours
  END IF;

  -- ── Weekend adjustment ─────────────────────────────────────
  IF v_is_weekend THEN
    v_base_ttl := v_base_ttl * 2;  -- Double on weekends (no earnings reports)
  END IF;

  -- Cap at 72 hours
  RETURN LEAST(v_base_ttl, 259200);
END;
$$;

-- ── Helper function: Check if cache is fresh for a symbol ────────────

CREATE OR REPLACE FUNCTION earnings_surprises_cache_is_fresh(p_symbol TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_refresh TIMESTAMPTZ;
  v_ttl_seconds INT;
BEGIN
  SELECT completed_at, ttl_seconds
  INTO v_last_refresh, v_ttl_seconds
  FROM earnings_surprises_refresh_log
  WHERE symbol = p_symbol
    AND status = 'success'
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_last_refresh IS NULL THEN
    RETURN FALSE;
  END IF;

  v_ttl_seconds := get_earnings_surprises_cache_ttl(p_symbol);

  RETURN (NOW() - v_last_refresh) < (v_ttl_seconds * INTERVAL '1 second');
END;
$$;

-- ── Helper function: Get last successful refresh info ────────────────

CREATE OR REPLACE FUNCTION get_earnings_surprises_last_refresh(p_symbol TEXT)
RETURNS TABLE(
  last_refresh_at TIMESTAMPTZ,
  quarters_parsed INT,
  ttl_seconds INT,
  age_seconds FLOAT,
  is_fresh BOOLEAN,
  smart_ttl INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.completed_at AS last_refresh_at,
    r.quarters_parsed,
    r.ttl_seconds,
    EXTRACT(EPOCH FROM (NOW() - r.completed_at))::FLOAT AS age_seconds,
    earnings_surprises_cache_is_fresh(p_symbol) AS is_fresh,
    get_earnings_surprises_cache_ttl(p_symbol) AS smart_ttl
  FROM earnings_surprises_refresh_log r
  WHERE r.symbol = p_symbol
    AND r.status = 'success'
  ORDER BY r.completed_at DESC
  LIMIT 1;
END;
$$;

-- ── Helper function: Get earnings activity stats ─────────────────────

CREATE OR REPLACE FUNCTION get_earnings_activity(p_symbol TEXT)
RETURNS TABLE(
  total_quarters INT,
  beats INT,
  misses INT,
  in_line INT,
  avg_surprise_pct FLOAT,
  current_streak_type TEXT,
  current_streak_length INT,
  latest_report_date DATE,
  latest_report_age_days INT,
  recommended_ttl INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM earnings_surprises_cache
     WHERE symbol = p_symbol AND eps_actual IS NOT NULL),
    (SELECT COUNT(*)::INT FROM earnings_surprises_cache
     WHERE symbol = p_symbol AND eps_surprise_pct > 0),
    (SELECT COUNT(*)::INT FROM earnings_surprises_cache
     WHERE symbol = p_symbol AND eps_surprise_pct < 0),
    (SELECT COUNT(*)::INT FROM earnings_surprises_cache
     WHERE symbol = p_symbol AND (eps_surprise_pct = 0 OR eps_surprise_pct IS NULL)),
    (SELECT AVG(e.eps_surprise_pct)::FLOAT FROM earnings_surprises_cache e
     WHERE e.symbol = p_symbol AND e.eps_surprise_pct IS NOT NULL),
    (SELECT e.streak_type FROM earnings_surprises_cache e
     WHERE e.symbol = p_symbol AND e.eps_actual IS NOT NULL
     ORDER BY e.fiscal_year DESC, e.fiscal_quarter DESC LIMIT 1),
    (SELECT e.streak_length FROM earnings_surprises_cache e
     WHERE e.symbol = p_symbol AND e.eps_actual IS NOT NULL
     ORDER BY e.fiscal_year DESC, e.fiscal_quarter DESC LIMIT 1)::INT,
    (SELECT MAX(e.report_date) FROM earnings_surprises_cache e
     WHERE e.symbol = p_symbol),
    (SELECT EXTRACT(DAY FROM (NOW() - MAX(e.report_date)))::INT
     FROM earnings_surprises_cache e WHERE e.symbol = p_symbol),
    get_earnings_surprises_cache_ttl(p_symbol);
END;
$$;
