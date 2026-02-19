import { NextResponse } from 'next/server';
import { sendAlertConfirmationEmail } from '@/lib/email/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, targetPrice, condition, userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'userEmail is required to set an alert' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const result = await sendAlertConfirmationEmail({
      to: userEmail,
      symbol,
      targetPrice: Number(targetPrice),
      condition,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
