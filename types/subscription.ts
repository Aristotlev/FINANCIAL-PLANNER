/**
 * Subscription & Pricing Plan Types
 * Defines types for user subscriptions, plan tiers, and usage tracking
 */

// ==================== SUBSCRIPTION PLANS ====================

export type SubscriptionPlan = 'FREE' | 'PRO' | 'UNLIMITED';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';

export interface PlanLimits {
  plan: SubscriptionPlan;
  max_entries_per_card: number;
  max_ai_calls_per_day: number;
  advanced_analytics: boolean;
  priority_support: boolean;
  custom_categories: boolean;
  price_monthly_usd: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  
  // Subscription Details
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  
  // Trial Management
  trial_start_date?: string;
  trial_end_date?: string;
  trial_used: boolean;
  
  // Subscription Dates
  subscription_start_date?: string;
  subscription_end_date?: string;
  
  // Payment Integration (Stripe)
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  
  // Cancellation
  cancelled_at?: string;
  cancel_at_period_end: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  id: string;
  user_id: string;
  subscription_id: string;
  
  // Daily Usage Tracking
  date: string; // ISO date string
  
  // Entry Counts per Card
  cash_entries_count: number;
  crypto_entries_count: number;
  stocks_entries_count: number;
  real_estate_entries_count: number;
  valuable_items_entries_count: number;
  savings_entries_count: number;
  expenses_entries_count: number;
  debt_entries_count: number;
  trading_accounts_entries_count: number;
  
  // AI Assistant Usage
  ai_calls_count: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// ==================== CARD TYPES ====================

export type CardType =
  | 'cash'
  | 'crypto'
  | 'stocks'
  | 'real_estate'
  | 'valuable_items'
  | 'savings'
  | 'expenses'
  | 'debt'
  | 'trading_accounts';

// ==================== PLAN CONFIGURATIONS ====================

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    plan: 'FREE',
    max_entries_per_card: 5,
    max_ai_calls_per_day: 0,
    advanced_analytics: false,
    priority_support: false,
    custom_categories: false,
    price_monthly_usd: 0.00,
  },
  PRO: {
    plan: 'PRO',
    max_entries_per_card: 20,
    max_ai_calls_per_day: 20,
    advanced_analytics: true,
    priority_support: false,
    custom_categories: true,
    price_monthly_usd: 19.99,
  },
  UNLIMITED: {
    plan: 'UNLIMITED',
    max_entries_per_card: 50,
    max_ai_calls_per_day: 50,
    advanced_analytics: true,
    priority_support: true,
    custom_categories: true,
    price_monthly_usd: 39.99,
  },
};

// ==================== PLAN FEATURES ====================

export interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeature[]> = {
  FREE: [
    { name: '5 entries per asset class', included: true },
    { name: 'Basic analytics', included: true },
    { name: 'Email support', included: true },
    { name: 'AI Assistant', included: false, tooltip: 'Upgrade to Pro for AI features' },
    { name: 'Advanced analytics', included: false },
    { name: 'Priority support', included: false },
    { name: 'Custom categories', included: false },
  ],
  PRO: [
    { name: '20 entries per asset class', included: true, tooltip: '4x more than Free' },
    { name: '20 AI calls per day', included: true, tooltip: 'Get AI-powered insights' },
    { name: 'Advanced analytics', included: true, tooltip: 'Performance tracking, trends, predictions' },
    { name: 'Custom categories', included: true, tooltip: 'Create your own expense categories' },
    { name: 'Export to CSV/Excel', included: true },
    { name: 'Email support', included: true },
    { name: 'Priority support', included: false },
  ],
  UNLIMITED: [
    { name: '50 entries per asset class', included: true, tooltip: '10x more than Free' },
    { name: '50 AI calls per day', included: true, tooltip: 'More AI power for your needs' },
    { name: 'Advanced analytics', included: true },
    { name: 'Priority support', included: true, tooltip: '24/7 priority email support' },
    { name: 'Custom categories', included: true },
    { name: 'Export to CSV/Excel', included: true },
    { name: 'API access', included: true },
    { name: 'Early access to features', included: true },
  ],
};

// ==================== USAGE LIMITS ====================

export interface UsageLimits {
  entries: {
    current: number;
    max: number;
    percentage: number;
  };
  aiCalls: {
    current: number;
    max: number;
    percentage: number;
  };
}

export interface LimitCheckResult {
  canProceed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentUsage?: number;
  maxAllowed?: number;
}

// ==================== STRIPE CONFIGURATION ====================

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  prices: {
    monthly: {
      id: string;
      amount: number;
      currency: string;
    };
  };
}

export const STRIPE_PRODUCTS: Record<SubscriptionPlan, StripeProduct | null> = {
  FREE: null, // No Stripe product for free plan
  PRO: {
    id: 'prod_pro_money_hub',
    name: 'Money Hub Pro',
    description: '20 entries per asset class, 20 AI calls/day',
    prices: {
      monthly: {
        id: 'price_pro_monthly',
        amount: 1999, // $19.99 in cents
        currency: 'usd',
      },
    },
  },
  UNLIMITED: {
    id: 'prod_unlimited_money_hub',
    name: 'Money Hub Unlimited',
    description: '50 entries per asset class, 50 AI calls/day, all features',
    prices: {
      monthly: {
        id: 'price_unlimited_monthly',
        amount: 3999, // $39.99 in cents
        currency: 'usd',
      },
    },
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Trial users get UNLIMITED plan features for 7 days
 */
export const TRIAL_PLAN_LIMITS = PLAN_CONFIG.UNLIMITED;

/**
 * Get the effective plan limits based on subscription status
 * During trial, users get UNLIMITED features
 */
export function getEffectivePlanLimits(subscription: UserSubscription): PlanLimits {
  if (isTrialActive(subscription)) {
    return TRIAL_PLAN_LIMITS;
  }
  return PLAN_CONFIG[subscription.plan];
}

export function isTrialActive(subscription: UserSubscription): boolean {
  if (subscription.status !== 'TRIAL') return false;
  if (!subscription.trial_end_date) return false;
  
  const now = new Date();
  const trialEnd = new Date(subscription.trial_end_date);
  
  return now < trialEnd;
}

export function isSubscriptionActive(subscription: UserSubscription): boolean {
  return subscription.status === 'ACTIVE' || isTrialActive(subscription);
}

export function getDaysRemainingInTrial(subscription: UserSubscription): number {
  if (!subscription.trial_end_date) return 0;
  
  const now = new Date();
  const trialEnd = new Date(subscription.trial_end_date);
  const diff = trialEnd.getTime() - now.getTime();
  
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getUsagePercentage(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, (current / max) * 100);
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'red';
  if (percentage >= 70) return 'orange';
  return 'green';
}

export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function getPlanDisplayName(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'FREE':
      return 'Free Plan';
    case 'PRO':
      return 'Pro Plan';
    case 'UNLIMITED':
      return 'Unlimited Plan';
    default:
      return plan;
  }
}

export function canUpgradeTo(currentPlan: SubscriptionPlan, targetPlan: SubscriptionPlan): boolean {
  const planOrder: SubscriptionPlan[] = ['FREE', 'PRO', 'UNLIMITED'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  
  return targetIndex > currentIndex;
}
