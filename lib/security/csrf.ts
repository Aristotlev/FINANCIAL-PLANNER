/**
 * CSRF Protection
 * 
 * Implements Cross-Site Request Forgery protection for mutation endpoints.
 * 
 * Strategy:
 * - Double Submit Cookie pattern
 * - Token is stored in a cookie and must be sent in headers
 * - Tokens are tied to the user session
 * - Uses Redis for distributed token storage (falls back to in-memory)
 * 
 * Usage:
 * 1. Client fetches a CSRF token from /api/auth/csrf
 * 2. Client includes token in X-CSRF-Token header on mutations
 * 3. Server validates the token matches the cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  isRedisConfigured, 
  redisGet, 
  redisSet, 
  redisDel, 
  RedisKeys, 
  RedisCsrfData,
  getRedis
} from './redis';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

// In-memory token storage with expiry (fallback for development)
const tokenStore = new Map<string, { userId: string; expiresAt: number }>();
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour in seconds

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
 * Uses Redis in production for distributed storage
 */
export async function createCsrfTokenAsync(userId: string): Promise<string> {
  const token = generateToken();
  
  if (isRedisConfigured()) {
    // Store in Redis with TTL
    const data: RedisCsrfData = {
      userId,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    };
    await redisSet(RedisKeys.csrfToken(token), data, TOKEN_TTL_SECONDS);
    
    // Also track user's tokens for bulk invalidation
    const redis = getRedis();
    if (redis) {
      await redis.sadd(RedisKeys.userCsrfTokens(userId), token);
      await redis.expire(RedisKeys.userCsrfTokens(userId), TOKEN_TTL_SECONDS);
    }
  } else {
    // Fallback to in-memory
    tokenStore.set(token, {
      userId,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });
  }

  return token;
}

/**
 * Create a new CSRF token for a user (sync version - in-memory only)
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
 * Validate a CSRF token (async - checks Redis first)
 */
export async function validateCsrfTokenAsync(token: string, userId: string): Promise<boolean> {
  if (isRedisConfigured()) {
    const stored = await redisGet<RedisCsrfData>(RedisKeys.csrfToken(token));
    
    if (!stored) {
      return false;
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      await redisDel(RedisKeys.csrfToken(token));
      return false;
    }

    // Check if user matches
    if (stored.userId !== userId) {
      return false;
    }

    return true;
  }

  // Fallback to in-memory
  return validateCsrfToken(token, userId);
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

  // CSRF is ENABLED by default in production
  // Set ENFORCE_CSRF=false to disable (not recommended)

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
    // Use async validation if Redis is configured
    if (isRedisConfigured()) {
      const csrfCheck = await validateCsrfAsync(context.request, context.user.id);
      if (!csrfCheck.valid && csrfCheck.error) {
        return csrfCheck.error;
      }
    } else {
      const csrfCheck = validateCsrf(context.request, context.user.id);
      if (!csrfCheck.valid && csrfCheck.error) {
        return csrfCheck.error;
      }
    }

    return handler(context);
  };
}

/**
 * Async CSRF validation middleware (uses Redis when available)
 */
export async function validateCsrfAsync(
  request: NextRequest,
  userId: string
): Promise<{ valid: boolean; error?: NextResponse }> {
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

  // Validate token (async for Redis)
  const isValid = await validateCsrfTokenAsync(headerToken, userId);
  if (!isValid) {
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
 * Invalidate a CSRF token (use after sensitive operations)
 */
export async function invalidateCsrfTokenAsync(token: string): Promise<void> {
  if (isRedisConfigured()) {
    await redisDel(RedisKeys.csrfToken(token));
  }
  tokenStore.delete(token);
}

/**
 * Invalidate a CSRF token (sync - in-memory only)
 */
export function invalidateCsrfToken(token: string): void {
  tokenStore.delete(token);
}

/**
 * Invalidate all tokens for a user (use on logout)
 */
export async function invalidateUserTokensAsync(userId: string): Promise<void> {
  // Remove from Redis
  if (isRedisConfigured()) {
    const redis = getRedis();
    if (redis) {
      // Get all user's tokens
      const tokens = await redis.smembers(RedisKeys.userCsrfTokens(userId));
      
      // Delete each token
      for (const token of tokens) {
        await redisDel(RedisKeys.csrfToken(token));
      }
      
      // Delete the user's token set
      await redis.del(RedisKeys.userCsrfTokens(userId));
    }
  }

  // Also remove from in-memory
  invalidateUserTokens(userId);
}

/**
 * Invalidate all tokens for a user (sync - in-memory only)
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
