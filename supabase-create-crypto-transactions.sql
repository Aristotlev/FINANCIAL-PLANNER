
-- Create crypto_transactions table
CREATE TABLE IF NOT EXISTS public.crypto_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    price_per_unit NUMERIC NOT NULL,
    total_value NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    original_price NUMERIC, -- For sell transactions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view their own crypto transactions" ON public.crypto_transactions;
DROP POLICY IF EXISTS "Users can insert their own crypto transactions" ON public.crypto_transactions;
DROP POLICY IF EXISTS "Users can update their own crypto transactions" ON public.crypto_transactions;
DROP POLICY IF EXISTS "Users can delete their own crypto transactions" ON public.crypto_transactions;

-- Create policies
CREATE POLICY "Users can view their own crypto transactions"
    ON public.crypto_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crypto transactions"
    ON public.crypto_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto transactions"
    ON public.crypto_transactions
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crypto transactions"
    ON public.crypto_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user_id ON public.crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_date ON public.crypto_transactions(date DESC);
