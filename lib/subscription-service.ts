/**
 * Subscription Service
 * Manages user subscriptions, usage tracking, and plan limits
 * 
 * Uses the secure /api/data route which runs with service role to bypass RLS
 */

"use client";

import { supabase, isSupabaseConfigured } from './supabase/client';
import { authClient } from './auth-client';
import type {
  UserSubscription,
  UserUsage,
  PlanLimits,
  SubscriptionPlan,
  CardType,
  LimitCheckResult,
  UsageLimits,
} from '@/types/subscription';
import { PLAN_CONFIG, getEffectivePlanLimits, isTrialActive } from '@/types/subscription';

// CSRF token cache for mutation requests
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
 * Clear cached CSRF token (call on logout or when token is rejected)
 */
function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenExpiry = 0;
}

export class SubscriptionService {
  private static isConfigured = isSupabaseConfigured();

  // ==================== API HELPERS ====================

  /**
   * Make a GET request to the secure data API
   */
  private static async apiGet<T>(table: string): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      const response = await fetch(`/api/data?table=${table}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return { data: null, error: new Error(errorData.error || `HTTP ${response.status}`) };
      }
      
      const data = await response.json();
      return { data: data.data || data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Make a POST request to the secure data API (insert or update)
   */
  private static async apiPost<T>(table: string, payload: any, id?: string): Promise<{ data: T | null; error: Error | null }> {
    try {
      const url = id ? `/api/data?table=${table}&id=${id}` : `/api/data?table=${table}`;
      
      // Get CSRF token for mutations
      const token = await getCsrfToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Include CSRF token if available
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        // Handle CSRF token expiration - retry with fresh token
        if (response.status === 403) {
          clearCsrfToken();
          const newToken = await getCsrfToken();
          if (newToken) {
            headers['X-CSRF-Token'] = newToken;
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify(payload),
            });
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              return { data: data.data || data, error: null };
            }
          }
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return { data: null, error: new Error(errorData.error || `HTTP ${response.status}`) };
      }
      
      const data = await response.json();
      return { data: data.data || data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // ==================== USER ID ====================

  private static async getUserEmail(): Promise<string | null> {
    // During SSR or build, we can't fetch the session
    if (typeof window === 'undefined') return null;

    if (!this.isConfigured) return null;

    try {
      const session = await authClient.getSession();
      return session.data?.user?.email || null;
    } catch (error) {
      return null;
    }
  }

  private static async getUserId(): Promise<string | null> {
    // During SSR or build, we can't fetch the session
    if (typeof window === 'undefined') return null;

    if (!this.isConfigured) return null;

    try {
      const session = await authClient.getSession();
      return session.data?.user?.id || null;
    } catch (error) {
      // Suppress "Failed to fetch" errors which happen when server is unreachable
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return null;
      }
      console.error('Error getting user ID from Better Auth:', error);
      return null;
    }
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Get current user's subscription
   * Uses the secure /api/data route which runs with service role
   */
  static async getCurrentSubscription(): Promise<UserSubscription | null> {
    if (!this.isConfigured) {
      // Return default trial subscription for offline mode
      return this.getDefaultTrialSubscription();
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return this.getDefaultTrialSubscription();

      // Use the secure API route instead of direct Supabase call
      const { data, error } = await this.apiGet<UserSubscription>('user_subscriptions');

      if (error || !data || data.length === 0) {
        // No subscription found, create a default trial one
        console.log('No subscription found, creating default trial for user:', userId);
        
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const newSubscription = {
          user_id: userId,
          plan: 'FREE_TRIAL',
          status: 'TRIAL',
          trial_start_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          trial_used: false
        };
        
        const { data: createdSub, error: createError } = await this.apiPost<UserSubscription>('user_subscriptions', newSubscription);
          
        if (createError || !createdSub) {
          console.error('Error creating default subscription:', createError?.message);
          return this.getDefaultTrialSubscription();
        }
        
        return createdSub;
      }

      // Return the first (and should be only) subscription
      return data[0];
    } catch (error) {
      console.error('Error in getCurrentSubscription:', error);
      return this.getDefaultTrialSubscription();
    }
  }

  /**
   * Get default trial subscription (for offline mode or new users)
   */
  private static getDefaultTrialSubscription(): UserSubscription {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    return {
      id: 'default-trial',
      user_id: 'offline',
      plan: 'STARTER',
      status: 'TRIAL',
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      trial_used: false,
      cancel_at_period_end: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  /**
   * Update user subscription plan
   * Uses the secure /api/data route which runs with service role
   */
  static async updateSubscription(
    plan: SubscriptionPlan,
    stripeData?: {
      customerId: string;
      subscriptionId: string;
      priceId: string;
    }
  ): Promise<UserSubscription | null> {
    if (!this.isConfigured) return null;

    try {
      const userId = await this.getUserId();
      if (!userId) return null;

      // First get the current subscription to get its ID
      const { data: existing } = await this.apiGet<UserSubscription>('user_subscriptions');
      if (!existing || existing.length === 0) return null;

      const updateData = {
        plan: plan as string,
        status: 'ACTIVE',
        subscription_start_date: new Date().toISOString(),
        ...(stripeData && {
          stripe_customer_id: stripeData.customerId,
          stripe_subscription_id: stripeData.subscriptionId,
          stripe_price_id: stripeData.priceId,
        }),
      };

      const { data, error } = await this.apiPost<UserSubscription>('user_subscriptions', updateData, existing[0].id);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   * Uses the secure /api/data route which runs with service role
   */
  static async cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const userId = await this.getUserId();
      if (!userId) return false;

      // First get the current subscription to get its ID
      const { data: existing } = await this.apiGet<UserSubscription>('user_subscriptions');
      if (!existing || existing.length === 0) return false;

      const { error } = await this.apiPost<UserSubscription>('user_subscriptions', {
        cancel_at_period_end: cancelAtPeriodEnd,
        cancelled_at: new Date().toISOString(),
        status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
      }, existing[0].id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  // ==================== USAGE TRACKING ====================

  /**
   * Get today's usage for current user
   * Uses the secure /api/data route which runs with service role
   */
  static async getTodayUsage(): Promise<UserUsage | null> {
    if (!this.isConfigured) {
      return this.getDefaultUsage();
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return this.getDefaultUsage();

      // Use the secure API route - it automatically filters by user_id
      const { data, error } = await this.apiGet<UserUsage>('user_usage');

      if (error) {
        console.error('Error fetching usage:', error);
        return this.getDefaultUsage();
      }

      // Filter for today's date
      const today = new Date().toISOString().split('T')[0];
      const todayUsage = data?.find(u => u.date === today);

      return todayUsage || this.getDefaultUsage();
    } catch (error) {
      console.error('Error in getTodayUsage:', error);
      return this.getDefaultUsage();
    }
  }

  /**
   * Get default usage (all zeros)
   */
  private static getDefaultUsage(): UserUsage {
    const now = new Date();
    return {
      id: 'default-usage',
      user_id: 'offline',
      subscription_id: 'default-subscription',
      date: now.toISOString().split('T')[0],
      cash_entries_count: 0,
      crypto_entries_count: 0,
      stocks_entries_count: 0,
      real_estate_entries_count: 0,
      valuable_items_entries_count: 0,
      savings_entries_count: 0,
      expenses_entries_count: 0,
      debt_entries_count: 0,
      trading_accounts_entries_count: 0,
      ai_calls_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  /**
   * Get usage limits with current usage
   */
  static async getUsageLimits(): Promise<UsageLimits> {
    const subscription = await this.getCurrentSubscription();
    const usage = await this.getTodayUsage();

    if (!subscription || !usage) {
      return {
        entries: { current: 0, max: 10, percentage: 0 },
        aiCalls: { current: 0, max: 20, percentage: 0 },
      };
    }

    // Use effective limits (UNLIMITED during trial, otherwise plan limits)
    const limits = getEffectivePlanLimits(subscription);

    // Sum all entry counts
    const totalEntries =
      usage.cash_entries_count +
      usage.crypto_entries_count +
      usage.stocks_entries_count +
      usage.real_estate_entries_count +
      usage.valuable_items_entries_count +
      usage.savings_entries_count +
      usage.expenses_entries_count +
      usage.debt_entries_count +
      usage.trading_accounts_entries_count;

    const maxEntries = limits.max_entries_per_card === 'unlimited' ? 999999 : limits.max_entries_per_card;
    const maxAICalls = limits.max_ai_calls_per_day === 'unlimited' ? 999999 : limits.max_ai_calls_per_day;

    return {
      entries: {
        current: totalEntries,
        max: maxEntries,
        percentage: (totalEntries / maxEntries) * 100,
      },
      aiCalls: {
        current: usage.ai_calls_count,
        max: maxAICalls,
        percentage: (usage.ai_calls_count / maxAICalls) * 100,
      },
    };
  }

  // ==================== LIMIT CHECKS ====================

  /**
   * Check if user can add an entry to a specific card
   */
  static async canAddEntry(cardType: CardType): Promise<LimitCheckResult> {
    // Check for admin bypass
    const userEmail = await this.getUserEmail();
    if (userEmail === 'ariscsc@gmail.com') {
      return { canProceed: true };
    }

    if (!this.isConfigured) {
      // In offline mode, allow unlimited entries
      return { canProceed: true };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        return { canProceed: true }; // Allow for non-authenticated users
      }

      // Try RPC first, but handle errors gracefully
      let rpcResult: boolean | null = null;
      try {
        const { data, error } = await (supabase.rpc as any)('can_add_entry', {
          p_user_id: userId,
          p_card_type: cardType,
        });

        if (!error && typeof data === 'boolean') {
          rpcResult = data;
        } else if (error) {
          console.warn('RPC can_add_entry failed, falling back to manual check:', error.message);
        }
      } catch (e) {
        console.warn('RPC call threw exception, falling back to manual check');
      }

      // If RPC explicitly allowed it, we're good
      if (rpcResult === true) {
        return { canProceed: true };
      }

      // If RPC denied it (false) OR RPC failed (null), we need to fetch details
      const subscription = await this.getCurrentSubscription();
      const limits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;
      const maxEntries = typeof limits.max_entries_per_card === 'number' ? limits.max_entries_per_card : 999999;

      // If RPC failed, we need to check usage manually
      if (rpcResult === null) {
        const usage = await this.getTodayUsage();
        // Construct column name dynamically based on card type
        const columnKey = `${cardType}_entries_count` as keyof UserUsage;
        const currentCount = (usage && typeof usage[columnKey] === 'number') ? usage[columnKey] as number : 0;
        
        if (currentCount < maxEntries) {
          return { canProceed: true };
        }
      }

      return {
        canProceed: false,
        reason: `You've reached your limit of ${limits.max_entries_per_card} entries for this card today.`,
        upgradeRequired: true,
        maxAllowed: maxEntries,
      };
    } catch (error) {
      console.error('Error checking entry limit:', error);
      return { canProceed: true }; // Fail open to avoid blocking users
    }
  }

  /**
   * Increment entry count for a card
   */
  static async incrementEntryCount(cardType: CardType): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // Try RPC first
      let rpcSuccess = false;
      try {
        const { error } = await (supabase.rpc as any)('increment_entry_count', {
          p_user_id: userId,
          p_card_type: cardType,
        });

        if (!error) {
          rpcSuccess = true;
        } else {
          console.warn('RPC increment_entry_count failed, falling back to manual update:', error.message);
        }
      } catch (e) {
        console.warn('RPC call threw exception, falling back to manual update');
      }

      if (rpcSuccess) return;

      // Fallback: Manual update via API
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return;

      const usage = await this.getTodayUsage();
      const columnKey = `${cardType}_entries_count`;

      if (usage && usage.id !== 'default-usage') {
        // Update existing usage
        await this.apiPost('user_usage', {
          [columnKey]: (usage[columnKey as keyof UserUsage] as number || 0) + 1
        }, usage.id);
      } else {
        // Create new usage record
        const today = new Date().toISOString().split('T')[0];
        const payload: any = {
          user_id: userId,
          subscription_id: subscription.id,
          date: today,
          // Initialize all counts to 0
          cash_entries_count: 0,
          crypto_entries_count: 0,
          stocks_entries_count: 0,
          real_estate_entries_count: 0,
          valuable_items_entries_count: 0,
          savings_entries_count: 0,
          expenses_entries_count: 0,
          debt_entries_count: 0,
          trading_accounts_entries_count: 0,
          ai_calls_count: 0
        };
        // Set specific count to 1
        payload[columnKey] = 1;

        await this.apiPost('user_usage', payload);
      }
    } catch (error) {
      console.error('Error incrementing entry count:', error);
    }
  }

  /**
   * Check if user can make an AI assistant call
   */
  static async canMakeAICall(): Promise<LimitCheckResult> {
    // Check for admin bypass
    const userEmail = await this.getUserEmail();
    if (userEmail === 'ariscsc@gmail.com') {
      return { canProceed: true };
    }

    if (!this.isConfigured) {
      // In offline mode, allow unlimited AI calls
      return { canProceed: true };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        return { canProceed: true }; // Allow for non-authenticated users
      }

      // Try RPC first, but handle errors gracefully
      let rpcResult: boolean | null = null;
      try {
        // Explicitly cast userId to string to match the TEXT parameter in the SQL function
        const { data, error } = await (supabase.rpc as any)('can_make_ai_call', {
          p_user_id: String(userId),
        });
        
        if (!error && typeof data === 'boolean') {
          rpcResult = data;
        } else if (error) {
          console.warn('RPC can_make_ai_call failed, falling back to manual check:', error.message);
        }
      } catch (e) {
        console.warn('RPC call threw exception, falling back to manual check');
      }

      // If RPC explicitly allowed it, we're good
      if (rpcResult === true) {
        return { canProceed: true };
      }

      // If RPC denied it (false) OR RPC failed (null), we need to fetch details
      // If RPC failed, we perform the check manually here
      const subscription = await this.getCurrentSubscription();
      const usage = await this.getTodayUsage();
      const limits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;
      
      const maxCalls = typeof limits.max_ai_calls_per_day === 'number' ? limits.max_ai_calls_per_day : 999999;
      const currentUsage = usage?.ai_calls_count || 0;

      // If RPC failed, we rely on this manual check
      if (rpcResult === null) {
        if (currentUsage < maxCalls) {
          return { canProceed: true };
        }
      }

      // If we are here, either RPC said no, or RPC failed AND manual check said no
      return {
        canProceed: false,
        reason: `You've reached your daily limit of ${limits.max_ai_calls_per_day} AI assistant calls.`,
        upgradeRequired: true,
        currentUsage: currentUsage,
        maxAllowed: maxCalls,
      };
    } catch (error) {
      console.error('Error checking AI call limit:', error);
      return { canProceed: true }; // Fail open to avoid blocking users
    }
  }

  /**
   * Increment AI call count
   */
  static async incrementAICallCount(): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // Try RPC first
      let rpcSuccess = false;
      try {
        const { error } = await (supabase.rpc as any)('increment_ai_call_count', {
          p_user_id: userId,
        });

        if (!error) {
          rpcSuccess = true;
        } else {
          console.warn('RPC increment_ai_call_count failed, falling back to manual update:', error.message);
        }
      } catch (e) {
        console.warn('RPC call threw exception, falling back to manual update');
      }

      if (rpcSuccess) return;

      // Fallback: Manual update via API
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return;

      const usage = await this.getTodayUsage();
      
      if (usage && usage.id !== 'default-usage') {
        // Update existing usage
        await this.apiPost('user_usage', {
          ai_calls_count: (usage.ai_calls_count || 0) + 1
        }, usage.id);
      } else {
        // Create new usage record
        const today = new Date().toISOString().split('T')[0];
        await this.apiPost('user_usage', {
          user_id: userId,
          subscription_id: subscription.id,
          date: today,
          ai_calls_count: 1,
          cash_entries_count: 0,
          crypto_entries_count: 0,
          stocks_entries_count: 0,
          real_estate_entries_count: 0,
          valuable_items_entries_count: 0,
          savings_entries_count: 0,
          expenses_entries_count: 0,
          debt_entries_count: 0,
          trading_accounts_entries_count: 0
        });
      }
    } catch (error) {
      console.error('Error incrementing AI call count:', error);
    }
  }

  // ==================== FEATURE CHECKS ====================

  /**
   * Check if user can use import/export features
   * Only available for TRADER, INVESTOR, and WHALE plans
   */
  static async canUseImportExport(): Promise<LimitCheckResult> {
    // Check for admin bypass
    const userEmail = await this.getUserEmail();
    if (userEmail === 'ariscsc@gmail.com') {
      return { canProceed: true };
    }

    if (!this.isConfigured) {
      // In offline mode, allow imports/exports
      return { canProceed: true };
    }

    try {
      const subscription = await this.getCurrentSubscription();
      const limits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;

      if (!limits.imports_exports) {
        return {
          canProceed: false,
          reason: 'Import/Export features are only available on Trader plan and above. Upgrade to unlock this feature!',
          upgradeRequired: true,
        };
      }

      return { canProceed: true };
    } catch (error) {
      console.error('Error checking import/export permission:', error);
      return { canProceed: true }; // Fail open to avoid blocking users
    }
  }

  /**
   * Check if user can use AI assistant
   * Only available for TRADER (10/day), INVESTOR (50/day), and WHALE (unlimited) plans
   */
  static async canUseAIAssistant(): Promise<LimitCheckResult> {
    // Check for admin bypass
    const userEmail = await this.getUserEmail();
    if (userEmail === 'ariscsc@gmail.com') {
      return { canProceed: true };
    }

    if (!this.isConfigured) {
      return { canProceed: true };
    }

    try {
      const subscription = await this.getCurrentSubscription();
      const limits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;

      if (!limits.ai_assistant) {
        return {
          canProceed: false,
          reason: 'AI Assistant is only available on Trader plan and above. Upgrade to unlock this feature!',
          upgradeRequired: true,
        };
      }

      // If AI assistant is enabled, also check daily limit
      return this.canMakeAICall();
    } catch (error) {
      console.error('Error checking AI assistant permission:', error);
      return { canProceed: true }; // Fail open
    }
  }

  // ==================== PLAN LIMITS ====================

  /**
   * Get plan limits from database
   */
  static async getPlanLimits(plan: SubscriptionPlan): Promise<PlanLimits> {
    if (!this.isConfigured) {
      return PLAN_CONFIG[plan];
    }

    try {
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan', plan)
        .single();

      if (error) throw error;

      return data as PlanLimits;
    } catch (error) {
      console.error('Error fetching plan limits:', error);
      return PLAN_CONFIG[plan] || PLAN_CONFIG.STARTER;
    }
  }

  /**
   * Get all plan limits
   */
  static async getAllPlanLimits(): Promise<PlanLimits[]> {
    if (!this.isConfigured) {
      return Object.values(PLAN_CONFIG);
    }

    try {
      const { data, error } = await supabase.from('plan_limits').select('*');

      if (error) {
        throw error;
      }

      return (data as PlanLimits[]) || Object.values(PLAN_CONFIG);
    } catch (error) {
      console.error('Error fetching all plan limits:', error);
      return Object.values(PLAN_CONFIG);
    }
  }
}

