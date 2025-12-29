/**
 * Stripe Configuration
 * Centralized Stripe product and price configuration
 */

import Stripe from 'stripe';
import type { SubscriptionPlan } from '@/types/subscription';

// ==================== STRIPE CLIENT ====================

export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY is not configured');
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// ==================== PRODUCT CONFIGURATION ====================

export interface StripePriceConfig {
  monthly: string;
  yearly?: string;
}

export interface StripeProductConfig {
  productIds: {
    monthly: string;
    yearly?: string;
  };
  prices: StripePriceConfig;
  name: string;
  description: string;
  priceMonthlyUsd: number;
}

/**
 * Stripe Product IDs and Price configurations
 * Using environment variables for all IDs
 * 
 * Pricing Strategy:
 * - TRADER ($9.99): Saves time with imports/exports + 10 AI msgs/day teaser
 * - INVESTOR ($19.99): Power user with 50 AI msgs/day + Priority Support
 * - WHALE ($49.99): Ultimate experience with unlimited AI + VIP Support + Beta Access
 */
export const STRIPE_CONFIG: Record<Exclude<SubscriptionPlan, 'STARTER'>, StripeProductConfig> = {
  TRADER: {
    productIds: {
      monthly: process.env.STRIPE_TRADER_PRODUCT_ID || 'prod_Tet932v2B53Owv',
      yearly: process.env.STRIPE_TRADER_YEARLY_PRODUCT_ID || 'prod_Th8PqpNy6EOoYf',
    },
    prices: {
      monthly: process.env.STRIPE_TRADER_PRICE_ID || 'price_1ShZN4E5xZWoLB7alzjybz7e',
      yearly: process.env.STRIPE_TRADER_YEARLY_PRICE_ID || 'price_1Sjk8TE5xZWoLB7ar1VRQRH4',
    },
    name: 'Omnifolio Trader',
    description: 'Unlimited Imports & Exports, All Analytics, AI Assistant (10 msgs/day)',
    priceMonthlyUsd: 9.99,
  },
  INVESTOR: {
    productIds: {
      monthly: process.env.STRIPE_INVESTOR_PRODUCT_ID || 'prod_TetJXzh000d3eK',
      yearly: process.env.STRIPE_INVESTOR_YEARLY_PRODUCT_ID || 'prod_Th8Pi0rWCQ91TV',
    },
    prices: {
      monthly: process.env.STRIPE_INVESTOR_PRICE_ID || 'price_1ShZWZE5xZWoLB7afhQ67UIW',
      yearly: process.env.STRIPE_INVESTOR_YEARLY_PRICE_ID || 'price_1Sjk8lE5xZWoLB7aEd6rBARS',
    },
    name: 'Omnifolio Investor',
    description: 'AI Assistant (50 msgs/day), Priority Support, Everything in Trader',
    priceMonthlyUsd: 19.99,
  },
  WHALE: {
    productIds: {
      monthly: process.env.STRIPE_WHALE_PRODUCT_ID || 'prod_TetJCuGPxuKNCu',
      yearly: process.env.STRIPE_WHALE_YEARLY_PRODUCT_ID || 'prod_Th8PG36licQ8yQ',
    },
    prices: {
      monthly: process.env.STRIPE_WHALE_PRICE_ID || 'price_1ShZX4E5xZWoLB7aVXbMsKF3',
      yearly: process.env.STRIPE_WHALE_YEARLY_PRICE_ID || 'price_1Sjk93E5xZWoLB7aaQw0f0R3',
    },
    name: 'Omnifolio Whale',
    description: 'Unlimited AI, VIP Priority Support, Beta Access to new features',
    priceMonthlyUsd: 49.99,
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get the price ID for a subscription plan
 */
export function getPriceIdForPlan(plan: SubscriptionPlan, interval: 'monthly' | 'yearly' = 'monthly'): string | null {
  if (plan === 'STARTER') return null;
  
  const config = STRIPE_CONFIG[plan];
  if (!config) return null;
  
  return interval === 'yearly' ? config.prices.yearly || null : config.prices.monthly;
}

/**
 * Get the product ID for a subscription plan
 */
export function getProductIdForPlan(plan: SubscriptionPlan, interval: 'monthly' | 'yearly' = 'monthly'): string | null {
  if (plan === 'STARTER') return null;
  const config = STRIPE_CONFIG[plan];
  if (!config) return null;
  
  if (interval === 'yearly' && config.productIds.yearly) {
    return config.productIds.yearly;
  }
  return config.productIds.monthly;
}

/**
 * Get plan from Stripe product ID
 */
export function getPlanFromProductId(productId: string): SubscriptionPlan | null {
  for (const [plan, config] of Object.entries(STRIPE_CONFIG)) {
    if (config.productIds.monthly === productId || config.productIds.yearly === productId) {
      return plan as SubscriptionPlan;
    }
  }
  return null;
}

/**
 * Get plan from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): SubscriptionPlan | null {
  for (const [plan, config] of Object.entries(STRIPE_CONFIG)) {
    if (config.prices.monthly === priceId || config.prices.yearly === priceId) {
      return plan as SubscriptionPlan;
    }
  }
  return null;
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

/**
 * Get all environment variable names needed for Stripe
 */
export const STRIPE_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_TRADER_PRODUCT_ID',
  'STRIPE_TRADER_YEARLY_PRODUCT_ID',
  'STRIPE_TRADER_PRICE_ID',
  'STRIPE_TRADER_YEARLY_PRICE_ID',
  'STRIPE_INVESTOR_PRODUCT_ID',
  'STRIPE_INVESTOR_YEARLY_PRODUCT_ID',
  'STRIPE_INVESTOR_PRICE_ID',
  'STRIPE_INVESTOR_YEARLY_PRICE_ID',
  'STRIPE_WHALE_PRODUCT_ID',
  'STRIPE_WHALE_YEARLY_PRODUCT_ID',
  'STRIPE_WHALE_PRICE_ID',
  'STRIPE_WHALE_YEARLY_PRICE_ID',
] as const;
