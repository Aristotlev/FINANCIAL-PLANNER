/**
 * Exchange Rate API Proxy
 * Proxies requests to exchangerate-api.com to keep client-side code using localhost only
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache exchange rates for 1 hour
let cachedRates: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const base = searchParams.get('base') || 'USD';

    // Return cached data if still valid
    const now = Date.now();
    if (cachedRates && cachedRates.base === base && now - cacheTimestamp < CACHE_DURATION) {
      console.log('[Exchange Rates] Returning cached rates for', base);
      return NextResponse.json(cachedRates);
    }

    // Fetch fresh data
    console.log('[Exchange Rates] Fetching fresh rates for', base);
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cachedRates = data;
    cacheTimestamp = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Exchange Rates] Error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rates',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
