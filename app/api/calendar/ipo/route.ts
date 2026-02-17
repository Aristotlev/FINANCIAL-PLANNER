/**
 * OmniFolio Proprietary IPO Calendar API
 * 
 * Zero third-party dependencies. Sourced from SEC EDGAR public data.
 * 
 * How it works:
 * ─────────────
 * 1. Fetch S-1/F-1/424B4 filings from SEC EDGAR EFTS (public, no key)
 * 2. Smart filtering: exclude SPACs, ETFs, insurance, secondary offerings
 * 3. Enrich top candidates with company details from SEC submissions API
 * 4. Filter out companies that are already public (have 10-K/10-Q)
 * 5. Seed into Supabase — DB as single source of truth
 * 6. Background refresh on 6-hour cooldown
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  fetchIPOFilings,
  enrichAndFilterIPOs,
  type ProprietaryIPO,
  type IPOStatus,
} from '@/lib/ipo-data';

// ─── Supabase ─────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ─── Constants ────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENRICH = 50;

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ─── SEC Data Refresh ─────────────────────────────────────────────────

async function refreshFromSEC(supabase: ReturnType<typeof getSupabase>): Promise<{
  fetched: number;
  enriched: number;
  upserted: number;
}> {
  const stats = { fetched: 0, enriched: 0, upserted: 0 };

  try {
    // Check cooldown
    const { data: meta } = await supabase
      .from('ipo_calendar_meta')
      .select('value')
      .eq('key', 'last_sec_refresh')
      .single();

    const lastRefresh = meta?.value ? parseInt(meta.value) : 0;
    if (Date.now() - lastRefresh < REFRESH_INTERVAL_MS) {
      console.log('[IPO] SEC refresh skipped — cooldown active');
      return stats;
    }

    console.log('[IPO] Starting SEC EDGAR refresh...');

    const now = new Date();

    // Search range: 12 months back for initial filings, 3 months for amendments
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Fetch filings (the library handles all form types in sequence)
    const rawIPOs = await fetchIPOFilings(fmtDate(twelveMonthsAgo), fmtDate(now), 200);
    stats.fetched = rawIPOs.length;

    if (rawIPOs.length === 0) {
      console.log('[IPO] No filings found from SEC');
      await updateTimestamp(supabase);
      return stats;
    }

    console.log(`[IPO] Fetched ${rawIPOs.length} candidate IPOs, enriching top ${MAX_ENRICH}...`);

    // Enrich and filter out secondary offerings
    const ipos = await enrichAndFilterIPOs(rawIPOs, MAX_ENRICH);
    stats.enriched = Math.min(rawIPOs.length, MAX_ENRICH);

    console.log(`[IPO] After enrichment + filtering: ${ipos.length} real IPOs`);

    // Deduplicate by CIK before upserting (avoid ON CONFLICT affecting row twice)
    const cikMap = new Map<string, ProprietaryIPO>();
    for (const ipo of ipos) {
      const key = ipo.cik || ipo.id;
      const existing = cikMap.get(key);
      // Keep the most recent filing or the one with more data
      if (!existing || ipo.filingDate > existing.filingDate) {
        cikMap.set(key, ipo);
      }
    }
    const dedupedIPOs = Array.from(cikMap.values());
    console.log(`[IPO] After dedup: ${dedupedIPOs.length} unique companies`);

    // For each IPO, check if it already exists by CIK, otherwise generate a UUID
    // First, fetch existing CIK→ID mappings
    const ciks = dedupedIPOs.filter(i => i.cik).map(i => i.cik as string);
    const existingMap = new Map<string, string>();
    if (ciks.length > 0) {
      const { data: existingRows } = await supabase
        .from('ipo_calendar_cache')
        .select('id, cik')
        .eq('source', 'sec-edgar')
        .in('cik', ciks);
      if (existingRows) {
        for (const row of existingRows) {
          if (row.cik) existingMap.set(row.cik, row.id);
        }
      }
    }

    // Upsert into database with proper UUIDs
    const CHUNK = 25;
    for (let i = 0; i < dedupedIPOs.length; i += CHUNK) {
      const chunk = dedupedIPOs.slice(i, i + CHUNK).map(ipo => {
        // Reuse existing UUID if the CIK already has an entry, otherwise generate new
        const existingId = ipo.cik ? existingMap.get(ipo.cik) : undefined;
        const id = existingId || randomUUID();

        return {
          id,
          company_name: ipo.companyName,
          symbol: ipo.symbol || null,
          exchange: ipo.exchange,
          filing_date: ipo.filingDate,
          ipo_date: ipo.expectedDate || ipo.filingDate,
          expected_ipo_date: ipo.expectedDate,
          price_range_low: ipo.priceRangeLow,
          price_range_high: ipo.priceRangeHigh,
          offer_price: ipo.offerPrice,
          shares_offered: ipo.sharesOffered,
          deal_size: ipo.dealSize,
          market_cap_estimate: ipo.dealSize,
          status: ipo.status,
          filing_type: ipo.filingType,
          sector: ipo.sector,
          industry: ipo.industry,
          lead_underwriters: ipo.leadUnderwriters,
          description: ipo.description,
          sec_filing_url: ipo.secFilingUrl,
          cik: ipo.cik,
          country: ipo.country,
          source: 'sec-edgar',
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('ipo_calendar_cache')
        .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error(`[IPO] Upsert error:`, error.message);
        // Fallback: try individual inserts/updates
        for (const row of chunk) {
          const { error: singleErr } = await supabase
            .from('ipo_calendar_cache')
            .upsert(row, { onConflict: 'id' });
          if (!singleErr) stats.upserted++;
        }
      } else {
        stats.upserted += chunk.length;
      }
    }

    await updateTimestamp(supabase);
    console.log(`[IPO] Refresh complete: ${stats.fetched} fetched, ${stats.upserted} upserted`);
  } catch (error) {
    console.error('[IPO] SEC refresh error:', error);
  }

  return stats;
}

async function updateTimestamp(supabase: ReturnType<typeof getSupabase>) {
  await supabase
    .from('ipo_calendar_meta')
    .upsert({
      key: 'last_sec_refresh',
      value: Date.now().toString(),
      updated_at: new Date().toISOString(),
    });
}

// ─── GET Handler ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const params = request.nextUrl.searchParams;

    const statusFilter = params.get('status');
    const searchQuery = params.get('q');
    const forceRefresh = params.get('refresh') === 'true';

    // Default range: 12 months back, 6 months forward
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setMonth(defaultFrom.getMonth() - 12);
    const defaultTo = new Date(now);
    defaultTo.setMonth(defaultTo.getMonth() + 6);

    const from = params.get('from') || fmtDate(defaultFrom);
    const to = params.get('to') || fmtDate(defaultTo);

    // Force refresh if requested — await so the response includes fresh data
    if (forceRefresh) {
      await supabase
        .from('ipo_calendar_meta')
        .upsert({ key: 'last_sec_refresh', value: '0', updated_at: new Date().toISOString() });
      await refreshFromSEC(supabase);
    } else {
      // Smart background refresh: only fire if cooldown has expired
      // This prevents unnecessary SEC requests on every page load
      const { data: meta } = await supabase
        .from('ipo_calendar_meta')
        .select('value')
        .eq('key', 'last_sec_refresh')
        .single();

      const lastRefresh = meta?.value ? parseInt(meta.value) : 0;
      if (Date.now() - lastRefresh >= REFRESH_INTERVAL_MS) {
        // Cooldown expired — trigger non-blocking background refresh
        refreshFromSEC(supabase).catch(err => {
          console.error('[IPO] Background refresh error:', err);
        });
      }
    }

    // Query database — only SEC-sourced data
    let query = supabase
      .from('ipo_calendar_cache')
      .select('*')
      .eq('source', 'sec-edgar')
      .gte('filing_date', from)
      .lte('filing_date', to)
      .order('filing_date', { ascending: false })
      .limit(500);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery) {
      query = query.or(
        `company_name.ilike.%${searchQuery}%,symbol.ilike.%${searchQuery}%`
      );
    }

    const { data: rows, error: dbError } = await query;

    if (dbError) {
      console.error('[IPO] DB error:', dbError.message);
      return NextResponse.json({ success: false, events: [], error: 'Database error' }, { status: 500 });
    }

    // Transform to API format
    interface IPOCalendarEvent {
      id: string;
      companyName: string;
      symbol: string | null;
      exchange: string | null;
      filingDate: string;
      expectedDate: string | null;
      priceRangeLow: number | null;
      priceRangeHigh: number | null;
      offerPrice: number | null;
      sharesOffered: number | null;
      dealSize: number | null;
      status: IPOStatus;
      filingType: string;
      sector: string | null;
      industry: string | null;
      secFilingUrl: string | null;
      country: string;
    }

    const events: IPOCalendarEvent[] = (rows || []).map(row => ({
      id: row.id,
      companyName: row.company_name,
      symbol: row.symbol,
      exchange: row.exchange,
      filingDate: row.filing_date || row.ipo_date || '',
      expectedDate: row.expected_ipo_date || row.ipo_date || null,
      priceRangeLow: row.price_range_low,
      priceRangeHigh: row.price_range_high,
      offerPrice: row.offer_price,
      sharesOffered: row.shares_offered,
      dealSize: row.deal_size || row.market_cap_estimate || null,
      status: (row.status || 'filed') as IPOStatus,
      filingType: row.filing_type || 'S-1',
      sector: row.sector,
      industry: row.industry,
      secFilingUrl: row.sec_filing_url,
      country: row.country || 'US',
    }));

    // Sort: upcoming first, then past descending
    const nowStr = fmtDate(now);
    events.sort((a, b) => {
      const dateA = a.expectedDate || a.filingDate;
      const dateB = b.expectedDate || b.filingDate;
      const aUp = dateA >= nowStr;
      const bUp = dateB >= nowStr;
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (aUp) return dateA.localeCompare(dateB);
      return dateB.localeCompare(dateA);
    });

    // Stats
    const stats = {
      total: events.length,
      filed: events.filter(e => e.status === 'filed').length,
      expected: events.filter(e => e.status === 'expected').length,
      priced: events.filter(e => e.status === 'priced').length,
      withdrawn: events.filter(e => e.status === 'withdrawn').length,
    };

    // Last refresh
    const { data: refreshMeta } = await supabase
      .from('ipo_calendar_meta')
      .select('value')
      .eq('key', 'last_sec_refresh')
      .single();

    const lastRefresh = refreshMeta?.value
      ? new Date(parseInt(refreshMeta.value)).toISOString()
      : null;

    return NextResponse.json({
      success: true,
      events,
      stats,
      dateRange: { from, to },
      source: 'sec-edgar',
      lastRefresh,
    });
  } catch (error: unknown) {
    console.error('[IPO] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, events: [], error: msg }, { status: 500 });
  }
}
