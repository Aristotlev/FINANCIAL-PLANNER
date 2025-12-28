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
      // Note: AI API keys (Google AI, ElevenLabs, Replicate) are SERVER-SIDE ONLY
      // They should NOT be in window.__ENV__ or have NEXT_PUBLIC_ prefix
      // Client-side code should call API routes instead
    };
  }
}

// Helper to get Supabase credentials at runtime
const getSupabaseCredentials = () => {
    // In browser, prioritize window.__ENV__ (runtime config)
    if (typeof window !== 'undefined') {
      const windowEnv = window.__ENV__;
      
      const url = windowEnv?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = windowEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;    // Only return if both values are actually present and non-empty
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

  // Create a chainable builder that mimics PostgrestBuilder
  const createChainableBuilder = () => {
    const builder: any = {
      then: (resolve: any) => resolve({ data: [], error: null }),
    };

    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert', 
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 
      'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 
      'rangeAdjacent', 'overlaps', 'textSearch', 'match', 'not', 'or', 'filter', 
      'order', 'limit', 'single', 'maybeSingle', 'csv', 'abortSignal'
    ];

    methods.forEach(method => {
      builder[method] = () => builder;
    });

    return builder;
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
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        };
      }
      // Return mock function for table operations
      if (prop === 'from') {
        return () => createChainableBuilder();
      }
      // For rpc calls
      if (prop === 'rpc') {
        return () => Promise.resolve({ data: null, error: null });
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
      setTimeout(async () => {
        let { url: retryUrl, key: retryKey } = getSupabaseCredentials();
        
        // If still not found, try fetching from API as a fallback
        if (!retryUrl || !retryKey) {
          console.log('[SUPABASE] Credentials missing after initial check. Trying fallback fetch...');
          try {
            const res = await fetch('/api/env', {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            if (res.ok) {
              const script = await res.text();
              // Execute script by adding it to the document
              // This is safer than eval() and works with CSP if 'unsafe-inline' is allowed
              const scriptEl = document.createElement('script');
              scriptEl.textContent = script;
              document.body.appendChild(scriptEl);
              
              // Give it a moment to execute
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Check again
              const creds = getSupabaseCredentials();
              retryUrl = creds.url;
              retryKey = creds.key;
              console.log('[SUPABASE] Fallback fetch result:', { hasUrl: !!retryUrl, hasKey: !!retryKey });
            } else {
              console.error('[SUPABASE] Fallback fetch failed:', res.status, res.statusText);
              try {
                const text = await res.text();
                console.error('[SUPABASE] Error body:', text.substring(0, 200));
              } catch (e) {}
            }
          } catch (e) {
            console.error('[SUPABASE] Failed to fetch fallback env vars:', e);
          }
        }

        if (!retryUrl || !retryKey) {
          console.warn('[SUPABASE] Credentials not found. Using localStorage fallback.');
          console.warn('[SUPABASE] Debug info:', { 
            windowEnv: typeof window !== 'undefined' ? window.__ENV__ : 'undefined',
            processEnvUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing'
          });
        } else {
          // Credentials are now available, reset instance to force re-initialization
          supabaseInstance = null;
          initializationAttempted = false;
          console.log('[SUPABASE] Credentials loaded via fallback.');
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

// Helper to ensure env vars are loaded
let envFetchPromise: Promise<void> | null = null;

const ensureEnvVars = async () => {
  if (isSupabaseConfigured()) return;
  
  if (!envFetchPromise) {
    envFetchPromise = (async () => {
      try {
        const res = await fetch('/api/env', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (res.ok) {
          const script = await res.text();
          const scriptEl = document.createElement('script');
          scriptEl.textContent = script;
          document.body.appendChild(scriptEl);
          // Give it a moment to execute
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          console.error('[SUPABASE] Failed to fetch fallback env vars:', res.status, res.statusText);
        }
      } catch (e) {
        console.error('[SUPABASE] Failed to fetch fallback env vars:', e);
      }
    })();
  }
  
  await envFetchPromise;
};

// Export helper to wait for Supabase to be ready
export const waitForSupabase = async (): Promise<boolean> => {
  if (isSupabaseConfigured()) return true;
  
  // If we're not in a browser, resolve immediately (server-side)
  if (typeof window === 'undefined') return false;

  // Try to fetch env vars if missing
  await ensureEnvVars();
  
  if (isSupabaseConfigured()) {
    // Reset instance to force re-initialization with new credentials
    supabaseInstance = null;
    initializationAttempted = false;
    return true;
  }

  // Polling as backup
  return new Promise((resolve) => {
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
