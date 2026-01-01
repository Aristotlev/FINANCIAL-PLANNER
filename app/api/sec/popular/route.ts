/**
 * SEC Popular Searches API
 * Get most popular companies searched by users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.rpc('get_popular_sec_searches', {
      p_limit: limit,
      p_days: days
    });

    if (error) {
      console.error('[SEC Popular] RPC Error:', error);
      // Fallback to a simple query if RPC fails or isn't migrated yet
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('sec_search_history')
        .select('ticker, company_name, cik')
        .not('ticker', 'is', null)
        .limit(limit);
        
      if (fallbackError) throw fallbackError;
      return NextResponse.json({ results: fallbackData || [] });
    }

    return NextResponse.json({ 
      results: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('[SEC Popular] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular searches' },
      { status: 500 }
    );
  }
}
