-- ================================================
-- USER SUBSCRIPTIONS & PRICING PLAN SCHEMA
-- ================================================
-- Tracks user subscription plans, trial periods, and usage limits
-- Supports: Free Trial (1 week) → Basic ($4.99) → Pro ($9.99)

-- Create subscription plans enum
DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('FREE_TRIAL', 'BASIC', 'PRO', 'UNLIMITED', 'LIFETIME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Subscription Details
    plan subscription_plan NOT NULL DEFAULT 'FREE_TRIAL',
    status subscription_status NOT NULL DEFAULT 'TRIAL',
    
    -- Trial Management
    trial_start_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    trial_used BOOLEAN DEFAULT FALSE,
    
    -- Subscription Dates
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Payment Integration (Stripe)
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    -- Cancellation
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one subscription per user
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.user_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    
    -- Daily Usage Tracking
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Entry Counts per Card (max 10 for BASIC, 50 for PRO)
    cash_entries_count INT DEFAULT 0,
    crypto_entries_count INT DEFAULT 0,
    stocks_entries_count INT DEFAULT 0,
    real_estate_entries_count INT DEFAULT 0,
    valuable_items_entries_count INT DEFAULT 0,
    savings_entries_count INT DEFAULT 0,
    expenses_entries_count INT DEFAULT 0,
    debt_entries_count INT DEFAULT 0,
    trading_accounts_entries_count INT DEFAULT 0,
    
    -- AI Assistant Usage (max 20 for BASIC, 100 for PRO)
    ai_calls_count INT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One usage record per user per day
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Create plan limits configuration table
CREATE TABLE IF NOT EXISTS public.plan_limits (
    plan subscription_plan PRIMARY KEY,
    
    -- Entry Limits per Card
    max_entries_per_card INT NOT NULL,
    
    -- AI Assistant Limits
    max_ai_calls_per_day INT NOT NULL,
    
    -- Feature Access
    advanced_analytics BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    custom_categories BOOLEAN DEFAULT FALSE,
    
    -- Pricing
    price_monthly_usd NUMERIC(10, 2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plan limits
INSERT INTO public.plan_limits (plan, max_entries_per_card, max_ai_calls_per_day, advanced_analytics, priority_support, custom_categories, price_monthly_usd)
VALUES 
    ('FREE_TRIAL', 10, 20, FALSE, FALSE, FALSE, 0.00),
    ('BASIC', 10, 20, FALSE, FALSE, FALSE, 4.99),
    ('PRO', 50, 100, TRUE, TRUE, TRUE, 9.99),
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON public.user_subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON public.user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_date ON public.user_usage(date);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_date ON public.user_usage(user_id, date);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
    ON public.user_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON public.user_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON public.user_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription"
    ON public.user_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for user_usage
CREATE POLICY "Users can view their own usage"
    ON public.user_usage
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
    ON public.user_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
    ON public.user_usage
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for plan_limits (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view plan limits"
    ON public.plan_limits
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Function to automatically create trial subscription for new users
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
        'FREE_TRIAL',
        'TRIAL',
        NOW(),
        NOW() + INTERVAL '7 days',
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create trial subscription on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_trial_subscription_for_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER set_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_usage_updated_at ON public.user_usage;
CREATE TRIGGER set_user_usage_updated_at
    BEFORE UPDATE ON public.user_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_plan_limits_updated_at ON public.plan_limits;
CREATE TRIGGER set_plan_limits_updated_at
    BEFORE UPDATE ON public.plan_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if user can add entry
CREATE OR REPLACE FUNCTION public.can_add_entry(
    p_user_id UUID,
    p_card_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan subscription_plan;
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
    
    -- Build column name dynamically
    v_column_name := p_card_type || '_entries_count';
    
    -- Get current count for today
    EXECUTE format('SELECT COALESCE(%I, 0) FROM public.user_usage WHERE user_id = $1 AND date = CURRENT_DATE', v_column_name)
    INTO v_current_count
    USING p_user_id;
    
    -- Check if under limit
    RETURN v_current_count < v_max_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment entry count
CREATE OR REPLACE FUNCTION public.increment_entry_count(
    p_user_id UUID,
    p_card_type TEXT
)
RETURNS VOID AS $$
DECLARE
    v_column_name TEXT;
    v_subscription_id UUID;
BEGIN
    -- Get subscription ID
    SELECT id INTO v_subscription_id
    FROM public.user_subscriptions
    WHERE user_id = p_user_id;
    
    -- Build column name
    v_column_name := p_card_type || '_entries_count';
    
    -- Insert or update usage record
    INSERT INTO public.user_usage (user_id, subscription_id, date)
    VALUES (p_user_id, v_subscription_id, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    -- Increment count
    EXECUTE format('UPDATE public.user_usage SET %I = %I + 1 WHERE user_id = $1 AND date = CURRENT_DATE', v_column_name, v_column_name)
    USING p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check AI calls limit
CREATE OR REPLACE FUNCTION public.can_make_ai_call(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan subscription_plan;
    v_max_calls INT;
    v_current_calls INT;
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
    
    -- Get max calls for plan
    SELECT max_ai_calls_per_day INTO v_max_calls
    FROM public.plan_limits
    WHERE plan = v_plan;
    
    -- Get current calls for today
    SELECT COALESCE(ai_calls_count, 0) INTO v_current_calls
    FROM public.user_usage
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    -- Check if under limit
    RETURN v_current_calls < v_max_calls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment AI call count
CREATE OR REPLACE FUNCTION public.increment_ai_call_count(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Get subscription ID
    SELECT id INTO v_subscription_id
    FROM public.user_subscriptions
    WHERE user_id = p_user_id;
    
    -- Insert or update usage record
    INSERT INTO public.user_usage (user_id, subscription_id, date, ai_calls_count)
    VALUES (p_user_id, v_subscription_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET ai_calls_count = public.user_usage.ai_calls_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_usage TO authenticated;
GRANT SELECT ON public.plan_limits TO authenticated;
GRANT ALL ON public.plan_limits TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.user_subscriptions IS 'Tracks user subscription plans and billing information';
COMMENT ON TABLE public.user_usage IS 'Tracks daily usage limits for entries and AI calls';
COMMENT ON TABLE public.plan_limits IS 'Configuration for subscription plan limits and features';
COMMENT ON FUNCTION public.can_add_entry IS 'Check if user can add another entry to a specific card';
COMMENT ON FUNCTION public.increment_entry_count IS 'Increment entry count for a specific card type';
COMMENT ON FUNCTION public.can_make_ai_call IS 'Check if user can make another AI assistant call';
COMMENT ON FUNCTION public.increment_ai_call_count IS 'Increment AI call count for the day';
