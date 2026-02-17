-- IPO Calendar — Schema Fix Migration
-- OmniFolio Proprietary IPO Calendar
--
-- Fixes:
-- 1. Allow symbol to be NULL (many SEC filings don't have tickers yet)
-- 2. Add unique constraint on CIK + filing_date for SEC-sourced dedup
-- 3. Ensure industry column exists
--
-- Safe to re-run.
-- Copyright OmniFolio. All rights reserved.

-- ── Fix symbol NOT NULL constraint ───────────────────────────────────
-- Many S-1/F-1 filings have no ticker assigned yet
ALTER TABLE ipo_calendar_cache ALTER COLUMN symbol DROP NOT NULL;

-- ── Add industry column if missing ───────────────────────────────────
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS industry TEXT;

-- ── Add lead_underwriters column if missing ──────────────────────────
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS lead_underwriters TEXT;

-- ── Add description column if missing ────────────────────────────────
ALTER TABLE ipo_calendar_cache ADD COLUMN IF NOT EXISTS description TEXT;

-- ── Unique constraint for SEC dedup (CIK + source) ──────────────────
-- This prevents duplicate rows for the same company from SEC data
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_cal_cik_source
  ON ipo_calendar_cache(cik, source)
  WHERE cik IS NOT NULL AND source = 'sec-edgar';

-- ── Composite index for API queries ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ipo_cal_source_filing_date
  ON ipo_calendar_cache(source, filing_date DESC);
