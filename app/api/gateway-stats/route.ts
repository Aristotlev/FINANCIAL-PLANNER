/**
 * API Gateway Statistics Endpoint
 * 
 * Exposes cache hit rates, circuit breaker status, and rate limiting metrics
 * for the centralized ExternalAPIGateway.
 * 
 * GET /api/gateway-stats
 * 
 * Use this to monitor:
 * - Cache hit rate (should be >70% in steady state)
 * - Circuit breaker state per provider (should all be closed)
 * - Rate limit utilization per provider (stay below 80%)
 * - Request deduplication effectiveness
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { NextResponse } from 'next/server';
import { apiGateway } from '@/lib/api/external-api-gateway';

export async function GET() {
  try {
    const stats = apiGateway.getStats();

    // Add health assessment
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'critical',
      issues: [] as string[],
    };

    // Check for open circuit breakers
    for (const [provider, info] of Object.entries(stats.providers)) {
      if ((info as any).circuitOpen) {
        health.status = 'critical';
        health.issues.push(`Circuit breaker OPEN for ${provider}`);
      }
      if ((info as any).utilizationPercent > 80) {
        if (health.status === 'healthy') health.status = 'degraded';
        health.issues.push(`${provider} rate limit at ${(info as any).utilizationPercent}%`);
      }
      if ((info as any).consecutiveErrors > 0) {
        if (health.status === 'healthy') health.status = 'degraded';
        health.issues.push(`${provider} has ${(info as any).consecutiveErrors} consecutive errors`);
      }
    }

    return NextResponse.json({
      ...stats,
      health,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve gateway stats' },
      { status: 500 }
    );
  }
}
