import { NextRequest, NextResponse } from 'next/server';
import { toolsCacheService } from '../../../../lib/tools-cache-service';

/**
 * Bulk Cache Endpoint
 * 
 * Returns all cached data for tools tabs in ONE request
 * This enables instant loading when data is already in the database
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // 'lobbying' | 'spending' | 'insider' | 'all'
  const limit = parseInt(searchParams.get('limit') || '500', 10);
  const debug = searchParams.get('debug') === 'true';

  try {
    const response: {
      lobbying?: any[];
      spending?: any[];
      insider?: any[];
      source: 'cache';
      timestamp: number;
      errors?: Record<string, string>;
    } = {
      source: 'cache',
      timestamp: Date.now(),
    };

    const errors: Record<string, string> = {};

    // Fetch requested data types in parallel
    const promises: Promise<void>[] = [];

    if (type === 'lobbying' || type === 'all') {
      promises.push(
        toolsCacheService.getSenateLobbying({ limit }).then(data => {
          response.lobbying = data;
        }).catch((err) => {
          console.error('Bulk cache - lobbying error:', err);
          response.lobbying = [];
          errors.lobbying = err.message || 'Failed to fetch lobbying data';
        })
      );
    }

    if (type === 'spending' || type === 'all') {
      promises.push(
        toolsCacheService.getUSASpending({ limit }).then(data => {
          response.spending = data;
        }).catch((err) => {
          console.error('Bulk cache - spending error:', err);
          response.spending = [];
          errors.spending = err.message || 'Failed to fetch spending data';
        })
      );
    }

    if (type === 'insider' || type === 'all') {
      promises.push(
        toolsCacheService.getInsiderTransactions({ limit }).then(data => {
          response.insider = data;
        }).catch((err) => {
          console.error('Bulk cache - insider error:', err);
          response.insider = [];
          errors.insider = err.message || 'Failed to fetch insider data';
        })
      );
    }

    await Promise.all(promises);

    // Add errors to response if any occurred
    if (Object.keys(errors).length > 0) {
      response.errors = errors;
    }

    const totalItems = (response.lobbying?.length || 0) + 
                       (response.spending?.length || 0) + 
                       (response.insider?.length || 0);

    console.log(`[Bulk Cache] Returning ${totalItems} total items for type: ${type}${Object.keys(errors).length > 0 ? ` (with errors: ${Object.keys(errors).join(', ')})` : ''}`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Total-Items': String(totalItems),
        ...(Object.keys(errors).length > 0 && { 'X-Has-Errors': 'true' }),
      },
    });
  } catch (error: any) {
    console.error('Error fetching bulk cache:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch cached data',
        source: 'error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
