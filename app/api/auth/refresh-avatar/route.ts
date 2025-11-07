import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Pool } from "pg";

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Force refresh the user's Google profile picture
 * Call this endpoint to fetch the latest profile picture from Google
 * 
 * GET /api/auth/refresh-avatar
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('🔄 Force refreshing avatar for user:', session.user.email);

    // Get user's Google account
    const result = await pool.query(
      `SELECT access_token, provider 
       FROM accounts 
       WHERE user_id = $1 AND provider = 'google'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [session.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].access_token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No Google account found or access token expired. Please sign out and sign in again with Google.' 
        },
        { status: 400 }
      );
    }

    const accessToken = result.rows[0].access_token;

    // Fetch from Google
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!googleResponse.ok) {
      console.error('❌ Google API error:', googleResponse.status);
      return NextResponse.json(
        { 
          success: false, 
          error: `Google API returned ${googleResponse.status}. Your session may have expired. Please sign out and sign in again.`,
          status: googleResponse.status
        },
        { status: 400 }
      );
    }

    const googleData = await googleResponse.json();
    console.log('✅ Fetched Google profile:', {
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
    });

    // Update database
    await pool.query(
      `UPDATE users 
       SET image = $1, 
           name = COALESCE(NULLIF(name, ''), $2),
           updated_at = NOW() 
       WHERE id = $3`,
      [googleData.picture, googleData.name, session.user.id]
    );

    console.log('💾 Saved profile picture to database');

    return NextResponse.json({
      success: true,
      message: 'Profile picture refreshed successfully!',
      data: {
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture,
      }
    });

  } catch (error: any) {
    console.error('❌ Error refreshing avatar:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to refresh avatar' 
      },
      { status: 500 }
    );
  }
}
