/**
 * Secure Data API Client
 * 
 * This module provides client-side functions to access user data
 * through the secure server-side API endpoint.
 * 
 * The server validates the user via Better Auth and uses the
 * service role key to access Supabase.
 * 
 * CSRF Protection:
 * - Mutation requests (POST, DELETE) include CSRF tokens when enabled
 * - Token is fetched from /api/auth/csrf and cached
 */

type DataTable = 
  | 'cash_accounts'
  | 'crypto_holdings'
  | 'stock_holdings'
  | 'trading_accounts'
  | 'savings_accounts'
  | 'real_estate'
  | 'valuable_items'
  | 'expense_categories'
  | 'income_sources'
  | 'tax_profiles'
  | 'subscriptions'
  | 'debt_accounts'
  | 'user_preferences'
  | 'portfolio_snapshots';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// CSRF token cache
let csrfToken: string | null = null;
let csrfTokenExpiry: number = 0;

/**
 * Get CSRF token for mutation requests
 * Caches the token for 50 minutes (tokens expire after 1 hour)
 */
async function getCsrfToken(): Promise<string | null> {
  // Return cached token if still valid
  if (csrfToken && Date.now() < csrfTokenExpiry) {
    return csrfToken;
  }

  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      // CSRF endpoint not available or user not authenticated
      return null;
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    // Cache for 50 minutes
    csrfTokenExpiry = Date.now() + 50 * 60 * 1000;
    return csrfToken;
  } catch {
    return null;
  }
}

/**
 * Clear cached CSRF token (call on logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenExpiry = 0;
}

/**
 * Fetch data from a table through the secure API
 */
export async function fetchData<T = any>(table: DataTable): Promise<T | null> {
  try {
    // Construct full URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/data?table=${table}`;

    // Retry logic
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated - return null silently
            return null;
          }
          const error = await response.json();
          console.error(`Error fetching ${table}:`, error.message);
          return null;
        }

        const result: ApiResponse<T> = await response.json();
        return result.data ?? null;
      } catch (error: any) {
        // Don't log network errors like "Failed to fetch" - these are common during dev/page transitions
        if (error?.message !== 'Failed to fetch') {
          console.error(`Error fetching ${table}:`, error);
        }
        
        // Retry on network error
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    return null;
  } catch (error: any) {
    return null;
  }
}

/**
 * Save data to a table through the secure API
 */
export async function saveData<T = any>(table: DataTable, data: T): Promise<T | null> {
  try {
    // Get CSRF token for mutations (if available)
    const token = await getCsrfToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Include CSRF token if available
    if (token) {
      headers['X-CSRF-Token'] = token;
    }

    // Construct full URL to avoid relative path issues in some environments
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/data?table=${table}`;

    // Retry logic for robustness
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Not authenticated - cannot save data');
            return null;
          }
          
          // Handle CSRF token expiration
          if (response.status === 403 && attempt === 0) {
            console.log('CSRF token expired, refreshing...');
            clearCsrfToken();
            const newToken = await getCsrfToken();
            if (newToken) {
              headers['X-CSRF-Token'] = newToken;
              // Retry immediately with new token
              continue;
            }
          }

          let errorMessage = 'Unknown error';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch (e) {
            errorMessage = await response.text();
          }
          
          throw new Error(`API error (${response.status}): ${errorMessage}`);
        }

        const result: ApiResponse<T> = await response.json();
        return result.data ?? null;
      } catch (error) {
        console.warn(`[DataClient] Attempt ${attempt + 1} failed for ${table}:`, error);
        lastError = error;
        
        // If it's a network error (Failed to fetch), wait and retry
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error(`Error saving to ${table}:`, error);
    return null;
  }
}

/**
 * Delete data from a table through the secure API
 */
export async function deleteData(table: DataTable, id: string): Promise<boolean> {
  try {
    // Get CSRF token for mutations (if available)
    const token = await getCsrfToken();
    
    const headers: HeadersInit = {};
    
    // Include CSRF token if available
    if (token) {
      headers['X-CSRF-Token'] = token;
    }

    // Construct full URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/data?table=${table}&id=${id}`;

    // Retry logic
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          credentials: 'include',
          headers,
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Not authenticated - cannot delete data');
            return false;
          }
          
          // Handle CSRF token expiration
          if (response.status === 403 && attempt === 0) {
            clearCsrfToken();
            const newToken = await getCsrfToken();
            if (newToken) {
              headers['X-CSRF-Token'] = newToken;
              continue;
            }
          }
          
          const error = await response.json();
          console.error(`Error deleting from ${table}:`, error.message);
          return false;
        }

        return true;
      } catch (error) {
        console.warn(`[DataClient] Attempt ${attempt + 1} failed for delete ${table}:`, error);
        
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    return false;
  }
}

/**
 * Fetch user preferences through the secure API
 */
export async function fetchUserPreferences(): Promise<Record<string, any> | null> {
  return fetchData('user_preferences');
}

/**
 * Save user preferences through the secure API
 */
export async function saveUserPreferences(preferences: Record<string, any>): Promise<boolean> {
  const result = await saveData('user_preferences', preferences);
  return result !== null;
}
