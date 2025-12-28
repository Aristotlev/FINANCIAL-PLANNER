-- Fix ambiguous function call for can_make_ai_call
-- The issue is that we have both can_make_ai_call(uuid) and can_make_ai_call(text)
-- and when calling via RPC with a string that looks like a UUID, Postgres can be confused
-- or the client library might be trying to cast it.

-- 1. Drop the UUID version to force usage of the TEXT version
DROP FUNCTION IF EXISTS public.can_make_ai_call(uuid);

-- 2. Ensure the TEXT version is robust and handles UUID strings correctly
CREATE OR REPLACE FUNCTION public.can_make_ai_call(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription_tier TEXT;
    v_usage_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get user's subscription tier
    SELECT 
        COALESCE(tier, 'free') INTO v_subscription_tier
    FROM user_subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end > NOW() OR current_period_end IS NULL)
    LIMIT 1;

    -- Default to free if no subscription found
    IF v_subscription_tier IS NULL THEN
        v_subscription_tier := 'free';
    END IF;

    -- Get limit from plan_limits table if available, otherwise hardcode defaults
    BEGIN
        SELECT max_ai_calls_per_day INTO v_limit
        FROM plan_limits
        WHERE plan = v_subscription_tier;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback if table doesn't exist or other error
        v_limit := NULL;
    END;

    -- Fallback defaults if plan_limits lookup failed
    IF v_limit IS NULL THEN
        IF v_subscription_tier = 'whale' THEN
            v_limit := 1000;
        ELSIF v_subscription_tier = 'investor' THEN
            v_limit := 100;
        ELSIF v_subscription_tier = 'trader' THEN
            v_limit := 50;
        ELSE
            v_limit := 10; -- Free limit
        END IF;
    END IF;

    -- Count usage in the last 24 hours
    SELECT COUNT(*) INTO v_usage_count
    FROM ai_chat_logs
    WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours';

    RETURN v_usage_count < v_limit;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.can_make_ai_call(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.can_make_ai_call(TEXT) IS 'Check if user can make another AI assistant call (accepts TEXT user_id)';
