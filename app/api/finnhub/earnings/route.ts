import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';

// Simple in-memory cache for earnings data
const earningsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache (earnings don't change often)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const limit = searchParams.get('limit');
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const cacheKey = `${symbol.toUpperCase()}_${limit || 4}`;
  
  // Check cache first - return immediately if valid
  const cached = earningsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const finnhub = createFinnhubClient();
    // Default limit to 4 for faster response
    const limitNum = limit ? parseInt(limit, 10) : 4;
    
    const data = await finnhub.getEarnings(symbol, limitNum);
    
    // Cache the result
    earningsCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Error fetching earnings surprises:', error);
    
    // Return stale cache if available on error
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
        },
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch earnings surprises' },
      { status: 500 }
    );
  }
}
