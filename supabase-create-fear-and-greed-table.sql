-- Create a table for caching Fear & Greed Index data
CREATE TABLE IF NOT EXISTS public.crypto_fear_and_greed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value INTEGER NOT NULL,
    value_classification TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    time_until_update TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies for Row Level Security
ALTER TABLE public.crypto_fear_and_greed ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access for authenticated users"
ON public.crypto_fear_and_greed
FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access (for updating the cache)
CREATE POLICY "Allow service role full access"
ON public.crypto_fear_and_greed
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_fear_and_greed_timestamp ON public.crypto_fear_and_greed(timestamp DESC);
