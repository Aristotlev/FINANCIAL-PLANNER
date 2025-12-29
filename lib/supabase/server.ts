/**
 * Server-side Supabase Client
 * 
 * This module provides a Supabase client that uses the service role key.
 * It should ONLY be used in server-side code (API routes, server components).
 * 
 * SECURITY:
 * - The service role key bypasses RLS, so this client can access all data
 * - Always validate the user via Better Auth before accessing user data
 * - Always filter by user_id in queries
 * 
 * DO NOT import this file in client-side code!
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Ensure this file is only used server-side
if (typeof window !== 'undefined') {
  throw new Error(
    'supabase/server.ts should only be imported in server-side code. ' +
    'Use supabase/client.ts for client-side code.'
  );
}

let supabaseAdminInstance: SupabaseClient<Database> | null = null;
let lastCredentials: { url: string; key: string } | null = null;

/**
 * Helper to get environment variables at runtime without build-time inlining
 * Uses dynamic access to prevent Next.js from inlining values at build time
 */
function getRuntimeEnv(key: string): string {
  // Access process.env dynamically to avoid build-time inlining
  const env = process.env;
  const value = env[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Get the Supabase admin client (service role)
 * This bypasses RLS - use with caution!
 * 
 * Note: The client is cached, but if credentials change (e.g., during container restart),
 * a new client will be created automatically.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  const supabaseUrl = getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY');

  // Check if we need to create a new instance
  // (first call, credentials missing previously but now available, or credentials changed)
  const credentialsChanged = lastCredentials && 
    (lastCredentials.url !== supabaseUrl || lastCredentials.key !== supabaseServiceKey);
  
  if (supabaseAdminInstance && !credentialsChanged) {
    return supabaseAdminInstance;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[SUPABASE SERVER] Missing credentials:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseServiceKey?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  // Store credentials to detect changes
  lastCredentials = { url: supabaseUrl, key: supabaseServiceKey };

  supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('[SUPABASE SERVER] Admin client initialized successfully');

  return supabaseAdminInstance;
}

/**
 * Check if the Supabase admin client can be created
 */
export function isSupabaseAdminConfigured(): boolean {
  const url = getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY');
  
  const configured = !!(url && key && url.length > 0 && key.length > 0);
  
  if (!configured) {
    console.warn('[SUPABASE SERVER] Configuration check failed:', {
      hasUrl: !!url,
      hasServiceKey: !!key,
      urlLength: url?.length || 0,
      keyLength: key?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });
  }
  
  return configured;
}

/**
 * Execute a query with user validation
 * This is a helper that ensures the user is validated before accessing their data
 */
export async function withUserValidation<T>(
  userId: string | null | undefined,
  callback: (supabase: SupabaseClient<Database>, userId: string) => Promise<T>
): Promise<T> {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const supabase = getSupabaseAdmin();
  return callback(supabase, userId);
}
