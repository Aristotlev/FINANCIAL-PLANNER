-- Earnings Calendar — Schema Migration
-- OmniFolio Proprietary Earnings Calendar
--
-- The earnings_calendar_cache table already exists with these columns:
--   id, symbol, company_name, report_date, report_time, fiscal_quarter,
--   fiscal_year, eps_estimate, eps_actual, revenue_estimate, revenue_actual,
--   surprise_percent, conference_call_time, conference_call_url, raw_data,
--   created_at, updated_at
--
-- This migration adds columns needed for SEC EDGAR proprietary sourcing.
-- All ALTER TABLE ... ADD COLUMN IF NOT EXISTS is safe to re-run.
--
-- Copyright OmniFolio. All rights reserved.

-- ── Add missing columns to existing earnings_calendar_cache ──────────

ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS filing_type TEXT DEFAULT '10-Q';
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS exchange TEXT;
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS sec_filing_url TEXT;
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS cik TEXT;
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE earnings_calendar_cache ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'sec-edgar';

-- ── Add indexes for new columns ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_earnings_cal_filing_type ON earnings_calendar_cache(filing_type);
CREATE INDEX IF NOT EXISTS idx_earnings_cal_sector ON earnings_calendar_cache(sector);
CREATE INDEX IF NOT EXISTS idx_earnings_cal_source ON earnings_calendar_cache(source);
CREATE INDEX IF NOT EXISTS idx_earnings_cal_cik ON earnings_calendar_cache(cik);
CREATE INDEX IF NOT EXISTS idx_earnings_cal_country ON earnings_calendar_cache(country);
CREATE INDEX IF NOT EXISTS idx_earnings_cal_exchange ON earnings_calendar_cache(exchange);
CREATE INDEX IF NOT EXISTS idx_earnings_cal_date_source ON earnings_calendar_cache(report_date, source);

-- ── Metadata table for tracking refresh state ────────────────────────

CREATE TABLE IF NOT EXISTS earnings_calendar_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE earnings_calendar_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on earnings_calendar_meta" ON earnings_calendar_meta;
CREATE POLICY "Allow public read on earnings_calendar_meta"
  ON earnings_calendar_meta
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow service role write on earnings_calendar_meta" ON earnings_calendar_meta;
CREATE POLICY "Allow service role write on earnings_calendar_meta"
  ON earnings_calendar_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
