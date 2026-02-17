-- ══════════════════════════════════════════════════════════════════════
-- OmniFolio Proprietary Insider Sentiment Cache
-- 
-- Stores computed insider sentiment scores derived from SEC EDGAR Form 4
-- filings. All data is sourced from public SEC filings and scored using
-- our proprietary algorithm — no third-party sentiment APIs required.
--
-- Smart TTL Strategy:
--   • Fresh data (< 6 hours): Serve from cache, no refresh
--   • Stale data (6-24 hours): Serve stale, refresh in background
--   • Expired data (> 24 hours): Refresh before serving
--   • Market hours: Shorter TTL (6h) for active trading
--   • Off-hours/weekends: Longer TTL (24h) to save API calls
--
-- Copyright OmniFolio. All rights reserved.
-- ══════════════════════════════════════════════════════════════════════

-- ── Monthly Aggregated Insider Sentiment ─────────────────────────────
-- One row per symbol per month, storing our proprietary sentiment score

CREATE TABLE IF NOT EXISTS insider_sentiment_cache (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        TEXT NOT NULL,
  cik           TEXT,
  company_name  TEXT,
  
  -- Time period
  year          INT NOT NULL,
  month         INT NOT NULL,
  
  -- Proprietary OmniFolio Insider Confidence Score (OIC)
  -- Range: -100 (extreme insider selling) to +100 (extreme insider buying)
  oic_score     NUMERIC(8,4) NOT NULL DEFAULT 0,
  
  -- Raw aggregated data from SEC Form 4 filings
  total_buys          INT DEFAULT 0,
  total_sells         INT DEFAULT 0,
  total_buy_shares    BIGINT DEFAULT 0,
  total_sell_shares   BIGINT DEFAULT 0,
  total_buy_value     NUMERIC(18,2) DEFAULT 0,
  total_sell_value    NUMERIC(18,2) DEFAULT 0,
  net_shares          BIGINT DEFAULT 0,    -- buy_shares - sell_shares
  net_value           NUMERIC(18,2) DEFAULT 0, -- buy_value - sell_value
  
  -- Insider breakdown
  officer_buys        INT DEFAULT 0,
  officer_sells       INT DEFAULT 0,
  director_buys       INT DEFAULT 0,
  director_sells      INT DEFAULT 0,
  ten_pct_owner_buys  INT DEFAULT 0,
  ten_pct_owner_sells INT DEFAULT 0,
  
  -- Unique insiders active this month
  unique_buyers       INT DEFAULT 0,
  unique_sellers      INT DEFAULT 0,
  
  -- Cluster detection (multiple insiders acting together = stronger signal)
  cluster_buy_flag    BOOLEAN DEFAULT FALSE,  -- 3+ insiders buying in same month
  cluster_sell_flag   BOOLEAN DEFAULT FALSE,  -- 3+ insiders selling in same month
  
  -- Filing metadata
  filing_count        INT DEFAULT 0,
  latest_filing_date  DATE,
  
  -- Sentiment label for quick display
  sentiment_label     TEXT DEFAULT 'Neutral',  -- 'Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'
  
  -- Cache metadata
  source              TEXT DEFAULT 'sec-edgar',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Unique constraint: one row per symbol per month
  CONSTRAINT insider_sentiment_symbol_period UNIQUE (symbol, year, month)
);

-- ── Individual Form 4 Transaction Details ────────────────────────────
-- Denormalized store of parsed Form 4 transactions for drill-down

CREATE TABLE IF NOT EXISTS insider_sentiment_transactions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol              TEXT NOT NULL,
  cik                 TEXT,
  
  -- Filing info
  accession_number    TEXT NOT NULL,
  filing_date         DATE NOT NULL,
  
  -- Owner info
  owner_name          TEXT NOT NULL,
  owner_cik           TEXT,
  is_officer          BOOLEAN DEFAULT FALSE,
  is_director         BOOLEAN DEFAULT FALSE,
  is_ten_pct_owner    BOOLEAN DEFAULT FALSE,
  officer_title       TEXT,
  
  -- Transaction details
  transaction_date    DATE,
  transaction_code    TEXT,          -- P, S, A, M, etc.
  security_title      TEXT,
  shares              BIGINT DEFAULT 0,
  price_per_share     NUMERIC(12,4),
  total_value         NUMERIC(18,2) DEFAULT 0,
  shares_owned_after  BIGINT DEFAULT 0,
  is_acquisition      BOOLEAN DEFAULT FALSE,
  direct_or_indirect  TEXT DEFAULT 'D',  -- D=Direct, I=Indirect
  
  -- Computed
  transaction_type    TEXT DEFAULT 'other',  -- 'buy', 'sell', 'other'
  
  -- Cache metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT insider_tx_unique UNIQUE (symbol, accession_number, owner_name, transaction_date, shares)
);

-- ── Cache Refresh Tracking ───────────────────────────────────────────
-- Tracks when each symbol was last refreshed to implement smart TTL

CREATE TABLE IF NOT EXISTS insider_sentiment_refresh_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol          TEXT NOT NULL,
  refresh_type    TEXT DEFAULT 'full',  -- 'full' | 'incremental' | 'background'
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'running' | 'success' | 'failed'
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  filings_parsed  INT DEFAULT 0,
  error_message   TEXT,
  ttl_seconds     INT DEFAULT 21600,  -- Default 6 hours
  
  CONSTRAINT insider_refresh_unique UNIQUE (symbol, started_at)
);

-- ── Indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_insider_sentiment_symbol
  ON insider_sentiment_cache(symbol);

CREATE INDEX IF NOT EXISTS idx_insider_sentiment_period
  ON insider_sentiment_cache(year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_insider_sentiment_symbol_period
  ON insider_sentiment_cache(symbol, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_insider_sentiment_expires
  ON insider_sentiment_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_insider_sentiment_oic
  ON insider_sentiment_cache(oic_score DESC);

CREATE INDEX IF NOT EXISTS idx_insider_sentiment_label
  ON insider_sentiment_cache(sentiment_label);

CREATE INDEX IF NOT EXISTS idx_insider_tx_symbol
  ON insider_sentiment_transactions(symbol);

CREATE INDEX IF NOT EXISTS idx_insider_tx_filing_date
  ON insider_sentiment_transactions(filing_date DESC);

CREATE INDEX IF NOT EXISTS idx_insider_tx_symbol_date
  ON insider_sentiment_transactions(symbol, filing_date DESC);

CREATE INDEX IF NOT EXISTS idx_insider_tx_owner
  ON insider_sentiment_transactions(owner_name);

CREATE INDEX IF NOT EXISTS idx_insider_tx_type
  ON insider_sentiment_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_insider_refresh_symbol
  ON insider_sentiment_refresh_log(symbol, started_at DESC);

-- ── Row Level Security ───────────────────────────────────────────────

ALTER TABLE insider_sentiment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE insider_sentiment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insider_sentiment_refresh_log ENABLE ROW LEVEL SECURITY;

-- Public read access (market data is public)
DROP POLICY IF EXISTS "Allow public read on insider_sentiment_cache" ON insider_sentiment_cache;
CREATE POLICY "Allow public read on insider_sentiment_cache"
  ON insider_sentiment_cache FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow public read on insider_sentiment_transactions" ON insider_sentiment_transactions;
CREATE POLICY "Allow public read on insider_sentiment_transactions"
  ON insider_sentiment_transactions FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow public read on insider_sentiment_refresh_log" ON insider_sentiment_refresh_log;
CREATE POLICY "Allow public read on insider_sentiment_refresh_log"
  ON insider_sentiment_refresh_log FOR SELECT
  TO authenticated, anon
  USING (true);

-- Service role can write (server-side only)
DROP POLICY IF EXISTS "Allow service role write on insider_sentiment_cache" ON insider_sentiment_cache;
CREATE POLICY "Allow service role write on insider_sentiment_cache"
  ON insider_sentiment_cache FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role write on insider_sentiment_transactions" ON insider_sentiment_transactions;
CREATE POLICY "Allow service role write on insider_sentiment_transactions"
  ON insider_sentiment_transactions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role write on insider_sentiment_refresh_log" ON insider_sentiment_refresh_log;
CREATE POLICY "Allow service role write on insider_sentiment_refresh_log"
  ON insider_sentiment_refresh_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── Helper function: Get smart TTL based on existing DB data ─────────
-- This is the CORE of the smart cache system. TTL adapts to:
--   1. Filing activity: more recent filings → shorter TTL (data changes fast)
--   2. Market hours: during trading → shorter TTL (insiders file same-day)
--   3. Symbol volatility: high activity symbols refresh more often
--   4. Earnings proximity: filings cluster around earnings → shorter TTL

CREATE OR REPLACE FUNCTION get_insider_cache_ttl(p_symbol TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_filing_count_7d INT;
  v_filing_count_30d INT;
  v_latest_filing_age_hours FLOAT;
  v_is_market_hours BOOLEAN;
  v_is_weekend BOOLEAN;
  v_base_ttl INT := 21600; -- 6 hours default
BEGIN
  -- Check if during market hours (Mon-Fri 9:30-16:00 ET)
  v_is_market_hours := (
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/New_York') BETWEEN 1 AND 5
    AND (NOW() AT TIME ZONE 'America/New_York')::TIME BETWEEN '09:30' AND '16:00'
  );

  v_is_weekend := (
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/New_York') IN (0, 6)
  );

  -- ── Factor 1: Recent filing activity (7-day window) ────────
  SELECT COUNT(*)
  INTO v_filing_count_7d
  FROM insider_sentiment_transactions
  WHERE symbol = p_symbol
    AND filing_date > (CURRENT_DATE - INTERVAL '7 days');

  -- ── Factor 2: Monthly filing activity (30-day window) ──────
  SELECT COUNT(*)
  INTO v_filing_count_30d
  FROM insider_sentiment_transactions
  WHERE symbol = p_symbol
    AND filing_date > (CURRENT_DATE - INTERVAL '30 days');

  -- ── Factor 3: How old is the latest filing? ────────────────
  SELECT EXTRACT(EPOCH FROM (NOW() - MAX(filing_date))) / 3600.0
  INTO v_latest_filing_age_hours
  FROM insider_sentiment_transactions
  WHERE symbol = p_symbol;

  -- ── Dynamic TTL calculation using all factors ──────────────
  -- HIGH ACTIVITY: 5+ filings in 7 days = data is moving fast
  IF v_filing_count_7d >= 5 THEN
    v_base_ttl := 7200;   -- 2 hours (very active, could be earnings window)
  -- MODERATE-HIGH: 3+ filings in 7 days
  ELSIF v_filing_count_7d >= 3 THEN
    v_base_ttl := 10800;  -- 3 hours
  -- MODERATE: 1+ filings in 7 days
  ELSIF v_filing_count_7d >= 1 THEN
    v_base_ttl := 21600;  -- 6 hours
  -- LOW: No recent 7-day filings, check 30-day
  ELSIF v_filing_count_30d >= 3 THEN
    v_base_ttl := 43200;  -- 12 hours (some activity, but not recent)
  -- DORMANT: Very little activity
  ELSE
    v_base_ttl := 86400;  -- 24 hours (dormant symbol, don't waste API calls)
  END IF;

  -- ── Factor 4: Latest filing recency bonus ──────────────────
  -- If the last filing is very recent (<24h), halve the TTL
  IF v_latest_filing_age_hours IS NOT NULL AND v_latest_filing_age_hours < 24 THEN
    v_base_ttl := GREATEST(v_base_ttl / 2, 3600); -- Min 1 hour
  END IF;

  -- ── Market hours / off-hours / weekend adjustment ──────────
  IF v_is_weekend THEN
    v_base_ttl := v_base_ttl * 3;  -- Triple on weekends (SEC closed)
  ELSIF NOT v_is_market_hours THEN
    v_base_ttl := v_base_ttl * 2;  -- Double off-hours
  END IF;

  -- Cap at 72 hours (even dormant symbols get checked periodically)
  RETURN LEAST(v_base_ttl, 259200);
END;
$$;

-- ── Helper function: Check if cache is fresh for a symbol ────────────
-- Uses get_insider_cache_ttl for data-driven TTL instead of static values

CREATE OR REPLACE FUNCTION insider_cache_is_fresh(p_symbol TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_refresh TIMESTAMPTZ;
  v_ttl_seconds INT;
BEGIN
  -- Check last successful refresh
  SELECT completed_at, ttl_seconds
  INTO v_last_refresh, v_ttl_seconds
  FROM insider_sentiment_refresh_log
  WHERE symbol = p_symbol
    AND status = 'success'
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_last_refresh IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Use the smart data-driven TTL (overrides whatever was stored at refresh time)
  v_ttl_seconds := get_insider_cache_ttl(p_symbol);

  RETURN (NOW() - v_last_refresh) < (v_ttl_seconds * INTERVAL '1 second');
END;
$$;

-- ── Helper function: Get last successful refresh date for incremental fetch ──

CREATE OR REPLACE FUNCTION get_insider_last_refresh_date(p_symbol TEXT)
RETURNS TABLE(
  last_refresh_at TIMESTAMPTZ,
  filings_parsed INT,
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
    r.filings_parsed,
    r.ttl_seconds,
    EXTRACT(EPOCH FROM (NOW() - r.completed_at))::FLOAT AS age_seconds,
    insider_cache_is_fresh(p_symbol) AS is_fresh,
    get_insider_cache_ttl(p_symbol) AS smart_ttl
  FROM insider_sentiment_refresh_log r
  WHERE r.symbol = p_symbol
    AND r.status = 'success'
  ORDER BY r.completed_at DESC
  LIMIT 1;
END;
$$;

-- ── Helper function: Get filing activity stats for a symbol ──────────
-- Used by the TypeScript service to make informed TTL decisions client-side

CREATE OR REPLACE FUNCTION get_insider_filing_activity(p_symbol TEXT)
RETURNS TABLE(
  filings_7d INT,
  filings_30d INT,
  filings_90d INT,
  latest_filing_date DATE,
  latest_filing_age_hours FLOAT,
  unique_insiders_30d INT,
  has_cluster_activity BOOLEAN,
  recommended_ttl INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM insider_sentiment_transactions
     WHERE symbol = p_symbol AND filing_date > CURRENT_DATE - 7),
    (SELECT COUNT(*)::INT FROM insider_sentiment_transactions
     WHERE symbol = p_symbol AND filing_date > CURRENT_DATE - 30),
    (SELECT COUNT(*)::INT FROM insider_sentiment_transactions
     WHERE symbol = p_symbol AND filing_date > CURRENT_DATE - 90),
    (SELECT MAX(t.filing_date) FROM insider_sentiment_transactions t
     WHERE t.symbol = p_symbol),
    (SELECT EXTRACT(EPOCH FROM (NOW() - MAX(t.filing_date))) / 3600.0
     FROM insider_sentiment_transactions t WHERE t.symbol = p_symbol)::FLOAT,
    (SELECT COUNT(DISTINCT t.owner_name)::INT FROM insider_sentiment_transactions t
     WHERE t.symbol = p_symbol AND t.filing_date > CURRENT_DATE - 30),
    (SELECT COUNT(DISTINCT t.owner_name) >= 3 FROM insider_sentiment_transactions t
     WHERE t.symbol = p_symbol AND t.filing_date > CURRENT_DATE - 7),
    get_insider_cache_ttl(p_symbol);
END;
$$;
