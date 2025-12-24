/**
 * API Route Authentication Wrapper
 * 
 * This module provides utilities for protecting API routes with Better Auth.
 * It validates the user session and provides the user ID for database queries.
 * 
 * SECURITY:
 * - Always use withAuth for routes that access user-specific data
 * - The user ID is validated via Better Auth, not from client input
 */

import { auth } from '../auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  request: NextRequest;
}

/**
 * Get the current authenticated user from the request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined,
      image: session.user.image || undefined,
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Wrapper for API route handlers that require authentication
 * 
 * Usage:
 * ```ts
 * export const GET = withAuth(async ({ user, request }) => {
 *   // user.id is guaranteed to be the authenticated user's ID
 *   const data = await getData(user.id);
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withAuth(
  handler: (context: AuthenticatedRequest) => Promise<Response>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    return handler({ user, request });
  };
}

/**
 * Wrapper for API route handlers that optionally use authentication
 * The handler receives user or null
 */
export function withOptionalAuth(
  handler: (context: { user: AuthenticatedUser | null; request: NextRequest }) => Promise<Response>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const user = await getAuthenticatedUser();
    return handler({ user, request });
  };
}

/**
 * Validate that the provided user ID matches the authenticated user
 * Use this when receiving user_id from client to prevent unauthorized access
 */
export async function validateUserOwnership(providedUserId: string): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.id === providedUserId;
}
