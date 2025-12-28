-- Add community_interaction column to plan_limits
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS community_interaction BOOLEAN DEFAULT FALSE;

-- Update existing plans
UPDATE public.plan_limits SET community_interaction = FALSE WHERE plan = 'STARTER';
UPDATE public.plan_limits SET community_interaction = TRUE WHERE plan IN ('TRADER', 'INVESTOR', 'WHALE');

-- Create helper function
CREATE OR REPLACE FUNCTION public.can_interact_with_community(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_can_interact BOOLEAN;
BEGIN
    -- Get user's current plan
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
