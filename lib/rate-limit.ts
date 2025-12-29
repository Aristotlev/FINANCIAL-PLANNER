/**
 * Simple in-memory rate limiter for API routes
 * Protects against API abuse and excessive usage
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Clean up expired entries from the store
 */
function cleanup() {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}

// Run cleanup every minute
setInterval(cleanup, 60000);

/**
 * Rate limit a request based on a unique identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object with success status and retry information
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  }
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const now = Date.now();
  const key = `${identifier}`;

  // Initialize or get existing rate limit data
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 0,
      resetTime: now + config.interval,
    };
  }

  const data = store[key];
  const isAllowed = data.count < config.uniqueTokenPerInterval;

  if (isAllowed) {
    data.count++;
  }

  return {
    success: isAllowed,
    limit: config.uniqueTokenPerInterval,
    remaining: Math.max(0, config.uniqueTokenPerInterval - data.count),
    reset: data.resetTime,
  };
}

/**
 * Get rate limit status without incrementing counter
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig = {
    interval: 60000,
    uniqueTokenPerInterval: 10,
  }
): {
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const key = `${identifier}`;

  if (!store[key] || store[key].resetTime < now) {
    return {
      limit: config.uniqueTokenPerInterval,
      remaining: config.uniqueTokenPerInterval,
      reset: now + config.interval,
    };
  }

  const data = store[key];
  return {
    limit: config.uniqueTokenPerInterval,
    remaining: Math.max(0, config.uniqueTokenPerInterval - data.count),
    reset: data.resetTime,
  };
}

/**
 * Create a rate limiter middleware for Next.js API routes
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const fullConfig: RateLimitConfig = {
    interval: config?.interval || 60000, // 1 minute default
    uniqueTokenPerInterval: config?.uniqueTokenPerInterval || 10, // 10 requests/min default
  };

  return async (identifier: string) => {
    return rateLimit(identifier, fullConfig);
  };
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(headers: Headers): string {
  // Try various headers that might contain the real IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default if no IP found (e.g., localhost)
  return 'unknown';
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // Strict limits for expensive AI operations
  AI_STRICT: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  },
  
  // Moderate limits for regular AI operations
  AI_MODERATE: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 30, // 30 requests per minute
  },
  
  // Lenient limits for lightweight operations
  AI_LENIENT: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 60, // 60 requests per minute
  },
  
  // Per-hour limits for daily quotas
  HOURLY: {
    interval: 3600000, // 1 hour
    uniqueTokenPerInterval: 100, // 100 requests per hour
  },
  
  // Strict for authentication endpoints
  AUTH: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 attempts per minute
  },
};
