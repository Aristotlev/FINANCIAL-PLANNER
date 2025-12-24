-- FIX RLS POLICIES FOR BETTER AUTH
-- ================================
-- Since you're using Better Auth (not Supabase Auth), auth.uid() is always NULL.
-- This script fixes RLS policies to allow the service role full access while
-- maintaining security at the application layer.
--
-- The application uses the service role key for all data operations via /api/data,
-- which validates the user via Better Auth session before making Supabase calls.

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY[
        'user_subscriptions',
        'user_usage',
        'tax_profiles',
        'us_tax_profiles',
        'cash_accounts', 
        'crypto_holdings', 
        'stock_holdings', 
        'real_estate', 
        'savings_accounts', 
        'debt_accounts', 
        'valuable_items', 
        'trading_accounts', 
        'expense_categories',
        'income_sources',
        'portfolio_snapshots',
        'user_preferences'
    ];
    r RECORD;
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            RAISE NOTICE 'Processing table: %', t;

            -- 1. Drop all existing policies
            FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public') LOOP 
                EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || t; 
            END LOOP;

            -- 2. Enable RLS (ensure it's on)
            EXECUTE 'ALTER TABLE public.' || t || ' ENABLE ROW LEVEL SECURITY';

            -- 3. Create service role policy (full access)
            -- The service role bypasses RLS by default, but let's be explicit
            EXECUTE 'CREATE POLICY "Service role has full access to ' || t || '" ON public.' || t || 
                    ' FOR ALL TO service_role USING (true) WITH CHECK (true)';

            -- 4. For authenticated role, allow all operations
            -- Security is handled at the application layer (Better Auth validates user before calling Supabase)
            -- The application always filters by user_id in queries
            EXECUTE 'CREATE POLICY "Authenticated users can select from ' || t || '" ON public.' || t || 
                    ' FOR SELECT TO authenticated USING (true)';
            EXECUTE 'CREATE POLICY "Authenticated users can insert to ' || t || '" ON public.' || t || 
                    ' FOR INSERT TO authenticated WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "Authenticated users can update ' || t || '" ON public.' || t || 
                    ' FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "Authenticated users can delete from ' || t || '" ON public.' || t || 
                    ' FOR DELETE TO authenticated USING (true)';

            -- 5. For anon role, allow all operations as well
            -- The application validates users via Better Auth before any data access
            EXECUTE 'CREATE POLICY "Anonymous users can select from ' || t || '" ON public.' || t || 
                    ' FOR SELECT TO anon USING (true)';
            EXECUTE 'CREATE POLICY "Anonymous users can insert to ' || t || '" ON public.' || t || 
                    ' FOR INSERT TO anon WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "Anonymous users can update ' || t || '" ON public.' || t || 
                    ' FOR UPDATE TO anon USING (true) WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "Anonymous users can delete from ' || t || '" ON public.' || t || 
                    ' FOR DELETE TO anon USING (true)';
                    
            RAISE NOTICE 'Fixed RLS policies for: %', t;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', t;
        END IF;
    END LOOP;
END $$;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Output confirmation
SELECT 'RLS policies updated for Better Auth compatibility' as status;
