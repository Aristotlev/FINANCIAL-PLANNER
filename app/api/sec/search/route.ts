/**
 * SEC Company Search API
 * Search for companies by name or ticker
 *
 * DB-first: searches sec_companies table in Supabase.
 * Falls back to SEC EDGAR company_tickers.json only if DB is empty,
 * then populates the DB for future searches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { secCacheService } from '@/lib/sec-cache-service';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const SEC_USER_AGENT = process.env.SEC_USER_AGENT || 'OmniFolio contact@omnifolio.com';
const SEC_COMPANY_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

// Helper to get Supabase Admin client (bypasses RLS)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase admin credentials not configured');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

interface CompanyTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

interface SearchResult {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

/**
 * Fallback: load from SEC and populate DB (only if sec_companies is empty)
 * This should almost never be called in production — cron handles it.
 */
async function loadAndCacheCompanyTickers(): Promise<SearchResult[]> {
  try {
    const response = await fetch(SEC_COMPANY_TICKERS_URL, {
      headers: {
        'User-Agent': SEC_USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status}`);
    }

    const data = await response.json() as Record<string, CompanyTickerEntry>;
    
    const companies = Object.values(data).map((entry) => ({
      cik: entry.cik_str.toString().padStart(10, '0'),
      ticker: entry.ticker,
      name: entry.title,
    }));

    // Background: populate sec_companies table so future searches are DB-only
    secCacheService.upsertCompanies(companies).catch(err =>
      console.warn('[SEC Search] Background company upsert failed:', err)
    );

    return companies;
  } catch (error) {
    console.error('[SEC Search] Error loading company tickers:', error);
    return [];
  }
}

function searchInMemory(companies: SearchResult[], query: string, limit: number = 10): SearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const scored = companies.map(company => {
    const tickerLower = company.ticker.toLowerCase();
    const nameLower = company.name.toLowerCase();
    
    let score = 0;
    
    if (tickerLower === normalizedQuery) score = 1000;
    else if (tickerLower.startsWith(normalizedQuery)) score = 500 + (100 - tickerLower.length);
    else if (tickerLower.includes(normalizedQuery)) score = 200;
    else if (nameLower.startsWith(normalizedQuery)) score = 150;
    else if (nameLower.includes(` ${normalizedQuery}`) || nameLower.includes(`${normalizedQuery} `)) score = 100;
    else if (nameLower.includes(normalizedQuery)) score = 50;

    return { company, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.company);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const recordSearch = searchParams.get('record') === 'true';
    const ticker = searchParams.get('ticker');
    const cik = searchParams.get('cik');
    const name = searchParams.get('name');

    if (!query && !ticker) {
      return NextResponse.json({ results: [] });
    }

    // If we're just recording a selection, do that and return
    if (recordSearch && (ticker || query)) {
      const supabase = getSupabaseAdmin();
      
      let userId = null;
      try {
        const session = await auth.api.getSession({
          headers: await headers()
        });
        if (session?.user) {
          userId = session.user.id;
        }
      } catch (e) {
        // Ignore auth errors for search recording
      }

      await supabase.from('sec_search_history').insert({
        user_id: userId,
        query: query || ticker,
        ticker: ticker,
        cik: cik,
        company_name: name,
      });

      if (recordSearch && !query) {
        return NextResponse.json({ success: true });
      }
    }

    // ── 1. Try DB search (sec_companies table) ───────────────────
    const searchQuery = query || '';
    const cached = await secCacheService.searchCompanies(searchQuery, Math.min(limit, 50));

    if (cached.data.length > 0) {
      return NextResponse.json({
        results: cached.data,
        total: cached.data.length,
        cached: true,
        _source: 'db',
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Data-Source': 'cache',
        },
      });
    }

    // ── 2. Fallback: fetch from SEC and populate DB ──────────────
    // This only happens if sec_companies is empty (first boot)
    const companies = await loadAndCacheCompanyTickers();
    const results = searchInMemory(companies, searchQuery, Math.min(limit, 50));

    return NextResponse.json({ 
      results,
      total: results.length,
      cached: false,
      _source: 'sec-edgar',
    }, {
      headers: {
        'X-Data-Source': 'fresh',
      },
    });
  } catch (error) {
    console.error('[SEC Search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
