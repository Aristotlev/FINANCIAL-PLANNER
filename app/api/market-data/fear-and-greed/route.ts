import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for DB access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for writes

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const runtime = 'edge';

// Cache duration for fallback (if DB is empty or fails)
const CACHE_DURATION = 3600; // 1 hour

export async function GET() {
  try {
    // 1. Try to get fresh data from DB first (cached)
    const { data: latestEntry, error: dbError } = await supabase
      .from('crypto_fear_and_greed')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!dbError && latestEntry) {
      const lastUpdate = new Date(latestEntry.timestamp).getTime();
      const createdAt = new Date(latestEntry.created_at).getTime();
      const now = new Date().getTime();
      
      // Calculate expiration
      // time_until_update is usually seconds from the data generation
      // If parsing fails, default to 15 minutes (900 seconds)
      const ttlSeconds = latestEntry.time_until_update ? parseInt(latestEntry.time_until_update) : 900;
      
      // We calculate validity based on when we actually stored it (created_at) plus the TTL
      // This ensures we respect the "time until update" relative to when we got the data
      // We add a small buffer (5 minutes) to ensure we don't fetch slightly too early before new data is computed upstream
      const expirationTime = createdAt + (ttlSeconds * 1000) + (5 * 60 * 1000); // TTL + 5 min buffer

      // Also ensure we don't cache for longer than 24 hours in case of stale data
      const maxCacheTime = lastUpdate + (24 * 60 * 60 * 1000);
      
      const shouldServeCache = now < expirationTime && now < maxCacheTime;

      if (shouldServeCache) {
        // console.log(`Serving cached Fear & Greed data. Next update in: ${Math.round((expirationTime - now) / 60000)} mins`);
        return NextResponse.json({
          data: {
            value: latestEntry.value,
            value_classification: latestEntry.value_classification,
            timestamp: latestEntry.timestamp,
            time_until_update: latestEntry.time_until_update
          }
        });
      }
    }

    // 2. Fetch from API if DB data is stale or missing
    const apiKey = process.env.CMC_API_KEY || process.env.NEXT_PUBLIC_CMC_API_KEY;
    if (!apiKey) {
        // If no API key, return DB data even if stale, if valid
        if (latestEntry) {
            return NextResponse.json({
                data: {
                    value: latestEntry.value,
                    value_classification: latestEntry.value_classification,
                    timestamp: latestEntry.timestamp,
                    time_until_update: latestEntry.time_until_update
                }
            });
        }
      return NextResponse.json(
        { error: 'CoinMarketCap API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        cache: 'no-store' // We want latest data to cache it ourselves
      }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('CoinMarketCap API error:', response.status, errorText);
        
        // If API fails (e.g. rate limit), return stale DB data if available
        if (latestEntry) {
             console.warn('Falling back to stale DB data due to API error');
             return NextResponse.json({
                data: {
                    value: latestEntry.value,
                    value_classification: latestEntry.value_classification,
                    timestamp: latestEntry.timestamp,
                    time_until_update: latestEntry.time_until_update
                }
            });
        }

        // Mock data fallback if API fails OR quota exceeded AND no DB data
        if (response.status === 403 || response.status === 401 || response.status === 429) {
           console.warn('Falling back to mock Fear & Greed data due to API restriction');
           return NextResponse.json({
             data: {
               value: 65,
               value_classification: "Greed",
               timestamp: new Date().toISOString(),
               time_until_update: "900" 
             }
           });
        }

        return NextResponse.json(
            { error: `CoinMarketCap API error: ${response.status}` },
            { status: response.status }
        );
    }

    const result = await response.json();
    
    // 3. Cache the new API data to Supabase
    if (result.data) {
        const { error: insertError } = await supabase
            .from('crypto_fear_and_greed')
            .insert({
                value: Math.round(result.data.value),
                value_classification: result.data.value_classification,
                timestamp: result.data.timestamp, // Ensure this is ISO string
                time_until_update: result.data.time_until_update
            });
            
        if (insertError) {
            console.error('Failed to cache Fear & Greed data:', insertError);
        }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Fear & Greed API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Fear & Greed Index' },
      { status: 500 }
    );
  }
}

