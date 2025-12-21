import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { plan, userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    let priceId;
    let mode: Stripe.Checkout.SessionCreateParams.Mode = 'subscription';

    switch (plan) {
      case 'BASIC':
        priceId = process.env.STRIPE_BASIC_PRICE_ID;
        break;
      case 'PRO':
        priceId = process.env.STRIPE_PRO_PRICE_ID;
        break;
      case 'UNLIMITED':
        priceId = process.env.STRIPE_UNLIMITED_PRICE_ID;
        break;
      case 'LIFETIME':
        priceId = process.env.STRIPE_LIFETIME_PRICE_ID;
        mode = 'payment'; // Lifetime is a one-time payment
        break;
      default:
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this plan' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: mode,
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
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/billing?canceled=true`,
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
