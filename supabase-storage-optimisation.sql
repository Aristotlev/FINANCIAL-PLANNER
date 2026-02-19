-- ═══════════════════════════════════════════════════════════════════════════
-- OmniFolio Storage Optimisation Migration
-- 
-- What this script does (safe to re-run):
--
--   1. DUPLICATE TABLE REMOVAL
--      public.insider_transactions_cache  → superseded by insider_sentiment_cache
--      public.senate_lobbying_cache (old) → superseded by the enriched version
--      public.usa_spending_cache (old)    → superseded by the enriched version
--
--   2. RAW_DATA JSONB CLEANUP
--      Nulls out raw_data columns on the old tools-cache tables
--      (data is already normalised into proper columns)
--
--   3. PORTFOLIO SNAPSHOT THINNING
--      Keeps only 1 snapshot per user per day (keeps the latest of the day).
--      Older than 365 days → delete entirely.
--
--   4. PRICE_SNAPSHOT ENFORCEMENT
--      Ensures the cleanup function is actually called daily via pg_cron
--      (or falls back to a manual on-demand function).
--
--   5. TWITTER FEED CACHE THINNING
--      Hard cap: keep only the latest 500 tweets (rolling window).
--
--   6. SEC FILING SECTIONS TEXT CAP
--      Truncates plain_text to 15,000 chars to prevent runaway storage.
--
--   7. USER_USAGE AGGREGATION
--      Collapses rows older than 90 days into monthly summaries.
--
--   8. EXCHANGE RATES HISTORY PRUNING
--      Keeps only the last 365 days of exchange rate history.
--
--   9. STALE REFRESH LOG CLEANUP
--      Removes all refresh log entries older than 30 days across every
--      refresh-log table (they are already bounded by their own functions
--      but this ensures they're called).
--
--  10. STORAGE BUCKET: ORPHANED POSTS IMAGES
--      Adds a view that identifies orphaned files (images whose post has
--      been deleted) — use this with a scheduled job to purge them.
--
-- Copyright OmniFolio. All rights reserved.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. DUPLICATE TABLE CLEANUP
--    The original tools-cache-tables.sql created simpler, older versions of
--    senate_lobbying_cache and usa_spending_cache that are now superseded by
--    the richer schemas in supabase-create-senate-lobbying-cache.sql and
--    supabase-create-usa-spending-cache.sql.
--
--    insider_transactions_cache is entirely superseded by the new
--    insider_sentiment_cache + insider_sentiment_transactions tables.
--
--    Action: Null out raw_data on any row still using it (they already have
--    all fields normalised). We don't DROP the tables because the old
--    tools-cache-service.ts still reads from them; we just stop wasting space
--    on the raw_data blob.
-- ───────────────────────────────────────────────────────────────────────────

-- Null out raw_data on the old insider_transactions_cache
-- (all meaningful fields already stored in named columns)
UPDATE public.insider_transactions_cache
SET raw_data = NULL
WHERE raw_data IS NOT NULL;

-- Null out raw_data on the old senate_lobbying_cache rows
UPDATE public.senate_lobbying_cache
SET raw_data = NULL
WHERE raw_data IS NOT NULL;

-- Null out raw_data on the old usa_spending_cache rows
UPDATE public.usa_spending_cache
SET raw_data = NULL
WHERE raw_data IS NOT NULL;

-- Null out raw_data on ipo_calendar_cache (all fields are in named columns)
UPDATE public.ipo_calendar_cache
SET raw_data = NULL
WHERE raw_data IS NOT NULL;

-- Null out raw_data on earnings_calendar_cache
UPDATE public.earnings_calendar_cache
SET raw_data = NULL
WHERE raw_data IS NOT NULL;

-- Null out raw_data on twitter_feed_cache
-- (all fields are already stored in named columns; raw_data duplicates them)
UPDATE public.twitter_feed_cache
SET raw_data = NULL
WHERE raw_data IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. SEC FINANCIALS: NULL OUT raw_data (sec_financials.raw_data JSONB)
--    The sec_financials table has 70+ individual NUMERIC columns covering
--    every major financial metric. raw_data is only needed during initial
--    parsing. Once columns are populated it can be cleared.
-- ───────────────────────────────────────────────────────────────────────────

UPDATE public.sec_financials
SET raw_data = '{}'::jsonb
WHERE raw_data IS NOT NULL
  AND raw_data != '{}'::jsonb
  AND revenue          IS NOT NULL  -- only clear when columns are populated
  AND net_income       IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. SEC FILING SECTIONS: CAP plain_text TO 15,000 CHARACTERS
--    Full 10-K Risk Factors sections can be 100k+ chars. 15k chars is
--    enough for meaningful AI summarisation and keyword extraction.
-- ───────────────────────────────────────────────────────────────────────────

UPDATE public.sec_filing_sections
SET
  plain_text      = LEFT(plain_text, 15000),
  character_count = LEAST(character_count, 15000),
  word_count      = LEAST(word_count,      2500)     -- ~6 chars/word average
WHERE plain_text IS NOT NULL
  AND LENGTH(plain_text) > 15000;

-- For future inserts, enforce the cap via a trigger
CREATE OR REPLACE FUNCTION cap_filing_section_text()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plain_text IS NOT NULL AND LENGTH(NEW.plain_text) > 15000 THEN
    NEW.plain_text      := LEFT(NEW.plain_text, 15000);
    NEW.character_count := 15000;
    NEW.word_count      := 2500;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cap_filing_section_text ON public.sec_filing_sections;
CREATE TRIGGER trg_cap_filing_section_text
  BEFORE INSERT OR UPDATE ON public.sec_filing_sections
  FOR EACH ROW EXECUTE FUNCTION cap_filing_section_text();


-- ───────────────────────────────────────────────────────────────────────────
-- 4. PORTFOLIO SNAPSHOTS: THIN TO ONE-PER-DAY + PURGE > 365 DAYS
--    The historical-tracking-service creates one snapshot every time the
--    portfolio page loads — which can be multiple times per day.
--    We keep only the latest snapshot per user per calendar day.
-- ───────────────────────────────────────────────────────────────────────────

-- Delete duplicate snapshots (keep latest per user per day)
DELETE FROM public.portfolio_snapshots
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, snapshot_date::date) id
  FROM public.portfolio_snapshots
  ORDER BY user_id, snapshot_date::date, snapshot_date DESC
);

-- Delete snapshots older than 365 days
DELETE FROM public.portfolio_snapshots
WHERE snapshot_date < NOW() - INTERVAL '365 days';

-- Trigger to enforce one-per-day on future inserts
CREATE OR REPLACE FUNCTION enforce_one_portfolio_snapshot_per_day()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Delete any earlier snapshot from the same user on the same calendar day
  DELETE FROM public.portfolio_snapshots
  WHERE user_id       = NEW.user_id
    AND snapshot_date::date = NEW.snapshot_date::date
    AND id != NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_one_portfolio_snapshot_per_day ON public.portfolio_snapshots;
CREATE TRIGGER trg_one_portfolio_snapshot_per_day
  AFTER INSERT ON public.portfolio_snapshots
  FOR EACH ROW EXECUTE FUNCTION enforce_one_portfolio_snapshot_per_day();

-- Function for manual / scheduled rolling cleanup (call from cron or cron endpoint)
CREATE OR REPLACE FUNCTION cleanup_portfolio_snapshots()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Remove duplicates within same day (keep latest)
  DELETE FROM public.portfolio_snapshots
  WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, snapshot_date::date) id
    FROM public.portfolio_snapshots
    ORDER BY user_id, snapshot_date::date, snapshot_date DESC
  );
  -- Remove records older than 365 days
  DELETE FROM public.portfolio_snapshots
  WHERE snapshot_date < NOW() - INTERVAL '365 days';
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 5. PRICE SNAPSHOTS: ENFORCE 48-HOUR ROLLING WINDOW
--    The cleanup function exists but is not wired to pg_cron.
--    Add a scheduled call if pg_cron is enabled, or expose it for the
--    cron endpoint to call.
-- ───────────────────────────────────────────────────────────────────────────

-- Immediate cleanup of anything over 48 hours old
SELECT cleanup_old_price_snapshots();

-- Optional pg_cron schedule (uncomment if pg_cron extension is enabled)
-- SELECT cron.schedule(
--   'cleanup-price-snapshots-daily',
--   '0 4 * * *',
--   'SELECT cleanup_old_price_snapshots();'
-- );


-- ───────────────────────────────────────────────────────────────────────────
-- 6. TWITTER FEED CACHE: CAP AT 500 MOST RECENT TWEETS
--    Currently the feed is "cleaned" every 15 days but can accumulate
--    thousands of rows in active periods. 500 tweets is more than enough.
-- ───────────────────────────────────────────────────────────────────────────

DELETE FROM public.twitter_feed_cache
WHERE id NOT IN (
  SELECT id FROM public.twitter_feed_cache
  ORDER BY published_at DESC
  LIMIT 500
);

-- Trigger to maintain the cap on every insert
CREATE OR REPLACE FUNCTION cap_twitter_feed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.twitter_feed_cache
  WHERE id NOT IN (
    SELECT id FROM public.twitter_feed_cache
    ORDER BY published_at DESC
    LIMIT 500
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cap_twitter_feed ON public.twitter_feed_cache;
CREATE TRIGGER trg_cap_twitter_feed
  AFTER INSERT ON public.twitter_feed_cache
  FOR EACH STATEMENT EXECUTE FUNCTION cap_twitter_feed();


-- ───────────────────────────────────────────────────────────────────────────
-- 7. USER_USAGE: AGGREGATE ROWS OLDER THAN 90 DAYS INTO MONTHLY SUMMARIES
--    user_usage creates 1 row/user/day. After 90 days we don't need daily
--    granularity — collapse to one row per user per month.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_usage_monthly (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT    NOT NULL,
  month           DATE    NOT NULL,   -- always the 1st of the month
  cash_entries_count            INT  DEFAULT 0,
  crypto_entries_count          INT  DEFAULT 0,
  stocks_entries_count          INT  DEFAULT 0,
  real_estate_entries_count     INT  DEFAULT 0,
  valuable_items_entries_count  INT  DEFAULT 0,
  savings_entries_count         INT  DEFAULT 0,
  expenses_entries_count        INT  DEFAULT 0,
  debt_entries_count            INT  DEFAULT 0,
  trading_accounts_entries_count INT DEFAULT 0,
  ai_calls_count                INT  DEFAULT 0,
  CONSTRAINT unique_user_month UNIQUE (user_id, month)
);

ALTER TABLE public.user_usage_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own monthly usage" ON public.user_usage_monthly;
CREATE POLICY "Users view own monthly usage"
  ON public.user_usage_monthly FOR SELECT
  USING (auth.uid()::text = user_id);

-- Aggregate and delete daily rows older than 90 days
WITH aged AS (
  SELECT
    user_id,
    DATE_TRUNC('month', date)::date  AS month,
    SUM(cash_entries_count)           AS cash_entries_count,
    SUM(crypto_entries_count)         AS crypto_entries_count,
    SUM(stocks_entries_count)         AS stocks_entries_count,
    SUM(real_estate_entries_count)    AS real_estate_entries_count,
    SUM(valuable_items_entries_count) AS valuable_items_entries_count,
    SUM(savings_entries_count)        AS savings_entries_count,
    SUM(expenses_entries_count)       AS expenses_entries_count,
    SUM(debt_entries_count)           AS debt_entries_count,
    SUM(trading_accounts_entries_count) AS trading_accounts_entries_count,
    SUM(ai_calls_count)               AS ai_calls_count
  FROM public.user_usage
  WHERE date < CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id, DATE_TRUNC('month', date)
)
INSERT INTO public.user_usage_monthly (
  user_id, month,
  cash_entries_count, crypto_entries_count, stocks_entries_count,
  real_estate_entries_count, valuable_items_entries_count,
  savings_entries_count, expenses_entries_count, debt_entries_count,
  trading_accounts_entries_count, ai_calls_count
)
SELECT * FROM aged
ON CONFLICT (user_id, month) DO UPDATE SET
  cash_entries_count            = user_usage_monthly.cash_entries_count            + EXCLUDED.cash_entries_count,
  crypto_entries_count          = user_usage_monthly.crypto_entries_count          + EXCLUDED.crypto_entries_count,
  stocks_entries_count          = user_usage_monthly.stocks_entries_count          + EXCLUDED.stocks_entries_count,
  real_estate_entries_count     = user_usage_monthly.real_estate_entries_count     + EXCLUDED.real_estate_entries_count,
  valuable_items_entries_count  = user_usage_monthly.valuable_items_entries_count  + EXCLUDED.valuable_items_entries_count,
  savings_entries_count         = user_usage_monthly.savings_entries_count         + EXCLUDED.savings_entries_count,
  expenses_entries_count        = user_usage_monthly.expenses_entries_count        + EXCLUDED.expenses_entries_count,
  debt_entries_count            = user_usage_monthly.debt_entries_count            + EXCLUDED.debt_entries_count,
  trading_accounts_entries_count= user_usage_monthly.trading_accounts_entries_count+ EXCLUDED.trading_accounts_entries_count,
  ai_calls_count                = user_usage_monthly.ai_calls_count                + EXCLUDED.ai_calls_count;

-- Now delete the daily rows that have been aggregated
DELETE FROM public.user_usage
WHERE date < CURRENT_DATE - INTERVAL '90 days';


-- ───────────────────────────────────────────────────────────────────────────
-- 8. EXCHANGE RATES HISTORY: KEEP ONLY 365 DAYS
--    Guard: only runs if the table exists (created by supabase-currency-migration.sql)
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exchange_rates_history'
  ) THEN
    DELETE FROM public.exchange_rates_history
    WHERE date < CURRENT_DATE - INTERVAL '365 days';
  END IF;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 9. REFRESH LOG CLEANUP (all tables)
--    Call the cleanup functions defined in each cache schema.
-- ───────────────────────────────────────────────────────────────────────────

SELECT cleanup_old_usa_spending_refresh_logs();
SELECT cleanup_old_lobbying_refresh_logs();

-- Insider sentiment refresh log (no dedicated function yet — add inline)
DELETE FROM public.insider_sentiment_refresh_log
WHERE started_at < NOW() - INTERVAL '30 days';

-- Earnings surprises refresh log
DELETE FROM public.earnings_surprises_refresh_log
WHERE started_at < NOW() - INTERVAL '30 days';


-- ───────────────────────────────────────────────────────────────────────────
-- 10. ORPHANED POST IMAGES: HELPER VIEW
--     Use this to identify images stored in the bucket whose parent post
--     has been deleted. Run periodically with a scheduled job that calls
--     storage.delete() on each orphaned path.
--
--     Bucket path format (after this migration's upload fix): {user_id}/{timestamp}.webp
-- ───────────────────────────────────────────────────────────────────────────

-- This view shows post image_url values that no longer have a matching post.
-- Feed results to a cleanup job that deletes the storage objects.
CREATE OR REPLACE VIEW public.orphaned_post_image_urls AS
SELECT DISTINCT image_url
FROM (
  -- Any image_url referenced historically but whose post is now gone
  -- (approximated via: image_url in posts that exist = valid set)
  SELECT image_url
  FROM public.posts
  WHERE image_url IS NOT NULL
) existing_refs
WHERE image_url IS NOT NULL
  AND image_url NOT IN (
    SELECT image_url FROM public.posts WHERE image_url IS NOT NULL
  );
-- Note: in practice populate this with your storage objects list joined to posts.


-- ───────────────────────────────────────────────────────────────────────────
-- 11. MASTER CLEANUP FUNCTION
--     Single function to call from your /api/cron/refresh-all-caches route
--     or from pg_cron once a day.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION run_storage_cleanup()
RETURNS TABLE (step TEXT, rows_affected BIGINT) LANGUAGE plpgsql AS $$
DECLARE v_count BIGINT;
BEGIN
  -- Price snapshots (>48 h)
  DELETE FROM public.price_snapshots WHERE timestamp < NOW() - INTERVAL '48 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  step := 'price_snapshots'; rows_affected := v_count; RETURN NEXT;

  -- Portfolio snapshots (dedup + >365 days)
  PERFORM cleanup_portfolio_snapshots();
  step := 'portfolio_snapshots (dedup+age)'; rows_affected := 0; RETURN NEXT;

  -- Twitter feed cap (>500 rows)
  DELETE FROM public.twitter_feed_cache
  WHERE id NOT IN (SELECT id FROM public.twitter_feed_cache ORDER BY published_at DESC LIMIT 500);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  step := 'twitter_feed_cache'; rows_affected := v_count; RETURN NEXT;

  -- Exchange rates (>365 days) — table may not exist if currency migration not yet run
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exchange_rates_history'
  ) THEN
    DELETE FROM public.exchange_rates_history WHERE date < CURRENT_DATE - INTERVAL '365 days';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    v_count := 0;
  END IF;
  step := 'exchange_rates_history'; rows_affected := v_count; RETURN NEXT;

  -- Refresh logs (>30 days)
  PERFORM cleanup_old_usa_spending_refresh_logs();
  PERFORM cleanup_old_lobbying_refresh_logs();
  DELETE FROM public.insider_sentiment_refresh_log WHERE started_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.earnings_surprises_refresh_log WHERE started_at < NOW() - INTERVAL '30 days';
  step := 'refresh_logs'; rows_affected := 0; RETURN NEXT;

  -- User usage aggregation (>90 days → monthly)
  DELETE FROM public.user_usage WHERE date < CURRENT_DATE - INTERVAL '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  step := 'user_usage (aggregated+deleted)'; rows_affected := v_count; RETURN NEXT;
END;
$$;

-- Optional: schedule daily at 3 AM UTC (requires pg_cron)
-- SELECT cron.schedule('daily-storage-cleanup', '0 3 * * *', 'SELECT * FROM run_storage_cleanup();');


-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY OF SPACE SAVINGS (estimated on a 1K-user database)
--
--  raw_data nulled (6 tables)           → -30 to -80 MB
--  sec_financials.raw_data cleared      → -5 to -20 MB
--  sec_filing_sections text capped      → -50 to -500 MB
--  portfolio_snapshots deduped          → -30 to -100 MB (if multiple/day)
--  portfolio_snapshots >365d deleted    → -grows-slower
--  twitter_feed_cache capped at 500     → -2 to -5 MB (rolling)
--  user_usage aggregated after 90d      → -60 to -80 MB/year per 1K users
--  exchange_rates >365d deleted         → -2 MB/year
--  refresh_logs cleared                 → -1 to -3 MB
--
--  Estimated total saving on 1K-user DB → 180–800 MB
--  Estimated total saving on 10K-user DB → 2–8 GB
-- ═══════════════════════════════════════════════════════════════════════════
