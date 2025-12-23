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
  productId: string;
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
    productId: process.env.STRIPE_TRADER_PRODUCT_ID || 'prod_Tet932v2B53Owv',
    prices: {
      monthly: process.env.STRIPE_TRADER_PRICE_ID || 'price_1ShZN4E5xZWoLB7alzjybz7e',
    },
    name: 'Omnifolio Trader',
    description: 'Unlimited Imports & Exports, All Analytics, AI Assistant (10 msgs/day)',
    priceMonthlyUsd: 9.99,
  },
  INVESTOR: {
    productId: process.env.STRIPE_INVESTOR_PRODUCT_ID || 'prod_TetJXzh000d3eK',
    prices: {
      monthly: process.env.STRIPE_INVESTOR_PRICE_ID || 'price_1ShZWZE5xZWoLB7afhQ67UIW',
    },
    name: 'Omnifolio Investor',
    description: 'AI Assistant (50 msgs/day), Priority Support, Everything in Trader',
    priceMonthlyUsd: 19.99,
  },
  WHALE: {
    productId: process.env.STRIPE_WHALE_PRODUCT_ID || 'prod_TetJCuGPxuKNCu',
    prices: {
      monthly: process.env.STRIPE_WHALE_PRICE_ID || 'price_1ShZX4E5xZWoLB7aVXbMsKF3',
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
export function getProductIdForPlan(plan: SubscriptionPlan): string | null {
  if (plan === 'STARTER') return null;
  return STRIPE_CONFIG[plan]?.productId || null;
}

/**
 * Get plan from Stripe product ID
 */
export function getPlanFromProductId(productId: string): SubscriptionPlan | null {
  for (const [plan, config] of Object.entries(STRIPE_CONFIG)) {
    if (config.productId === productId) {
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
  'STRIPE_TRADER_PRICE_ID',
  'STRIPE_INVESTOR_PRODUCT_ID',
  'STRIPE_INVESTOR_PRICE_ID',
  'STRIPE_WHALE_PRODUCT_ID',
  'STRIPE_WHALE_PRICE_ID',
] as const;
