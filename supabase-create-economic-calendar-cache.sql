-- Economic Calendar Cache Table
-- Stores economic calendar events fetched from public APIs
-- Events persist forever (historical data) while current week refreshes periodically

CREATE TABLE IF NOT EXISTS economic_calendar_cache (
  id TEXT PRIMARY KEY,                    -- unique event id: "YYYY-MM-DD-COUNTRY-hash"
  date DATE NOT NULL,                     -- event date
  time TEXT NOT NULL DEFAULT '00:00',     -- event time HH:mm
  datetime TIMESTAMPTZ,                   -- full datetime
  country TEXT NOT NULL,                  -- currency/country code (USD, EUR, GBP, etc.)
  event TEXT NOT NULL,                    -- event title
  impact TEXT NOT NULL DEFAULT 'low',     -- high, medium, low, holiday
  forecast TEXT,                          -- forecast value (kept as text to preserve formatting like "3.5%")
  previous TEXT,                          -- previous value
  actual TEXT,                            -- actual value (filled in when released)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast date range queries
CREATE INDEX IF NOT EXISTS idx_econ_cal_date ON economic_calendar_cache(date);
CREATE INDEX IF NOT EXISTS idx_econ_cal_country ON economic_calendar_cache(country);
CREATE INDEX IF NOT EXISTS idx_econ_cal_date_country ON economic_calendar_cache(date, country);

-- Enable RLS
ALTER TABLE economic_calendar_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (this is public economic data, not user-specific)
DROP POLICY IF EXISTS "Allow public read access on economic_calendar_cache" ON economic_calendar_cache;
CREATE POLICY "Allow public read access on economic_calendar_cache"
  ON economic_calendar_cache
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow service role to insert/update/delete
DROP POLICY IF EXISTS "Allow service role full access on economic_calendar_cache" ON economic_calendar_cache;
CREATE POLICY "Allow service role full access on economic_calendar_cache"
  ON economic_calendar_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cache metadata table to track when we last refreshed
CREATE TABLE IF NOT EXISTS economic_calendar_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE economic_calendar_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on economic_calendar_meta" ON economic_calendar_meta;
CREATE POLICY "Allow public read on economic_calendar_meta"
  ON economic_calendar_meta
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow service role write on economic_calendar_meta" ON economic_calendar_meta;
CREATE POLICY "Allow service role write on economic_calendar_meta"
  ON economic_calendar_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
