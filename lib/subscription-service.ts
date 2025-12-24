/**
 * Subscription Service
 * Manages user subscriptions, usage tracking, and plan limits
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

export class SubscriptionService {
  private static isConfigured = isSupabaseConfigured();

  // ==================== USER ID ====================

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
   */
  static async getCurrentSubscription(): Promise<UserSubscription | null> {
    if (!this.isConfigured) {
      // Return default trial subscription for offline mode
      return this.getDefaultTrialSubscription();
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return this.getDefaultTrialSubscription();

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no subscription found (PGRST116), create a default trial one
        if (error.code === 'PGRST116') {
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
          
          const { data: createdSub, error: createError } = await (supabase as any)
            .from('user_subscriptions')
            .insert(newSubscription)
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating default subscription:', createError);
            return this.getDefaultTrialSubscription();
          }
          
          return createdSub as UserSubscription;
        }
        
        console.error('Error fetching subscription:', error);
        return this.getDefaultTrialSubscription();
      }

      return data as UserSubscription;
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

      // Use type assertion to work around strict Database type checking
      // The user_subscriptions table exists but types may be out of sync
      const { data, error } = await (supabase as any)
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as UserSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const userId = await this.getUserId();
      if (!userId) return false;

      // Use type assertion to work around strict Database type checking
      const { error } = await (supabase as any)
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          cancelled_at: new Date().toISOString(),
          status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
        })
        .eq('user_id', userId);

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
   */
  static async getTodayUsage(): Promise<UserUsage | null> {
    if (!this.isConfigured) {
      return this.getDefaultUsage();
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return this.getDefaultUsage();

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine
        console.error('Error fetching usage:', error);
      }

      return data ? (data as UserUsage) : this.getDefaultUsage();
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
    if (!this.isConfigured) {
      // In offline mode, allow unlimited entries
      return { canProceed: true };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        return { canProceed: true }; // Allow for non-authenticated users
      }

      // Call Supabase function
      const { data, error } = await (supabase.rpc as any)('can_add_entry', {
        p_user_id: userId,
        p_card_type: cardType,
      });

      if (error) throw error;

      if (!data) {
        const subscription = await this.getCurrentSubscription();
        const limits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;

        return {
          canProceed: false,
          reason: `You've reached your limit of ${limits.max_entries_per_card} entries for this card today.`,
          upgradeRequired: true,
          maxAllowed: typeof limits.max_entries_per_card === 'number' ? limits.max_entries_per_card : 999999,
        };
      }

      return { canProceed: true };
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

      const { error } = await (supabase.rpc as any)('increment_entry_count', {
        p_user_id: userId,
        p_card_type: cardType,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing entry count:', error);
    }
  }

  /**
   * Check if user can make an AI assistant call
   */
  static async canMakeAICall(): Promise<LimitCheckResult> {
    if (!this.isConfigured) {
      // In offline mode, allow unlimited AI calls
      return { canProceed: true };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) {
        return { canProceed: true }; // Allow for non-authenticated users
      }

      // Call Supabase function
      const { data, error } = await (supabase.rpc as any)('can_make_ai_call', {
        p_user_id: userId,
      });

      if (error) throw error;

      if (!data) {
        const subscription = await this.getCurrentSubscription();
        const usage = await this.getTodayUsage();
        const limits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;

        return {
          canProceed: false,
          reason: `You've reached your daily limit of ${limits.max_ai_calls_per_day} AI assistant calls.`,
          upgradeRequired: true,
          currentUsage: usage?.ai_calls_count || 0,
          maxAllowed: typeof limits.max_ai_calls_per_day === 'number' ? limits.max_ai_calls_per_day : 999999,
        };
      }

      return { canProceed: true };
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

      const { error } = await (supabase.rpc as any)('increment_ai_call_count', {
        p_user_id: userId,
      });

      if (error) throw error;
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

