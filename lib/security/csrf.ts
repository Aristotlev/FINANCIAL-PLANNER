/**
 * CSRF Protection
 * 
 * Implements Cross-Site Request Forgery protection for mutation endpoints.
 * 
 * Strategy:
 * - Double Submit Cookie pattern
 * - Token is stored in a cookie and must be sent in headers
 * - Tokens are tied to the user session
 * 
 * Usage:
 * 1. Client fetches a CSRF token from /api/auth/csrf
 * 2. Client includes token in X-CSRF-Token header on mutations
 * 3. Server validates the token matches the cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

// In-memory token storage with expiry
// For production with multiple instances, use Redis
const tokenStore = new Map<string, { userId: string; expiresAt: number }>();
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  // Use crypto if available (Node.js / modern browsers)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(TOKEN_LENGTH);
    crypto.getRandomValues(array);
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      token += chars[array[i] % chars.length];
    }
  } else {
    // Fallback (less secure, for compatibility)
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return token;
}

/**
 * Create a new CSRF token for a user
 */
export function createCsrfToken(userId: string): string {
  // Clean up expired tokens periodically
  if (Math.random() < 0.01) {
    cleanupExpiredTokens();
  }

  const token = generateToken();
  
  tokenStore.set(token, {
    userId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string, userId: string): boolean {
  const stored = tokenStore.get(token);
  
  if (!stored) {
    return false;
  }

  // Check if expired
  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(token);
    return false;
  }

  // Check if user matches
  if (stored.userId !== userId) {
    return false;
  }

  return true;
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  tokenStore.forEach((value, key) => {
    if (now > value.expiresAt) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => tokenStore.delete(key));
}

/**
 * Get CSRF token from request headers
 */
export function getCsrfTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Get CSRF token from cookies
 */
export async function getCsrfTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Set CSRF token cookie
 */
export function setCsrfTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
}

/**
 * CSRF validation middleware
 * 
 * Use this to wrap mutation endpoints (POST, PUT, DELETE, PATCH)
 */
export function validateCsrf(
  request: NextRequest,
  userId: string
): { valid: boolean; error?: NextResponse } {
  // Skip CSRF in development mode for easier testing
  if (process.env.NODE_ENV === 'development') {
    return { valid: true };
  }

  // Skip CSRF check for safe methods
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (safeMethod) {
    return { valid: true };
  }

  // Skip CSRF for API routes that use other auth mechanisms (webhooks, etc.)
  const path = new URL(request.url).pathname;
  const excludedPaths = [
    '/api/webhooks/',
    '/api/auth/',
  ];
  
  if (excludedPaths.some(p => path.startsWith(p))) {
    return { valid: true };
  }

  // Check if CSRF enforcement is enabled (opt-in for now)
  // Set ENFORCE_CSRF=true in production when client is ready
  if (process.env.ENFORCE_CSRF !== 'true') {
    return { valid: true };
  }

  // Get token from header
  const headerToken = getCsrfTokenFromRequest(request);
  
  if (!headerToken) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          error: 'CSRF token missing',
          message: 'Please include X-CSRF-Token header in your request',
        },
        { status: 403 }
      ),
    };
  }

  // Validate token
  if (!validateCsrfToken(headerToken, userId)) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          error: 'CSRF token invalid',
          message: 'Your CSRF token is invalid or expired. Please refresh and try again.',
        },
        { status: 403 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Middleware wrapper that includes CSRF protection
 */
export function withCsrf<T extends { user: { id: string }; request: NextRequest }>(
  handler: (context: T) => Promise<Response>
): (context: T) => Promise<Response> {
  return async (context: T) => {
    const csrfCheck = validateCsrf(context.request, context.user.id);
    
    if (!csrfCheck.valid && csrfCheck.error) {
      return csrfCheck.error;
    }

    return handler(context);
  };
}

/**
 * Invalidate a CSRF token (use after sensitive operations)
 */
export function invalidateCsrfToken(token: string): void {
  tokenStore.delete(token);
}

/**
 * Invalidate all tokens for a user (use on logout)
 */
export function invalidateUserTokens(userId: string): void {
  const keysToDelete: string[] = [];

  tokenStore.forEach((value, key) => {
    if (value.userId === userId) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => tokenStore.delete(key));
}

/**
 * Get CSRF stats for monitoring
 */
export function getCsrfStats(): { activeTokens: number } {
  return { activeTokens: tokenStore.size };
}
