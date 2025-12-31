/**
 * Rate Limiting for Serverless
 * 
 * A memory-efficient rate limiter designed for serverless environments.
 * Uses in-memory storage with automatic cleanup (no external dependencies).
 * 
 * For production at scale, consider:
 * - Upstash Redis (@upstash/ratelimit)
 * - Cloudflare Workers KV
 * - Vercel Edge Config
 * 
 * This implementation is suitable for:
 * - Low to medium traffic
 * - Single-region deployments
 * - Development and testing
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number;
  /** Time window in seconds */
  windowSec: number;
  /** Optional identifier for the limit (for logging) */
  name?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Seconds until the limit resets */
  resetInSec: number;
  /** Total limit for the window */
  limit: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

// Store rate limit data in memory
// Key format: "{limiter-name}:{identifier}"
const store = new Map<string, RateLimitEntry>();

// Cleanup interval (every 60 seconds)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 60_000);
  
  // Don't prevent Node.js from exiting
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
}

// Start cleanup on module load
if (typeof window === 'undefined') {
  startCleanup();
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Create a rate limiter with the given configuration.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { max, windowSec, name = 'default' } = config;
  const windowMs = windowSec * 1000;

  return {
    /**
     * Check if a request is allowed for the given identifier.
     * @param identifier - Unique identifier (e.g., user ID, IP address)
     */
    check(identifier: string): RateLimitResult {
      const key = `${name}:${identifier}`;
      const now = Date.now();
      const entry = store.get(key);

      // Window expired or no entry - start fresh
      if (!entry || entry.resetAt < now) {
        store.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });
        return {
          allowed: true,
          remaining: max - 1,
          resetInSec: windowSec,
          limit: max,
        };
      }

      // Within window - check and increment
      if (entry.count < max) {
        entry.count++;
        return {
          allowed: true,
          remaining: max - entry.count,
          resetInSec: Math.ceil((entry.resetAt - now) / 1000),
          limit: max,
        };
      }

      // Rate limited
      return {
        allowed: false,
        remaining: 0,
        resetInSec: Math.ceil((entry.resetAt - now) / 1000),
        limit: max,
      };
    },

    /**
     * Reset the rate limit for a specific identifier.
     */
    reset(identifier: string): void {
      const key = `${name}:${identifier}`;
      store.delete(key);
    },

    /**
     * Get current status without incrementing.
     */
    status(identifier: string): RateLimitResult {
      const key = `${name}:${identifier}`;
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        return {
          allowed: true,
          remaining: max,
          resetInSec: 0,
          limit: max,
        };
      }

      return {
        allowed: entry.count < max,
        remaining: Math.max(0, max - entry.count),
        resetInSec: Math.ceil((entry.resetAt - now) / 1000),
        limit: max,
      };
    },
  };
}

// ============================================================================
// PRE-CONFIGURED LIMITERS
// ============================================================================

/**
 * Rate limiter for sync operations.
 * 60 requests per minute per user - generous for normal use,
 * but prevents infinite loops or buggy clients.
 */
export const syncLimiter = createRateLimiter({
  name: 'sync',
  max: 60,
  windowSec: 60,
});

/**
 * Rate limiter for authentication attempts.
 * 10 attempts per 5 minutes per IP - prevents brute force.
 */
export const authLimiter = createRateLimiter({
  name: 'auth',
  max: 10,
  windowSec: 300,
});

/**
 * Rate limiter for password reset/OTP.
 * 3 attempts per hour per email - very strict.
 */
export const passwordResetLimiter = createRateLimiter({
  name: 'password-reset',
  max: 3,
  windowSec: 3600,
});

/**
 * Rate limiter for API calls (general).
 * 100 requests per minute per user.
 */
export const apiLimiter = createRateLimiter({
  name: 'api',
  max: 100,
  windowSec: 60,
});

/**
 * Rate limiter for expensive operations (AI, exports, etc.).
 * 10 requests per minute per user.
 */
export const expensiveLimiter = createRateLimiter({
  name: 'expensive',
  max: 10,
  windowSec: 60,
});

// ============================================================================
// NEXT.JS MIDDLEWARE HELPER
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Add rate limit headers to a response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): void {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetInSec));
}

/**
 * Create a rate limit error response.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${result.resetInSec} seconds.`,
      retryAfter: result.resetInSec,
    },
    { status: 429 }
  );
  
  addRateLimitHeaders(response, result);
  response.headers.set('Retry-After', String(result.resetInSec));
  
  return response;
}

/**
 * Get the client identifier from a request.
 * Uses user ID if authenticated, falls back to IP.
 */
export function getClientIdentifier(
  request: NextRequest,
  userId?: string | null
): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }
  
  // Fallback for local development
  return 'ip:127.0.0.1';
}

// ============================================================================
// TELEMETRY COUNTERS (Simple, No Sensitive Data)
// ============================================================================

interface TelemetryCounters {
  requests: number;
  rateLimited: number;
  errors: number;
  syncPushes: number;
  syncPulls: number;
  authAttempts: number;
  authSuccesses: number;
}

const telemetry: TelemetryCounters = {
  requests: 0,
  rateLimited: 0,
  errors: 0,
  syncPushes: 0,
  syncPulls: 0,
  authAttempts: 0,
  authSuccesses: 0,
};

let lastReset = Date.now();

/**
 * Increment a telemetry counter.
 */
export function incrementCounter(counter: keyof TelemetryCounters): void {
  telemetry[counter]++;
}

/**
 * Get current telemetry counters.
 */
export function getTelemetry(): TelemetryCounters & { uptimeSec: number } {
  return {
    ...telemetry,
    uptimeSec: Math.floor((Date.now() - lastReset) / 1000),
  };
}

/**
 * Reset telemetry counters.
 */
export function resetTelemetry(): void {
  telemetry.requests = 0;
  telemetry.rateLimited = 0;
  telemetry.errors = 0;
  telemetry.syncPushes = 0;
  telemetry.syncPulls = 0;
  telemetry.authAttempts = 0;
  telemetry.authSuccesses = 0;
  lastReset = Date.now();
}
