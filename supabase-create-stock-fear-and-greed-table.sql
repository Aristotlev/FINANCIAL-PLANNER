-- Migration: Create stock_fear_and_greed table for OmniFolio Stock Fear & Greed Index
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.stock_fear_and_greed (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value                INTEGER NOT NULL CHECK (value >= 0 AND value <= 100),
    value_classification TEXT NOT NULL,
    timestamp            TIMESTAMPTZ NOT NULL,
    time_until_update    TEXT DEFAULT '1200',
    -- Proprietary engine breakdown: { price_momentum, vix_level, market_breadth, volume_surge, rsi_signal, safe_haven }
    components           JSONB DEFAULT NULL,
    source               TEXT DEFAULT 'omnifolio-stock-engine-v1',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.stock_fear_and_greed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users"
    ON public.stock_fear_and_greed FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow service role full access"
    ON public.stock_fear_and_greed FOR ALL
    TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_fear_and_greed_timestamp
    ON public.stock_fear_and_greed (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_stock_fear_and_greed_source
    ON public.stock_fear_and_greed (source);
