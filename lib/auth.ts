import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create PostgreSQL pool for Better Auth
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Determine the base URL for auth - always use non-www in production
const getAuthBaseURL = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Normalize www to non-www
  return appUrl.replace('://www.', '://');
};

export const auth = betterAuth({
  database: pool,
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Use the normalized base URL for redirect
      redirectURI: `${getAuthBaseURL()}/api/auth/callback/google`,
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
    crossSubDomainCookies: {
      enabled: true,
      domain: ".omnifolio.app", // Allow cookies across subdomains
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
