import { NextResponse } from 'next/server';

/**
 * Helper to get environment variables at runtime without build-time inlining
 */
function getRuntimeEnv(key: string): string {
  const env = process.env;
  return (env[key] as string) || '';
}

export async function GET() {
  // Check for critical environment variables
  const envStatus = {
    // Build-time values (might be inlined)
    buildTime: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    // Runtime values (actual values in the container)
    runtime: {
      NEXT_PUBLIC_SUPABASE_URL: !!getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL'),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!getRuntimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: !!getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY'),
      BETTER_AUTH_SECRET: !!getRuntimeEnv('BETTER_AUTH_SECRET'),
    },
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    status: 'ok',
    env: envStatus,
  });
}

export const dynamic = 'force-dynamic';
