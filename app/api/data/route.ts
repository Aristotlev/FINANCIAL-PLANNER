/**
 * Secure Data API Route
 * 
 * This API route provides secure access to user data.
 * It validates the user via Better Auth and uses the service role to access Supabase.
 * 
 * SECURITY:
 * - User is validated via Better Auth session
 * - Service role key is used server-side only
 * - All queries are filtered by the authenticated user's ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api/auth-wrapper';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server';

type DataTable = 
  | 'cash_accounts'
  | 'crypto_holdings'
  | 'stock_holdings'
  | 'trading_accounts'
  | 'savings_accounts'
  | 'real_estate'
  | 'valuable_items'
  | 'expense_categories'
  | 'income_sources'
  | 'tax_profiles'
  | 'subscriptions'
  | 'debt_accounts'
  | 'user_preferences'
  | 'portfolio_snapshots';

const ALLOWED_TABLES: DataTable[] = [
  'cash_accounts',
  'crypto_holdings',
  'stock_holdings',
  'trading_accounts',
  'savings_accounts',
  'real_estate',
  'valuable_items',
  'expense_categories',
  'income_sources',
  'tax_profiles',
  'subscriptions',
  'debt_accounts',
  'user_preferences',
  'portfolio_snapshots',
];

function isValidTable(table: string): table is DataTable {
  return ALLOWED_TABLES.includes(table as DataTable);
}

// GET: Fetch user data
export const GET = withAuth(async ({ user, request }: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (!table || !isValidTable(table)) {
    return NextResponse.json(
      { error: 'Invalid table', message: 'Specify a valid table parameter' },
      { status: 400 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // Special handling for user_preferences (uses user_id as primary key)
    if (table === 'user_preferences') {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return NextResponse.json({ data: data || null });
    }

    // Standard query for other tables
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error(`Error fetching ${table}:`, error);
    return NextResponse.json(
      { error: 'Database error', message: error.message },
      { status: 500 }
    );
  }
});

// POST: Create or update user data
export const POST = withAuth(async ({ user, request }: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (!table || !isValidTable(table)) {
    return NextResponse.json(
      { error: 'Invalid table', message: 'Specify a valid table parameter' },
      { status: 400 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Ensure user_id is set to the authenticated user
    const record = {
      ...body,
      user_id: user.id,
    };

    // Remove any user_id that was passed from client (security)
    if (body.user_id && body.user_id !== user.id) {
      console.warn(`Attempted to set user_id to ${body.user_id} but authenticated as ${user.id}`);
    }

    // Special handling for user_preferences (uses user_id as primary key)
    if (table === 'user_preferences') {
      const { data, error } = await supabase
        .from(table)
        .upsert(record, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    const { data, error } = await supabase
      .from(table)
      .upsert(record)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error(`Error saving to ${table}:`, error);
    return NextResponse.json(
      { error: 'Database error', message: error.message },
      { status: 500 }
    );
  }
});

// DELETE: Delete user data
export const DELETE = withAuth(async ({ user, request }: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const id = searchParams.get('id');

  if (!table || !isValidTable(table)) {
    return NextResponse.json(
      { error: 'Invalid table', message: 'Specify a valid table parameter' },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: 'Missing id', message: 'Specify an id parameter' },
      { status: 400 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Delete with user_id check for security
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting from ${table}:`, error);
    return NextResponse.json(
      { error: 'Database error', message: error.message },
      { status: 500 }
    );
  }
});
