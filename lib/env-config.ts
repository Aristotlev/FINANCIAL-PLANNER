/**
 * Environment Configuration Manager
 * 
 * This module handles dynamic environment configuration across multiple domains.
 * It automatically detects the current domain and provides the correct configuration.
 * 
 * Features:
 * - Multi-domain support (localhost, Cloud Run, custom domains)
 * - Automatic domain detection
 * - Environment-specific configuration
 * - OAuth redirect URL management
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvConfig {
  appUrl: string;
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  authCallbackUrl: string;
  apiUrl: string;
}

/**
 * Get the current app URL based on the environment
 * This works on both server and client side
 */
export function getAppUrl(): string {
  // Server-side: Use environment variables
  if (typeof window === 'undefined') {
    // Check for explicit APP_URL first
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    
    // Cloud Run provides these environment variables
    if (process.env.K_SERVICE && process.env.CLOUD_RUN_SERVICE_URL) {
      return process.env.CLOUD_RUN_SERVICE_URL;
    }
    
    // Default to localhost for development
    return 'http://localhost:3000';
  }
  
  // Client-side: Use window.location
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
}

/**
 * Determine the current environment
 */
export function getEnvironment(): Environment {
  const url = getAppUrl();
  
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'development';
  }
  
  if (url.includes('staging') || url.includes('-dev.') || url.includes('-test.')) {
    return 'staging';
  }
  
  return 'production';
}

/**
 * Get the complete environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const appUrl = getAppUrl();
  const environment = getEnvironment();
  
  return {
    appUrl,
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    authCallbackUrl: `${appUrl}/auth/callback`,
    apiUrl: `${appUrl}/api`,
  };
}

/**
 * Get the OAuth redirect URL for Supabase
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const appUrl = getAppUrl();
  return `${appUrl}${path}`;
}

/**
 * Validate required environment variables
 */
export function validateEnv(): { isValid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Get Supabase configuration with proper redirects
 */
export function getSupabaseConfig() {
  const { authCallbackUrl } = getEnvConfig();
  
  return {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce' as const,
      redirectTo: authCallbackUrl,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  };
}

// Log configuration in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[ENV CONFIG]', {
    appUrl: getAppUrl(),
    environment: getEnvironment(),
    authCallbackUrl: getAuthRedirectUrl(),
  });
}
