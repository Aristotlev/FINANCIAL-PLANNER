-- ══════════════════════════════════════════════════════════════════
-- Add Missing UNIQUE Constraints to Cache Tables
-- 
-- BACKGROUND:
-- The cache tables were originally created with an older schema.
-- When the new schema was deployed, CREATE TABLE IF NOT EXISTS
-- was skipped (tables existed), so the UNIQUE constraints inside
-- the CREATE TABLE block were never created. This caused all
-- upsert operations to silently fail with error 42P10:
--   "there is no unique or exclusion constraint matching the 
--    ON CONFLICT specification"
--
-- IMPACT: No data was ever being written to the cache tables.
-- Every API request hit the external APIs (Senate LDA, USASpending).
--
-- This migration adds the missing constraints so upserts work.
-- The application code has been updated to use DELETE+INSERT as a
-- fallback, but having the constraints is still recommended.
--
-- Run this in the Supabase Dashboard SQL Editor.
-- ══════════════════════════════════════════════════════════════════

-- Step 1: Clean up any remaining old-schema rows with NULL keys
DELETE FROM senate_lobbying_cache WHERE filing_uuid IS NULL;
DELETE FROM usa_spending_cache WHERE award_id IS NULL;

-- Step 2: Make the key columns NOT NULL (required for UNIQUE constraint)
ALTER TABLE senate_lobbying_cache ALTER COLUMN filing_uuid SET NOT NULL;
ALTER TABLE usa_spending_cache ALTER COLUMN award_id SET NOT NULL;

-- Step 3: Add UNIQUE constraints (safe to re-run — IF NOT EXISTS)
DO $$ 
BEGIN
  -- Senate Lobbying Cache
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'senate_lobbying_cache_unique'
  ) THEN
    ALTER TABLE senate_lobbying_cache 
      ADD CONSTRAINT senate_lobbying_cache_unique 
      UNIQUE (symbol, filing_uuid);
    RAISE NOTICE 'Added UNIQUE constraint to senate_lobbying_cache';
  ELSE
    RAISE NOTICE 'senate_lobbying_cache_unique already exists';
  END IF;

  -- USA Spending Cache
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'usa_spending_cache_unique'
  ) THEN
    ALTER TABLE usa_spending_cache 
      ADD CONSTRAINT usa_spending_cache_unique 
      UNIQUE (symbol, award_id);
    RAISE NOTICE 'Added UNIQUE constraint to usa_spending_cache';
  ELSE
    RAISE NOTICE 'usa_spending_cache_unique already exists';
  END IF;
END $$;

-- Step 4: Verify
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('senate_lobbying_cache', 'usa_spending_cache')
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name;
