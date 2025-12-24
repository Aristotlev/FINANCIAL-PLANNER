-- Fix RLS policies to correctly handle UUID vs Text comparisons
-- This updates the helper function to use safe casting

CREATE OR REPLACE FUNCTION safe_create_user_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %I" ON %I', table_name, table_name);
    
    -- Also drop the "Deny" policies if they were added by previous script
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access to %I" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Deny authenticated access to %I" ON %I', table_name, table_name);

    -- 1. Service Role Full Access
    EXECUTE format('CREATE POLICY "Service role full access to %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name, table_name);

    -- 2. User Select (Own rows) - Cast both sides to text to be safe for both UUID and Text columns
    EXECUTE format('CREATE POLICY "Users can view own %I" ON %I FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text)', table_name, table_name);

    -- 3. User Insert (Own rows)
    EXECUTE format('CREATE POLICY "Users can insert own %I" ON %I FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id::text)', table_name, table_name);

    -- 4. User Update (Own rows)
    EXECUTE format('CREATE POLICY "Users can update own %I" ON %I FOR UPDATE TO authenticated USING (auth.uid()::text = user_id::text)', table_name, table_name);

    RAISE NOTICE 'Applied User Owner policies to table: %', table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping...', table_name;
END;
$$ LANGUAGE plpgsql;

-- Re-apply to user_subscriptions
SELECT safe_create_user_policies('user_subscriptions');
SELECT safe_create_user_policies('user_usage');
SELECT safe_create_user_policies('us_tax_profiles');
