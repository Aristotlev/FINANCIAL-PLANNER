-- ================================================
-- PRICING PLAN UPDATE - STEP 2: Apply Configuration
-- ================================================
-- Run this AFTER step1 is committed
-- Updates plan_limits and migrates existing users

-- Step 2: Add new columns to plan_limits table for feature flags
ALTER TABLE public.plan_limits 
ADD COLUMN IF NOT EXISTS imports_exports BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_assistant BOOLEAN DEFAULT FALSE;

-- Step 3: Update plan_limits with new pricing structure
-- max_entries_per_card = 999999 means unlimited
-- max_ai_calls_per_day = 999999 means unlimited
-- Using TEXT cast to avoid enum issues

INSERT INTO public.plan_limits (
    plan, 
    max_entries_per_card, 
    max_ai_calls_per_day, 
    advanced_analytics, 
    priority_support, 
    custom_categories, 
    imports_exports,
    ai_assistant,
    price_monthly_usd
)
VALUES 
    -- STARTER: $0/forever - Unlimited assets, manual only, no imports, no AI
    ('STARTER'::subscription_plan, 999999, 0, FALSE, FALSE, FALSE, FALSE, FALSE, 0.00),
    
    -- TRADER: $9.99/month - Everything + Imports/Exports + AI (10 msgs/day)
    ('TRADER'::subscription_plan, 999999, 10, TRUE, FALSE, TRUE, TRUE, TRUE, 9.99),
    
    -- INVESTOR: $19.99/month - Everything + AI (50 msgs/day) + Priority Support
    ('INVESTOR'::subscription_plan, 999999, 50, TRUE, TRUE, TRUE, TRUE, TRUE, 19.99),
    
    -- WHALE: $49.99/month - Everything + Unlimited AI + VIP Support + Beta Access
    ('WHALE'::subscription_plan, 999999, 999999, TRUE, TRUE, TRUE, TRUE, TRUE, 49.99)
ON CONFLICT (plan) DO UPDATE SET
    max_entries_per_card = EXCLUDED.max_entries_per_card,
    max_ai_calls_per_day = EXCLUDED.max_ai_calls_per_day,
    advanced_analytics = EXCLUDED.advanced_analytics,
    priority_support = EXCLUDED.priority_support,
    custom_categories = EXCLUDED.custom_categories,
    imports_exports = EXCLUDED.imports_exports,
    ai_assistant = EXCLUDED.ai_assistant,
    price_monthly_usd = EXCLUDED.price_monthly_usd,
    updated_at = NOW();

-- Step 4: Migrate existing users from old plans to new plans
-- FREE_TRIAL → STARTER (with trial status)
-- BASIC → STARTER  
-- PRO → TRADER
-- UNLIMITED → WHALE
-- LIFETIME → WHALE

UPDATE public.user_subscriptions 
SET plan = 'STARTER' 
WHERE plan::TEXT IN ('FREE_TRIAL', 'BASIC');

UPDATE public.user_subscriptions 
SET plan = 'TRADER' 
WHERE plan::TEXT = 'PRO';

UPDATE public.user_subscriptions 
SET plan = 'WHALE' 
WHERE plan::TEXT IN ('UNLIMITED', 'LIFETIME');

-- Step 5: Update the function to check import/export permission
CREATE OR REPLACE FUNCTION public.can_use_import_export(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan subscription_plan;
    v_can_use BOOLEAN;
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
    
    -- Check if plan has import/export access
    SELECT imports_exports INTO v_can_use
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    RETURN COALESCE(v_can_use, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update the function to check AI assistant permission
CREATE OR REPLACE FUNCTION public.can_use_ai_assistant(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan subscription_plan;
    v_can_use BOOLEAN;
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
    
    -- Check if plan has AI assistant access
    SELECT ai_assistant INTO v_can_use
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    RETURN COALESCE(v_can_use, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Update the trigger function for new users to use STARTER plan
CREATE OR REPLACE FUNCTION public.create_trial_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_subscriptions (
        user_id,
        plan,
        status,
        trial_start_date,
        trial_end_date,
        trial_used
    ) VALUES (
        NEW.id,
        'STARTER',  -- New users start on STARTER plan
        'TRIAL',    -- With TRIAL status (gets WHALE features for 7 days)
        NOW(),
        NOW() + INTERVAL '7 days',
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Verify the migration
SELECT plan, max_entries_per_card, max_ai_calls_per_day, 
       imports_exports, ai_assistant, priority_support, 
       price_monthly_usd
FROM public.plan_limits
ORDER BY price_monthly_usd;

-- Comments for documentation
COMMENT ON COLUMN public.plan_limits.imports_exports IS 'Whether the plan allows CSV import/export and broker sync';
COMMENT ON COLUMN public.plan_limits.ai_assistant IS 'Whether the plan has access to AI assistant';
COMMENT ON FUNCTION public.can_use_import_export IS 'Check if user plan allows import/export features';
COMMENT ON FUNCTION public.can_use_ai_assistant IS 'Check if user plan has AI assistant access';
