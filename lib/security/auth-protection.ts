import { NextRequest, NextResponse } from "next/server";
import { rateLimit, RateLimitConfigs } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit-logger";
import { getClientIP } from "@/lib/security/ip-allowlist";

export interface AuthProtectionResult {
  allowed: boolean;
  error?: string;
  statusCode?: number;
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
  
  // Rate limit check
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
