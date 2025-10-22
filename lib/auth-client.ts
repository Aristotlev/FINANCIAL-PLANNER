import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  
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
