-- Fix can_interact_with_community function to accept TEXT user_id
-- This is required because user_id is now TEXT in the database (to support Better Auth IDs)
-- but the function was expecting UUID, causing 400 Bad Request errors.

CREATE OR REPLACE FUNCTION public.can_interact_with_community(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_can_interact BOOLEAN;
BEGIN
    -- Get user's current plan
    -- We cast p_user_id to match the column type if needed, but since user_id is TEXT, direct comparison is best
    SELECT plan INTO v_plan
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
    AND status IN ('ACTIVE', 'TRIAL');
    
    -- If no subscription found, deny
    IF v_plan IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if plan has community interaction access
    SELECT community_interaction INTO v_can_interact
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    RETURN COALESCE(v_can_interact, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
