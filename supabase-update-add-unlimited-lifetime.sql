-- ==========================================
-- UPDATE SUBSCRIPTION SCHEMA
-- Add UNLIMITED and LIFETIME plans
-- ==========================================

-- Drop existing enum and recreate with new values
ALTER TYPE subscription_plan RENAME TO subscription_plan_old;

CREATE TYPE subscription_plan AS ENUM ('FREE_TRIAL', 'BASIC', 'PRO', 'UNLIMITED', 'LIFETIME');

-- Update existing columns to use new enum
ALTER TABLE public.user_subscriptions 
  ALTER COLUMN plan TYPE subscription_plan 
  USING plan::text::subscription_plan;

ALTER TABLE public.plan_limits 
  ALTER COLUMN plan TYPE subscription_plan 
  USING plan::text::subscription_plan;

-- Drop old enum
DROP TYPE subscription_plan_old;

-- Insert new plan limits for UNLIMITED and LIFETIME
INSERT INTO public.plan_limits (plan, max_entries_per_card, max_ai_calls_per_day, advanced_analytics, priority_support, custom_categories, price_monthly_usd)
VALUES 
    ('UNLIMITED', 999999, 999999, TRUE, TRUE, TRUE, 49.99),
    ('LIFETIME', 999999, 999999, TRUE, TRUE, TRUE, 499.99)
ON CONFLICT (plan) DO UPDATE SET
    max_entries_per_card = EXCLUDED.max_entries_per_card,
    max_ai_calls_per_day = EXCLUDED.max_ai_calls_per_day,
    advanced_analytics = EXCLUDED.advanced_analytics,
    priority_support = EXCLUDED.priority_support,
    custom_categories = EXCLUDED.custom_categories,
    price_monthly_usd = EXCLUDED.price_monthly_usd,
    updated_at = NOW();

-- Verify the update
SELECT 
    plan,
    max_entries_per_card,
    max_ai_calls_per_day,
    price_monthly_usd,
    advanced_analytics,
    priority_support,
    custom_categories
FROM public.plan_limits
ORDER BY price_monthly_usd;
