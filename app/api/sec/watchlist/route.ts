/**
 * SEC Watchlist API
 * Manage user's company watchlist for SEC filings
 *
 * DB-first for CIK resolution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { secCacheService } from '@/lib/sec-cache-service';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const secApi = createSECEdgarClient();

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

// GET /api/sec/watchlist - Get user's watchlist
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    // Verify session with Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    // Get watchlist
    const { data: watchlist, error } = await supabase
      .from('sec_watchlist')
      .select(`
        *,
        company:sec_companies(*)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      watchlist: watchlist || [],
      count: watchlist?.length || 0,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

// POST /api/sec/watchlist - Add to watchlist
export async function POST(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    // Verify session with Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { 
      ticker, 
      formTypes = ['10-K', '10-Q', '8-K', '4'],
      priority = 'medium',
      notificationEnabled = true,
      notes,
      tags,
    } = body;

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
        { status: 400 }
      );
    }

    // Look up company (DB-first)
    const cached = await secCacheService.getCompanyByTicker(ticker);
    let company = cached.data;
    if (!company) {
      company = await secApi.getCIKByTicker(ticker);
      if (company) {
        secCacheService.upsertCompanies([company]).catch(() => {});
      }
    }
    if (!company) {
      return NextResponse.json(
        { error: `Company not found: ${ticker}` },
        { status: 404 }
      );
    }

    // Ensure company exists in our database
    const { data: existingCompany, error: companyError } = await supabase
      .from('sec_companies')
      .upsert({
        cik: company.cik,
        ticker: company.ticker,
        company_name: company.name,
      }, {
        onConflict: 'cik',
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error upserting company:', companyError);
    }

    // Add to watchlist
    const { data: watchlistItem, error } = await supabase
      .from('sec_watchlist')
      .upsert({
        user_id: session.user.id,
        company_id: existingCompany?.id,
        ticker: company.ticker,
        cik: company.cik,
        form_types: formTypes,
        priority,
        notification_enabled: notificationEnabled,
        notes,
        tags,
      }, {
        onConflict: 'user_id,company_id',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      watchlistItem,
      company,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error adding to watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

// DELETE /api/sec/watchlist?ticker=AAPL
export async function DELETE(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    // Verify session with Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const id = searchParams.get('id');

    if (!ticker && !id) {
      return NextResponse.json(
        { error: 'Ticker or ID required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('sec_watchlist')
      .delete()
      .eq('user_id', session.user.id);

    if (id) {
      query = query.eq('id', id);
    } else if (ticker) {
      query = query.eq('ticker', ticker.toUpperCase());
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      removed: ticker || id,
    }, {
      headers: limiter.headers,
    });
  } catch (error) {
    console.error('[SEC API] Error removing from watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}
