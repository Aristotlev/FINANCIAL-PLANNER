/**
 * Upstash Redis Client
 * 
 * Provides a shared Redis client for distributed rate limiting and CSRF tokens.
 * Uses Upstash Redis which is serverless and works perfectly with Cloud Run.
 * 
 * SETUP:
 * 1. Create a free Upstash Redis database at https://upstash.com
 * 2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment
 * 3. For Cloud Run, add these to Secret Manager
 * 
 * Falls back to in-memory storage if Redis is not configured (dev mode).
 */

import { Redis } from '@upstash/redis';

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get the Redis client (creates one if needed)
 */
export function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redisClient;
}

/**
 * Key prefixes for different uses
 */
export const RedisKeys = {
  /** Rate limit: rate_limit:{identifier} */
  rateLimit: (identifier: string) => `rate_limit:${identifier}`,
  
  /** CSRF token: csrf:{token} */
  csrfToken: (token: string) => `csrf:${token}`,
  
  /** Session: session:{sessionId} */
  session: (sessionId: string) => `session:${sessionId}`,
  
  /** Blocked IP: blocked_ip:{ip} */
  blockedIp: (ip: string) => `blocked_ip:${ip}`,
  
  /** User tokens: user_csrf:{userId} */
  userCsrfTokens: (userId: string) => `user_csrf:${userId}`,
};

/**
 * Rate limit data structure in Redis
 */
export interface RedisRateLimitData {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

/**
 * CSRF token data structure in Redis
 */
export interface RedisCsrfData {
  userId: string;
  expiresAt: number;
}

/**
 * Helper to safely get data from Redis with fallback
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

/**
 * Helper to safely set data in Redis with TTL
 */
export async function redisSet<T>(
  key: string, 
  value: T, 
  ttlSeconds?: number
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('[Redis] Set error:', error);
    return false;
  }
}

/**
 * Helper to delete a key from Redis
 */
export async function redisDel(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[Redis] Del error:', error);
    return false;
  }
}

/**
 * Increment a counter in Redis (for rate limiting)
 */
export async function redisIncr(key: string): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.incr(key);
  } catch (error) {
    console.error('[Redis] Incr error:', error);
    return null;
  }
}

/**
 * Set expiry on a key
 */
export async function redisExpire(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.expire(key, ttlSeconds);
    return true;
  } catch (error) {
    console.error('[Redis] Expire error:', error);
    return false;
  }
}

/**
 * Check if Redis is healthy
 */
export async function redisHealthCheck(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}

/**
 * Get Redis stats for monitoring
 */
export async function getRedisStats(): Promise<{
  configured: boolean;
  healthy: boolean;
}> {
  return {
    configured: isRedisConfigured(),
    healthy: await redisHealthCheck(),
  };
}
