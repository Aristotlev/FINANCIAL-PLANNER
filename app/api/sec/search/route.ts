/**
 * SEC Company Search API
 * Search for companies by name or ticker using SEC EDGAR
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const SEC_USER_AGENT = process.env.SEC_USER_AGENT || 'OmniFolio contact@omnifolio.com';
const SEC_BASE_URL = 'https://efts.sec.gov/LATEST/search-index';
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

// Cache for company tickers (refresh every hour)
let tickerCache: SearchResult[] | null = null;
let tickerCacheTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function loadCompanyTickers(): Promise<SearchResult[]> {
  const now = Date.now();
  
  if (tickerCache && (now - tickerCacheTime) < CACHE_DURATION) {
    return tickerCache;
  }

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
    
    tickerCache = Object.values(data).map((entry) => ({
      cik: entry.cik_str.toString().padStart(10, '0'),
      ticker: entry.ticker,
      name: entry.title,
    }));
    
    tickerCacheTime = now;
    return tickerCache;
  } catch (error) {
    console.error('[SEC Search] Error loading company tickers:', error);
    return tickerCache || [];
  }
}

function searchCompanies(companies: SearchResult[], query: string, limit: number = 10): SearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return [];

  // Score each company based on match quality
  const scored = companies.map(company => {
    const tickerLower = company.ticker.toLowerCase();
    const nameLower = company.name.toLowerCase();
    
    let score = 0;
    
    // Exact ticker match - highest priority
    if (tickerLower === normalizedQuery) {
      score = 1000;
    }
    // Ticker starts with query
    else if (tickerLower.startsWith(normalizedQuery)) {
      score = 500 + (100 - tickerLower.length); // Shorter tickers rank higher
    }
    // Ticker contains query
    else if (tickerLower.includes(normalizedQuery)) {
      score = 200;
    }
    // Name starts with query
    else if (nameLower.startsWith(normalizedQuery)) {
      score = 150;
    }
    // Name contains query as whole word
    else if (nameLower.includes(` ${normalizedQuery}`) || nameLower.includes(`${normalizedQuery} `)) {
      score = 100;
    }
    // Name contains query
    else if (nameLower.includes(normalizedQuery)) {
      score = 50;
    }

    return { company, score };
  });

  // Filter and sort by score
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
      
      // Try to get user ID from session
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

    const companies = await loadCompanyTickers();
    const results = searchCompanies(companies, query || '', Math.min(limit, 50));

    return NextResponse.json({ 
      results,
      total: results.length,
      cached: tickerCache !== null,
    });
  } catch (error) {
    console.error('[SEC Search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
