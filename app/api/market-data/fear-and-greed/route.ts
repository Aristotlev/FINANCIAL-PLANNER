/**
 * OmniFolio Fear & Greed Index API
 *
 * DB-first caching pattern — same as all other OmniFolio data services.
 *
 * Resolution order:
 *   1. Server in-memory cache (instant, shared across all users in this process)
 *   2. Supabase DB cache (fast, shared across all servers/instances)
 *   3. Alternative.me API (free, no API key required)
 *      → Only called when DB has NO data or data is stale
 *      → Result is stored in DB for ALL future users
 *
 * Protection:
 *   - In-memory cache prevents redundant DB queries
 *   - Global fetch lock prevents duplicate API calls from concurrent users
 *   - Stale data is ALWAYS served immediately; refresh happens in background
 *   - On API failure, stale DB data is returned (never a blank response)
 *
 * Copyright OmniFolio. All rights reserved.
 */

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE (shared across all users in this server process)
// ══════════════════════════════════════════════════════════════════

interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

interface MemoryCacheEntry {
  data: FearGreedData;
  storedAt: number;
  ttlMs: number;
}

let _memoryCache: MemoryCacheEntry | null = null;
let _fetchLock: Promise<FearGreedData | null> | null = null;

const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_COOLDOWN_MS = 15 * 60 * 1000; // 15 min between API calls
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours absolute max

// Track last API call time to enforce cooldown
let _lastApiCallMs = 0;

function getFromMemoryCache(): FearGreedData | null {
  if (!_memoryCache) return null;
  if (Date.now() - _memoryCache.storedAt > _memoryCache.ttlMs) {
    _memoryCache = null;
    return null;
  }
  return _memoryCache.data;
}

function setInMemoryCache(data: FearGreedData, ttlMs = MEMORY_CACHE_TTL_MS): void {
  _memoryCache = { data, storedAt: Date.now(), ttlMs };
}

// ══════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ══════════════════════════════════════════════════════════════════

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  _supabase = createClient(supabaseUrl, supabaseServiceKey);
  return _supabase;
}

// ══════════════════════════════════════════════════════════════════
// CACHE FRESHNESS CHECK
// ══════════════════════════════════════════════════════════════════

function isCacheFresh(entry: any): { fresh: boolean; stale: boolean; expired: boolean } {
  if (!entry) return { fresh: false, stale: false, expired: true };

  const createdAt = new Date(entry.created_at).getTime();
  const lastUpdate = new Date(entry.timestamp).getTime();
  const now = Date.now();

  // TTL from the data source (how long until new data is published upstream)
  const ttlSeconds = entry.time_until_update ? parseInt(entry.time_until_update) : 900;
  const ttlMs = ttlSeconds * 1000;

  // Fresh: within TTL + 5 min buffer from when we stored it
  const freshUntil = createdAt + ttlMs + (5 * 60 * 1000);

  // Stale: past fresh window but within 2x TTL (serve but refresh in background)
  const staleUntil = createdAt + (ttlMs * 2) + (10 * 60 * 1000);

  // Absolute max: 24 hours from data timestamp
  const absoluteMax = lastUpdate + MAX_CACHE_AGE_MS;

  if (now > absoluteMax) {
    return { fresh: false, stale: false, expired: true };
  }

  if (now < freshUntil) {
    return { fresh: true, stale: false, expired: false };
  }

  if (now < staleUntil) {
    return { fresh: false, stale: true, expired: false };
  }

  return { fresh: false, stale: false, expired: true };
}

// ══════════════════════════════════════════════════════════════════
// API FETCH + DB STORE
// ══════════════════════════════════════════════════════════════════

async function fetchFromAPIAndStore(supabase: SupabaseClient | null): Promise<FearGreedData | null> {
  // Enforce cooldown — don't hammer the API
  const now = Date.now();
  if (now - _lastApiCallMs < REFRESH_COOLDOWN_MS) {
    console.log(`[FearGreed] API cooldown active (${Math.round((REFRESH_COOLDOWN_MS - (now - _lastApiCallMs)) / 1000)}s remaining)`);
    return null;
  }

  _lastApiCallMs = now;
  console.log('[FearGreed] 🔄 Fetching fresh data from Alternative.me API');

  try {
    const response = await fetch(
      'https://api.alternative.me/fng/?limit=1',
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FearGreed] Alternative.me API error: ${response.status}`, errorText);
      return null;
    }

    const result = await response.json();
    if (!result.data || !result.data[0]) return null;

    const apiData = result.data[0];
    const freshData: FearGreedData = {
      value: Math.round(parseInt(apiData.value)),
      value_classification: apiData.value_classification,
      timestamp: new Date(parseInt(apiData.timestamp) * 1000).toISOString(),
      time_until_update: apiData.time_until_update || '900',
    };

    // Store in DB for all future users
    if (supabase) {
      const { error: insertError } = await supabase
        .from('crypto_fear_and_greed')
        .insert({
          value: freshData.value,
          value_classification: freshData.value_classification,
          timestamp: freshData.timestamp,
          time_until_update: freshData.time_until_update,
        });

      if (insertError) {
        console.error('[FearGreed] DB insert error:', insertError);
      } else {
        console.log('[FearGreed] ✅ Stored fresh data in DB');
      }
    }

    // Update memory cache
    setInMemoryCache(freshData);

    return freshData;
  } catch (error: any) {
    console.error('[FearGreed] API fetch error:', error.message);
    return null;
  }
}

/**
 * Background refresh — fire and forget.
 * Uses a global fetch lock so only ONE refresh runs at a time,
 * even if 100 users hit the endpoint simultaneously.
 */
function refreshInBackground(supabase: SupabaseClient | null): void {
  if (_fetchLock) {
    // Already refreshing — skip
    return;
  }

  _fetchLock = fetchFromAPIAndStore(supabase).finally(() => {
    _fetchLock = null;
  });
}

// ══════════════════════════════════════════════════════════════════
// RESPONSE BUILDER
// ══════════════════════════════════════════════════════════════════

function buildResponse(data: FearGreedData, source: string): NextResponse {
  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        'X-Data-Source': source,
      },
    }
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    // ── 1. In-memory cache (instant, ~0ms) ─────────────────────
    const memoryCached = getFromMemoryCache();
    if (memoryCached) {
      return buildResponse(memoryCached, 'memory-cache');
    }

    // ── 2. Supabase DB cache ───────────────────────────────────
    const supabase = getSupabaseClient();
    let latestEntry: any = null;

    if (supabase) {
      const { data, error: dbError } = await supabase
        .from('crypto_fear_and_greed')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!dbError && data) {
        latestEntry = data;
      }
    }

    if (latestEntry) {
      const freshness = isCacheFresh(latestEntry);
      const dbData: FearGreedData = {
        value: latestEntry.value,
        value_classification: latestEntry.value_classification,
        timestamp: latestEntry.timestamp,
        time_until_update: latestEntry.time_until_update,
      };

      if (freshness.fresh) {
        // Fresh — serve immediately, update memory cache
        setInMemoryCache(dbData);
        return buildResponse(dbData, 'db-cache-fresh');
      }

      if (freshness.stale) {
        // Stale — serve immediately, refresh in background
        setInMemoryCache(dbData, 5 * 60 * 1000); // shorter memory TTL for stale data
        refreshInBackground(supabase);
        return buildResponse(dbData, 'db-cache-stale');
      }

      // Expired — still serve the expired data, but trigger refresh
      // This prevents users from ever seeing an empty response
      console.log('[FearGreed] 📦 Serving expired DB cache, refreshing in background');
      setInMemoryCache(dbData, 2 * 60 * 1000); // very short memory TTL
      refreshInBackground(supabase);
      return buildResponse(dbData, 'db-cache-expired');
    }

    // ── 3. No DB data at all — must fetch from API ─────────────
    // Use fetch lock to prevent duplicate API calls from concurrent requests
    if (_fetchLock) {
      console.log('[FearGreed] 🔒 Waiting on existing API fetch');
      const result = await _fetchLock;
      if (result) {
        return buildResponse(result, 'api-locked');
      }
    }

    // Acquire lock and fetch
    _fetchLock = fetchFromAPIAndStore(supabase).finally(() => {
      _fetchLock = null;
    });

    const freshData = await _fetchLock;
    if (freshData) {
      return buildResponse(freshData, 'api-fresh');
    }

    // ── 4. Complete failure — return error ──────────────────────
    return NextResponse.json(
      { error: 'Fear & Greed data unavailable. Please try again shortly.' },
      { status: 503, headers: { 'Retry-After': '60' } }
    );
  } catch (error: any) {
    console.error('[FearGreed] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Fear & Greed Index' },
      { status: 500 }
    );
  }
}

