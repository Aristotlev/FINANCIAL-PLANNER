import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("🔍 Fetching OAuth data for user:", session.user.id);

    // Query the accounts table to get the Google OAuth account
    const accountResult = await pool.query(
      `SELECT provider, provider_account_id, access_token, refresh_token, expires_at 
       FROM accounts 
       WHERE user_id = $1 AND provider = 'google'`,
      [session.user.id]
    );

    if (accountResult.rows.length === 0) {
      return NextResponse.json({ 
        error: "No Google account linked",
        message: "Please sign in with Google to sync profile picture"
      }, { status: 404 });
    }

    const account = accountResult.rows[0];
    console.log("📱 Found Google account:", account.provider_account_id);

    // Fetch user info from Google
    if (account.access_token) {
      try {
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        });

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();
          console.log("✅ Google user info:", googleData);
          
          // Update user's image in the database
          const updateResult = await pool.query(
            'UPDATE users SET image = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [googleData.picture, session.user.id]
          );

          console.log("💾 Updated user in database:", updateResult.rows[0]);

          return NextResponse.json({
            success: true,
            message: "Profile picture synced successfully",
            image: googleData.picture,
            user: updateResult.rows[0],
          });
        } else {
          const errorText = await googleResponse.text();
          console.error("❌ Google API error:", googleResponse.status, errorText);
          
          return NextResponse.json({
            error: "Failed to fetch from Google",
            status: googleResponse.status,
            message: "Access token may be expired. Please sign out and sign in again.",
          }, { status: 400 });
        }
      } catch (error) {
        console.error("❌ Error fetching from Google:", error);
        return NextResponse.json({
          error: "Failed to fetch profile from Google",
          details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: "No access token available",
      message: "Please sign out and sign in with Google again to refresh your access token",
    }, { status: 400 });
  } catch (error) {
    console.error("❌ Sync error:", error);
    return NextResponse.json({ 
      error: "Failed to sync profile picture",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
