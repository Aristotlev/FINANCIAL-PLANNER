-- Grant INSERT permission to anon role for price_snapshots table
-- This is required because the RLS policy "Allow public insert of price snapshots"
-- allows public inserts, but the role permission was missing.

GRANT INSERT ON public.price_snapshots TO anon;

-- Ensure authenticated users also have access (already granted in previous schema, but good to be safe)
GRANT SELECT, INSERT ON public.price_snapshots TO authenticated;

-- Verify RLS is enabled
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- Re-apply policies just in case (using DO block to avoid errors if they exist)
DO $$
BEGIN
    -- Policy for SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'price_snapshots' 
        AND policyname = 'Allow public read access to price snapshots'
    ) THEN
        CREATE POLICY "Allow public read access to price snapshots"
            ON public.price_snapshots
            FOR SELECT
            USING (true);
    END IF;

    -- Policy for INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'price_snapshots' 
        AND policyname = 'Allow public insert of price snapshots'
    ) THEN
        CREATE POLICY "Allow public insert of price snapshots"
            ON public.price_snapshots
            FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- Also check portfolio_snapshots permissions
-- Users should only access their own data, so no anon access needed for portfolio_snapshots
-- But we ensure authenticated users have full access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_snapshots TO authenticated;
