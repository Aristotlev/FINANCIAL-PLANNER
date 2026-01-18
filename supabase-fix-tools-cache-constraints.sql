-- ============================================
-- FIX TOOLS CACHE CONSTRAINTS
-- ============================================
-- This migration fixes the unique constraints for cache tables
-- to properly handle NULL values in ID fields.
-- ============================================

-- ==================== FIX SENATE LOBBYING CACHE ====================

-- Step 1: Update existing NULL values to empty strings
UPDATE public.senate_lobbying_cache 
SET senate_id = '' WHERE senate_id IS NULL;

UPDATE public.senate_lobbying_cache 
SET house_registrant_id = '' WHERE house_registrant_id IS NULL;

-- Step 2: Drop the old constraint
ALTER TABLE public.senate_lobbying_cache 
DROP CONSTRAINT IF EXISTS senate_lobbying_cache_symbol_senate_id_house_registrant_id_key;

-- Step 3: Alter columns to NOT NULL with default
ALTER TABLE public.senate_lobbying_cache 
ALTER COLUMN senate_id SET NOT NULL,
ALTER COLUMN senate_id SET DEFAULT '';

ALTER TABLE public.senate_lobbying_cache 
ALTER COLUMN house_registrant_id SET NOT NULL,
ALTER COLUMN house_registrant_id SET DEFAULT '';

-- Step 4: Add the constraint back
ALTER TABLE public.senate_lobbying_cache 
ADD CONSTRAINT senate_lobbying_cache_symbol_senate_id_house_registrant_id_key 
UNIQUE (symbol, senate_id, house_registrant_id);

-- ==================== FIX INSIDER TRANSACTIONS CACHE ====================
-- Ensure date columns are properly typed and the cache can accept data

-- Remove any rows with NULL dates that would break the constraint
DELETE FROM public.insider_transactions_cache 
WHERE filing_date IS NULL OR transaction_date IS NULL;

-- ==================== FIX USA SPENDING CACHE ====================

-- Step 1: Update existing NULL values to empty strings
UPDATE public.usa_spending_cache 
SET permalink = '' WHERE permalink IS NULL;

-- Step 2: Drop the old constraint
ALTER TABLE public.usa_spending_cache 
DROP CONSTRAINT IF EXISTS usa_spending_cache_symbol_permalink_key;

-- Step 3: Alter column to NOT NULL with default
ALTER TABLE public.usa_spending_cache 
ALTER COLUMN permalink SET NOT NULL,
ALTER COLUMN permalink SET DEFAULT '';

-- Step 4: Add the constraint back
ALTER TABLE public.usa_spending_cache 
ADD CONSTRAINT usa_spending_cache_symbol_permalink_key 
UNIQUE (symbol, permalink);

-- ==================== VERIFY ====================

SELECT 'senate_lobbying_cache constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.senate_lobbying_cache'::regclass;

SELECT 'insider_transactions_cache constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.insider_transactions_cache'::regclass;

SELECT 'usa_spending_cache constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.usa_spending_cache'::regclass;

-- ==================== RESET CACHE STATUS ====================
-- Allow immediate refresh after fix

UPDATE public.cache_metadata 
SET last_refresh_at = NULL, 
    last_refresh_status = NULL, 
    last_refresh_error = NULL,
    is_refreshing = false
WHERE cache_name IN ('insider_transactions', 'senate_lobbying', 'usa_spending');
