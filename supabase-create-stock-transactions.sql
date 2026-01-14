
-- Create stock_transactions table
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Using TEXT for Better Auth compatibility
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    shares NUMERIC NOT NULL,
    price_per_share NUMERIC NOT NULL,
    total_value NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    original_price NUMERIC, -- For sell transactions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid errors on re-run
DROP POLICY IF EXISTS "Service role full access to stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Users can view own stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Users can insert own stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Users can update own stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Users can delete own stock_transactions" ON public.stock_transactions;

-- Create policies
-- Service role access
CREATE POLICY "Service role full access to stock_transactions" 
    ON public.stock_transactions 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Authenticated user access
CREATE POLICY "Users can view own stock_transactions"
    ON public.stock_transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id OR user_id = 'offline');

CREATE POLICY "Users can insert own stock_transactions"
    ON public.stock_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id OR user_id = 'offline');

CREATE POLICY "Users can update own stock_transactions"
    ON public.stock_transactions
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id OR user_id = 'offline');

CREATE POLICY "Users can delete own stock_transactions"
    ON public.stock_transactions
    FOR DELETE
    TO authenticated
    USING (auth.uid()::text = user_id OR user_id = 'offline');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_id ON public.stock_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON public.stock_transactions(date DESC);
