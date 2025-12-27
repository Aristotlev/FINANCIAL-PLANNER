/**
 * Subscription Dashboard Component
 * View and manage subscription and usage
 */

"use client";

import React from 'react';
import { Crown, Zap, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useSubscription, useUsage } from '@/hooks/use-subscription';
import { getPlanDisplayName, formatPrice, PLAN_CONFIG, getEffectivePlanLimits } from '@/types/subscription';

export default function SubscriptionDashboard() {
  const { subscription, loading: subLoading, daysRemainingInTrial, isTrialActive } = useSubscription();
  const { usage, limits, loading: usageLoading } = useUsage();

  if (subLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <p className="text-yellow-900 dark:text-yellow-100">
          No subscription found. Please contact support.
        </p>
      </div>
    );
  }

  // Use effective limits (UNLIMITED during trial)
  const config = getEffectivePlanLimits(subscription);

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 sm:p-10 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              {subscription.plan === 'INVESTOR' || subscription.plan === 'WHALE' || isTrialActive ? <Crown className="w-10 h-10" /> : <Zap className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {isTrialActive ? '✨ Trial (Unlimited Features)' : getPlanDisplayName(subscription.plan)}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                {isTrialActive ? 'Free for 7 days' : `${formatPrice(config.price_monthly_usd)}/mo`}
              </p>
            </div>
          </div>
          <div className={`px-6 py-3 rounded-xl text-sm font-bold shadow-md ${
            subscription.status === 'ACTIVE'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : subscription.status === 'TRIAL'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {subscription.status === 'TRIAL' ? '🚀 Unlimited Trial' : `✓ ${subscription.status}`}
          </div>
        </div>

        {/* Trial Warning */}
        {isTrialActive && (
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-2xl">
            <div className="flex items-start gap-4">
              <Calendar className="w-7 h-7 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-purple-900 dark:text-purple-100 font-bold text-xl mb-2">
                  🎉 {daysRemainingInTrial} days left with UNLIMITED features!
                </p>
                <p className="text-purple-700 dark:text-purple-300 text-base">
                  You have full access to all features. Upgrade to Investor or Whale to keep these benefits after your trial ends.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Features Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: config.max_entries_per_card, label: 'Entries/card', icon: '📝' },
            { value: config.max_ai_calls_per_day, label: 'AI calls/day', icon: '🤖' },
            { value: config.advanced_analytics ? '✓' : '✗', label: 'Analytics', icon: '📊' },
            { value: config.priority_support ? '✓' : '✗', label: 'Priority', icon: '⚡' }
          ].map((item, index) => (
            <div key={index} className="text-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {item.value}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Card */}
      {limits && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 sm:p-10 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
              <TrendingUp className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Today's Usage
            </h3>
          </div>

          <div className="space-y-10">
            {/* Entries Usage */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-xl mb-1">
                    📝 Entries Added
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Across all your cards
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-4xl font-bold ${getUsageColor(limits.entries.percentage)}`}>
                    {limits.entries.current}<span className="text-2xl text-gray-400 dark:text-gray-500">/{limits.entries.max}</span>
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(limits.entries.percentage)} rounded-full`}
                  style={{ width: `${Math.min(100, limits.entries.percentage)}%` }}
                />
              </div>
              {limits.entries.percentage >= 80 && (
                <div className="mt-4 flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-yellow-700 dark:text-yellow-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    You're approaching your daily limit. Upgrade for more capacity!
                  </p>
                </div>
              )}
            </div>

            {/* AI Calls Usage */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-xl mb-1">
                    🤖 AI Assistant Calls
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Resets at midnight
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-4xl font-bold ${getUsageColor(limits.aiCalls.percentage)}`}>
                    {limits.aiCalls.current}<span className="text-2xl text-gray-400 dark:text-gray-500">/{limits.aiCalls.max}</span>
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(limits.aiCalls.percentage)} rounded-full`}
                  style={{ width: `${Math.min(100, limits.aiCalls.percentage)}%` }}
                />
              </div>
              {limits.aiCalls.percentage >= 80 && (
                <div className="mt-4 flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-yellow-700 dark:text-yellow-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    Running low on AI calls. Upgrade to Investor for more!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA (if not on Investor/Whale) */}
      {!['INVESTOR', 'WHALE'].includes(subscription.plan) && (
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 rounded-3xl shadow-2xl p-10 text-white">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-8">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                <Crown className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-1">Upgrade to Investor</h3>
                <p className="text-purple-100 text-lg">Unlimited Assets + AI assistant</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                `Unlimited Assets`,
                `50 AI calls per day`,
                'Deep analytics',
                'Custom categories'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="w-2 h-2 rounded-full bg-white shadow-sm flex-shrink-0"></div>
                  <span className="text-white font-semibold">{feature}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-white text-purple-600 font-bold py-5 px-8 rounded-2xl hover:shadow-2xl transition-all duration-300  text-lg">
              Upgrade Now - {formatPrice(PLAN_CONFIG.INVESTOR.price_monthly_usd)}/month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
