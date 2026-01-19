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

  try {
    const response: {
      lobbying?: any[];
      spending?: any[];
      insider?: any[];
      source: 'cache';
      timestamp: number;
    } = {
      source: 'cache',
      timestamp: Date.now(),
    };

    // Fetch requested data types in parallel
    const promises: Promise<void>[] = [];

    if (type === 'lobbying' || type === 'all') {
      promises.push(
        toolsCacheService.getSenateLobbying({ limit }).then(data => {
          response.lobbying = data;
        }).catch(() => {
          response.lobbying = [];
        })
      );
    }

    if (type === 'spending' || type === 'all') {
      promises.push(
        toolsCacheService.getUSASpending({ limit }).then(data => {
          response.spending = data;
        }).catch(() => {
          response.spending = [];
        })
      );
    }

    if (type === 'insider' || type === 'all') {
      promises.push(
        toolsCacheService.getInsiderTransactions({ limit }).then(data => {
          response.insider = data;
        }).catch(() => {
          response.insider = [];
        })
      );
    }

    await Promise.all(promises);

    const totalItems = (response.lobbying?.length || 0) + 
                       (response.spending?.length || 0) + 
                       (response.insider?.length || 0);

    console.log(`[Bulk Cache] Returning ${totalItems} total items for type: ${type}`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Total-Items': String(totalItems),
      },
    });
  } catch (error: any) {
    console.error('Error fetching bulk cache:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cached data' },
      { status: 500 }
    );
  }
}
