-- ============================================================================
-- Omnifolio Proprietary API - Database Schema
-- Creates tables for API key management, usage tracking, and rate limiting
-- 
-- Run this migration against your Supabase database.
-- Copyright OmniFolio. All rights reserved.
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. API Keys Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,               -- References Better Auth user ID
    name TEXT NOT NULL,                   -- User-friendly key name
    key_prefix TEXT NOT NULL,             -- First 8 chars for display (e.g., "omni_ab12")
    key_hash TEXT NOT NULL UNIQUE,        -- SHA-256 hash of the full API key
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'suspended')),
    scopes JSONB NOT NULL DEFAULT '["company:read", "analytics:read"]'::jsonb,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
    rate_limit_per_day INTEGER NOT NULL DEFAULT 500,
    monthly_quota INTEGER NOT NULL DEFAULT 10000,
    monthly_usage INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(tier);

-- ============================================================================
-- 2. API Usage Logs Table (partitioned by month for performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    request_params JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);

-- Composite index for usage summaries
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_date 
    ON api_usage_logs(api_key_id, created_at DESC);

-- ============================================================================
-- 3. API Rate Limit Tracking Table (in-memory preferred, DB fallback)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day', 'month')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (api_key_id, window_type, window_start)
);

-- Indexes for rate limit checks
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_window 
    ON api_rate_limits(api_key_id, window_type, window_start DESC);

-- ============================================================================
-- 4. API Webhooks Table (for pro/enterprise tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,   -- e.g., ["price_alert", "market_open"]
    secret TEXT NOT NULL,                          -- Webhook signing secret
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_webhooks_user_id ON api_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_api_key_id ON api_webhooks(api_key_id);

-- ============================================================================
-- 5. Updated At Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_api_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to api_keys
DROP TRIGGER IF EXISTS trigger_api_keys_updated_at ON api_keys;
CREATE TRIGGER trigger_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_updated_at();

-- Apply trigger to api_webhooks
DROP TRIGGER IF EXISTS trigger_api_webhooks_updated_at ON api_webhooks;
CREATE TRIGGER trigger_api_webhooks_updated_at
    BEFORE UPDATE ON api_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_api_updated_at();

-- ============================================================================
-- 6. Monthly Usage Reset Function
-- Run this as a cron job on the 1st of each month
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_monthly_api_usage()
RETURNS void AS $$
BEGIN
    UPDATE api_keys SET monthly_usage = 0 WHERE status = 'active';
    
    -- Also expire any expired keys
    UPDATE api_keys 
    SET status = 'expired' 
    WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Usage Summary View
-- ============================================================================
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
    ak.id AS api_key_id,
    ak.user_id,
    ak.name AS key_name,
    ak.tier,
    ak.monthly_usage,
    ak.monthly_quota,
    ROUND((ak.monthly_usage::numeric / NULLIF(ak.monthly_quota, 0)) * 100, 2) AS usage_percent,
    COUNT(aul.id) AS total_requests_today,
    COUNT(CASE WHEN aul.status_code < 400 THEN 1 END) AS successful_today,
    COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) AS failed_today,
    ROUND(AVG(aul.response_time_ms)::numeric, 2) AS avg_response_time_ms
FROM api_keys ak
LEFT JOIN api_usage_logs aul ON ak.id = aul.api_key_id 
    AND aul.created_at >= CURRENT_DATE
GROUP BY ak.id, ak.user_id, ak.name, ak.tier, ak.monthly_usage, ak.monthly_quota;

-- ============================================================================
-- 8. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;

-- API Keys: Users can only see their own keys
-- Note: Service role bypasses RLS, which is what our API routes use
CREATE POLICY api_keys_user_policy ON api_keys
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Usage Logs: Users can only see logs for their own keys
CREATE POLICY api_usage_logs_user_policy ON api_usage_logs
    FOR ALL
    USING (api_key_id IN (
        SELECT id FROM api_keys WHERE user_id = current_setting('app.current_user_id', true)
    ));

-- Rate Limits: Users can only see rate limits for their own keys
CREATE POLICY api_rate_limits_user_policy ON api_rate_limits
    FOR ALL
    USING (api_key_id IN (
        SELECT id FROM api_keys WHERE user_id = current_setting('app.current_user_id', true)
    ));

-- Webhooks: Users can only manage their own webhooks
CREATE POLICY api_webhooks_user_policy ON api_webhooks
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- ============================================================================
-- 9. Cleanup Old Logs Function
-- Run this as a weekly cron job to keep the logs table manageable
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_api_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_usage_logs 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also cleanup old rate limit entries
    DELETE FROM api_rate_limits 
    WHERE window_start < NOW() - INTERVAL '2 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Done! Run: SELECT * FROM api_keys LIMIT 1; to verify.
-- ============================================================================
