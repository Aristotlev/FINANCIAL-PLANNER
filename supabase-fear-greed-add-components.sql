-- Migration: Add proprietary engine columns to crypto_fear_and_greed
-- Run this once in the Supabase SQL editor.

-- Add source column (tracks which engine version produced the row)
ALTER TABLE public.crypto_fear_and_greed
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'omnifolio-engine-v1';

-- Add components JSONB column (stores the 6 signal scores)
-- Shape: { price_momentum, volatility, dominance, volume_surge, market_breadth, rsi_signal }
ALTER TABLE public.crypto_fear_and_greed
  ADD COLUMN IF NOT EXISTS components JSONB DEFAULT NULL;

-- Index for faster lookups by source if needed
CREATE INDEX IF NOT EXISTS idx_fear_and_greed_source
  ON public.crypto_fear_and_greed (source);
