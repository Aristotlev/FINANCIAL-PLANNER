/**
 * CSRF Token API
 * 
 * Provides CSRF tokens to authenticated clients for use in mutation requests.
 * 
 * Usage:
 * 1. Client calls GET /api/auth/csrf to get a token
 * 2. Client includes token in X-CSRF-Token header on POST/PUT/DELETE requests
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api/auth-wrapper';
import { createCsrfToken, setCsrfTokenCookie } from '@/lib/security/csrf';

export const GET = withAuth(async ({ user }: AuthenticatedRequest) => {
  // Generate a new CSRF token for this user
  const token = createCsrfToken(user.id);
  
  // Create response with token
  const response = NextResponse.json({
    csrfToken: token,
    expiresIn: 3600, // 1 hour
  });

  // Also set it as a cookie for double-submit pattern
  setCsrfTokenCookie(response, token);

  return response;
});
