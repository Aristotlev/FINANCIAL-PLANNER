-- ============================================
-- NEWS DATA CACHE TABLES FOR OMNIFOLIO
-- ============================================
-- This migration creates cache tables for:
-- 1. IPO Calendar
-- 2. Earnings Calendar  
-- 3. Twitter/X Feed
--
-- Benefits:
-- - Reduces external API calls (cost savings)
-- - Faster response times for users
-- - App works even if external APIs are down
-- - Centralized refresh management
-- ============================================

-- ==================== IPO CALENDAR CACHE ====================

CREATE TABLE IF NOT EXISTS public.ipo_calendar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  exchange TEXT,
  ipo_date DATE,
  price_range_low DECIMAL(12, 2),
  price_range_high DECIMAL(12, 2),
  offer_price DECIMAL(12, 2),
  shares_offered BIGINT,
  expected_ipo_date DATE,
  status TEXT, -- 'upcoming', 'priced', 'withdrawn', 'postponed'
  industry TEXT,
  lead_underwriters TEXT[],
  market_cap_estimate DECIMAL(18, 2),
  description TEXT,
  filing_date DATE,
  raw_data JSONB, -- Store full API response for flexibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate entries for same symbol on same date
  UNIQUE(symbol, ipo_date)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_ipo_calendar_date ON public.ipo_calendar_cache(ipo_date DESC);
CREATE INDEX IF NOT EXISTS idx_ipo_calendar_status ON public.ipo_calendar_cache(status);
CREATE INDEX IF NOT EXISTS idx_ipo_calendar_symbol ON public.ipo_calendar_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_ipo_calendar_updated ON public.ipo_calendar_cache(updated_at);

-- ==================== EARNINGS CALENDAR CACHE ====================

CREATE TABLE IF NOT EXISTS public.earnings_calendar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  report_time TEXT, -- 'bmo' (before market open), 'amc' (after market close), 'during'
  fiscal_quarter TEXT, -- 'Q1', 'Q2', 'Q3', 'Q4'
  fiscal_year INTEGER,
  eps_estimate DECIMAL(10, 4),
  eps_actual DECIMAL(10, 4),
  revenue_estimate DECIMAL(18, 2),
  revenue_actual DECIMAL(18, 2),
  surprise_percent DECIMAL(8, 4),
  conference_call_time TIMESTAMPTZ,
  conference_call_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate entries for same symbol on same date
  UNIQUE(symbol, report_date)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_date ON public.earnings_calendar_cache(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_symbol ON public.earnings_calendar_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_time ON public.earnings_calendar_cache(report_time);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_updated ON public.earnings_calendar_cache(updated_at);

-- ==================== TWITTER/X FEED CACHE ====================

CREATE TABLE IF NOT EXISTS public.twitter_feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT UNIQUE NOT NULL, -- Original tweet ID from Twitter
  author_username TEXT NOT NULL,
  author_name TEXT,
  author_profile_image TEXT,
  author_verified BOOLEAN DEFAULT FALSE,
  author_followers INTEGER,
  content TEXT NOT NULL,
  content_html TEXT, -- Formatted with links/mentions
  media_urls TEXT[], -- Images, videos
  hashtags TEXT[],
  mentioned_symbols TEXT[], -- Stock symbols mentioned ($AAPL, $TSLA, etc.)
  mentioned_users TEXT[],
  tweet_url TEXT,
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  sentiment TEXT, -- 'bullish', 'bearish', 'neutral'
  sentiment_score DECIMAL(5, 4), -- -1 to 1
  is_retweet BOOLEAN DEFAULT FALSE,
  original_tweet_id TEXT,
  language TEXT DEFAULT 'en',
  source TEXT, -- 'fintwit', 'official', 'influencer', etc.
  category TEXT, -- 'market_news', 'earnings', 'ipo', 'crypto', 'general'
  published_at TIMESTAMPTZ NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_twitter_feed_published ON public.twitter_feed_cache(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_feed_author ON public.twitter_feed_cache(author_username);
CREATE INDEX IF NOT EXISTS idx_twitter_feed_symbols ON public.twitter_feed_cache USING GIN(mentioned_symbols);
CREATE INDEX IF NOT EXISTS idx_twitter_feed_hashtags ON public.twitter_feed_cache USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_twitter_feed_category ON public.twitter_feed_cache(category);
CREATE INDEX IF NOT EXISTS idx_twitter_feed_sentiment ON public.twitter_feed_cache(sentiment);
CREATE INDEX IF NOT EXISTS idx_twitter_feed_updated ON public.twitter_feed_cache(updated_at);

-- ==================== CACHE METADATA TABLE ====================
-- Track when each cache was last refreshed

CREATE TABLE IF NOT EXISTS public.cache_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_name TEXT UNIQUE NOT NULL, -- 'ipo_calendar', 'earnings_calendar', 'twitter_feed'
  last_refresh_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  refresh_interval_minutes INTEGER DEFAULT 60, -- How often to refresh
  last_refresh_status TEXT, -- 'success', 'failed', 'partial'
  last_refresh_error TEXT,
  items_count INTEGER DEFAULT 0,
  api_calls_today INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT 1000,
  is_refreshing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default metadata entries
INSERT INTO public.cache_metadata (cache_name, refresh_interval_minutes, api_calls_limit)
VALUES 
  ('ipo_calendar', 360, 100),      -- Refresh every 6 hours
  ('earnings_calendar', 60, 500),  -- Refresh every hour
  ('twitter_feed', 15, 1000)       -- Refresh every 15 minutes
ON CONFLICT (cache_name) DO NOTHING;

-- ==================== HELPER FUNCTIONS ====================

-- Function to check if cache needs refresh
CREATE OR REPLACE FUNCTION cache_needs_refresh(p_cache_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_metadata RECORD;
BEGIN
  SELECT * INTO v_metadata
  FROM public.cache_metadata
  WHERE cache_name = p_cache_name;
  
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check if currently refreshing (avoid concurrent refreshes)
  IF v_metadata.is_refreshing THEN
    RETURN FALSE;
  END IF;
  
  -- Check if never refreshed or past next refresh time
  IF v_metadata.last_refresh_at IS NULL OR 
     NOW() >= v_metadata.next_refresh_at THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark cache refresh started
CREATE OR REPLACE FUNCTION cache_refresh_started(p_cache_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.cache_metadata
  SET is_refreshing = TRUE,
      updated_at = NOW()
  WHERE cache_name = p_cache_name;
END;
$$ LANGUAGE plpgsql;

-- Function to mark cache refresh completed
CREATE OR REPLACE FUNCTION cache_refresh_completed(
  p_cache_name TEXT,
  p_status TEXT,
  p_error TEXT DEFAULT NULL,
  p_items_count INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
  v_interval INTEGER;
BEGIN
  SELECT refresh_interval_minutes INTO v_interval
  FROM public.cache_metadata
  WHERE cache_name = p_cache_name;
  
  UPDATE public.cache_metadata
  SET is_refreshing = FALSE,
      last_refresh_at = NOW(),
      next_refresh_at = NOW() + (v_interval || ' minutes')::INTERVAL,
      last_refresh_status = p_status,
      last_refresh_error = p_error,
      items_count = p_items_count,
      api_calls_today = api_calls_today + 1,
      updated_at = NOW()
  WHERE cache_name = p_cache_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache status
CREATE OR REPLACE FUNCTION get_cache_status()
RETURNS TABLE (
  cache_name TEXT,
  last_refresh_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  needs_refresh BOOLEAN,
  is_refreshing BOOLEAN,
  items_count INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.cache_name,
    cm.last_refresh_at,
    cm.next_refresh_at,
    cache_needs_refresh(cm.cache_name) AS needs_refresh,
    cm.is_refreshing,
    cm.items_count,
    cm.last_refresh_status AS status
  FROM public.cache_metadata cm
  ORDER BY cm.cache_name;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old cache data
CREATE OR REPLACE FUNCTION clean_old_cache_data(p_days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE (
  table_name TEXT,
  rows_deleted INTEGER
) AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Clean old IPO data (keep historical for reference)
  DELETE FROM public.ipo_calendar_cache
  WHERE ipo_date < NOW() - (p_days_to_keep || ' days')::INTERVAL
    AND status NOT IN ('upcoming', 'priced');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'ipo_calendar_cache';
  rows_deleted := v_deleted;
  RETURN NEXT;
  
  -- Clean old earnings data
  DELETE FROM public.earnings_calendar_cache
  WHERE report_date < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'earnings_calendar_cache';
  rows_deleted := v_deleted;
  RETURN NEXT;
  
  -- Clean old tweets (keep less time as they're more ephemeral)
  DELETE FROM public.twitter_feed_cache
  WHERE published_at < NOW() - ((p_days_to_keep / 2) || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'twitter_feed_cache';
  rows_deleted := v_deleted;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS
ALTER TABLE public.ipo_calendar_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_calendar_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twitter_feed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_metadata ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read cached data)
CREATE POLICY "Public read access for ipo_calendar_cache"
ON public.ipo_calendar_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for earnings_calendar_cache"
ON public.earnings_calendar_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for twitter_feed_cache"
ON public.twitter_feed_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for cache_metadata"
ON public.cache_metadata FOR SELECT
USING (true);

-- Service role can do everything (for background refresh jobs)
CREATE POLICY "Service role full access for ipo_calendar_cache"
ON public.ipo_calendar_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for earnings_calendar_cache"
ON public.earnings_calendar_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for twitter_feed_cache"
ON public.twitter_feed_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for cache_metadata"
ON public.cache_metadata FOR ALL
USING (auth.role() = 'service_role');

-- ==================== AUTO-UPDATE TIMESTAMPS ====================

CREATE OR REPLACE FUNCTION update_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ipo_calendar_cache_timestamp
BEFORE UPDATE ON public.ipo_calendar_cache
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

CREATE TRIGGER update_earnings_calendar_cache_timestamp
BEFORE UPDATE ON public.earnings_calendar_cache
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

CREATE TRIGGER update_twitter_feed_cache_timestamp
BEFORE UPDATE ON public.twitter_feed_cache
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

CREATE TRIGGER update_cache_metadata_timestamp
BEFORE UPDATE ON public.cache_metadata
FOR EACH ROW EXECUTE FUNCTION update_cache_timestamp();

-- ==================== USEFUL VIEWS ====================

-- View for upcoming IPOs (next 30 days)
CREATE OR REPLACE VIEW public.upcoming_ipos AS
SELECT 
  symbol,
  company_name,
  exchange,
  ipo_date,
  price_range_low,
  price_range_high,
  offer_price,
  shares_offered,
  industry,
  lead_underwriters,
  market_cap_estimate,
  description,
  status,
  updated_at
FROM public.ipo_calendar_cache
WHERE ipo_date >= CURRENT_DATE
  AND ipo_date <= CURRENT_DATE + INTERVAL '30 days'
  AND status IN ('upcoming', 'priced')
ORDER BY ipo_date ASC;

-- View for this week's earnings
CREATE OR REPLACE VIEW public.weekly_earnings AS
SELECT 
  symbol,
  company_name,
  report_date,
  report_time,
  fiscal_quarter,
  fiscal_year,
  eps_estimate,
  eps_actual,
  revenue_estimate,
  revenue_actual,
  surprise_percent,
  conference_call_time,
  updated_at
FROM public.earnings_calendar_cache
WHERE report_date >= date_trunc('week', CURRENT_DATE)
  AND report_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
ORDER BY report_date ASC, 
  CASE report_time 
    WHEN 'bmo' THEN 1 
    WHEN 'during' THEN 2 
    WHEN 'amc' THEN 3 
    ELSE 4 
  END;

-- View for recent financial tweets
CREATE OR REPLACE VIEW public.recent_fintwit AS
SELECT 
  tweet_id,
  author_username,
  author_name,
  author_profile_image,
  author_verified,
  content,
  mentioned_symbols,
  hashtags,
  tweet_url,
  likes_count,
  retweets_count,
  sentiment,
  category,
  published_at
FROM public.twitter_feed_cache
WHERE published_at >= NOW() - INTERVAL '24 hours'
ORDER BY published_at DESC
LIMIT 100;

-- ============================================
-- USAGE EXAMPLES
-- ============================================
--
-- Check cache status:
--   SELECT * FROM get_cache_status();
--
-- Check if cache needs refresh:
--   SELECT cache_needs_refresh('ipo_calendar');
--
-- Get upcoming IPOs:
--   SELECT * FROM upcoming_ipos;
--
-- Get this week's earnings:
--   SELECT * FROM weekly_earnings;
--
-- Get recent financial tweets:
--   SELECT * FROM recent_fintwit;
--
-- Clean old data (keep last 30 days):
--   SELECT * FROM clean_old_cache_data(30);
--
-- Manual refresh flow (in your backend code):
--   1. Check: SELECT cache_needs_refresh('twitter_feed');
--   2. Start: SELECT cache_refresh_started('twitter_feed');
--   3. Fetch from API and insert data
--   4. Complete: SELECT cache_refresh_completed('twitter_feed', 'success', NULL, 50);
-- ============================================
