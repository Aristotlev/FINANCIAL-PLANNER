import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get user's subscription from Supabase to find stripe_customer_id
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_URL}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
