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
  suggestedPlan?: SubscriptionPlan;
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
  suggestedPlan,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const recommendedPlan: SubscriptionPlan = suggestedPlan || (
    currentPlan === 'STARTER' ? 'TRADER' : 
    currentPlan === 'TRADER' ? 'INVESTOR' : 
    'WHALE'
  );
  const config = PLAN_CONFIG[recommendedPlan];

  const handleUpgrade = () => {
    onUpgrade?.(recommendedPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#1A1A1A] p-6 text-white border-b border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-white">Upgrade Required</h2>
              <p className="text-gray-400 text-sm">Unlock more features and capabilities</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Limit Reached Message */}
          <div className="mb-6 p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-lg">
            <p className="text-yellow-500 text-sm font-medium">
              {reason}
            </p>
          </div>

          {/* Current vs Upgrade Comparison */}
          {feature && currentLimit !== undefined && upgradeLimit !== undefined && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center p-4 bg-[#1A1A1A] rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Current Limit</p>
                  <p className="text-2xl font-bold text-white">{currentLimit}</p>
                  <p className="text-xs text-gray-500 mt-1">{feature}</p>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-600 flex-shrink-0" />
                <div className="flex-1 text-center p-4 bg-[#1A1A1A] rounded-lg border border-gray-700 relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/5" />
                  <p className="text-xs text-blue-400 mb-1 font-semibold relative z-10">With Upgrade</p>
                  <p className="text-2xl font-bold text-white relative z-10">{upgradeLimit}</p>
                  <p className="text-xs text-blue-300/50 mt-1 relative z-10">{feature}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Plan */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Recommended Plan
            </h3>
            <div className="border border-gray-800 rounded-lg p-4 bg-[#1A1A1A]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  {recommendedPlan === 'WHALE' ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-white">
                    {recommendedPlan === 'TRADER' ? 'Trader Plan' : 
                     recommendedPlan === 'INVESTOR' ? 'Investor Plan' : 
                     'Whale Plan'}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {formatPrice(config.price_monthly_usd)}/month
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span>{config.max_entries_per_card === 'unlimited' ? 'Unlimited' : config.max_entries_per_card} entries per asset class</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span>{config.max_ai_calls_per_day === 'unlimited' ? 'Unlimited' : config.max_ai_calls_per_day} AI calls per day</span>
                </li>
                {config.advanced_analytics && (
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span>Advanced analytics</span>
                  </li>
                )}
                {config.priority_support && (
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
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
              className="flex-1 px-4 py-3 border border-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-all font-bold"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
