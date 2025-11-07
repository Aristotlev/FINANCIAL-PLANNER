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

/**
 * Force refresh the user's Google profile picture
 * This endpoint fetches the latest profile picture from Google and updates the database
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("🔄 Force refresh avatar for:", session.user.email);

    // Get Google account and access token (Better Auth uses singular table names!)
    const accountResult = await pool.query(
      `SELECT "accessToken", "providerId" FROM "account" 
       WHERE "userId" = $1 AND "providerId" = 'google' 
       ORDER BY "createdAt" DESC LIMIT 1`,
      [session.user.id]
    );

    if (accountResult.rows.length === 0 || !accountResult.rows[0].accessToken) {
      return NextResponse.json(
        { 
          error: "No Google account found. Please sign out and sign in with Google.", 
          hint: "This feature only works with Google accounts."
        },
        { status: 400 }
      );
    }

    const accessToken = accountResult.rows[0].accessToken;

    // Fetch profile from Google
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!googleResponse.ok) {
      if (googleResponse.status === 401) {
        return NextResponse.json(
          { 
            error: "Google access token expired. Please sign out and sign in again.",
            hint: "Access tokens expire after about 1 hour. Sign out and sign back in to refresh."
          },
          { status: 400 }
        );
      }
      
      throw new Error(`Google API returned ${googleResponse.status}`);
    }

    const googleData = await googleResponse.json();
    console.log("✅ Fetched Google profile data:", {
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
    });

    // Update database (singular table name!)
    await pool.query(
      `UPDATE "user" 
       SET image = $1, 
           name = COALESCE(NULLIF(name, ''), $2),
           "updatedAt" = NOW() 
       WHERE id = $3`,
      [googleData.picture, googleData.name, session.user.id]
    );

    console.log("💾 Profile picture updated successfully!");

    return NextResponse.json({
      success: true,
      message: "Profile picture refreshed successfully!",
      data: {
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture,
      },
    });

  } catch (error: any) {
    console.error("❌ Error refreshing profile picture:", error);
    return NextResponse.json(
      { 
        error: "Failed to refresh profile picture",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
