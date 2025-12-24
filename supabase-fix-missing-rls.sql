-- =====================================================
-- SECURITY FIX: Apply RLS to remaining tables
-- =====================================================
-- This script applies secure RLS policies to tables that were missed
-- or had insecure configurations.
-- It applies "Service Role Only" for backend tables, and
-- "User Owner" policies for user-specific data.
-- =====================================================

-- =====================================================
-- Helper function: Service Role Only (Strict)
-- =====================================================
CREATE OR REPLACE FUNCTION safe_create_service_role_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny authenticated access to %I" ON %I', table_name, table_name);
    
    -- Create Service Role Policy
    EXECUTE format('CREATE POLICY "Service role full access to %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name, table_name);
    
    -- Explicit Deny for others (optional as RLS default is deny, but good for clarity)
    EXECUTE format('CREATE POLICY "Deny anon access to %I" ON %I FOR ALL TO anon USING (false) WITH CHECK (false)', table_name, table_name);
    EXECUTE format('CREATE POLICY "Deny authenticated access to %I" ON %I FOR ALL TO authenticated USING (false) WITH CHECK (false)', table_name, table_name);
    
    RAISE NOTICE 'Applied Service Role Only policies to table: %', table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping...', table_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Helper function: User Owner Access (Select/Insert/Update)
-- =====================================================
CREATE OR REPLACE FUNCTION safe_create_user_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

    -- Drop existing policies (generic and specific)
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %I" ON %I', table_name, table_name);
    
    -- Also drop the "Deny" policies if they were added by previous script
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny authenticated access to %I" ON %I', table_name, table_name);

    -- 1. Service Role Full Access
    EXECUTE format('CREATE POLICY "Service role full access to %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name, table_name);

    -- 2. User Select (Own rows)
    EXECUTE format('CREATE POLICY "Users can view own %I" ON %I FOR SELECT TO authenticated USING (auth.uid() = user_id)', table_name, table_name);

    -- 3. User Insert (Own rows)
    EXECUTE format('CREATE POLICY "Users can insert own %I" ON %I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', table_name, table_name);

    -- 4. User Update (Own rows)
    EXECUTE format('CREATE POLICY "Users can update own %I" ON %I FOR UPDATE TO authenticated USING (auth.uid() = user_id)', table_name, table_name);

    RAISE NOTICE 'Applied User Owner policies to table: %', table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping...', table_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Helper function: Read Only for Authenticated
-- =====================================================
CREATE OR REPLACE FUNCTION safe_create_readonly_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %I" ON %I', table_name, table_name);
    
    -- Drop Deny policies
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny authenticated access to %I" ON %I', table_name, table_name);

    -- 1. Service Role Full Access
    EXECUTE format('CREATE POLICY "Service role full access to %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name, table_name);

    -- 2. Authenticated Select
    EXECUTE format('CREATE POLICY "Authenticated users can view %I" ON %I FOR SELECT TO authenticated USING (true)', table_name, table_name);

    RAISE NOTICE 'Applied Read Only policies to table: %', table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping...', table_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Apply Policies
-- =====================================================

-- 1. Verifications (Better Auth internal table) -> Service Role Only
SELECT safe_create_service_role_policies('verifications');

-- 2. User Subscriptions -> User Owner Access
SELECT safe_create_user_policies('user_subscriptions');

-- 3. User Usage -> User Owner Access
SELECT safe_create_user_policies('user_usage');

-- 4. Plan Limits -> Read Only for Authenticated (Public config)
SELECT safe_create_readonly_policies('plan_limits');

-- 5. US Tax Profiles -> User Owner Access
SELECT safe_create_user_policies('us_tax_profiles');

-- =====================================================
-- Clean up
-- =====================================================

DROP FUNCTION IF EXISTS safe_create_service_role_policies(text);
DROP FUNCTION IF EXISTS safe_create_user_policies(text);
DROP FUNCTION IF EXISTS safe_create_readonly_policies(text);

DO $$
BEGIN
    RAISE NOTICE '✅ Applied RLS fixes to all tables with correct access levels.';
END $$;
