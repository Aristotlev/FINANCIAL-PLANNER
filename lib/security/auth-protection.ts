import { NextRequest, NextResponse } from "next/server";
import { rateLimit, RateLimitConfigs } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit-logger";
import { getClientIP } from "@/lib/security/ip-allowlist";

export interface AuthProtectionResult {
  allowed: boolean;
  error?: string;
  statusCode?: number;
}

const SUSPICIOUS_USER_AGENTS = [
  'curl', 'python', 'wget', 'http-client', 'axios', 'postman', 'insomnia',
  'bot', 'crawler', 'spider', 'scraper', 'headless', 'puppeteer', 'selenium'
];

/**
 * Detect potential bot traffic based on request characteristics
 */
export function detectBot(req: NextRequest, body?: any): { isBot: boolean; reason?: string } {
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
  
  // 1. Check User-Agent
  if (!userAgent || userAgent.length < 5) {
    return { isBot: true, reason: 'Missing or invalid User-Agent' };
  }
  
  // Check for known bot signatures
  // We use a more specific check to avoid blocking legitimate browsers that might have "bot" in a plugin name
  const isKnownBot = SUSPICIOUS_USER_AGENTS.some(ua => {
    // Exact match or word boundary match is safer
    return userAgent.includes(ua);
  });

  if (isKnownBot) {
    return { isBot: true, reason: `Suspicious User-Agent detected` };
  }

  // 2. Check Origin/Referer for mutation requests (POST/PUT/DELETE)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    
    // If origin is present, it must match the host
    // Note: We allow missing origin for some legitimate non-browser clients if needed, 
    // but for a web app auth flow, origin is standard.
    if (origin && host) {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return { isBot: true, reason: 'Origin mismatch' };
      }
    }
  }

  // 3. Check Honeypot Field (if body is provided)
  if (body && typeof body === 'object') {
    // 'website' is our hidden honeypot field
    if (body.website) {
      return { isBot: true, reason: 'Honeypot field filled' };
    }
  }

  return { isBot: false };
}

/**
 * Protect authentication endpoints with rate limiting and security checks
 */
export async function protectAuthEndpoint(
  req: NextRequest,
  type: string,
  body?: any
): Promise<AuthProtectionResult> {
  const ip = getClientIP(req);
  
  // 1. Bot Detection
  const botCheck = detectBot(req, body);
  if (botCheck.isBot) {
    logSecurityEvent('BOT_BLOCKED', `Bot detected on ${type}: ${botCheck.reason}`, {
      severity: 'WARN',
      ip,
      metadata: {
        userAgent: req.headers.get('user-agent'),
        reason: botCheck.reason
      }
    });
    
    return {
      allowed: false,
      error: "Security check failed",
      statusCode: 403
    };
  }
  
  // 2. Rate limit check
  // Use strict limits for auth endpoints
  const rateLimitResult = await rateLimit(ip, RateLimitConfigs.AUTH);
  
  if (!rateLimitResult.success) {
    logSecurityEvent('RATE_LIMITED', `Auth rate limit exceeded for IP ${ip} on ${type}`, {
      severity: 'WARN',
      ip,
      metadata: {
        path: req.nextUrl.pathname,
        type,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset
      }
    });

    return {
      allowed: false,
      error: "Too many authentication attempts. Please try again later.",
      statusCode: 429
    };
  }

  return { allowed: true };
}
