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

/**
 * Get the Supabase admin client (service role)
 * This bypasses RLS - use with caution!
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminInstance;
}

/**
 * Check if the Supabase admin client can be created
 */
export function isSupabaseAdminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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
