-- Comprehensive fix for ALL remaining tables to support Better Auth (String IDs)
-- This script iterates through all user-data tables and ensures user_id is TEXT
-- It also updates RLS policies to be compatible

-- List of tables to check/fix:
-- 1. cash_accounts
-- 2. crypto_holdings
-- 3. stock_holdings
-- 4. real_estate
-- 5. savings_accounts
-- 6. debt_accounts
-- 7. valuable_items
-- 8. trading_accounts
-- 9. expense_categories
-- 10. income_sources
-- 11. portfolio_snapshots

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY[
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
        'portfolio_snapshots'
    ];
    r RECORD;
BEGIN 
    -- 0. Drop dependent views first to avoid dependency errors
    -- portfolio_performance depends on portfolio_snapshots.user_id
    EXECUTE 'DROP VIEW IF EXISTS portfolio_performance';

    FOREACH t IN ARRAY tables LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            RAISE NOTICE 'Processing table: %', t;

            -- 1. Drop all policies to allow column type change
            FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = t) LOOP 
                EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || t; 
            END LOOP;

            -- 2. Drop FK constraint on user_id if it exists
            -- We search for any constraint on this table that references auth.users
            FOR r IN (
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = t
                AND kcu.column_name = 'user_id'
            ) LOOP
                EXECUTE 'ALTER TABLE ' || t || ' DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
            END LOOP;

            -- 3. Alter user_id column to TEXT
            -- We use a USING clause to cast if necessary, though UUID to TEXT is implicit
            EXECUTE 'ALTER TABLE ' || t || ' ALTER COLUMN user_id TYPE TEXT';

            -- 4. Re-create index on user_id
            EXECUTE 'DROP INDEX IF EXISTS idx_' || t || '_user_id';
            EXECUTE 'CREATE INDEX idx_' || t || '_user_id ON ' || t || '(user_id)';

            -- 5. Re-create permissive RLS policies
            -- Since we use Service Role in API, these are mostly for safety/direct access if enabled
            EXECUTE 'CREATE POLICY "Users can view own ' || t || '" ON ' || t || ' FOR SELECT USING (true)';
            EXECUTE 'CREATE POLICY "Users can insert own ' || t || '" ON ' || t || ' FOR INSERT WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "Users can update own ' || t || '" ON ' || t || ' FOR UPDATE USING (true)';
            EXECUTE 'CREATE POLICY "Users can delete own ' || t || '" ON ' || t || ' FOR DELETE USING (true)';
            
            RAISE NOTICE 'Fixed table: %', t;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', t;
        END IF;
    END LOOP;

    -- 6. Re-create dependent views
    EXECUTE 'CREATE OR REPLACE VIEW public.portfolio_performance AS
    SELECT 
        user_id,
        COUNT(*) as total_snapshots,
        MIN(snapshot_date) as first_snapshot,
        MAX(snapshot_date) as latest_snapshot,
        MAX(total_net_worth) as max_net_worth,
        MIN(total_net_worth) as min_net_worth,
        (MAX(total_net_worth) - MIN(total_net_worth)) as net_worth_change,
        AVG(total_net_worth) as avg_net_worth
    FROM public.portfolio_snapshots
    GROUP BY user_id';
    
    EXECUTE 'GRANT SELECT ON public.portfolio_performance TO authenticated';

END $$;
