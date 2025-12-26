"use client";

import React, { useState, useEffect } from 'react';
import { Bot, TrendingUp, TrendingDown, ArrowRight, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { useFinancialWorker } from '../../hooks/use-financial-worker';

export interface RebalancingSuggestion {
  asset: string;
  currentAllocation: number; // percentage
  suggestedAllocation: number; // percentage
  action: 'buy' | 'sell' | 'hold';
  amount?: number; // dollar amount
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIRebalancingProps {
  holdings: Array<{
    symbol: string;
    name?: string;
    value: number;
    shares?: number;
    currentPrice?: number;
  }>;
  totalValue: number;
  assetType: 'crypto' | 'stocks' | 'trading' | 'savings' | 'general';
}

export function AIRebalancing({ holdings, totalValue, assetType }: AIRebalancingProps) {
  const [suggestions, setSuggestions] = useState<RebalancingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { calculate, isReady } = useFinancialWorker();

  useEffect(() => {
    if (isReady) {
      generateSuggestions();
    }
  }, [holdings, totalValue, isReady]);

  const generateSuggestions = async () => {
    if (holdings.length === 0 || totalValue === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    
    try {
      // Use worker for heavy calculation if available
      if (isReady) {
        // Define target allocation based on asset type
        const targetAllocation: Record<string, number> = {};
        
        // Simple equal weight strategy for worker demo
        if (holdings.length > 0) {
          const equalWeight = 100 / holdings.length;
          holdings.forEach(h => {
            targetAllocation[h.symbol] = equalWeight;
          });
        }

        const workerSuggestions = await calculate('rebalancing', {
          assets: holdings.map(h => ({
            ...h,
            amount: h.shares || (h.value / (h.currentPrice || 1)),
            currentPrice: h.currentPrice || (h.value / (h.shares || 1)),
            category: h.symbol // Simple mapping
          })),
          targetAllocation
        });

        // Transform worker result to component format if needed
        // For now, we'll stick with the existing logic but run it in the worker in a future update
        // The worker returns raw suggestions, we need to enrich them with reasons/priorities
      }

      // Calculate current allocations
      const allocations = holdings.map(h => ({
        asset: h.symbol,
        name: h.name || h.symbol,
        currentAllocation: (h.value / totalValue) * 100,
        value: h.value
      }));

      // AI-driven rebalancing logic
      const newSuggestions: RebalancingSuggestion[] = [];

      // Rule 1: No single asset should exceed 40% (concentration risk)
      allocations.forEach(alloc => {
        if (alloc.currentAllocation > 40) {
          const excessPercentage = alloc.currentAllocation - 35;
          const sellAmount = (excessPercentage / 100) * totalValue;
          newSuggestions.push({
            asset: alloc.asset,
            currentAllocation: alloc.currentAllocation,
            suggestedAllocation: 35,
            action: 'sell',
            amount: sellAmount,
            reason: `Reduce concentration risk. ${alloc.asset} represents ${alloc.currentAllocation.toFixed(1)}% of portfolio.`,
            priority: 'high'
          });
        }
      });

      // Rule 2: Minimum holding for diversification (5% for stocks/trading, 10% for crypto)
      const minAllocation = assetType === 'crypto' ? 10 : 5;
      allocations.forEach(alloc => {
        if (alloc.currentAllocation < minAllocation && alloc.currentAllocation > 0) {
          const targetPercentage = minAllocation;
          const buyAmount = ((targetPercentage - alloc.currentAllocation) / 100) * totalValue;
          newSuggestions.push({
            asset: alloc.asset,
            currentAllocation: alloc.currentAllocation,
            suggestedAllocation: targetPercentage,
            action: 'buy',
            amount: buyAmount,
            reason: `Position too small for meaningful impact. Consider increasing or exiting.`,
            priority: 'low'
          });
        }
      });

      // Rule 3: Balanced portfolio recommendation
      if (holdings.length >= 3) {
        const idealAllocation = 100 / holdings.length;
        const tolerance = assetType === 'crypto' ? 15 : 10; // Higher tolerance for crypto

        allocations.forEach(alloc => {
          const deviation = Math.abs(alloc.currentAllocation - idealAllocation);
          if (deviation > tolerance) {
            const action = alloc.currentAllocation > idealAllocation ? 'sell' : 'buy';
            const targetAllocation = idealAllocation;
            const amount = Math.abs(((targetAllocation - alloc.currentAllocation) / 100) * totalValue);
            
            // Only add if not already suggested
            if (!newSuggestions.some(s => s.asset === alloc.asset)) {
              newSuggestions.push({
                asset: alloc.asset,
                currentAllocation: alloc.currentAllocation,
                suggestedAllocation: targetAllocation,
                action,
                amount,
                reason: `Rebalance to equal-weight allocation (${idealAllocation.toFixed(1)}% target).`,
                priority: 'medium'
              });
            }
          }
        });
      }

      // Rule 4: Asset-specific recommendations based on type
      if (assetType === 'crypto') {
        // Suggest stablecoin allocation for volatility buffer
        const hasStablecoin = holdings.some(h => 
          ['USDT', 'USDC', 'DAI', 'BUSD'].includes(h.symbol.toUpperCase())
        );
        if (!hasStablecoin && totalValue > 1000) {
          newSuggestions.push({
            asset: 'USDT/USDC',
            currentAllocation: 0,
            suggestedAllocation: 15,
            action: 'buy',
            amount: totalValue * 0.15,
            reason: 'Add stablecoins for stability and quick rebalancing opportunities.',
            priority: 'medium'
          });
        }
      }

      if (assetType === 'stocks' || assetType === 'trading') {
        // Check for sector diversification
        const techStocks = holdings.filter(h => 
          ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'].includes(h.symbol.toUpperCase())
        );
        const techAllocation = techStocks.reduce((sum, h) => sum + (h.value / totalValue * 100), 0);
        
        if (techAllocation > 60) {
          newSuggestions.push({
            asset: 'Tech Sector',
            currentAllocation: techAllocation,
            suggestedAllocation: 50,
            action: 'sell',
            reason: 'High concentration in technology sector. Consider diversifying into other sectors.',
            priority: 'high'
          });
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setSuggestions(newSuggestions.slice(0, 5)); // Limit to top 5 suggestions
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error generating rebalancing suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <ArrowRight className="w-4 h-4 text-gray-500" />;
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Add holdings to get AI-powered rebalancing suggestions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Rebalancing Suggestions
        </h3>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {suggestions.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Portfolio is Well-Balanced
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your current allocation looks good! No immediate rebalancing needed.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getActionIcon(suggestion.action)}
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {suggestion.action.toUpperCase()} {suggestion.asset}
                  </h4>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(suggestion.priority)}`}>
                  {suggestion.priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Current</span>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {suggestion.currentAllocation.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Suggested</span>
                  <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {suggestion.suggestedAllocation.toFixed(1)}%
                  </div>
                </div>
              </div>

              {suggestion.amount && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {suggestion.action === 'buy' ? 'Buy' : 'Sell'}: ${formatNumber(suggestion.amount)}
                  </span>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {suggestion.reason}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> These are AI-generated suggestions based on portfolio diversification principles. 
            Always conduct your own research and consider your risk tolerance before making investment decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
