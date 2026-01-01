-- SEC Search History Table
CREATE TABLE IF NOT EXISTS sec_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Optional, can be null for anonymous searches
  query TEXT NOT NULL,
  ticker VARCHAR(10), -- If the search was for a specific ticker
  cik VARCHAR(10), -- If the search was for a specific CIK
  company_name TEXT, -- If the search was for a specific company
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for popular searches
CREATE INDEX IF NOT EXISTS idx_sec_search_query ON sec_search_history(query);
CREATE INDEX IF NOT EXISTS idx_sec_search_ticker ON sec_search_history(ticker);
CREATE INDEX IF NOT EXISTS idx_sec_search_created ON sec_search_history(created_at DESC);

-- RLS for search history
ALTER TABLE sec_search_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own search history
CREATE POLICY "Users can view their own search history"
  ON sec_search_history FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Anyone can insert a search record
CREATE POLICY "Anyone can insert search history"
  ON sec_search_history FOR INSERT
  WITH CHECK (true);

-- Function to get popular searches
CREATE OR REPLACE FUNCTION get_popular_sec_searches(p_limit INTEGER DEFAULT 10, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  ticker VARCHAR(10),
  company_name TEXT,
  cik VARCHAR(10),
  search_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.ticker,
    s.company_name,
    s.cik,
    COUNT(*)::BIGINT as search_count
  FROM sec_search_history s
  WHERE s.ticker IS NOT NULL
    AND s.created_at >= CURRENT_DATE - p_days
  GROUP BY s.ticker, s.company_name, s.cik
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
