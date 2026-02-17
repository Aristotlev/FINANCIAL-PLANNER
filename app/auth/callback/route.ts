import { NextResponse } from 'next/server';

/**
 * Legacy OAuth callback route.
 * Google OAuth callbacks are now handled by Better Auth at /api/auth/callback/google.
 * This route redirects any stray callbacks to the home page.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // If a code arrives here, it was likely meant for Better Auth's callback.
    // Redirect to the Better Auth callback with the code preserved.
    const betterAuthCallback = new URL('/api/auth/callback/google', requestUrl.origin);
    betterAuthCallback.search = requestUrl.search;
    return NextResponse.redirect(betterAuthCallback);
  }

  // No code - just redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
