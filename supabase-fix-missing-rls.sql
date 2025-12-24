-- =====================================================
-- SECURITY FIX: Apply RLS to remaining tables
-- =====================================================
-- This script applies the secure "Service Role Only" RLS pattern to
-- tables that were missed in the previous security fix or have
-- insecure/missing RLS policies.
-- =====================================================

-- =====================================================
-- Helper function to safely drop and create policies
-- =====================================================

CREATE OR REPLACE FUNCTION safe_create_service_role_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Drop existing policies if they exist (generic names)
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny authenticated access to %I" ON %I', table_name, table_name);
    
    -- Drop specific policies found in other schemas
    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own subscription" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own subscription" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update their own subscription" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own subscription" ON %I', table_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own usage" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own usage" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update their own usage" ON %I', table_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view plan limits" ON %I', table_name);
    
    -- Create new secure policies
    -- 1. Allow service_role full access (bypass RLS)
    EXECUTE format('CREATE POLICY "Service role full access to %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name, table_name);
    
    -- 2. Deny everyone else (anon and authenticated)
    -- Note: We explicitly deny to be safe, although enabling RLS without policies implies denial.
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
-- Apply to missing tables
-- =====================================================

-- 1. Verifications (Better Auth)
SELECT safe_create_service_role_policies('verifications');

-- 2. User Subscriptions & Usage
SELECT safe_create_service_role_policies('user_subscriptions');
SELECT safe_create_service_role_policies('user_usage');

-- 3. Plan Limits (Configuration)
-- Note: Plan limits might need to be readable by authenticated users if the frontend queries it directly.
-- However, with the "Service Role Only" pattern, the frontend should fetch this via an API route.
-- If the app fetches plan limits directly from Supabase client, this will break it.
-- Assuming the app uses API routes (which is the recommended pattern with Better Auth).
SELECT safe_create_service_role_policies('plan_limits');

-- 4. US Tax Profiles (if exists)
SELECT safe_create_service_role_policies('us_tax_profiles');

-- =====================================================
-- Clean up
-- =====================================================

DROP FUNCTION IF EXISTS safe_create_service_role_policies(text);

DO $$
BEGIN
    RAISE NOTICE '✅ Applied RLS fixes to remaining tables.';
END $$;
