import { NextResponse } from 'next/server';
import { isStripeConfigured, STRIPE_CONFIG, getPriceIdForPlan } from '@/lib/stripe/config';

/**
 * Debug endpoint to check Stripe configuration
 * Access at: /api/debug/stripe-config
 * 
 * This doesn't expose any secret values, just checks if they're set
 */
export async function GET() {
  const config = {
    stripeConfigured: isStripeConfigured(),
    secretKeySet: !!process.env.STRIPE_SECRET_KEY,
    publishableKeySet: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'NOT SET',
    plans: {
      TRADER: {
        priceId: getPriceIdForPlan('TRADER'),
        productIds: STRIPE_CONFIG.TRADER.productIds,
      },
      INVESTOR: {
        priceId: getPriceIdForPlan('INVESTOR'),
        productIds: STRIPE_CONFIG.INVESTOR.productIds,
      },
      WHALE: {
        priceId: getPriceIdForPlan('WHALE'),
        productIds: STRIPE_CONFIG.WHALE.productIds,
      },
    },
    environment: process.env.NODE_ENV,
  };

  return NextResponse.json(config);
}
