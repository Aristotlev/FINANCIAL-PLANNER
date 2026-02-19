/**
 * OmniFolio Email Service
 *
 * Centralised Resend wrapper for ALL transactional emails.
 * Never use raw Resend calls outside this module.
 *
 * From address strategy:
 *   noreply@omnifolio.app   → automated / system emails
 *   alerts@omnifolio.app    → price alerts & notifications
 *   hello@omnifolio.app     → welcome / marketing
 *
 * For Resend to send from @omnifolio.app you must:
 *  1. Add omnifolio.app as a verified domain in Resend dashboard.
 *  2. Add the required DNS records (SPF, DKIM, DMARC).
 *  3. Set FROM_EMAIL in env (defaults below).
 *
 * ENV VARS:
 *   RESEND_API_KEY   — required in production
 *   FROM_EMAIL       — override the default from address (optional)
 *   APP_URL          — used to build action links (optional, defaults to omnifolio.app)
 */

import { Resend } from 'resend';

// ─── Config ──────────────────────────────────────────────────────────────────

const FROM_NOREPLY = process.env.FROM_EMAIL || 'OmniFolio <noreply@omnifolio.app>';
const FROM_ALERTS  = 'OmniFolio Alerts <alerts@omnifolio.app>';
const FROM_HELLO   = 'OmniFolio <hello@omnifolio.app>';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.omnifolio.app';

// ─── Client ──────────────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set. Add it to your environment variables.');
  }

  _resend = new Resend(apiKey);
  return _resend;
}

// ─── Result type ─────────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

async function safeSend(opts: Parameters<Resend['emails']['send']>[0]): Promise<EmailResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send(opts);
    if (error) {
      console.error('[email-service] Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[email-service] Unexpected error:', err);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}

// ─── Shared template helpers ─────────────────────────────────────────────────

function baseLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OmniFolio</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e5e7eb; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 24px; font-weight: 700; color: #06b6d4; letter-spacing: -0.5px; margin-bottom: 32px; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #f9fafb; margin: 0 0 12px; }
    p { font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 16px; }
    .btn { display: inline-block; padding: 12px 28px; background: #06b6d4; color: #0a0a0f; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; margin: 8px 0 24px; }
    .divider { border: none; border-top: 1px solid #1f2937; margin: 24px 0; }
    .small { font-size: 12px; color: #4b5563; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #374151; }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="wrapper">
    <div class="logo">◈ OmniFolio</div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} OmniFolio · <a href="${APP_URL}/privacy" style="color:#4b5563;">Privacy</a> · <a href="${APP_URL}/unsubscribe" style="color:#4b5563;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string;
}): Promise<EmailResult> {
  const firstName = opts.name?.split(' ')[0] ?? 'there';
  const html = baseLayout(
    `
    <h1>Welcome to OmniFolio 👋</h1>
    <p>Hey ${firstName},</p>
    <p>Your portfolio is now live. Track stocks, crypto, cash, savings, and more — all in one place.</p>
    <a class="btn" href="${APP_URL}/dashboard">Go to your dashboard →</a>
    <hr class="divider" />
    <p class="small">If you didn't create this account, you can safely ignore this email.</p>
    `,
    `Welcome to OmniFolio — your portfolio awaits.`
  );

  return safeSend({
    from: FROM_HELLO,
    to: opts.to,
    subject: 'Welcome to OmniFolio 🚀',
    html,
  });
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(opts: {
  to: string;
  name?: string;
  verificationUrl: string;
}): Promise<EmailResult> {
  const firstName = opts.name?.split(' ')[0] ?? 'there';
  const html = baseLayout(
    `
    <h1>Verify your email</h1>
    <p>Hi ${firstName}, click the button below to verify your email address and complete your OmniFolio account setup.</p>
    <a class="btn" href="${opts.verificationUrl}">Verify email →</a>
    <p>This link expires in <strong>24 hours</strong>.</p>
    <hr class="divider" />
    <p class="small">Or copy this URL into your browser:<br /><span style="word-break:break-all;color:#6b7280;">${opts.verificationUrl}</span></p>
    <p class="small">If you didn't sign up for OmniFolio, you can safely ignore this email.</p>
    `,
    `Verify your OmniFolio email address.`
  );

  return safeSend({
    from: FROM_NOREPLY,
    to: opts.to,
    subject: 'Verify your OmniFolio email',
    html,
  });
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  name?: string;
  resetUrl: string;
}): Promise<EmailResult> {
  const firstName = opts.name?.split(' ')[0] ?? 'there';
  const html = baseLayout(
    `
    <h1>Reset your password</h1>
    <p>Hi ${firstName}, we received a request to reset the password for your OmniFolio account.</p>
    <a class="btn" href="${opts.resetUrl}">Reset password →</a>
    <p>This link expires in <strong>1 hour</strong>.</p>
    <hr class="divider" />
    <p class="small">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
    <p class="small">Or copy this URL:<br /><span style="word-break:break-all;color:#6b7280;">${opts.resetUrl}</span></p>
    `,
    `Reset your OmniFolio password.`
  );

  return safeSend({
    from: FROM_NOREPLY,
    to: opts.to,
    subject: 'Reset your OmniFolio password',
    html,
  });
}

// ─── Price alert triggered ────────────────────────────────────────────────────

export async function sendPriceAlertEmail(opts: {
  to: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  condition: 'above' | 'below';
}): Promise<EmailResult> {
  const direction = opts.condition === 'above' ? '🟢 reached above' : '🔴 dropped below';
  const html = baseLayout(
    `
    <h1>Price alert triggered</h1>
    <p><strong>${opts.symbol}</strong> has ${direction} your target of <strong>$${opts.targetPrice.toLocaleString()}</strong>.</p>
    <div style="background:#1f2937;border-radius:8px;padding:20px;margin:16px 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#9ca3af;font-size:13px;">Current price</span>
        <span style="font-size:20px;font-weight:700;color:#f9fafb;">$${opts.currentPrice.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#9ca3af;font-size:13px;">Your target</span>
        <span style="font-size:16px;color:#06b6d4;">$${opts.targetPrice.toLocaleString()}</span>
      </div>
    </div>
    <a class="btn" href="${APP_URL}/portfolio">View portfolio →</a>
    <hr class="divider" />
    <p class="small">You set this alert in OmniFolio. <a href="${APP_URL}/settings/alerts" style="color:#6b7280;">Manage alerts</a></p>
    `,
    `${opts.symbol} ${direction} $${opts.targetPrice}`
  );

  return safeSend({
    from: FROM_ALERTS,
    to: opts.to,
    subject: `Alert: ${opts.symbol} ${opts.condition === 'above' ? '≥' : '≤'} $${opts.targetPrice}`,
    html,
  });
}

// ─── Alert confirmation (set, not triggered) ──────────────────────────────────

export async function sendAlertConfirmationEmail(opts: {
  to: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
}): Promise<EmailResult> {
  const conditionLabel = opts.condition === 'above'
    ? `reaches or exceeds $${opts.targetPrice.toLocaleString()}`
    : `drops to or below $${opts.targetPrice.toLocaleString()}`;

  const html = baseLayout(
    `
    <h1>Price alert set ✓</h1>
    <p>You'll be notified when <strong>${opts.symbol}</strong> ${conditionLabel}.</p>
    <div style="background:#1f2937;border-radius:8px;padding:20px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#9ca3af;">Asset</p>
      <p style="margin:4px 0 12px;font-size:18px;font-weight:700;color:#f9fafb;">${opts.symbol}</p>
      <p style="margin:0;font-size:13px;color:#9ca3af;">Target price</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#06b6d4;">$${opts.targetPrice.toLocaleString()}</p>
    </div>
    <a class="btn" href="${APP_URL}/portfolio">View portfolio →</a>
    <hr class="divider" />
    <p class="small"><a href="${APP_URL}/settings/alerts" style="color:#6b7280;">Manage your alerts</a></p>
    `,
    `Alert set for ${opts.symbol} at $${opts.targetPrice}`
  );

  return safeSend({
    from: FROM_ALERTS,
    to: opts.to,
    subject: `Alert set: ${opts.symbol} ${opts.condition === 'above' ? '≥' : '≤'} $${opts.targetPrice}`,
    html,
  });
}
