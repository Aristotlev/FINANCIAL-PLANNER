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
 * - Rate limiting prevents abuse (100 requests/minute per user)
 * - All access is logged for auditing
 * - CSRF protection on mutations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api/auth-wrapper';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server';
import { withRateLimit, RateLimitPresets, getSubscriptionRateLimit } from '@/lib/security/rate-limiter';
import { dataAudit, logApiRequest, logApiResponse } from '@/lib/security/audit-logger';
import { validateCsrf } from '@/lib/security/csrf';
import { encrypt, decrypt } from '@/lib/security/encryption';

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
  | 'portfolio_snapshots'
  | 'user_subscriptions'
  | 'user_usage'
  | 'crypto_transactions'
  | 'stock_transactions';

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
  'user_subscriptions',
  'user_usage',
  'crypto_transactions',
  'stock_transactions',
];

// Fields that should be encrypted in the database
const SENSITIVE_FIELDS = [
  'openai_api_key',
  'gemini_api_key',
  'finnhub_api_key',
  'alpha_vantage_api_key',
  'elevenlabs_api_key',
  'replicate_api_token',
  'stripe_customer_id',
  'exchange_api_key',
  'exchange_api_secret',
  'wallet_private_key', // If ever stored (shouldn't be, but just in case)
];

/**
 * Encrypt sensitive fields in a record (recursive)
 */
function encryptSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => encryptSensitiveData(item));
  }
  
  const encrypted = { ...data };
  
  for (const key in encrypted) {
    if (Object.prototype.hasOwnProperty.call(encrypted, key)) {
      // Check if this key is in our sensitive list
      if (SENSITIVE_FIELDS.includes(key)) {
        if (encrypted[key] && typeof encrypted[key] === 'string' && !encrypted[key].includes(':')) {
          try {
            encrypted[key] = encrypt(encrypted[key]);
          } catch (e) {
            console.error(`Failed to encrypt field ${key}:`, e);
          }
        }
      } else if (typeof encrypted[key] === 'object' && encrypted[key] !== null) {
        // Recursively check nested objects (like 'preferences' JSON column)
        encrypted[key] = encryptSensitiveData(encrypted[key]);
      }
    }
  }
  
  return encrypted;
}

/**
 * Decrypt sensitive fields in a record (recursive)
 */
function decryptSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => decryptSensitiveData(item));
  }
  
  const decrypted = { ...data };
  
  for (const key in decrypted) {
    if (Object.prototype.hasOwnProperty.call(decrypted, key)) {
      // Check if this key is in our sensitive list
      if (SENSITIVE_FIELDS.includes(key)) {
        if (decrypted[key] && typeof decrypted[key] === 'string' && decrypted[key].includes(':')) {
          try {
            decrypted[key] = decrypt(decrypted[key]);
          } catch (e) {
            // If decryption fails, return original value
            console.warn(`Failed to decrypt field ${key}:`, e);
          }
        }
      } else if (typeof decrypted[key] === 'object' && decrypted[key] !== null) {
        // Recursively check nested objects
        decrypted[key] = decryptSensitiveData(decrypted[key]);
      }
    }
  }
  
  return decrypted;
}

function isValidTable(table: string): table is DataTable {
  const allowed = ALLOWED_TABLES.includes(table as DataTable);
  if (!allowed) {
      console.log(`[API Validation] Rejected table: "${table}"`);
      console.log(`[API Validation] Allowed: ${ALLOWED_TABLES.join(', ')}`);
  }
  return allowed;
}

/**
 * Apply rate limiting based on user subscription
 * Premium users get higher limits
 */
async function checkRateLimitForUser(request: NextRequest, userId: string): Promise<{
  success: boolean;
  response?: NextResponse;
}> {
  // TODO: Get user's subscription plan from database
  // For now, use standard rate limits
  const rateLimitConfig = RateLimitPresets.API_DATA;
  
  const result = withRateLimit(request, rateLimitConfig, userId);
  
  if (!result.success && result.response) {
    return { success: false, response: result.response };
  }
  
  return { success: true };
}

// GET: Fetch user data
export const GET = withAuth(async ({ user, request }: AuthenticatedRequest) => {
  const requestId = logApiRequest(request, user.id);
  
  // Apply rate limiting
  const rateLimitResult = await checkRateLimitForUser(request, user.id);
  if (!rateLimitResult.success && rateLimitResult.response) {
    logApiResponse(request, 429, requestId, user.id);
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  // Debug logging
  if (table === 'crypto_transactions') {
    console.log(`[API] Received request for table: ${table}`);
    console.log(`[API] Is valid table? ${isValidTable(table)}`);
  }

  if (!table || !isValidTable(table)) {
    logApiResponse(request, 400, requestId, user.id);
    return NextResponse.json(
      { error: 'Invalid table', message: 'Specify a valid table parameter' },
      { status: 400 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    logApiResponse(request, 500, requestId, user.id);
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

      // Decrypt sensitive data before returning to client
      const decryptedData = data ? decryptSensitiveData(data) : null;

      // Log data access
      dataAudit.access(user.id, table, data ? 1 : 0, request);
      logApiResponse(request, 200, requestId, user.id);
      return NextResponse.json({ data: decryptedData });
    }

    // Standard query for other tables
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Decrypt sensitive data in list results (e.g. trading accounts with API keys)
    const decryptedList = data ? data.map(decryptSensitiveData) : [];

    // Log data access
    dataAudit.access(user.id, table, data?.length || 0, request);
    logApiResponse(request, 200, requestId, user.id);
    return NextResponse.json({ data: decryptedList });
  } catch (error: any) {
    console.error(`Error fetching ${table}:`, error);
    logApiResponse(request, 500, requestId, user.id, { error: error.message });
    return NextResponse.json(
      { error: 'Database error', message: error.message },
      { status: 500 }
    );
  }
});

// POST: Create or update user data
export const POST = withAuth(async ({ user, request }: AuthenticatedRequest) => {
  const requestId = logApiRequest(request, user.id);
  
  // Apply rate limiting
  const rateLimitResult = await checkRateLimitForUser(request, user.id);
  if (!rateLimitResult.success && rateLimitResult.response) {
    logApiResponse(request, 429, requestId, user.id);
    return rateLimitResult.response;
  }

  // Validate CSRF token for mutations
  const csrfCheck = validateCsrf(request, user.id);
  if (!csrfCheck.valid && csrfCheck.error) {
    logApiResponse(request, 403, requestId, user.id, { reason: 'CSRF validation failed' });
    return csrfCheck.error;
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (!table || !isValidTable(table)) {
    logApiResponse(request, 400, requestId, user.id);
    return NextResponse.json(
      { error: 'Invalid table', message: 'Specify a valid table parameter' },
      { status: 400 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    logApiResponse(request, 500, requestId, user.id);
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

    // Encrypt sensitive data before saving
    const encryptedRecord = encryptSensitiveData(record);

    // Remove any user_id that was passed from client (security)
    if (body.user_id && body.user_id !== user.id) {
      console.warn(`Attempted to set user_id to ${body.user_id} but authenticated as ${user.id}`);
    }

    // Special handling for user_preferences (uses user_id as primary key)
    if (table === 'user_preferences') {
      const { data, error } = await supabase
        .from(table)
        .upsert(encryptedRecord, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      
      // Return decrypted data to client so they see what they just saved
      const decryptedData = decryptSensitiveData(data);

      // Log data modification
      dataAudit.modify(user.id, table, user.id, request);
      logApiResponse(request, 200, requestId, user.id);
      return NextResponse.json({ data: decryptedData });
    }

    const { data, error } = await supabase
      .from(table)
      .upsert(encryptedRecord)
      .select()
      .single();

    if (error) throw error;

    // Return decrypted data
    const decryptedData = decryptSensitiveData(data);

    // Log data modification
    dataAudit.modify(user.id, table, (data as any)?.id || 'new', request);
    logApiResponse(request, 200, requestId, user.id);
    return NextResponse.json({ data: decryptedData });
  } catch (error: any) {
    console.error(`Error saving to ${table}:`, error);
    logApiResponse(request, 500, requestId, user.id, { error: error.message });
    return NextResponse.json(
      { error: 'Database error', message: error.message },
      { status: 500 }
    );
  }
});

// DELETE: Delete user data
export const DELETE = withAuth(async ({ user, request }: AuthenticatedRequest) => {
  const requestId = logApiRequest(request, user.id);
  
  // Apply rate limiting
  const rateLimitResult = await checkRateLimitForUser(request, user.id);
  if (!rateLimitResult.success && rateLimitResult.response) {
    logApiResponse(request, 429, requestId, user.id);
    return rateLimitResult.response;
  }

  // Validate CSRF token for mutations
  const csrfCheck = validateCsrf(request, user.id);
  if (!csrfCheck.valid && csrfCheck.error) {
    logApiResponse(request, 403, requestId, user.id, { reason: 'CSRF validation failed' });
    return csrfCheck.error;
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const id = searchParams.get('id');

  if (!table || !isValidTable(table)) {
    logApiResponse(request, 400, requestId, user.id);
    return NextResponse.json(
      { error: 'Invalid table', message: 'Specify a valid table parameter' },
      { status: 400 }
    );
  }

  if (!id) {
    logApiResponse(request, 400, requestId, user.id);
    return NextResponse.json(
      { error: 'Missing id', message: 'Specify an id parameter' },
      { status: 400 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    logApiResponse(request, 500, requestId, user.id);
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

    // Log data deletion
    dataAudit.delete(user.id, table, id, request);
    logApiResponse(request, 200, requestId, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting from ${table}:`, error);
    logApiResponse(request, 500, requestId, user.id, { error: error.message });
    return NextResponse.json(
      { error: 'Database error', message: error.message },
      { status: 500 }
    );
  }
});
