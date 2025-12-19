import { createAuthClient } from "better-auth/client";

// Always use the production URL for auth to ensure cookie consistency
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // In production, always use omnifolio.app regardless of how user accessed the site
    // Handle both www.omnifolio.app and omnifolio.app
    if (window.location.hostname.includes('run.app') || 
        window.location.hostname.includes('omnifolio.app')) {
      return 'https://omnifolio.app';
    }
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  
  // Add fetch timeout to prevent hanging
  fetchOptions: {
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
