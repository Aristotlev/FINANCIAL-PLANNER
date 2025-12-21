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

// Fix for local development: Ensure production URLs in .env.local don't interfere
if (process.env.NODE_ENV !== "production") {
  // These might be set in .env.local pointing to production, which confuses better-auth
  // We want to force localhost for development
  if (process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL !== "http://localhost:3000") {
    console.log("⚠️ Overriding BETTER_AUTH_URL for development (was " + process.env.BETTER_AUTH_URL + ")");
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  }
}

// IMPORTANT: Always use www canonical URL to prevent state_mismatch errors
// The OAuth flow MUST start and end on the exact same domain
const getAuthBaseURL = () => {
  if (process.env.NODE_ENV === "production") {
    // Always use canonical www URL in production
    return "https://www.omnifolio.app";
  }
  // FORCE localhost:3000 in development to avoid redirecting to production
  return "http://localhost:3000";
};

// Debug logging for OAuth credentials
console.log("Auth Config Debug:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Base URL:", getAuthBaseURL());
console.log("BETTER_AUTH_URL (env):", process.env.BETTER_AUTH_URL);

if (process.env.NODE_ENV === "production") {
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + "..." : "MISSING");
  console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.substring(0, 5) + "..." : "MISSING");
  console.log("NEXT_PUBLIC_BETTER_AUTH_URL:", process.env.NEXT_PUBLIC_BETTER_AUTH_URL);
}

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
      clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      // Explicitly set redirectURI to ensure it matches exactly what Google expects
      redirectURI: process.env.NODE_ENV === "production" 
        ? "https://www.omnifolio.app/api/auth/callback/google"
        : "http://localhost:3000/api/auth/callback/google",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    // Disable cookie cache in development to prevent stale state issues
    cookieCache: {
      enabled: process.env.NODE_ENV === "production",
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
      enabled: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? ".omnifolio.app" : undefined, 
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
