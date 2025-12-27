-- Fix RPC functions to consistently accept TEXT user_id and cast to UUID
-- This resolves "400 Bad Request" errors due to parameter type mismatches

-- 1. Fix can_make_ai_call
DROP FUNCTION IF EXISTS public.can_make_ai_call(uuid);
DROP FUNCTION IF EXISTS public.can_make_ai_call(text);

CREATE OR REPLACE FUNCTION public.can_make_ai_call(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_uuid UUID;
    v_plan subscription_plan;
    v_max_calls INT;
    v_current_calls INT;
BEGIN
    -- Cast TEXT to UUID
    v_user_uuid := p_user_id::UUID;

    -- Get user's current plan
    SELECT plan INTO v_plan
    FROM public.user_subscriptions
    WHERE user_id = v_user_uuid
    AND status IN ('ACTIVE', 'TRIAL');
    
    -- If no subscription found, deny
    IF v_plan IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get max calls for plan
    SELECT max_ai_calls_per_day INTO v_max_calls
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    -- Get current calls for today
    SELECT COALESCE(ai_calls_count, 0) INTO v_current_calls
    FROM public.user_usage
    WHERE user_id = v_user_uuid AND date = CURRENT_DATE;
    
    -- Check if under limit
    RETURN v_current_calls < v_max_calls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_make_ai_call(TEXT) IS 'Check if user can make another AI assistant call (accepts TEXT user_id)';


-- 2. Fix increment_ai_call_count
DROP FUNCTION IF EXISTS public.increment_ai_call_count(uuid);
DROP FUNCTION IF EXISTS public.increment_ai_call_count(text);

CREATE OR REPLACE FUNCTION public.increment_ai_call_count(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_uuid UUID;
    v_subscription_id UUID;
BEGIN
    -- Cast TEXT to UUID
    v_user_uuid := p_user_id::UUID;

    -- Get subscription ID
    SELECT id INTO v_subscription_id
    FROM public.user_subscriptions
    WHERE user_id = v_user_uuid;
    
    -- Insert or update usage record
    INSERT INTO public.user_usage (user_id, subscription_id, date, ai_calls_count)
    VALUES (v_user_uuid, v_subscription_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET ai_calls_count = public.user_usage.ai_calls_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_ai_call_count(TEXT) IS 'Increment AI call count for the day (accepts TEXT user_id)';


-- 3. Fix can_add_entry
DROP FUNCTION IF EXISTS public.can_add_entry(uuid, text);
DROP FUNCTION IF EXISTS public.can_add_entry(text, text);

CREATE OR REPLACE FUNCTION public.can_add_entry(
    p_user_id TEXT,
    p_card_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_uuid UUID;
    v_plan subscription_plan;
    v_max_entries INT;
    v_current_count INT;
    v_column_name TEXT;
BEGIN
    -- Cast TEXT to UUID
    v_user_uuid := p_user_id::UUID;

    -- Get user's current plan
    SELECT plan INTO v_plan
    FROM public.user_subscriptions
    WHERE user_id = v_user_uuid
    AND status IN ('ACTIVE', 'TRIAL');
    
    -- If no subscription found, deny
    IF v_plan IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get max entries for plan
    SELECT max_entries_per_card INTO v_max_entries
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    -- Build column name dynamically
    v_column_name := p_card_type || '_entries_count';
    
    -- Get current count for today
    EXECUTE format('SELECT COALESCE(%I, 0) FROM public.user_usage WHERE user_id = $1 AND date = CURRENT_DATE', v_column_name)
    INTO v_current_count
    USING v_user_uuid;
    
    -- Check if under limit
    RETURN v_current_count < v_max_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_add_entry(TEXT, TEXT) IS 'Check if user can add another entry to a specific card (accepts TEXT user_id)';


-- 4. Fix increment_entry_count
DROP FUNCTION IF EXISTS public.increment_entry_count(uuid, text);
DROP FUNCTION IF EXISTS public.increment_entry_count(text, text);

CREATE OR REPLACE FUNCTION public.increment_entry_count(
    p_user_id TEXT,
    p_card_type TEXT
)
RETURNS VOID AS $$
DECLARE
    v_user_uuid UUID;
    v_column_name TEXT;
    v_subscription_id UUID;
BEGIN
    -- Cast TEXT to UUID
    v_user_uuid := p_user_id::UUID;

    -- Get subscription ID
    SELECT id INTO v_subscription_id
    FROM public.user_subscriptions
    WHERE user_id = v_user_uuid;
    
    -- Build column name
    v_column_name := p_card_type || '_entries_count';
    
    -- Insert or update usage record
    INSERT INTO public.user_usage (user_id, subscription_id, date)
    VALUES (v_user_uuid, v_subscription_id, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    -- Increment count
    EXECUTE format('UPDATE public.user_usage SET %I = %I + 1 WHERE user_id = $1 AND date = CURRENT_DATE', v_column_name, v_column_name)
    USING v_user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_entry_count(TEXT, TEXT) IS 'Increment entry count for a specific card type (accepts TEXT user_id)';
