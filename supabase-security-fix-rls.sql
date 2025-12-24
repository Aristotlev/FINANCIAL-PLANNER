-- =====================================================
-- SECURITY FIX: Proper RLS Policies for Better Auth
-- =====================================================
-- 
-- IMPORTANT: This migration fixes the insecure USING (true) policies
-- 
-- Since we use Better Auth (external to Supabase Auth), we have two options:
-- 
-- OPTION A (Recommended): Service Role with App-Level Verification
-- - Use service_role key on server-side to bypass RLS
-- - Application code validates user via Better Auth before accessing data
-- - RLS policies deny public/anon access, allow only service_role
-- 
-- OPTION B: Custom JWT Verification
-- - Configure Supabase to accept Better Auth JWTs
-- - Pass user_id in JWT claims
-- - RLS policies verify user_id matches the JWT claim
-- 
-- This migration implements OPTION A for maximum security.
-- =====================================================

-- =====================================================
-- Helper function to safely drop and create policies
-- =====================================================

CREATE OR REPLACE FUNCTION safe_create_service_role_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Drop existing policies if they exist
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny authenticated access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %I" ON %I', table_name, table_name);
    
    -- Create new secure policies
    EXECUTE format('CREATE POLICY "Service role full access to %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name, table_name);
    EXECUTE format('CREATE POLICY "Deny anon access to %I" ON %I FOR ALL TO anon USING (false) WITH CHECK (false)', table_name, table_name);
    EXECUTE format('CREATE POLICY "Deny authenticated access to %I" ON %I FOR ALL TO authenticated USING (false) WITH CHECK (false)', table_name, table_name);
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    RAISE NOTICE 'Applied secure policies to table: %', table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping...', table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error applying policies to %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 1: Fix portfolio_snapshots
-- =====================================================

DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Public can read portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Public can insert portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Public can update portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Public can delete portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Users can read own portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Users can insert own portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Users can update own portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Users can delete own portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Service role full access to portfolio_snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Deny anon access to portfolio_snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Deny authenticated access to portfolio_snapshots" ON public.portfolio_snapshots;
    
    -- Create secure policies
    CREATE POLICY "Service role full access to portfolio_snapshots"
        ON public.portfolio_snapshots FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    CREATE POLICY "Deny anon access to portfolio_snapshots"
        ON public.portfolio_snapshots FOR ALL TO anon
        USING (false) WITH CHECK (false);

    CREATE POLICY "Deny authenticated access to portfolio_snapshots"
        ON public.portfolio_snapshots FOR ALL TO authenticated
        USING (false) WITH CHECK (false);
    
    ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Applied secure policies to portfolio_snapshots';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table portfolio_snapshots does not exist, skipping...';
END $$;

-- =====================================================
-- STEP 2: Fix price_snapshots (public read, service_role write)
-- =====================================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read access to price snapshots" ON public.price_snapshots;
    DROP POLICY IF EXISTS "Allow public insert of price snapshots" ON public.price_snapshots;
    DROP POLICY IF EXISTS "Public can read price_snapshots" ON public.price_snapshots;
    DROP POLICY IF EXISTS "Service role can manage price_snapshots" ON public.price_snapshots;
    DROP POLICY IF EXISTS "Deny public write to price_snapshots" ON public.price_snapshots;
    
    -- Price data is public, anyone can read
    CREATE POLICY "Public can read price_snapshots"
        ON public.price_snapshots FOR SELECT
        TO anon, authenticated, service_role
        USING (true);

    -- Only service_role can write
    CREATE POLICY "Service role can manage price_snapshots"
        ON public.price_snapshots FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    
    ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Applied secure policies to price_snapshots';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table price_snapshots does not exist, skipping...';
END $$;

-- =====================================================
-- STEP 3: Fix user_preferences
-- =====================================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role can manage all preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Service role full access to user_preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Deny anon access to user_preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Deny authenticated access to user_preferences" ON user_preferences;
    
    CREATE POLICY "Service role full access to user_preferences"
        ON user_preferences FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    CREATE POLICY "Deny anon access to user_preferences"
        ON user_preferences FOR ALL TO anon
        USING (false) WITH CHECK (false);

    CREATE POLICY "Deny authenticated access to user_preferences"
        ON user_preferences FOR ALL TO authenticated
        USING (false) WITH CHECK (false);
    
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Applied secure policies to user_preferences';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table user_preferences does not exist, skipping...';
END $$;

-- =====================================================
-- STEP 4: Fix subscriptions
-- =====================================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Deny anon access to subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Deny authenticated access to subscriptions" ON public.subscriptions;
    
    CREATE POLICY "Service role full access to subscriptions"
        ON public.subscriptions FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    CREATE POLICY "Deny anon access to subscriptions"
        ON public.subscriptions FOR ALL TO anon
        USING (false) WITH CHECK (false);

    CREATE POLICY "Deny authenticated access to subscriptions"
        ON public.subscriptions FOR ALL TO authenticated
        USING (false) WITH CHECK (false);
    
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Applied secure policies to subscriptions';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table subscriptions does not exist, skipping...';
END $$;

-- =====================================================
-- STEP 5: Apply to all user data tables using helper
-- =====================================================

SELECT safe_create_service_role_policies('cash_accounts');
SELECT safe_create_service_role_policies('crypto_holdings');
SELECT safe_create_service_role_policies('stock_holdings');
SELECT safe_create_service_role_policies('trading_accounts');
SELECT safe_create_service_role_policies('savings_accounts');
SELECT safe_create_service_role_policies('real_estate');
SELECT safe_create_service_role_policies('valuable_items');
SELECT safe_create_service_role_policies('expense_categories');
SELECT safe_create_service_role_policies('income_sources');
SELECT safe_create_service_role_policies('tax_profiles');
SELECT safe_create_service_role_policies('debt_accounts');

-- =====================================================
-- STEP 6: Handle optional tables (may not exist)
-- =====================================================

-- supported_currencies (reference data - public read)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view supported currencies" ON supported_currencies;
    DROP POLICY IF EXISTS "Public can read supported_currencies" ON supported_currencies;
    DROP POLICY IF EXISTS "Service role can manage supported_currencies" ON supported_currencies;
    
    CREATE POLICY "Public can read supported_currencies"
        ON supported_currencies FOR SELECT
        TO anon, authenticated, service_role
        USING (true);

    CREATE POLICY "Service role can manage supported_currencies"
        ON supported_currencies FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    
    ALTER TABLE supported_currencies ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Applied policies to supported_currencies';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table supported_currencies does not exist, skipping...';
END $$;

-- exchange_rates_history (reference data - public read)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates_history;
    DROP POLICY IF EXISTS "Public can read exchange_rates_history" ON exchange_rates_history;
    DROP POLICY IF EXISTS "Service role can manage exchange_rates_history" ON exchange_rates_history;
    
    CREATE POLICY "Public can read exchange_rates_history"
        ON exchange_rates_history FOR SELECT
        TO anon, authenticated, service_role
        USING (true);

    CREATE POLICY "Service role can manage exchange_rates_history"
        ON exchange_rates_history FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    
    ALTER TABLE exchange_rates_history ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Applied policies to exchange_rates_history';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table exchange_rates_history does not exist, skipping...';
END $$;

-- user_currency_preferences
DO $$
BEGIN
    PERFORM safe_create_service_role_policies('user_currency_preferences');
    RAISE NOTICE '✅ Applied policies to user_currency_preferences';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table user_currency_preferences does not exist, skipping...';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not apply policies to user_currency_preferences: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 7: Clean up helper function
-- =====================================================

DROP FUNCTION IF EXISTS safe_create_service_role_policies(text);

-- =====================================================
-- STEP 8: Verify policies
-- =====================================================

SELECT 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ RLS Security Fix Applied Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Changes:';
    RAISE NOTICE '   - All user data tables now deny direct access from anon/authenticated roles';
    RAISE NOTICE '   - Only service_role can access user data (bypasses RLS)';
    RAISE NOTICE '   - Public reference data (currencies, exchange rates) remains readable';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Application code must:';
    RAISE NOTICE '   1. Use SUPABASE_SERVICE_ROLE_KEY for database access';
    RAISE NOTICE '   2. Validate user via Better Auth BEFORE accessing data';
    RAISE NOTICE '   3. Filter queries by user_id in application code';
    RAISE NOTICE '';
    RAISE NOTICE '📝 See lib/supabase/server.ts and lib/api/auth-wrapper.ts for implementation';
    RAISE NOTICE '============================================';
END $$;
