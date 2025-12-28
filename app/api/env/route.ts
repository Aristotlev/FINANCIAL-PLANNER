/**
 * Runtime Environment Variables API
 * 
 * This endpoint serves environment variables at runtime as a JavaScript file.
 * It's loaded before the app initializes to ensure client-side code has access
 * to necessary configuration (Supabase URL, API keys, etc.)
 * 
 * Security: Only NEXT_PUBLIC_ variables should be exposed here
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[ENV API] Request received');
    
    // Create JavaScript that sets window.__ENV__
    const envScript = `
(function() {
  'use strict';
  
  // Set environment variables on window object
  window.__ENV__ = {
    NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL || '')},
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')},
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${JSON.stringify(process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')},
    NEXT_PUBLIC_APP_URL: ${JSON.stringify(process.env['NEXT_PUBLIC_APP_URL'] || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'))},
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
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('[ENV API] CRITICAL: Supabase environment variables are missing on the server!');
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
