-- Fix user_id type for crypto_transactions table
-- Converts user_id from UUID to TEXT to support Better Auth IDs

DO $$ 
DECLARE 
    t text := 'crypto_transactions';
    r RECORD;
    col_exists boolean;
BEGIN 
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
        RAISE NOTICE 'Processing table: %', t;

        -- Check if user_id column exists
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = t 
            AND column_name = 'user_id'
        ) INTO col_exists;

        IF col_exists THEN
            -- 1. Drop all policies to allow column type change
            FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = t) LOOP 
                EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || t; 
            END LOOP;

            -- 2. Drop FK constraint on user_id if it exists
            FOR r IN (
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = t
                AND kcu.column_name = 'user_id'
            ) LOOP
                EXECUTE 'ALTER TABLE ' || t || ' DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
                RAISE NOTICE 'Dropped FK constraint % on %', r.constraint_name, t;
            END LOOP;

            -- 3. Alter user_id column to TEXT
            -- We use a USING clause to cast if necessary
            EXECUTE 'ALTER TABLE ' || t || ' ALTER COLUMN user_id TYPE TEXT';
            RAISE NOTICE 'Converted user_id to TEXT on %', t;

            -- 4. Re-create index on user_id
            EXECUTE 'DROP INDEX IF EXISTS idx_' || t || '_user_id';
            EXECUTE 'CREATE INDEX idx_' || t || '_user_id ON ' || t || '(user_id)';

            -- 5. Re-create permissive RLS policies
            EXECUTE 'CREATE POLICY "Service role full access to ' || t || '" ON ' || t || ' FOR ALL TO service_role USING (true) WITH CHECK (true)';
            
            -- For authenticated users, we allow access if the user_id matches
            EXECUTE 'CREATE POLICY "Users can view own ' || t || '" ON ' || t || ' FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text OR user_id = ''offline'')';
            EXECUTE 'CREATE POLICY "Users can insert own ' || t || '" ON ' || t || ' FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id::text OR user_id = ''offline'')';
            EXECUTE 'CREATE POLICY "Users can update own ' || t || '" ON ' || t || ' FOR UPDATE TO authenticated USING (auth.uid()::text = user_id::text OR user_id = ''offline'')';
            EXECUTE 'CREATE POLICY "Users can delete own ' || t || '" ON ' || t || ' FOR DELETE TO authenticated USING (auth.uid()::text = user_id::text OR user_id = ''offline'')';
            
            RAISE NOTICE 'Fixed table: %', t;
        ELSE
            RAISE NOTICE 'Table % exists but has no user_id column, skipping', t;
        END IF;
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping', t;
    END IF;
END $$;
