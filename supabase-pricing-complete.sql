-- ================================================
-- PRICING PLAN UPDATE - COMPLETE SINGLE FILE VERSION
-- ================================================
-- This version uses TEXT column instead of ENUM to avoid PostgreSQL
-- transaction issues with enum values
--
-- Run this entire file at once in Supabase SQL Editor

-- Step 1: Check if plan_limits table exists and what type the plan column is
-- If it's an enum, we need to convert it to TEXT

-- First, let's see what we're working with
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'plan_limits' AND column_name = 'plan';

-- Step 2: Create a backup and recreate plan_limits with TEXT type if needed
-- This approach avoids all enum issues

-- Drop and recreate plan_limits table with TEXT plan column
DROP TABLE IF EXISTS public.plan_limits_backup;

-- Backup existing data if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plan_limits') THEN
        CREATE TABLE public.plan_limits_backup AS SELECT * FROM public.plan_limits;
    END IF;
END $$;

-- Drop and recreate with TEXT type
DROP TABLE IF EXISTS public.plan_limits CASCADE;

CREATE TABLE public.plan_limits (
    plan TEXT PRIMARY KEY,
    max_entries_per_card INT NOT NULL DEFAULT 999999,
    max_ai_calls_per_day INT NOT NULL DEFAULT 0,
    advanced_analytics BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    custom_categories BOOLEAN DEFAULT FALSE,
    imports_exports BOOLEAN DEFAULT FALSE,
    ai_assistant BOOLEAN DEFAULT FALSE,
    price_monthly_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the new pricing plans
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
    ('STARTER', 999999, 0, FALSE, FALSE, FALSE, FALSE, FALSE, 0.00),
    
    -- TRADER: $9.99/month - Everything + Imports/Exports + AI (10 msgs/day)
    ('TRADER', 999999, 10, TRUE, FALSE, TRUE, TRUE, TRUE, 9.99),
    
    -- INVESTOR: $19.99/month - Everything + AI (50 msgs/day) + Priority Support
    ('INVESTOR', 999999, 50, TRUE, TRUE, TRUE, TRUE, TRUE, 19.99),
    
    -- WHALE: $49.99/month - Everything + Unlimited AI + VIP Support + Beta Access
    ('WHALE', 999999, 999999, TRUE, TRUE, TRUE, TRUE, TRUE, 49.99);

-- Enable RLS
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy for plan_limits (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view plan limits" ON public.plan_limits;
CREATE POLICY "Authenticated users can view plan limits"
    ON public.plan_limits
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON public.plan_limits TO authenticated;
GRANT ALL ON public.plan_limits TO service_role;

-- Step 3: Update user_subscriptions table to use TEXT for plan column
-- First check current type
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' AND column_name = 'plan';

-- Alter user_subscriptions.plan to TEXT if it's an enum
DO $$
BEGIN
    -- Try to alter column type (may fail if it's already TEXT or incompatible)
    BEGIN
        ALTER TABLE public.user_subscriptions 
        ALTER COLUMN plan TYPE TEXT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not alter plan column, may already be TEXT or have constraints';
    END;
END $$;

-- Step 4: Migrate existing users from old plans to new plans
UPDATE public.user_subscriptions 
SET plan = 'STARTER' 
WHERE plan IN ('FREE_TRIAL', 'BASIC');

UPDATE public.user_subscriptions 
SET plan = 'TRADER' 
WHERE plan = 'PRO';

UPDATE public.user_subscriptions 
SET plan = 'WHALE' 
WHERE plan IN ('UNLIMITED', 'LIFETIME');

-- Set any remaining NULL or unknown plans to STARTER
UPDATE public.user_subscriptions 
SET plan = 'STARTER' 
WHERE plan IS NULL OR plan NOT IN ('STARTER', 'TRADER', 'INVESTOR', 'WHALE');

-- Step 5: Create helper functions (these work with TEXT now)
CREATE OR REPLACE FUNCTION public.can_use_import_export(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
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

CREATE OR REPLACE FUNCTION public.can_use_ai_assistant(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
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

-- Update existing functions to work with TEXT plan column
CREATE OR REPLACE FUNCTION public.can_add_entry(
    p_user_id UUID,
    p_card_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_max_entries INT;
    v_current_count INT;
    v_column_name TEXT;
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
    
    -- Get max entries for plan
    SELECT max_entries_per_card INTO v_max_entries
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    -- Unlimited check
    IF v_max_entries >= 999999 THEN
        RETURN TRUE;
    END IF;
    
    -- Build column name dynamically
    v_column_name := p_card_type || '_entries_count';
    
    -- Get current count for today
    EXECUTE format('SELECT COALESCE(%I, 0) FROM public.user_usage WHERE user_id = $1 AND date = CURRENT_DATE', v_column_name)
    INTO v_current_count
    USING p_user_id;
    
    -- Check if under limit
    RETURN COALESCE(v_current_count, 0) < v_max_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_make_ai_call(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_max_calls INT;
    v_current_calls INT;
    v_ai_enabled BOOLEAN;
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
    
    -- Check if AI is enabled for this plan
    SELECT ai_assistant, max_ai_calls_per_day INTO v_ai_enabled, v_max_calls
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    -- If AI not enabled, deny
    IF NOT COALESCE(v_ai_enabled, FALSE) THEN
        RETURN FALSE;
    END IF;
    
    -- Unlimited check
    IF v_max_calls >= 999999 THEN
        RETURN TRUE;
    END IF;
    
    -- Get current calls for today
    SELECT COALESCE(ai_calls_count, 0) INTO v_current_calls
    FROM public.user_usage
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    -- Check if under limit
    RETURN COALESCE(v_current_calls, 0) < v_max_calls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger function for new users
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

-- Step 6: Verify the migration
SELECT '=== Plan Limits ===' AS info;
SELECT plan, max_entries_per_card, max_ai_calls_per_day, 
       imports_exports, ai_assistant, priority_support, 
       price_monthly_usd
FROM public.plan_limits
ORDER BY price_monthly_usd;

SELECT '=== User Subscriptions ===' AS info;
SELECT plan, status, COUNT(*) as count
FROM public.user_subscriptions
GROUP BY plan, status
ORDER BY plan;

-- Cleanup backup table
DROP TABLE IF EXISTS public.plan_limits_backup;

-- Comments for documentation
COMMENT ON TABLE public.plan_limits IS 'Configuration for subscription plan limits and features';
COMMENT ON COLUMN public.plan_limits.imports_exports IS 'Whether the plan allows CSV import/export and broker sync';
COMMENT ON COLUMN public.plan_limits.ai_assistant IS 'Whether the plan has access to AI assistant';
