/**
 * Encrypted State Sync API
 * 
 * Provides secure endpoints for syncing encrypted state to Supabase.
 * Uses service_role key server-side to bypass RLS, with Better Auth
 * session validation for user authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  syncLimiter,
  getClientIdentifier,
  rateLimitResponse,
  addRateLimitHeaders,
  incrementCounter,
} from '@/lib/security/rate-limit';

// Create Supabase admin client with service_role key (server-side only)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Validate session and get user ID
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// GET - Retrieve encrypted state for current user
export async function GET(request: NextRequest) {
  incrementCounter('requests');
  
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Rate limiting
    const clientId = getClientIdentifier(request, userId);
    const rateLimitResult = syncLimiter.check(clientId);
    
    if (!rateLimitResult.allowed) {
      incrementCounter('rateLimited');
      return rateLimitResponse(rateLimitResult);
    }
    
    incrementCounter('syncPulls');
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('encrypted_state_snapshots')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for new users
      console.error('Error fetching encrypted state:', error);
      return NextResponse.json(
        { error: 'Failed to fetch state' },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { data: null, exists: false },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      data: {
        rev: data.rev,
        schemaVersion: data.schema_version,
        ciphertext: data.ciphertext,
        iv: data.iv,
        salt: data.salt,
        wrappedDek: data.wrapped_dek,
        dekIv: data.dek_iv,
        updatedAt: data.updated_at,
      },
      exists: true,
    });
  } catch (error) {
    incrementCounter('errors');
    console.error('Error in GET /api/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update encrypted state
export async function POST(request: NextRequest) {
  incrementCounter('requests');
  
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Rate limiting
    const clientId = getClientIdentifier(request, userId);
    const rateLimitResult = syncLimiter.check(clientId);
    
    if (!rateLimitResult.allowed) {
      incrementCounter('rateLimited');
      return rateLimitResponse(rateLimitResult);
    }
    
    incrementCounter('syncPushes');
    
    const body = await request.json();
    const { rev, schemaVersion, ciphertext, iv, salt, wrappedDek, dekIv } = body;
    
    // Validate required fields
    if (
      typeof rev !== 'number' ||
      typeof schemaVersion !== 'number' ||
      typeof ciphertext !== 'string' ||
      typeof iv !== 'string' ||
      typeof salt !== 'string' ||
      typeof wrappedDek !== 'string' ||
      typeof dekIv !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check if record exists and get current rev for conflict detection
    const { data: existing } = await supabase
      .from('encrypted_state_snapshots')
      .select('rev')
      .eq('user_id', userId)
      .single();
    
    // Conflict detection: if remote rev is higher, reject the write
    if (existing && existing.rev >= rev) {
      return NextResponse.json(
        { 
          error: 'Conflict', 
          message: 'Remote state is newer or same revision',
          remoteRev: existing.rev,
          localRev: rev,
        },
        { status: 409 }
      );
    }
    
    // Upsert the encrypted state
    const { error } = await supabase
      .from('encrypted_state_snapshots')
      .upsert({
        user_id: userId,
        rev,
        schema_version: schemaVersion,
        ciphertext,
        iv,
        salt,
        wrapped_dek: wrappedDek,
        dek_iv: dekIv,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (error) {
      console.error('Error saving encrypted state:', error);
      return NextResponse.json(
        { error: 'Failed to save state' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      savedRev: rev,
    });
  } catch (error) {
    incrementCounter('errors');
    console.error('Error in POST /api/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove encrypted state for current user
export async function DELETE(request: NextRequest) {
  incrementCounter('requests');
  
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Rate limiting (shares sync limiter)
    const clientId = getClientIdentifier(request, userId);
    const rateLimitResult = syncLimiter.check(clientId);
    
    if (!rateLimitResult.allowed) {
      incrementCounter('rateLimited');
      return rateLimitResponse(rateLimitResult);
    }
    
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('encrypted_state_snapshots')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting encrypted state:', error);
      return NextResponse.json(
        { error: 'Failed to delete state' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    incrementCounter('errors');
    console.error('Error in DELETE /api/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
