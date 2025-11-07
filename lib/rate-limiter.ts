import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate Limiter Implementation
 * Prevents API abuse by limiting requests per client
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Configuration
export interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Block duration after exceeding limit (in ms) */
  blockDuration?: number;
  /** Custom identifier function */
  identifier?: (request: NextRequest) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (request: NextRequest) => boolean;
}

/**
 * Get client identifier from request
 * Priority: Authenticated user ID > IP address
 */
function getDefaultIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header/cookie (if authenticated)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In production, decode and validate JWT to get user ID
    return `user:${authHeader.substring(7, 20)}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Combine IP + User Agent hash for better uniqueness
  return `ip:${ip}:${hashString(userAgent)}`;
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Rate limit middleware
 * Returns { success: boolean, remaining: number, retryAfter?: number }
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 60, windowMs: 60000 }
): {
  success: boolean;
  remaining: number;
  retryAfter?: number;
  headers: Record<string, string>;
} {
  // Check if we should skip rate limiting
  if (config.skip && config.skip(request)) {
    return {
      success: true,
      remaining: config.limit,
      headers: {},
    };
  }

  // Get client identifier
  const identifier = config.identifier 
    ? config.identifier(request)
    : getDefaultIdentifier(request);

  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  // Clean up old records periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupOldRecords();
  }

  // Check if client is blocked
  if (record?.blocked && record.blockUntil && now < record.blockUntil) {
    const retryAfter = Math.ceil((record.blockUntil - now) / 1000);
    return {
      success: false,
      remaining: 0,
      retryAfter,
      headers: {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.blockUntil).toISOString(),
        'Retry-After': retryAfter.toString(),
      },
    };
  }

  // Reset or create new record
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false,
    };
    rateLimitStore.set(identifier, record);

    return {
      success: true,
      remaining: config.limit - 1,
      headers: {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': (config.limit - 1).toString(),
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
      },
    };
  }

  // Increment counter
  record.count++;

  // Check if limit exceeded
  if (record.count > config.limit) {
    // Block the client
    if (config.blockDuration) {
      record.blocked = true;
      record.blockUntil = now + config.blockDuration;
    }

    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      retryAfter,
      headers: {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        'Retry-After': retryAfter.toString(),
      },
    };
  }

  return {
    success: true,
    remaining: config.limit - record.count,
    headers: {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': (config.limit - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
    },
  };
}

/**
 * Clean up expired records from the store
 */
function cleanupOldRecords() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime && (!record.blockUntil || now > record.blockUntil)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Middleware wrapper for API routes
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const limiter = withRateLimit(request, { limit: 10, windowMs: 60000 });
 *   if (!limiter.success) {
 *     return limiter.response;
 *   }
 *   // Your API logic here
 * }
 * ```
 */
export function withRateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): {
  success: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
} {
  const result = rateLimit(request, config);

  if (!result.success) {
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      },
      { status: 429 }
    );

    // Add rate limit headers
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return {
      success: false,
      response,
      headers: result.headers,
    };
  }

  return {
    success: true,
    headers: result.headers,
  };
}

/**
 * Preset configurations for common use cases
 */
export const RateLimitPresets = {
  /** Strict: 10 requests per minute */
  STRICT: { limit: 10, windowMs: 60000, blockDuration: 300000 }, // 5 min block
  
  /** Standard: 60 requests per minute */
  STANDARD: { limit: 60, windowMs: 60000, blockDuration: 60000 }, // 1 min block
  
  /** Generous: 120 requests per minute */
  GENEROUS: { limit: 120, windowMs: 60000 },
  
  /** AI API: 30 requests per hour (expensive operations) */
  AI_API: { limit: 30, windowMs: 3600000, blockDuration: 600000 }, // 10 min block
  
  /** Public API: 1000 requests per hour */
  PUBLIC: { limit: 1000, windowMs: 3600000 },
  
  /** Auth endpoints: 5 attempts per 15 minutes */
  AUTH: { limit: 5, windowMs: 900000, blockDuration: 1800000 }, // 30 min block
};

/**
 * Get rate limit statistics for monitoring
 */
export function getRateLimitStats() {
  let blockedCount = 0;
  let totalRequests = 0;
  
  rateLimitStore.forEach((record) => {
    if (record.blocked) blockedCount++;
    totalRequests += record.count;
  });
  
  return {
    totalClients: rateLimitStore.size,
    blockedClients: blockedCount,
    activeRequests: totalRequests,
  };
}

/**
 * Clear all rate limit records (use with caution)
 */
export function clearRateLimitStore() {
  rateLimitStore.clear();
}

/**
 * Block a specific identifier
 */
export function blockIdentifier(identifier: string, durationMs: number = 3600000) {
  rateLimitStore.set(identifier, {
    count: 999999,
    resetTime: Date.now() + durationMs,
    blocked: true,
    blockUntil: Date.now() + durationMs,
  });
}

/**
 * Unblock a specific identifier
 */
export function unblockIdentifier(identifier: string) {
  rateLimitStore.delete(identifier);
}
