/**
 * Advanced Rate Limiter with Multiple Strategies
 * 
 * Features:
 * - In-memory rate limiting (for single instance)
 * - User-based and IP-based limiting
 * - Tiered limits based on subscription
 * - Automatic cleanup of stale entries
 * 
 * For distributed systems, integrate with Upstash Redis or similar
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

// In-memory store
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup interval (run every 60 seconds)
let cleanupInterval: NodeJS.Timeout | null = null;

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
  /** Response message when rate limited */
  message?: string;
}

/**
 * Get client identifier from request
 * Priority: User ID (from header/cookie) > IP address
 */
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  // If we have a user ID, use it
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfIp || (forwarded ? forwarded.split(',')[0].trim() : realIp) || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Start cleanup interval if not already running
 */
function ensureCleanupInterval() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      rateLimitStore.forEach((record, key) => {
        if (now > record.resetTime && (!record.blockUntil || now > record.blockUntil)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => rateLimitStore.delete(key));
    }, 60000);
  }
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  success: boolean;
  remaining: number;
  retryAfter?: number;
  headers: Record<string, string>;
} {
  ensureCleanupInterval();

  const now = Date.now();
  let record = rateLimitStore.get(identifier);

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
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): {
  success: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
} {
  // Check if we should skip
  if (config.skip && config.skip(request)) {
    return { success: true, headers: {} };
  }

  const identifier = config.identifier 
    ? config.identifier(request) 
    : getClientIdentifier(request, userId);
    
  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: config.message || `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
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
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /** API Data: 100 requests per minute per user */
  API_DATA: { 
    limit: 100, 
    windowMs: 60000, 
    blockDuration: 60000,
    message: 'API rate limit exceeded. Please slow down your requests.',
  },
  
  /** AI API: 30 requests per minute (expensive operations) */
  AI_API: { 
    limit: 30, 
    windowMs: 60000, 
    blockDuration: 120000,
    message: 'AI service rate limit exceeded. Please wait before making more AI requests.',
  },

  /** Strict: 10 requests per minute */
  STRICT: { 
    limit: 10, 
    windowMs: 60000, 
    blockDuration: 300000,
    message: 'Rate limit exceeded. You have been temporarily blocked.',
  },

  /** Auth endpoints: 5 attempts per 15 minutes */
  AUTH: { 
    limit: 5, 
    windowMs: 900000, 
    blockDuration: 1800000,
    message: 'Too many authentication attempts. Please wait 30 minutes.',
  },

  /** Webhooks: 1000 requests per minute (from trusted sources) */
  WEBHOOK: { 
    limit: 1000, 
    windowMs: 60000,
    message: 'Webhook rate limit exceeded.',
  },

  /** Public read: 200 requests per minute */
  PUBLIC_READ: { 
    limit: 200, 
    windowMs: 60000,
    message: 'Rate limit exceeded. Please try again later.',
  },
};

/**
 * Get subscription-based rate limit multiplier
 */
export function getSubscriptionMultiplier(plan: string): number {
  switch (plan) {
    case 'WHALE':
      return 10; // 10x limits
    case 'INVESTOR':
      return 5;  // 5x limits
    case 'TRADER':
      return 2;  // 2x limits
    default:
      return 1;  // Standard limits
  }
}

/**
 * Apply subscription multiplier to rate limit config
 */
export function getSubscriptionRateLimit(
  baseConfig: RateLimitConfig,
  plan: string
): RateLimitConfig {
  const multiplier = getSubscriptionMultiplier(plan);
  return {
    ...baseConfig,
    limit: baseConfig.limit * multiplier,
  };
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalClients: number;
  blockedClients: number;
} {
  let blockedCount = 0;

  rateLimitStore.forEach((record) => {
    if (record.blocked) blockedCount++;
  });

  return {
    totalClients: rateLimitStore.size,
    blockedClients: blockedCount,
  };
}

/**
 * Manually block an identifier
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
 * Manually unblock an identifier
 */
export function unblockIdentifier(identifier: string) {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limit records
 */
export function clearRateLimitStore() {
  rateLimitStore.clear();
}
