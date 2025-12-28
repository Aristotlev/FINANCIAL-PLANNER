import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { protectAuthEndpoint } from "@/lib/security/auth-protection";
import { getClientIP } from "@/lib/security/ip-allowlist";
import { logSecurityEvent } from "@/lib/security/audit-logger";

// This handles all Better Auth routes:
// - /api/auth/sign-in
// - /api/auth/sign-up
// - /api/auth/sign-out
// - /api/auth/callback/google
// - /api/auth/session
// And more...

const { GET: originalGET, POST: originalPOST } = toNextJsHandler(auth);

/**
 * Determine auth endpoint type from URL path
 */
function getEndpointType(pathname: string): 'SIGN_UP' | 'SIGN_IN' | 'PASSWORD_RESET' | 'OAUTH' | null {
  if (pathname.includes('/sign-up')) return 'SIGN_UP';
  if (pathname.includes('/sign-in')) return 'SIGN_IN';
  if (pathname.includes('/forget-password') || pathname.includes('/reset-password')) return 'PASSWORD_RESET';
  if (pathname.includes('/callback/')) return 'OAUTH';
  return null;
}

/**
 * Protected GET handler with rate limiting
 */
export async function GET(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const endpointType = getEndpointType(pathname);
  const ip = getClientIP(request);

  // Apply rate limiting for OAuth callbacks (GET requests)
  if (endpointType === 'OAUTH') {
    const protection = await protectAuthEndpoint(request, 'OAUTH');
    if (!protection.allowed) {
      logSecurityEvent('AUTH_FAILED', `OAuth rate limit: ${ip}`, {
        severity: 'WARN',
        ip,
        metadata: { pathname, error: protection.error },
      });
      return NextResponse.json(
        { error: protection.error },
        { status: protection.statusCode || 429 }
      );
    }
  }

  return originalGET(request);
}

/**
 * Protected POST handler with rate limiting and bot detection
 */
export async function POST(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const endpointType = getEndpointType(pathname);
  const ip = getClientIP(request);

  // Skip protection for certain paths
  // sign-out, session, and social sign-in initiation don't need bot detection
  const skipPaths = ['/sign-out', '/session', '/get-session', '/sign-in/social'];
  if (skipPaths.some(p => pathname.includes(p))) {
    return originalPOST(request);
  }

  // Apply protection for sign-up and sign-in
  if (endpointType) {
    // Clone request to read body for bot detection
    let body: Record<string, any> | undefined;
    
    if (endpointType === 'SIGN_UP') {
      try {
        const clonedRequest = request.clone();
        body = await clonedRequest.json();
      } catch {
        // Body parsing failed, continue without it
      }
    }

    const protection = await protectAuthEndpoint(request, endpointType, body);
    
    if (!protection.allowed) {
      logSecurityEvent('AUTH_FAILED', `Auth protection blocked: ${endpointType} from ${ip}`, {
        severity: 'WARN',
        ip,
        metadata: { 
          pathname, 
          endpointType,
          error: protection.error,
          email: body?.email ? body.email.substring(0, 10) + '...' : undefined,
        },
      });
      
      return NextResponse.json(
        { 
          error: 'auth_blocked',
          message: protection.error,
        },
        { status: protection.statusCode || 403 }
      );
    }

    // Log successful auth attempt for auditing
    logSecurityEvent('API_REQUEST', `Auth attempt: ${endpointType} from ${ip}`, {
      severity: 'INFO',
      ip,
      metadata: { pathname, endpointType },
    });
  }

  return originalPOST(request);
}
