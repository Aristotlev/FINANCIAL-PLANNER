-- IPO Calendar — Schema Migration
-- OmniFolio Proprietary IPO Calendar
-- 
-- The ipo_calendar_cache table already exists with these columns:
--   id, symbol, company_name, exchange, ipo_date, price_range_low,
--   price_range_high, offer_price, shares_offered, expected_ipo_date,
--   status, industry, lead_underwriters, market_cap_estimate,
--   description, filing_date, raw_data, created_at, updated_at
--
-- This migration adds columns needed for SEC EDGAR sourcing.
-- All ALTER TABLE ... ADD COLUMN IF NOT EXISTS is safe to re-run.
--
-- Copyright OmniFolio. All rights reserved.

-- ── Add missing columns to existing ipo_calendar_cache ────────────────

ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS filing_type TEXT DEFAULT 'S-1';
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS sec_filing_url TEXT;
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS cik TEXT;
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'sec-edgar';
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS deal_size NUMERIC;

-- ── Add indexes for new columns ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ipo_cal_filing_date ON ipo_calendar_cache(filing_date);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_expected_ipo_date ON ipo_calendar_cache(expected_ipo_date);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_ipo_date ON ipo_calendar_cache(ipo_date);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_status ON ipo_calendar_cache(status);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_exchange ON ipo_calendar_cache(exchange);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_sector ON ipo_calendar_cache(sector);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_date_status ON ipo_calendar_cache(ipo_date, status);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_symbol ON ipo_calendar_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_ipo_cal_source ON ipo_calendar_cache(source);

-- ── Metadata table for tracking refresh state ────────────────────────

CREATE TABLE IF NOT EXISTS ipo_calendar_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ipo_calendar_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on ipo_calendar_meta" ON ipo_calendar_meta;
CREATE POLICY "Allow public read on ipo_calendar_meta"
  ON ipo_calendar_meta
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow service role write on ipo_calendar_meta" ON ipo_calendar_meta;
CREATE POLICY "Allow service role write on ipo_calendar_meta"
  ON ipo_calendar_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
