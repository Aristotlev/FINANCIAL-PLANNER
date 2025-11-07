# 🔐 Rate Limiting Guide

## Overview

Rate limiting protects your API from abuse by limiting the number of requests a client can make within a time window.

## Implementation

### 1. Basic Rate Limiting

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const limiter = withRateLimit(request, {
    limit: 60,        // 60 requests
    windowMs: 60000,  // per minute
  });

  if (!limiter.success) {
    return limiter.response; // Returns 429 Too Many Requests
  }

  // Your API logic here
  const data = { message: 'Success' };

  const response = NextResponse.json(data);
  
  // Add rate limit headers to successful responses
  Object.entries(limiter.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

### 2. Using Presets

```typescript
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // Use AI API preset (30 requests per hour)
  const limiter = withRateLimit(request, RateLimitPresets.AI_API);

  if (!limiter.success) {
    return limiter.response;
  }

  // Your expensive AI operation
  const result = await processAIRequest();
  
  return NextResponse.json(result);
}
```

### 3. Custom Identifier

```typescript
export async function POST(request: NextRequest) {
  const limiter = withRateLimit(request, {
    limit: 10,
    windowMs: 60000,
    identifier: (req) => {
      // Rate limit by user ID instead of IP
      const userId = req.headers.get('x-user-id');
      return userId || 'anonymous';
    },
  });

  if (!limiter.success) {
    return limiter.response;
  }

  // Your logic here
  return NextResponse.json({ success: true });
}
```

### 4. Skip Rate Limiting for Certain Conditions

```typescript
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, {
    limit: 60,
    windowMs: 60000,
    skip: (req) => {
      // Skip rate limiting for admin users
      const isAdmin = req.headers.get('x-admin-key') === process.env.ADMIN_KEY;
      return isAdmin;
    },
  });

  if (!limiter.success) {
    return limiter.response;
  }

  return NextResponse.json({ data: 'Success' });
}
```

## Available Presets

```typescript
RateLimitPresets.STRICT     // 10 requests/minute, 5 min block
RateLimitPresets.STANDARD   // 60 requests/minute, 1 min block
RateLimitPresets.GENEROUS   // 120 requests/minute
RateLimitPresets.AI_API     // 30 requests/hour, 10 min block
RateLimitPresets.PUBLIC     // 1000 requests/hour
RateLimitPresets.AUTH       // 5 attempts/15 minutes, 30 min block
```

## Response Headers

The rate limiter adds these headers to responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-11-07T10:30:00.000Z
Retry-After: 30  (only when rate limit exceeded)
```

## Error Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 30 seconds.",
  "retryAfter": 30
}
```

Status code: `429 Too Many Requests`

## Monitoring

```typescript
import { getRateLimitStats } from '@/lib/rate-limiter';

// Get current statistics
const stats = getRateLimitStats();
console.log(stats);
// {
//   totalClients: 150,
//   blockedClients: 5,
//   activeRequests: 450
// }
```

## Manual Blocking

```typescript
import { blockIdentifier, unblockIdentifier } from '@/lib/rate-limiter';

// Block a specific IP or user
blockIdentifier('ip:192.168.1.1', 3600000); // Block for 1 hour

// Unblock
unblockIdentifier('ip:192.168.1.1');
```

## Production Considerations

### 1. Use Redis for Distributed Systems

For production with multiple instances, use Redis instead of in-memory storage:

```typescript
// lib/redis-rate-limiter.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function rateLimit(identifier: string, limit: number, windowMs: number) {
  const key = `rate_limit:${identifier}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

### 2. Use Upstash for Serverless

For serverless deployments (Vercel, Cloudflare Workers):

```bash
npm install @upstash/redis @upstash/ratelimit
```

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const { success, remaining } = await ratelimit.limit(identifier);
  
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  
  // Your logic
  return NextResponse.json({ success: true });
}
```

### 3. IP-based vs User-based

```typescript
function getClientIdentifier(request: NextRequest): string {
  // Authenticated users: rate limit by user ID
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }
  
  // Anonymous users: rate limit by IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ip:${ip}`;
}
```

## Testing

```typescript
// Test rate limiting
describe('Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const mockRequest = new Request('http://localhost:3000/api/test');
    
    for (let i = 0; i < 10; i++) {
      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
    }
  });
  
  it('should block requests exceeding limit', async () => {
    const mockRequest = new Request('http://localhost:3000/api/test');
    
    // Make 11 requests (limit is 10)
    for (let i = 0; i < 11; i++) {
      const response = await GET(mockRequest);
      
      if (i < 10) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });
});
```

## Best Practices

1. **Different Limits for Different Endpoints**
   - Expensive operations: Stricter limits
   - Read-only operations: Generous limits
   - Authentication: Very strict limits

2. **Graceful Degradation**
   - Return meaningful error messages
   - Include `Retry-After` header
   - Provide clear documentation

3. **Monitoring**
   - Track rate limit hits
   - Alert on unusual patterns
   - Adjust limits based on usage

4. **User Experience**
   - Show rate limit information in UI
   - Implement client-side throttling
   - Cache responses when possible

5. **Security**
   - Block suspicious IPs automatically
   - Implement CAPTCHA after multiple violations
   - Log all rate limit violations

## Example: Complete API Route

```typescript
// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Apply AI-specific rate limiting
    const limiter = withRateLimit(request, {
      ...RateLimitPresets.AI_API,
      identifier: (req) => {
        // Rate limit by user ID if authenticated
        const userId = req.cookies.get('user_id')?.value;
        return userId || req.headers.get('x-forwarded-for') || 'unknown';
      },
    });

    if (!limiter.success) {
      logger.warn('Rate limit exceeded', {
        identifier: limiter.headers['X-RateLimit-Limit'],
        retryAfter: limiter.response?.headers.get('Retry-After'),
      });
      return limiter.response;
    }

    // Parse request
    const body = await request.json();
    
    // Process AI request
    const result = await processAIChat(body);
    
    const response = NextResponse.json(result);
    
    // Add rate limit headers
    Object.entries(limiter.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    logger.error('AI chat error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Troubleshooting

### Rate limits not working?

1. Check if identifier function returns consistent values
2. Verify time window is in milliseconds
3. Ensure cleanup is running (memory leaks)

### Too many false positives?

1. Use authenticated user IDs instead of IPs
2. Increase limits for trusted clients
3. Implement IP whitelisting

### Need distributed rate limiting?

Use Redis/Upstash for multiple server instances.
