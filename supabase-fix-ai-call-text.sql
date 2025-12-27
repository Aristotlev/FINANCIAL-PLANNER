-- Drop the UUID version of the function
DROP FUNCTION IF EXISTS public.can_make_ai_call(uuid);

-- Recreate with TEXT parameter to match the table schema
CREATE OR REPLACE FUNCTION public.can_make_ai_call(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription_tier TEXT;
    v_usage_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get user's subscription tier
    SELECT 
        CASE 
            WHEN tier IS NULL THEN 'free'
            ELSE tier
        END INTO v_subscription_tier
    FROM user_subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end > NOW() OR current_period_end IS NULL)
    LIMIT 1;

    -- Default to free if no subscription found
    IF v_subscription_tier IS NULL THEN
        v_subscription_tier := 'free';
    END IF;

    -- Set limits based on tier
    IF v_subscription_tier = 'premium' THEN
        v_limit := 50; -- Premium limit
    ELSIF v_subscription_tier = 'pro' THEN
        v_limit := 500; -- Pro limit
    ELSE
        v_limit := 5; -- Free limit
    END IF;

    -- Count usage in the last 24 hours
    SELECT COUNT(*) INTO v_usage_count
    FROM ai_chat_logs
    WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours';

    RETURN v_usage_count < v_limit;
END;
$$;

COMMENT ON FUNCTION public.can_make_ai_call(TEXT) IS 'Check if user can make another AI assistant call (accepts TEXT user_id)';
