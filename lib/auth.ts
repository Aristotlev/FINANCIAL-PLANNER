import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create PostgreSQL pool for Better Auth
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// IMPORTANT: Always use www canonical URL to prevent state_mismatch errors
// The OAuth flow MUST start and end on the exact same domain
const getAuthBaseURL = () => {
  if (process.env.NODE_ENV === "production") {
    // Always use canonical www URL in production
    return "https://www.omnifolio.app";
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const auth = betterAuth({
  database: pool,
  
  // Secret for signing tokens - required for production
  secret: process.env.BETTER_AUTH_SECRET,
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // CRITICAL: Must match exactly what's in Google Cloud Console
      redirectURI: "https://www.omnifolio.app/api/auth/callback/google",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  user: {
    // Include additional fields in the user object
    additionalFields: {
      image: {
        type: "string",
        required: false,
      },
    },
  },

  baseURL: getAuthBaseURL(),

  trustedOrigins: [
    "https://omnifolio.app",
    "https://www.omnifolio.app",
    "https://financial-planner-629380503119.europe-west1.run.app",
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "http://localhost:3000",
  ],

  advanced: {
    cookiePrefix: "money-hub",
    useSecureCookies: process.env.NODE_ENV === "production",
    // Use www domain for cookies
    crossSubDomainCookies: {
      enabled: true,
      domain: "www.omnifolio.app",
    },
  },

  // Configure where to redirect after social sign-in
  callbacks: {
    async onSignIn(user: any, account: any) {
      // Fetch and save Google profile picture
      if (account?.provider === 'google' && account?.access_token) {
        try {
          const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
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
              [googleData.picture, googleData.name, user.id]
            );
            
            console.log("💾 Saved profile picture to database");
          }
        } catch (error) {
          console.error("❌ Error fetching profile picture:", error);
        }
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
