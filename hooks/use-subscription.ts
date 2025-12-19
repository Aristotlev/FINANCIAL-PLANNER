/**
 * Subscription Hooks
 * React hooks for managing subscriptions and checking usage limits
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { SubscriptionService } from '@/lib/subscription-service';
import type {
  UserSubscription,
  UserUsage,
  UsageLimits,
  CardType,
  LimitCheckResult,
  SubscriptionPlan,
} from '@/types/subscription';
import { isTrialActive, getDaysRemainingInTrial } from '@/types/subscription';

// ==================== useSubscription ====================

/**
 * Hook to get current user's subscription
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SubscriptionService.getCurrentSubscription();
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upgrade = useCallback(
    async (plan: SubscriptionPlan, stripeData?: any) => {
      try {
        setLoading(true);
        setError(null);
        const updated = await SubscriptionService.updateSubscription(plan, stripeData);
        if (updated) {
          setSubscription(updated);
        }
        return updated;
      } catch (err) {
        console.error('Error upgrading subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to upgrade subscription');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cancel = useCallback(async (cancelAtPeriodEnd: boolean = true) => {
    try {
      setLoading(true);
      setError(null);
      const success = await SubscriptionService.cancelSubscription(cancelAtPeriodEnd);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return {
    subscription,
    loading,
    error,
    refresh,
    upgrade,
    cancel,
    isTrialActive: subscription ? isTrialActive(subscription) : false,
    daysRemainingInTrial: subscription ? getDaysRemainingInTrial(subscription) : 0,
  };
}

// ==================== useUsage ====================

/**
 * Hook to get current user's usage limits
 */
export function useUsage() {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageData, limitsData] = await Promise.all([
        SubscriptionService.getTodayUsage(),
        SubscriptionService.getUsageLimits(),
      ]);
      setUsage(usageData);
      setLimits(limitsData);
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    usage,
    limits,
    loading,
    error,
    refresh,
  };
}

// ==================== useEntryLimit ====================

/**
 * Hook to check and manage entry limits for a specific card
 */
export function useEntryLimit(cardType: CardType) {
  const [canAdd, setCanAdd] = useState(true);
  const [checking, setChecking] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitCheckResult | null>(null);

  const checkLimit = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      const result = await SubscriptionService.canAddEntry(cardType);
      setCanAdd(result.canProceed);
      setLimitInfo(result);
      return result.canProceed;
    } catch (error) {
      console.error('Error checking entry limit:', error);
      setCanAdd(true); // Fail open
      return true;
    } finally {
      setChecking(false);
    }
  }, [cardType]);

  const recordEntry = useCallback(async () => {
    try {
      await SubscriptionService.incrementEntryCount(cardType);
    } catch (error) {
      console.error('Error recording entry:', error);
    }
  }, [cardType]);

  const addEntry = useCallback(async (): Promise<boolean> => {
    const allowed = await checkLimit();
    if (allowed) {
      await recordEntry();
    }
    return allowed;
  }, [checkLimit, recordEntry]);

  useEffect(() => {
    checkLimit();
  }, [checkLimit]);

  return {
    canAdd,
    checking,
    limitInfo,
    checkLimit,
    recordEntry,
    addEntry,
  };
}

// ==================== useAILimit ====================

/**
 * Hook to check and manage AI assistant call limits
 */
export function useAILimit() {
  const [canCall, setCanCall] = useState(true);
  const [checking, setChecking] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitCheckResult | null>(null);
  const [callsRemaining, setCallsRemaining] = useState<number | null>(null);

  const checkLimit = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      const result = await SubscriptionService.canMakeAICall();
      setCanCall(result.canProceed);
      setLimitInfo(result);

      if (result.maxAllowed && result.currentUsage !== undefined) {
        setCallsRemaining(result.maxAllowed - result.currentUsage);
      }

      return result.canProceed;
    } catch (error) {
      console.error('Error checking AI limit:', error);
      setCanCall(true); // Fail open
      return true;
    } finally {
      setChecking(false);
    }
  }, []);

  const recordCall = useCallback(async () => {
    try {
      await SubscriptionService.incrementAICallCount();
      // Refresh limit info after recording
      await checkLimit();
    } catch (error) {
      console.error('Error recording AI call:', error);
    }
  }, [checkLimit]);

  const makeCall = useCallback(async (): Promise<boolean> => {
    const allowed = await checkLimit();
    if (allowed) {
      await recordCall();
    }
    return allowed;
  }, [checkLimit, recordCall]);

  useEffect(() => {
    checkLimit();
  }, [checkLimit]);

  return {
    canCall,
    checking,
    limitInfo,
    callsRemaining,
    checkLimit,
    recordCall,
    makeCall,
  };
}

// ==================== useUpgradePrompt ====================

/**
 * Hook to manage upgrade prompt state
 */
export function useUpgradePrompt() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');
  const [upgradeContext, setUpgradeContext] = useState<{
    feature?: string;
    currentLimit?: number;
    upgradeLimit?: number;
  }>({});

  const promptUpgrade = useCallback(
    (reason: string, context?: { feature?: string; currentLimit?: number; upgradeLimit?: number }) => {
      setUpgradeReason(reason);
      setUpgradeContext(context || {});
      setShowUpgradeModal(true);
    },
    []
  );

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
    setUpgradeReason('');
    setUpgradeContext({});
  }, []);

  return {
    showUpgradeModal,
    upgradeReason,
    upgradeContext,
    promptUpgrade,
    closeUpgradeModal,
  };
}

// ==================== useSubscriptionGuard ====================

/**
 * Combined hook for guarding actions with subscription limits
 */
export function useSubscriptionGuard(cardType?: CardType) {
  const { subscription } = useSubscription();
  const { limits } = useUsage();
  const entryLimit = cardType ? useEntryLimit(cardType) : null;
  const aiLimit = useAILimit();
  const upgradePrompt = useUpgradePrompt();

  const guardEntry = useCallback(
    async (onSuccess: () => void | Promise<void>) => {
      if (!entryLimit) return;

      const allowed = await entryLimit.checkLimit();
      if (allowed) {
        await onSuccess();
        await entryLimit.recordEntry();
      } else if (entryLimit.limitInfo) {
        upgradePrompt.promptUpgrade(
          entryLimit.limitInfo.reason || 'Entry limit reached',
          {
            feature: 'entries',
            currentLimit: entryLimit.limitInfo.maxAllowed,
            upgradeLimit: 50, // PRO plan limit
          }
        );
      }
    },
    [entryLimit, upgradePrompt]
  );

  const guardAICall = useCallback(
    async (onSuccess: () => void | Promise<void>) => {
      const allowed = await aiLimit.checkLimit();
      if (allowed) {
        await onSuccess();
        await aiLimit.recordCall();
      } else if (aiLimit.limitInfo) {
        upgradePrompt.promptUpgrade(
          aiLimit.limitInfo.reason || 'AI call limit reached',
          {
            feature: 'AI calls',
            currentLimit: aiLimit.limitInfo.maxAllowed,
            upgradeLimit: 100, // PRO plan limit
          }
        );
      }
    },
    [aiLimit, upgradePrompt]
  );

  return {
    subscription,
    limits,
    entryLimit,
    aiLimit,
    upgradePrompt,
    guardEntry,
    guardAICall,
  };
}
