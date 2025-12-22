/**
 * Upgrade Modal Component
 * Shown when users hit usage limits
 */

"use client";

import React from 'react';
import { X, ArrowRight, Zap, Crown } from 'lucide-react';
import { PLAN_CONFIG, formatPrice } from '@/types/subscription';
import type { SubscriptionPlan } from '@/types/subscription';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  currentPlan?: SubscriptionPlan;
  feature?: string;
  currentLimit?: number;
  upgradeLimit?: number;
  onUpgrade?: (plan: SubscriptionPlan) => void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  reason,
  currentPlan = 'STARTER',
  feature,
  currentLimit,
  upgradeLimit,
  onUpgrade,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const recommendedPlan: SubscriptionPlan = 
    currentPlan === 'STARTER' ? 'TRADER' : 
    currentPlan === 'TRADER' ? 'INVESTOR' : 
    'WHALE';
  const config = PLAN_CONFIG[recommendedPlan];

  const handleUpgrade = () => {
    onUpgrade?.(recommendedPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Upgrade Required</h2>
              <p className="text-purple-100 text-sm">Unlock more features and capabilities</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Limit Reached Message */}
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-yellow-900 dark:text-yellow-100 text-sm font-medium">
              {reason}
            </p>
          </div>

          {/* Current vs Upgrade Comparison */}
          {feature && currentLimit !== undefined && upgradeLimit !== undefined && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Limit</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentLimit}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{feature}</p>
                </div>
                <ArrowRight className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <div className="flex-1 text-center p-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-1 font-semibold">With Upgrade</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{upgradeLimit}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">{feature}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Plan */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Recommended Plan
            </h3>
            <div className="border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
                  {recommendedPlan === 'WHALE' ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {recommendedPlan === 'TRADER' ? 'Trader Plan' : 
                     recommendedPlan === 'INVESTOR' ? 'Investor Plan' : 
                     'Whale Plan'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPrice(config.price_monthly_usd)}/month
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  <span>{config.max_entries_per_card === 'unlimited' ? 'Unlimited' : config.max_entries_per_card} entries per asset class</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  <span>{config.max_ai_calls_per_day === 'unlimited' ? 'Unlimited' : config.max_ai_calls_per_day} AI calls per day</span>
                </li>
                {config.advanced_analytics && (
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    <span>Advanced analytics</span>
                  </li>
                )}
                {config.priority_support && (
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    <span>Priority support</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
