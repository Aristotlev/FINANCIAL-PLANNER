import { createAuthClient } from "better-auth/client";

// Use relative URL to avoid CORS issues between www and non-www
// The browser will automatically use the current origin
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Always use the current origin to avoid CORS issues
    // This works for both www.omnifolio.app and omnifolio.app
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
