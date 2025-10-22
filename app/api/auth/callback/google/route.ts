import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create the default handlers
const { GET: defaultGET, POST: defaultPOST } = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  // Let Better Auth handle the OAuth callback first
  const response = await defaultGET(request);
  
  // After successful OAuth, fetch and save profile picture
  try {
    // Get the session that was just created
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (session?.user?.id) {
      console.log("🔵 OAuth callback - User authenticated:", session.user.id);
      
      // Fetch the Google account data
      const accountResult = await pool.query(
        `SELECT access_token, provider_account_id 
         FROM accounts 
         WHERE user_id = $1 AND provider = 'google'
         ORDER BY created_at DESC
         LIMIT 1`,
        [session.user.id]
      );

      if (accountResult.rows.length > 0 && accountResult.rows[0].access_token) {
        const accessToken = accountResult.rows[0].access_token;
        console.log("📱 Found Google access token");

        // Fetch profile data from Google
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();
          console.log("✅ Fetched Google profile:", {
            email: googleData.email,
            picture: googleData.picture,
          });

          // Update user's profile picture in database
          await pool.query(
            `UPDATE users 
             SET image = $1, 
                 name = COALESCE(NULLIF(name, ''), $2),
                 updated_at = NOW() 
             WHERE id = $3`,
            [googleData.picture, googleData.name, session.user.id]
          );
          
          console.log("💾 Saved profile picture to database");
        } else {
          console.warn("⚠️ Failed to fetch Google profile:", googleResponse.status);
        }
      }
    }
  } catch (error) {
    // Don't fail the OAuth flow if profile picture fetch fails
    console.error("❌ Error fetching profile picture:", error);
  }

  return response;
}

export { defaultPOST as POST };
