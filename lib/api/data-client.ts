/**
 * Secure Data API Client
 * 
 * This module provides client-side functions to access user data
 * through the secure server-side API endpoint.
 * 
 * The server validates the user via Better Auth and uses the
 * service role key to access Supabase.
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

/**
 * Fetch data from a table through the secure API
 */
export async function fetchData<T = any>(table: DataTable): Promise<T | null> {
  try {
    const response = await fetch(`/api/data?table=${table}`, {
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
  } catch (error) {
    console.error(`Error fetching ${table}:`, error);
    return null;
  }
}

/**
 * Save data to a table through the secure API
 */
export async function saveData<T = any>(table: DataTable, data: T): Promise<T | null> {
  try {
    const response = await fetch(`/api/data?table=${table}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Not authenticated - cannot save data');
        return null;
      }
      const error = await response.json();
      console.error(`Error saving to ${table}:`, error.message);
      return null;
    }

    const result: ApiResponse<T> = await response.json();
    return result.data ?? null;
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
    const response = await fetch(`/api/data?table=${table}&id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Not authenticated - cannot delete data');
        return false;
      }
      const error = await response.json();
      console.error(`Error deleting from ${table}:`, error.message);
      return false;
    }

    return true;
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
