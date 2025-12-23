import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_CONFIG, getPriceIdForPlan } from '@/lib/stripe/config';
import type { SubscriptionPlan } from '@/types/subscription';

// Initialize Stripe only if the secret key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

export async function POST(req: Request) {
  if (!stripe) {
    console.error('Stripe is not configured');
    return NextResponse.json(
      { error: 'Stripe configuration missing' },
      { status: 500 }
    );
  }

  try {
    const { plan, userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans: SubscriptionPlan[] = ['TRADER', 'INVESTOR', 'WHALE'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be TRADER, INVESTOR, or WHALE.' },
        { status: 400 }
      );
    }

    // Get price ID from configuration
    const priceId = getPriceIdForPlan(plan as SubscriptionPlan);
    
    if (!priceId) {
      console.error(`Price ID not configured for plan: ${plan}`);
      return NextResponse.json(
        { error: `Price ID not configured for ${plan} plan. Please create prices in Stripe Dashboard.` },
        { status: 500 }
      );
    }

    // Get product configuration for metadata
    const productConfig = STRIPE_CONFIG[plan as Exclude<SubscriptionPlan, 'STARTER'>];

    // Get the base URL - use NEXT_PUBLIC_APP_URL, fallback to localhost for dev
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // Explicitly enable card payments - Apple Pay and Google Pay work automatically on top of cards
      // when enabled in your Stripe Dashboard settings
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        userId: userId,
        plan: plan,
        productId: productConfig.productId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan,
        },
      },
      success_url: `${baseUrl}/billing?success=true&plan=${plan}`,
      cancel_url: `${baseUrl}/billing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
