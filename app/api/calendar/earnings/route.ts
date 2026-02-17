/**
 * OmniFolio Proprietary Earnings Calendar API
 *
 * Zero third-party dependencies. Sourced from SEC EDGAR public data.
 *
 * How it works:
 * ─────────────
 * 1. Fetch 8-K (Item 2.02), 10-Q, and 10-K filings from SEC EDGAR EFTS (public, no key)
 * 2. 8-K Item 2.02 = "Results of Operations" = the actual earnings announcement
 * 3. 10-Q/10-K = the quarterly/annual financial reports
 * 4. Enrich top candidates with company details from SEC submissions API
 * 5. Estimate upcoming report dates from historical filing patterns
 * 6. Seed into Supabase — DB as single source of truth
 * 7. Background refresh on 4-hour cooldown
 *
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  fetchEarningsFilings,
  enrichEarnings,
  type ProprietaryEarnings,
} from '@/lib/earnings-data';

// ─── Supabase ─────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ─── Constants ────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_ENRICH = 75;

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
      .from('earnings_calendar_meta')
      .select('value')
      .eq('key', 'last_sec_refresh')
      .single();

    const lastRefresh = meta?.value ? parseInt(meta.value) : 0;
    if (Date.now() - lastRefresh < REFRESH_INTERVAL_MS) {
      console.log('[Earnings] SEC refresh skipped — cooldown active');
      return stats;
    }

    console.log('[Earnings] Starting SEC EDGAR refresh...');

    const now = new Date();

    // Search range: 3 months back for recent reports, 1 month forward for upcoming
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Fetch filings (the library handles all form types in sequence)
    const rawEarnings = await fetchEarningsFilings(fmtDate(threeMonthsAgo), fmtDate(now), 400);
    stats.fetched = rawEarnings.length;

    if (rawEarnings.length === 0) {
      console.log('[Earnings] No filings found from SEC');
      await updateTimestamp(supabase);
      return stats;
    }

    console.log(`[Earnings] Fetched ${rawEarnings.length} candidate earnings, enriching top ${MAX_ENRICH}...`);

    // Enrich with company details
    const earnings = await enrichEarnings(rawEarnings, MAX_ENRICH);
    stats.enriched = Math.min(rawEarnings.length, MAX_ENRICH);

    console.log(`[Earnings] After enrichment: ${earnings.length} earnings events`);

    // Deduplicate by CIK + quarter before upserting
    const dedupMap = new Map<string, ProprietaryEarnings>();
    for (const earning of earnings) {
      const key = earning.id; // Already CIK-quarter based
      const existing = dedupMap.get(key);
      if (!existing || earning.reportDate > existing.reportDate) {
        dedupMap.set(key, earning);
      }
    }
    const dedupedEarnings = Array.from(dedupMap.values());
    console.log(`[Earnings] After dedup: ${dedupedEarnings.length} unique events`);

    // For each earning, check if it already exists, otherwise generate a UUID
    const symbols = dedupedEarnings.filter(e => e.symbol).map(e => e.symbol as string);
    const existingMap = new Map<string, string>();
    if (symbols.length > 0) {
      // Batch query in chunks to avoid URL length limits
      const SYMBOL_CHUNK = 50;
      for (let i = 0; i < symbols.length; i += SYMBOL_CHUNK) {
        const chunk = symbols.slice(i, i + SYMBOL_CHUNK);
        const { data: existingRows } = await supabase
          .from('earnings_calendar_cache')
          .select('id, symbol, report_date')
          .eq('source', 'sec-edgar')
          .in('symbol', chunk);
        if (existingRows) {
          for (const row of existingRows) {
            if (row.symbol && row.report_date) {
              existingMap.set(`${row.symbol}-${row.report_date}`, row.id);
            }
          }
        }
      }
    }

    // Upsert into database with proper UUIDs
    const CHUNK = 25;
    for (let i = 0; i < dedupedEarnings.length; i += CHUNK) {
      const chunk = dedupedEarnings.slice(i, i + CHUNK).map(earning => {
        const existingId = earning.symbol
          ? existingMap.get(`${earning.symbol}-${earning.reportDate}`)
          : undefined;
        const id = existingId || randomUUID();

        return {
          id,
          symbol: earning.symbol || `CIK-${earning.cik}`,
          company_name: earning.companyName,
          exchange: earning.exchange,
          report_date: earning.reportDate,
          report_time: earning.reportTime,
          fiscal_quarter: earning.fiscalQuarter,
          fiscal_year: earning.fiscalYear,
          filing_type: earning.filingType,
          sector: earning.sector,
          industry: earning.industry,
          eps_estimate: earning.epsEstimate,
          eps_actual: earning.epsActual,
          revenue_estimate: earning.revenueEstimate,
          revenue_actual: earning.revenueActual,
          surprise_percent: earning.surprisePercent,
          sec_filing_url: earning.secFilingUrl,
          cik: earning.cik,
          country: earning.country,
          source: 'sec-edgar',
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('earnings_calendar_cache')
        .upsert(chunk, { onConflict: 'symbol,report_date', ignoreDuplicates: false });

      if (error) {
        console.error(`[Earnings] Upsert error:`, error.message);
        // Fallback: try individual inserts/updates
        for (const row of chunk) {
          const { error: singleErr } = await supabase
            .from('earnings_calendar_cache')
            .upsert(row, { onConflict: 'symbol,report_date' });
          if (!singleErr) stats.upserted++;
        }
      } else {
        stats.upserted += chunk.length;
      }
    }

    await updateTimestamp(supabase);
    console.log(`[Earnings] Refresh complete: ${stats.fetched} fetched, ${stats.upserted} upserted`);
  } catch (error) {
    console.error('[Earnings] SEC refresh error:', error);
  }

  return stats;
}

async function updateTimestamp(supabase: ReturnType<typeof getSupabase>) {
  await supabase
    .from('earnings_calendar_meta')
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

    const symbol = params.get('symbol');
    const searchQuery = params.get('q');
    const sectorFilter = params.get('sector');
    const forceRefresh = params.get('refresh') === 'true';

    // Default range: 3 months back, 3 months forward
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setMonth(defaultFrom.getMonth() - 3);
    const defaultTo = new Date(now);
    defaultTo.setMonth(defaultTo.getMonth() + 3);

    const from = params.get('from') || fmtDate(defaultFrom);
    const to = params.get('to') || fmtDate(defaultTo);

    // Force refresh if requested
    if (forceRefresh) {
      await supabase
        .from('earnings_calendar_meta')
        .upsert({ key: 'last_sec_refresh', value: '0', updated_at: new Date().toISOString() });
      await refreshFromSEC(supabase);
    } else {
      // Smart background refresh: only fire if cooldown has expired
      const { data: meta } = await supabase
        .from('earnings_calendar_meta')
        .select('value')
        .eq('key', 'last_sec_refresh')
        .single();

      const lastRefresh = meta?.value ? parseInt(meta.value) : 0;
      if (Date.now() - lastRefresh >= REFRESH_INTERVAL_MS) {
        refreshFromSEC(supabase).catch(err => {
          console.error('[Earnings] Background refresh error:', err);
        });
      }
    }

    // Query database
    let query = supabase
      .from('earnings_calendar_cache')
      .select('*')
      .gte('report_date', from)
      .lte('report_date', to)
      .order('report_date', { ascending: false })
      .limit(500);

    // Filter by symbol if provided
    if (symbol) {
      query = query.eq('symbol', symbol.toUpperCase());
    }

    // Filter by sector
    if (sectorFilter && sectorFilter !== 'all') {
      query = query.eq('sector', sectorFilter);
    }

    // Text search
    if (searchQuery) {
      query = query.or(
        `company_name.ilike.%${searchQuery}%,symbol.ilike.%${searchQuery}%`
      );
    }

    const { data: rows, error: dbError } = await query;

    if (dbError) {
      console.error('[Earnings] DB error:', dbError.message);
      return NextResponse.json({ success: false, events: [], error: 'Database error' }, { status: 500 });
    }

    // Transform to API format (backward-compatible with existing component)
    interface EarningsCalendarEvent {
      date: string;
      companyName: string;
      epsActual: number | null;
      epsEstimate: number | null;
      hour: string;
      quarter: number;
      revenueActual: number | null;
      revenueEstimate: number | null;
      symbol: string;
      year: number;
      filingType: string;
      sector: string | null;
      industry: string | null;
      exchange: string | null;
      secFilingUrl: string | null;
      country: string;
      surprisePercent: number | null;
    }

    const events: EarningsCalendarEvent[] = (rows || []).map(row => ({
      date: row.report_date || '',
      companyName: row.company_name || row.symbol || '',
      epsActual: row.eps_actual,
      epsEstimate: row.eps_estimate,
      hour: row.report_time || 'unknown',
      quarter: parseInt(row.fiscal_quarter?.replace('Q', '').replace('FY', '4') || '0') || 0,
      revenueActual: row.revenue_actual,
      revenueEstimate: row.revenue_estimate,
      symbol: row.symbol || '',
      year: row.fiscal_year || new Date(row.report_date || '').getFullYear(),
      filingType: row.filing_type || '10-Q',
      sector: row.sector || null,
      industry: row.industry || null,
      exchange: row.exchange || null,
      secFilingUrl: row.sec_filing_url || null,
      country: row.country || 'US',
      surprisePercent: row.surprise_percent || null,
    }));

    // Sort: upcoming first, then past descending
    const nowStr = fmtDate(now);
    events.sort((a, b) => {
      const aUp = a.date >= nowStr;
      const bUp = b.date >= nowStr;
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (aUp) return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });

    // Stats
    const stats = {
      total: events.length,
      upcoming: events.filter(e => e.date >= nowStr).length,
      reported: events.filter(e => e.date < nowStr).length,
      withEPS: events.filter(e => e.epsActual !== null).length,
      sectors: [...new Set(events.map(e => e.sector).filter(Boolean))],
    };

    // Last refresh
    const { data: refreshMeta } = await supabase
      .from('earnings_calendar_meta')
      .select('value')
      .eq('key', 'last_sec_refresh')
      .single();

    const lastRefresh = refreshMeta?.value
      ? new Date(parseInt(refreshMeta.value)).toISOString()
      : null;

    return NextResponse.json({
      success: true,
      data: events,
      stats,
      dateRange: { from, to },
      source: 'sec-edgar',
      lastRefresh,
      isMock: false,
    });
  } catch (error: unknown) {
    console.error('[Earnings] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, data: [], error: msg }, { status: 500 });
  }
}
