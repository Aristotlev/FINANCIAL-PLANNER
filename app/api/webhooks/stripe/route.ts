import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getPlanFromPriceId } from '@/lib/stripe/config';

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

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          // Update user subscription
          const { error } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan: plan,
              status: 'ACTIVE',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_start_date: new Date().toISOString(),
              trial_used: true, // Mark trial as used when subscribing
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });

          if (error) {
            console.error('Error updating subscription in Supabase:', error);
            throw error;
          }
          console.log(`✅ Subscription updated: User ${userId} -> Plan ${plan}`);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        // Get the price ID from the subscription items
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : null;
        
        if (userId) {
          const updateData: Record<string, any> = {
            status: subscription.status === 'active' ? 'ACTIVE' : 
                    subscription.status === 'canceled' ? 'CANCELLED' : 
                    subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          };
          
          if (plan) {
            updateData.plan = plan;
          }
          
          // Use type assertion to access current_period_end
          const subData = subscription as any;
          if (subData.current_period_end) {
            updateData.subscription_end_date = new Date(subData.current_period_end * 1000).toISOString();
          }

          const { error } = await supabaseAdmin
            .from('user_subscriptions')
            .update(updateData)
            .eq('stripe_subscription_id', subscription.id);

          if (error) {
            console.error('Error updating subscription:', error);
          } else {
            console.log(`✅ Subscription updated: ${subscription.id}`);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by stripe_subscription_id and cancel
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: 'CANCELLED',
            plan: 'STARTER', // Downgrade to free plan
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error cancelling subscription in Supabase:', error);
          throw error;
        }
        console.log(`✅ Subscription cancelled: ${subscription.id}`);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Use type assertion to access subscription property
        const invoiceData = invoice as any;
        const subscriptionId = invoiceData.subscription as string;
        
        if (subscriptionId) {
          // Extend subscription period on successful payment
          const { error } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: 'ACTIVE',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription after payment:', error);
          } else {
            console.log(`✅ Payment succeeded for subscription: ${subscriptionId}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Use type assertion to access subscription property
        const invoiceData = invoice as any;
        const subscriptionId = invoiceData.subscription as string;
        
        if (subscriptionId) {
          // Mark subscription as past due
          const { error } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: 'EXPIRED',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription after failed payment:', error);
          } else {
            console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
