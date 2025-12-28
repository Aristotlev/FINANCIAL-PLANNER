/**
 * Runtime Environment Variables API
 * 
 * This endpoint serves environment variables at runtime as a JavaScript file.
 * It's loaded before the app initializes to ensure client-side code has access
 * to necessary configuration (Supabase URL, API keys, etc.)
 * 
 * Security: Only NEXT_PUBLIC_ variables should be exposed here
 * 
 * IMPORTANT: We use indirect access through a helper function to prevent
 * Next.js from inlining NEXT_PUBLIC_* variables at build time.
 */

import { NextResponse } from 'next/server';

// Use a separate function that's not analyzed at build time
// The indirection through 'envObj' prevents static analysis
function getEnvValue(key: string): string {
  const envObj = process.env;
  return (envObj[key] as string) || '';
}

// List of allowed public env var names (prevents arbitrary access)
const PUBLIC_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

export async function GET() {
  try {
    // Build env object dynamically at runtime
    const envValues: Record<string, string> = {};
    
    for (const varName of PUBLIC_ENV_VARS) {
      envValues[varName] = getEnvValue(varName);
    }
    
    // Set default for app URL
    if (!envValues.NEXT_PUBLIC_APP_URL) {
      envValues.NEXT_PUBLIC_APP_URL = 'https://www.omnifolio.app';
    }
    
    // Always log in production to help debug
    console.log('[ENV API] Runtime env check:', {
      hasSupabaseUrl: !!envValues.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlPrefix: envValues.NEXT_PUBLIC_SUPABASE_URL ? envValues.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) : 'MISSING',
      nodeEnv: process.env.NODE_ENV,
    });
    
    // Create JavaScript that sets window.__ENV__
    const envScript = `
(function() {
  'use strict';
  
  // Set environment variables on window object
  window.__ENV__ = ${JSON.stringify(envValues)};
  
  // Log for debugging
  console.log('[ENV API] Environment variables loaded:', {
    hasSupabaseUrl: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasMapsKey: !!window.__ENV__.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    appUrl: window.__ENV__.NEXT_PUBLIC_APP_URL,
  });
})();
`;

    // Check if critical variables are missing on the server
    if (!envValues.NEXT_PUBLIC_SUPABASE_URL || !envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('[ENV API] CRITICAL: Supabase environment variables are missing on the server!');
      console.warn('[ENV API] Checking process.env directly...');
      console.warn('[ENV API] NEXT_PUBLIC keys found:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')));
    }

    // Return as JavaScript with proper MIME type
    return new NextResponse(envScript, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[ENV API] Error generating environment script:', error);
    
    // Return empty but valid JavaScript on error
    const fallbackScript = `
(function() {
  console.error('[ENV API] Failed to load environment variables');
  window.__ENV__ = {};
})();
`;
    
    return new NextResponse(fallbackScript, {
      status: 200, // Still return 200 to avoid blocking app
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
      },
    });
  }
}

// Prevent caching of this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;
