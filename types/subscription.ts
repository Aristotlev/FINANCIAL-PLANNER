/**
 * Subscription & Pricing Plan Types
 * Defines types for user subscriptions, plan tiers, and usage tracking
 */

// ==================== SUBSCRIPTION PLANS ====================

export type SubscriptionPlan = 'STARTER' | 'TRADER' | 'INVESTOR' | 'WHALE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';

export interface PlanLimits {
  plan: SubscriptionPlan;
  max_entries_per_card: number | 'unlimited';
  max_ai_calls_per_day: number | 'unlimited';
  advanced_analytics: boolean;
  priority_support: boolean;
  custom_categories: boolean;
  imports_exports: boolean;
  ai_assistant: boolean;
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
  STARTER: {
    plan: 'STARTER',
    max_entries_per_card: 3,
    max_ai_calls_per_day: 0,
    advanced_analytics: false,
    priority_support: false,
    custom_categories: false,
    imports_exports: false,
    ai_assistant: false,
    price_monthly_usd: 0.00,
  },
  TRADER: {
    plan: 'TRADER',
    max_entries_per_card: 'unlimited',
    max_ai_calls_per_day: 0,
    advanced_analytics: true, // Basic AI Analytics (PnL, Diversity Score)
    priority_support: false,
    custom_categories: true,
    imports_exports: true,
    ai_assistant: false,
    price_monthly_usd: 9.99,
  },
  INVESTOR: {
    plan: 'INVESTOR',
    max_entries_per_card: 'unlimited',
    max_ai_calls_per_day: 50,
    advanced_analytics: true, // Deep Analytics
    priority_support: false,
    custom_categories: true,
    imports_exports: true,
    ai_assistant: true,
    price_monthly_usd: 19.99,
  },
  WHALE: {
    plan: 'WHALE',
    max_entries_per_card: 'unlimited',
    max_ai_calls_per_day: 'unlimited',
    advanced_analytics: true,
    priority_support: true,
    custom_categories: true,
    imports_exports: true,
    ai_assistant: true,
    price_monthly_usd: 49.99,
  },
};

// ==================== PLAN FEATURES ====================

export interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeature[]> = {
  STARTER: [
    { name: '3 Assets per Asset Class', included: true },
    { name: 'Unlimited Manual Transactions', included: true },
    { name: 'Basic Portfolio Tracking', included: true },
    { name: 'No Credit Card Required', included: true },
    { name: 'Imports & Exports', included: false },
    { name: 'AI Analytics', included: false },
  ],
  TRADER: [
    { name: 'Unlimited Assets', included: true },
    { name: 'Imports & Exports (CSV, PDF)', included: true },
    { name: 'Automated Data', included: true },
    { name: 'Basic AI Analytics', included: true },
    { name: 'AI Assistant', included: false },
  ],
  INVESTOR: [
    { name: 'Unlimited Assets', included: true },
    { name: 'AI Assistant (50 Qs/day)', included: true },
    { name: 'Deep Analytics', included: true },
    { name: 'Everything in Trader', included: true },
  ],
  WHALE: [
    { name: 'Unlimited Everything', included: true },
    { name: 'Unlimited AI Assistant', included: true },
    { name: 'Priority Support', included: true },
    { name: 'Early Access to new tools', included: true },
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
  STARTER: null, // No Stripe product for free plan
  TRADER: {
    id: 'prod_trader_money_hub',
    name: 'Money Hub Trader',
    description: 'Unlimited Assets, Imports & Exports, Basic AI Analytics',
    prices: {
      monthly: {
        id: 'price_trader_monthly',
        amount: 999, // $9.99 in cents
        currency: 'usd',
      },
    },
  },
  INVESTOR: {
    id: 'prod_investor_money_hub',
    name: 'Money Hub Investor',
    description: 'AI Assistant (50 Qs/day), Deep Analytics',
    prices: {
      monthly: {
        id: 'price_investor_monthly',
        amount: 1999, // $19.99 in cents
        currency: 'usd',
      },
    },
  },
  WHALE: {
    id: 'prod_whale_money_hub',
    name: 'Money Hub Whale',
    description: 'Unlimited AI & Priority Support',
    prices: {
      monthly: {
        id: 'price_whale_monthly',
        amount: 4999, // $49.99 in cents
        currency: 'usd',
      },
    },
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Trial users get UNLIMITED plan features for 7 days
 */
export const TRIAL_PLAN_LIMITS = PLAN_CONFIG.WHALE;

/**
 * Get the effective plan limits based on subscription status
 * During trial, users get UNLIMITED features
 */
export function getEffectivePlanLimits(subscription: UserSubscription): PlanLimits {
  if (isTrialActive(subscription)) {
    return TRIAL_PLAN_LIMITS;
  }
  return PLAN_CONFIG[subscription.plan] || PLAN_CONFIG.STARTER;
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
    case 'STARTER':
      return 'The Starter';
    case 'TRADER':
      return 'The Trader';
    case 'INVESTOR':
      return 'The Investor';
    case 'WHALE':
      return 'The Whale';
    default:
      return plan;
  }
}

export function canUpgradeTo(currentPlan: SubscriptionPlan, targetPlan: SubscriptionPlan): boolean {
  const planOrder: SubscriptionPlan[] = ['STARTER', 'TRADER', 'INVESTOR', 'WHALE'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  
  return targetIndex > currentIndex;
}
