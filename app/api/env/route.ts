/**
 * Runtime Environment Variables API
 * 
 * This endpoint serves environment variables at runtime as a JavaScript file.
 * It's loaded before the app initializes to ensure client-side code has access
 * to necessary configuration (Supabase URL, API keys, etc.)
 * 
 * Security: Only NEXT_PUBLIC_ variables should be exposed here
 * 
 * IMPORTANT: We use dynamic property access (process.env[varName]) instead of
 * static access (process.env.NEXT_PUBLIC_*) because Next.js inlines NEXT_PUBLIC_*
 * variables at build time. Dynamic access ensures we read runtime values.
 */

import { NextResponse } from 'next/server';

// Helper to get env var at runtime (bypasses Next.js compile-time inlining)
const getEnvVar = (name: string): string => {
  // Use dynamic property access to prevent Next.js from inlining at build time
  const value = (process.env as Record<string, string | undefined>)[name];
  return value || '';
};

export async function GET() {
  try {
    // Read environment variables at runtime using dynamic access
    const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const googleMapsKey = getEnvVar('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    const appUrl = getEnvVar('NEXT_PUBLIC_APP_URL') || 'https://www.omnifolio.app';
    
    console.log('[ENV API] Request received, Supabase URL present:', !!supabaseUrl);
    
    // Create JavaScript that sets window.__ENV__
    const envScript = `
(function() {
  'use strict';
  
  // Set environment variables on window object
  window.__ENV__ = {
    NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(supabaseUrl)},
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)},
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${JSON.stringify(googleMapsKey)},
    NEXT_PUBLIC_APP_URL: ${JSON.stringify(appUrl)},
  };
  
  // Log in development
  console.log('[ENV API] Environment variables loaded:', {
    hasSupabaseUrl: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasMapsKey: !!window.__ENV__.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    appUrl: window.__ENV__.NEXT_PUBLIC_APP_URL,
  });
})();
`;

    // Check if critical variables are missing on the server
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[ENV API] CRITICAL: Supabase environment variables are missing on the server!');
      console.warn('[ENV API] Available env keys:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')));
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
