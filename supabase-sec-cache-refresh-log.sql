-- SEC Cache Refresh Log Table
-- Tracks when each cache key was last refreshed so routes know if data is fresh
-- Run this migration AFTER supabase-sec-edgar-schema.sql

CREATE TABLE IF NOT EXISTS sec_cache_refresh_log (
  cache_key TEXT PRIMARY KEY,
  last_refresh_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  item_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow public reads, service_role writes
ALTER TABLE sec_cache_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEC cache refresh log is publicly readable"
  ON sec_cache_refresh_log FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage SEC cache refresh log"
  ON sec_cache_refresh_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add unique constraint on manager_cik + cusip + report_date for holdings upsert
-- (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_holdings_manager_cusip_date'
  ) THEN
    ALTER TABLE sec_institutional_holdings
      ADD CONSTRAINT unique_holdings_manager_cusip_date
      UNIQUE (manager_cik, cusip, report_date);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Trigger for updated_at
CREATE TRIGGER update_sec_cache_refresh_log_updated_at
  BEFORE UPDATE ON sec_cache_refresh_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
