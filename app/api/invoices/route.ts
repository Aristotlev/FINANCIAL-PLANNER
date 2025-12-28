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

export async function GET(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get user's subscription from Supabase to find stripe_customer_id
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subError) {
        console.error('Error fetching subscription:', subError);
        return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    if (!subscription?.stripe_customer_id) {
      // If no stripe customer ID, return empty list (user might be on free trial or hasn't paid yet)
      return NextResponse.json({ invoices: [] });
    }

    // List invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 100, // Adjust limit as needed
    });

    // Map Stripe invoices to a simpler format for the frontend
    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.number || invoice.id,
      date: new Date(invoice.created * 1000).toISOString(),
      amount: invoice.total / 100, // Stripe amounts are in cents
      status: invoice.status,
      description: invoice.lines.data[0]?.description || 'Subscription',
      pdfUrl: invoice.invoice_pdf,
    }));

    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
