-- ============================================
-- FIX USA SPENDING CACHE RLS POLICIES
-- ============================================
-- Run this in your Supabase SQL Editor to fix 
-- USA Spending cache access issues in production.
--
-- Problem: RLS is enabled but policies may be missing,
-- causing the anon key to return empty results.
-- ============================================

-- First, check if the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'usa_spending_cache'
  ) THEN
    RAISE EXCEPTION 'Table usa_spending_cache does not exist. Please create it first.';
  END IF;
END $$;

-- ==================== ENABLE RLS ====================
-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.usa_spending_cache ENABLE ROW LEVEL SECURITY;

-- ==================== DROP ALL EXISTING POLICIES ====================
-- Clean slate approach to avoid conflicts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'usa_spending_cache' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usa_spending_cache', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- ==================== CREATE READ POLICY ====================
-- Allow ANYONE (including anon) to read cached data
-- This is public government data, no authentication required
CREATE POLICY "Anyone can read usa_spending_cache"
ON public.usa_spending_cache
FOR SELECT
TO public
USING (true);

-- ==================== CREATE WRITE POLICIES ====================
-- Only service_role can insert/update/delete (backend API calls)

CREATE POLICY "Service role can insert usa_spending_cache"
ON public.usa_spending_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update usa_spending_cache"
ON public.usa_spending_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete usa_spending_cache"
ON public.usa_spending_cache
FOR DELETE
TO service_role
USING (true);

-- ==================== ALSO FIX OTHER CACHE TABLES ====================
-- Apply same pattern to insider_transactions_cache and senate_lobbying_cache

-- insider_transactions_cache
ALTER TABLE public.insider_transactions_cache ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'insider_transactions_cache' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.insider_transactions_cache', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Anyone can read insider_transactions_cache"
ON public.insider_transactions_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role can insert insider_transactions_cache"
ON public.insider_transactions_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update insider_transactions_cache"
ON public.insider_transactions_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete insider_transactions_cache"
ON public.insider_transactions_cache
FOR DELETE
TO service_role
USING (true);

-- senate_lobbying_cache
ALTER TABLE public.senate_lobbying_cache ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'senate_lobbying_cache' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.senate_lobbying_cache', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Anyone can read senate_lobbying_cache"
ON public.senate_lobbying_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role can insert senate_lobbying_cache"
ON public.senate_lobbying_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update senate_lobbying_cache"
ON public.senate_lobbying_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete senate_lobbying_cache"
ON public.senate_lobbying_cache
FOR DELETE
TO service_role
USING (true);

-- ==================== VERIFY POLICIES ====================
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('usa_spending_cache', 'insider_transactions_cache', 'senate_lobbying_cache')
ORDER BY tablename, policyname;

-- ==================== TEST ACCESS ====================
-- This should return data count (or 0 if empty, but NOT error)
SELECT 
  'usa_spending_cache' as table_name,
  COUNT(*) as row_count
FROM public.usa_spending_cache
UNION ALL
SELECT 
  'insider_transactions_cache',
  COUNT(*)
FROM public.insider_transactions_cache
UNION ALL
SELECT 
  'senate_lobbying_cache',
  COUNT(*)
FROM public.senate_lobbying_cache;
