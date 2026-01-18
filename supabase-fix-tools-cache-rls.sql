-- ============================================
-- FIX RLS POLICIES FOR TOOLS CACHE TABLES
-- ============================================
-- This migration adds missing RLS policies for:
-- 1. insider_transactions_cache
-- 2. senate_lobbying_cache  
-- 3. usa_spending_cache
--
-- Without these policies, the tables are inaccessible 
-- when RLS is enabled (which it likely is in production).
-- ============================================

-- ==================== ENABLE RLS ====================

ALTER TABLE public.insider_transactions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senate_lobbying_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usa_spending_cache ENABLE ROW LEVEL SECURITY;

-- ==================== DROP EXISTING POLICIES (if any) ====================
-- This prevents errors if policies already exist

DROP POLICY IF EXISTS "Public read access for insider_transactions_cache" ON public.insider_transactions_cache;
DROP POLICY IF EXISTS "Service role full access for insider_transactions_cache" ON public.insider_transactions_cache;

DROP POLICY IF EXISTS "Public read access for senate_lobbying_cache" ON public.senate_lobbying_cache;
DROP POLICY IF EXISTS "Service role full access for senate_lobbying_cache" ON public.senate_lobbying_cache;

DROP POLICY IF EXISTS "Public read access for usa_spending_cache" ON public.usa_spending_cache;
DROP POLICY IF EXISTS "Service role full access for usa_spending_cache" ON public.usa_spending_cache;

-- ==================== CREATE READ POLICIES ====================
-- Allow anyone to read cached data (this is public government data)

CREATE POLICY "Public read access for insider_transactions_cache"
ON public.insider_transactions_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for senate_lobbying_cache"
ON public.senate_lobbying_cache FOR SELECT
USING (true);

CREATE POLICY "Public read access for usa_spending_cache"
ON public.usa_spending_cache FOR SELECT
USING (true);

-- ==================== CREATE WRITE POLICIES ====================
-- Only service role (backend/cron jobs) can insert/update/delete

CREATE POLICY "Service role full access for insider_transactions_cache"
ON public.insider_transactions_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for senate_lobbying_cache"
ON public.senate_lobbying_cache FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for usa_spending_cache"
ON public.usa_spending_cache FOR ALL
USING (auth.role() = 'service_role');

-- ==================== VERIFY ====================
-- Run this after applying the migration to verify

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('insider_transactions_cache', 'senate_lobbying_cache', 'usa_spending_cache')
ORDER BY tablename, policyname;
