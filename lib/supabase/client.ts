import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseConfig, getAuthRedirectUrl } from '../env-config';

// Extend Window interface to include __ENV__
declare global {
  interface Window {
    __ENV__?: {
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      NEXT_PUBLIC_APP_URL?: string;
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
      NEXT_PUBLIC_GOOGLE_AI_API_KEY?: string;
      NEXT_PUBLIC_ELEVENLABS_API_KEY?: string;
      NEXT_PUBLIC_ELEVENLABS_VOICE_ID?: string;
    };
  }
}

// Helper to get Supabase credentials at runtime
const getSupabaseCredentials = () => {
  // In browser, prioritize window.__ENV__ (runtime config)
  if (typeof window !== 'undefined') {
    const windowEnv = window.__ENV__;
    const url = windowEnv?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = windowEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Only return if both values are actually present and non-empty
    if (url && key && url !== '' && key !== '') {
      return { url, key };
    }
    return { url: undefined, key: undefined };
  }
  
  // On server, get from process.env (should be set via Cloud Run env vars)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Only return if both values are actually present and non-empty
  if (url && key && url !== '' && key !== '') {
    return { url, key };
  }
  return { url: undefined, key: undefined };
};

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  try {
    const { url, key } = getSupabaseCredentials();
    return !!(url && key && url !== '' && key !== '');
  } catch (error) {
    // During SSR or build, this might fail - return false safely
    return false;
  }
};

// Create a dummy client for when Supabase is not configured
const createDummyClient = (): any => {
  const notConfiguredError = () => {
    // Silently return error - don't log warnings as env might be loading
    return Promise.resolve({ data: null, error: new Error('Supabase not configured') });
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      // Return mock auth object for auth.getUser() calls
      if (prop === 'auth') {
        return {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          updateUser: notConfiguredError,
          signIn: notConfiguredError,
          signOut: notConfiguredError,
        };
      }
      // Return mock function for table operations
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: [], error: null }),
          insert: notConfiguredError,
          update: notConfiguredError,
          delete: notConfiguredError,
          upsert: notConfiguredError,
        });
      }
      return notConfiguredError;
    }
  });
};

// Lazy initialization of Supabase client
let supabaseInstance: SupabaseClient<Database> | any | null = null;
let initializationAttempted = false;

const getSupabaseInstance = () => {
  // If we already have a valid instance, return it
  if (supabaseInstance && initializationAttempted) {
    return supabaseInstance;
  }
  
  const { url, key } = getSupabaseCredentials();
  
  if (url && key && url !== '' && key !== '') {
    // Get environment-aware configuration
    const config = getSupabaseConfig();
    
    try {
      supabaseInstance = createClient<Database>(url, key, config);
      initializationAttempted = true;
      
      // Log redirect URL in development (client-side only)
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        console.log('[SUPABASE] Auth redirect URL:', getAuthRedirectUrl());
        console.log('[SUPABASE] Initialized with URL:', url);
      }
    } catch (error) {
      // If createClient fails, use dummy client
      console.error('[SUPABASE] Failed to create client:', error);
      supabaseInstance = createDummyClient();
      initializationAttempted = true;
    }
  } else {
    // Credentials not available yet - return dummy client
    // Don't mark as attempted so we can retry later
    if (!supabaseInstance) {
      supabaseInstance = createDummyClient();
    }
    
    // If we're in the browser and haven't logged the warning yet, do it now
    if (typeof window !== 'undefined' && !initializationAttempted) {
      // Wait a bit to see if env script loads
      setTimeout(() => {
        const { url: retryUrl, key: retryKey } = getSupabaseCredentials();
        if (!retryUrl || !retryKey) {
          console.warn('[SUPABASE] Credentials not found. Using localStorage fallback.');
        } else {
          // Credentials are now available, reset instance to force re-initialization
          supabaseInstance = null;
          initializationAttempted = false;
        }
      }, 100);
    }
  }
  
  return supabaseInstance;
};

// Export a proxy that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (target, prop) => {
    const instance = getSupabaseInstance();
    return instance[prop];
  }
});

// Export helper to wait for Supabase to be ready
export const waitForSupabase = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isSupabaseConfigured()) {
      resolve(true);
      return;
    }
    
    // If we're not in a browser, resolve immediately (server-side)
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    
    // Wait for window.__ENV__ to be populated
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (isSupabaseConfigured()) {
        clearInterval(checkInterval);
        // Reset instance to force re-initialization with new credentials
        supabaseInstance = null;
        initializationAttempted = false;
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('[SUPABASE] Timeout waiting for credentials');
        resolve(false);
      }
    }, 100);
  });
};
