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
  paid_apis_allowed: boolean;
  community_access: boolean;
  sec_filings_access: boolean;
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

/**
 * Plan Configuration Strategy:
 * 
 * STARTER ($0/forever) - "Unlimited tracking for those willing to do the work"
 *   ✅ Unlimited Assets & Inputs (manual entry only)
 *   ✅ Multi-Currency Support (30) & Live Rates
 *   ✅ 100+ Major Banks Database
 *   ✅ Basic Analytics (Portfolio Value & Allocation)
 *   ❌ No Imports/Exports (Manual Entry Only)
 *   ❌ No AI Assistant / Recommendations
 *   ❌ No AI Chat
 * 
 * TRADER ($9.99/month) - "Saves time & provides deeper insights"
 *   ✅ Everything in Starter, plus:
 *   🚀 Unlimited Imports & Exports (CSV, Broker Sync)
 *   📊 All Analytics (PnL, Advanced Charts, Diversity Scores)
 *   🤖 AI Assistant: 10 messages/day
 * 
 * INVESTOR ($19.99/month) - "For users who actively analyze portfolio with AI"
 *   ✅ Everything in Trader, plus:
 *   🧠 AI Assistant: 50 messages/day
 *   💎 Priority Support (Faster email response)
 * 
 * WHALE ($49.99/month) - "The ultimate experience with zero friction"
 *   ✅ Everything in Investor, plus:
 *   ♾️ Unlimited AI Assistant messages
 *   ⚡ VIP Priority Support (Skip the line)
 *   🧪 Beta Access (Try new features before anyone else)
 */
export const PLAN_CONFIG: Record<SubscriptionPlan, PlanLimits> = {
  STARTER: {
    plan: 'STARTER',
    max_entries_per_card: 'unlimited', // Unlimited assets - key growth engine
    max_ai_calls_per_day: 0,           // No AI access
    advanced_analytics: false,          // Basic analytics only (Portfolio Value & Allocation)
    priority_support: false,
    custom_categories: true,
    imports_exports: false,             // Manual Entry Only - NO imports/exports
    ai_assistant: false,                // No AI Assistant
    paid_apis_allowed: false,           // No paid APIs (Google Maps, etc.)
    community_access: false,            // No Community Access
    sec_filings_access: false,          // No SEC Filings Access
    price_monthly_usd: 0.00,
  },
  TRADER: {
    plan: 'TRADER',
    max_entries_per_card: 'unlimited',
    max_ai_calls_per_day: 10,           // 10 messages/day - teaser to upgrade
    advanced_analytics: true,            // All Analytics (PnL, Charts, Diversity)
    priority_support: false,
    custom_categories: true,
    imports_exports: true,               // Unlimited Imports & Exports
    ai_assistant: true,                  // AI Assistant enabled (10 msgs/day)
    paid_apis_allowed: true,             // Paid APIs allowed
    community_access: true,              // Community Access
    sec_filings_access: false,           // No SEC Filings Access
    price_monthly_usd: 9.99,
  },
  INVESTOR: {
    plan: 'INVESTOR',
    max_entries_per_card: 'unlimited',
    max_ai_calls_per_day: 50,            // 50 messages/day - deep conversations
    advanced_analytics: true,
    priority_support: true,              // Priority Support (faster email response)
    custom_categories: true,
    imports_exports: true,
    ai_assistant: true,
    paid_apis_allowed: true,
    community_access: true,              // Community Access
    sec_filings_access: true,            // SEC Filings Access
    price_monthly_usd: 19.99,
  },
  WHALE: {
    plan: 'WHALE',
    max_entries_per_card: 'unlimited',
    max_ai_calls_per_day: 'unlimited',   // Unlimited AI messages
    advanced_analytics: true,
    priority_support: true,              // VIP Priority Support
    custom_categories: true,
    imports_exports: true,
    ai_assistant: true,
    paid_apis_allowed: true,
    community_access: true,              // Community Access
    sec_filings_access: true,            // SEC Filings Access
    price_monthly_usd: 49.99,
  },
};

// ==================== PLAN FEATURES ====================

export interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

/**
 * Plan Features for UI Display
 * These are shown on pricing cards and comparison tables
 */
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeature[]> = {
  STARTER: [
    { name: 'Multi Asset Tracking', included: true, tooltip: 'Track cash, crypto, stocks, and more' },
    { name: 'Real Time Updates', included: true, tooltip: 'Live market data' },
    { name: 'Dual Currency Display', included: true, tooltip: 'Original and converted values' },
    { name: 'Multi Currency Bank Accounts', included: true },
    { name: 'Automatic Conversions', included: true },
    { name: '150+ Supported Countries', included: true },
    { name: 'Trading Accounts', included: true, tooltip: 'Manage multiple brokerage and crypto accounts' },
    { name: 'Interactive Charts', included: true, tooltip: 'Basic visualization' },
    { name: 'Advanced Tax Calculator (41+ Countries)', included: true },
    { name: 'Custom Income Sources', included: true },
    { name: 'Tax Optimization', included: true },
    { name: 'Community Access', included: false, tooltip: 'Access to investor community' },
    { name: 'SEC Filings Access', included: false, tooltip: 'SEC EDGAR filings and insider trading data' },
    { name: 'Google Maps Integration', included: false, tooltip: 'Paid API feature' },
    { name: 'Lisa AI Assistant', included: false },
  ],
  TRADER: [
    { name: 'Everything in Starter', included: true },
    { name: 'Community Access', included: true, tooltip: 'Access to investor community' },
    { name: 'Google Maps Integration', included: true },
    { name: 'Interactive Charts (Advanced)', included: true },
    { name: 'Lisa AI Assistant (10 msgs/day)', included: true },
    { name: 'SEC Filings Access', included: false, tooltip: 'SEC EDGAR filings and insider trading data' },
  ],
  INVESTOR: [
    { name: 'Everything in Trader', included: true },
    { name: 'SEC Filings Access', included: true, tooltip: 'SEC EDGAR filings and insider trading data' },
    { name: 'Lisa AI Assistant (50 msgs/day)', included: true },
    { name: 'Priority Support', included: true },
  ],
  WHALE: [
    { name: 'Everything in Investor', included: true },
    { name: 'Lisa AI Assistant (Unlimited + Voice)', included: true, tooltip: 'Gemini Powered with voice interaction' },
    { name: 'VIP Priority Support', included: true },
    { name: 'Beta Access', included: true },
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

/**
 * Stripe Product configuration with real product IDs
 * Price IDs should be set via environment variables
 */
export const STRIPE_PRODUCTS: Record<SubscriptionPlan, StripeProduct | null> = {
  STARTER: null, // No Stripe product for free plan
  TRADER: {
    id: 'prod_Tet932v2B53Owv',
    name: 'Omnifolio Trader',
    description: 'Unlimited Imports & Exports, All Analytics, AI Assistant (10 msgs/day)',
    prices: {
      monthly: {
        id: process.env.STRIPE_TRADER_PRICE_ID || 'price_trader_monthly',
        amount: 999, // $9.99 in cents
        currency: 'usd',
      },
    },
  },
  INVESTOR: {
    id: 'prod_TetJXzh000d3eK',
    name: 'Omnifolio Investor',
    description: 'AI Assistant (50 msgs/day), Priority Support, Everything in Trader',
    prices: {
      monthly: {
        id: process.env.STRIPE_INVESTOR_PRICE_ID || 'price_investor_monthly',
        amount: 1999, // $19.99 in cents
        currency: 'usd',
      },
    },
  },
  WHALE: {
    id: 'prod_TetJCuGPxuKNCu',
    name: 'Omnifolio Whale',
    description: 'Unlimited AI, VIP Priority Support, Beta Access',
    prices: {
      monthly: {
        id: process.env.STRIPE_WHALE_PRICE_ID || 'price_whale_monthly',
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
