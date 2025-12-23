import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors when RESEND_API_KEY is not set
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, targetPrice, condition, userEmail } = body;

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const resendClient = getResendClient();
    if (!resendClient) {
      console.error('Failed to initialize Resend client');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // In a real application, you would save the alert to your database here.
    // For this demo, we'll send a confirmation email immediately.

    const { data, error } = await resendClient.emails.send({
      from: 'Money Hub Alerts <onboarding@resend.dev>', // Use your verified domain in production
      to: userEmail || 'delivered@resend.dev', // Default for testing if no email provided
      subject: `Alert Set: ${symbol} ${condition === 'above' ? '≥' : '≤'} $${targetPrice}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Price Alert Set Successfully</h1>
          <p>You will be notified when <strong>${symbol}</strong> reaches <strong>$${targetPrice}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Asset</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold;">${symbol}</p>
            
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Target Price</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">$${targetPrice}</p>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated message from Money Hub.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
