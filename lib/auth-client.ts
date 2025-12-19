import { createAuthClient } from "better-auth/client";

// CRITICAL: Always use the canonical www URL for OAuth
// This prevents state_mismatch errors
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // In production, ALWAYS use the canonical www URL
    // This ensures OAuth state cookie matches between start and callback
    if (window.location.hostname === 'www.omnifolio.app' || 
        window.location.hostname === 'omnifolio.app') {
      return 'https://www.omnifolio.app';
    }
    // For Cloud Run or other deployments, use current origin
    if (window.location.hostname.includes('run.app')) {
      return window.location.origin;
    }
    // For localhost development
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  
  // Add fetch timeout to prevent hanging
  fetchOptions: {
    credentials: 'include', // Ensure cookies are sent
    onError(context) {
      console.error('Auth API error:', context);
    },
    onRequest(context) {
      // Optional: Add request logging in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('Auth request:', context.url);
      }
    },
  },
});

// Export convenient methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // Social sign-in methods
  signIn: { social: socialSignIn },
} = authClient;
