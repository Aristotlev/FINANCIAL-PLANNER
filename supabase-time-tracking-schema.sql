-- =====================================================
-- TIME TRACKING TABLES FOR MONEY HUB APP
-- Enhanced Portfolio & Price Tracking System
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: price_snapshots
-- Stores historical price data for crypto and stocks
-- Enables 1h, 4h, 24h, 7d, 30d, 365d timeframe analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS public.price_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock', 'forex', 'index')),
    price NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 2),
    market_cap NUMERIC(20, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol ON public.price_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_asset_type ON public.price_snapshots(asset_type);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_timestamp ON public.price_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_timestamp ON public.price_snapshots(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_composite ON public.price_snapshots(symbol, asset_type, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read price snapshots (public data)
CREATE POLICY "Allow public read access to price snapshots"
    ON public.price_snapshots
    FOR SELECT
    USING (true);

-- Policy: Anyone can insert price snapshots (for automatic tracking)
CREATE POLICY "Allow public insert of price snapshots"
    ON public.price_snapshots
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- TABLE: portfolio_snapshots
-- Stores historical portfolio snapshots for users
-- Tracks total net worth, assets, liabilities over time
-- =====================================================

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_net_worth NUMERIC(20, 2) NOT NULL DEFAULT 0,
    total_assets NUMERIC(20, 2) NOT NULL DEFAULT 0,
    total_liabilities NUMERIC(20, 2) NOT NULL DEFAULT 0,
    cash NUMERIC(20, 2) NOT NULL DEFAULT 0,
    savings NUMERIC(20, 2) NOT NULL DEFAULT 0,
    crypto_value NUMERIC(20, 2) NOT NULL DEFAULT 0,
    stocks_value NUMERIC(20, 2) NOT NULL DEFAULT 0,
    real_estate_value NUMERIC(20, 2) NOT NULL DEFAULT 0,
    valuable_items_value NUMERIC(20, 2) NOT NULL DEFAULT 0,
    trading_account_value NUMERIC(20, 2) NOT NULL DEFAULT 0,
    crypto_holdings JSONB DEFAULT '[]'::jsonb,
    stock_holdings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id ON public.portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_snapshot_date ON public.portfolio_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);

-- Enable Row Level Security
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own portfolio snapshots
CREATE POLICY "Users can read own portfolio snapshots"
    ON public.portfolio_snapshots
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Policy: Users can only insert their own portfolio snapshots
CREATE POLICY "Users can insert own portfolio snapshots"
    ON public.portfolio_snapshots
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can only update their own portfolio snapshots
CREATE POLICY "Users can update own portfolio snapshots"
    ON public.portfolio_snapshots
    FOR UPDATE
    USING (auth.uid()::text = user_id);

-- Policy: Users can only delete their own portfolio snapshots
CREATE POLICY "Users can delete own portfolio snapshots"
    ON public.portfolio_snapshots
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- =====================================================
-- AUTOMATIC CLEANUP FUNCTION
-- Removes old price snapshots (keeps last 48 hours)
-- Runs daily to prevent database bloat
-- Note: Cleanup is also handled client-side in enhanced-time-tracking-service.ts
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_price_snapshots()
RETURNS void AS $$
BEGIN
    DELETE FROM public.price_snapshots
    WHERE timestamp < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED CLEANUP (Optional - requires pg_cron extension)
-- Uncomment if you want automatic daily cleanup
-- =====================================================

-- SELECT cron.schedule(
--     'cleanup-old-price-snapshots',
--     '0 3 * * *',  -- Run at 3 AM daily
--     'SELECT cleanup_old_price_snapshots();'
-- );

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Latest price for each symbol
CREATE OR REPLACE VIEW public.latest_prices AS
SELECT DISTINCT ON (symbol, asset_type)
    symbol,
    asset_type,
    price,
    volume,
    market_cap,
    timestamp
FROM public.price_snapshots
ORDER BY symbol, asset_type, timestamp DESC;

-- View: Portfolio performance summary for each user
CREATE OR REPLACE VIEW public.portfolio_performance AS
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
GROUP BY user_id;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON public.price_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_snapshots TO authenticated;
GRANT SELECT ON public.latest_prices TO authenticated;
GRANT SELECT ON public.portfolio_performance TO authenticated;

-- Grant access to anon users (read-only for public price data)
GRANT SELECT ON public.price_snapshots TO anon;
GRANT SELECT ON public.latest_prices TO anon;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.price_snapshots IS 'Historical price data for cryptocurrencies and stocks. Used for timeframe analysis (1h, 4h, 24h, 7d, 30d, 365d).';
COMMENT ON TABLE public.portfolio_snapshots IS 'Historical portfolio snapshots for users. Tracks net worth, assets, and holdings over time.';
COMMENT ON VIEW public.latest_prices IS 'Shows the most recent price for each asset symbol and type.';
COMMENT ON VIEW public.portfolio_performance IS 'Summary statistics for each user''s portfolio performance over time.';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Time tracking tables created successfully!';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '   - price_snapshots (with 5 indexes)';
    RAISE NOTICE '   - portfolio_snapshots (with 3 indexes)';
    RAISE NOTICE '🔒 Row Level Security enabled on both tables';
    RAISE NOTICE '📈 Views created:';
    RAISE NOTICE '   - latest_prices';
    RAISE NOTICE '   - portfolio_performance';
    RAISE NOTICE '🎉 Your time tracking system is ready to use!';
END $$;
