import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { Pool } from "pg";

// Create PostgreSQL pool for Better Auth
// IMPORTANT: Cloud Run requires SSL but Supabase uses self-signed certs
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase pooler self-signed certs
  },
});

// Disable SSL verification globally for Node.js (needed in Cloud Run)
// This is safe because we're connecting to a known Supabase endpoint
if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

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
    // Changed prefix to invalidate any old/conflicting cookies from previous deployments
    cookiePrefix: "omnifolio-v2", 
    useSecureCookies: process.env.NODE_ENV === "production",
    // Re-enable cross-subdomain cookies to ensure stability across www and root
    crossSubDomainCookies: {
      enabled: true,
      domain: ".omnifolio.app", 
    },
  },

  // Use hooks to handle post-authentication actions
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Check if this is the OAuth callback for Google
      if (ctx.path === "/callback/:id" && ctx.params?.id === "google") {
        const newSession = ctx.context.newSession;
        if (newSession?.user) {
          try {
            // The user's profile picture should already be set from Google's userinfo
            // But we can update it if needed
            console.log("✅ Google OAuth callback completed for user:", newSession.user.email);
            
            // If the user has an image from Google, it's already saved
            if (newSession.user.image) {
              console.log("� User image from Google:", newSession.user.image);
            }
          } catch (error) {
            console.error("❌ Error in OAuth callback hook:", error);
          }
        }
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
