'use client';

/**
 * Insider Trading Component
 * Displays Form 4 insider transactions for a company
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, TrendingDown, DollarSign, Activity, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsiderTransaction {
  date: string;
  filingDate: string;
  owner: string;
  title: string;
  isOfficer: boolean;
  isDirector: boolean;
  transactionType: 'Buy' | 'Sell';
  transactionCode: string;
  transactionDescription: string;
  shares: number;
  price: number | null;
  value: number;
  sharesOwnedAfter: number;
  securityTitle: string;
  accessionNumber: string;
}

interface InsiderSummary {
  totalBuys: number;
  totalSells: number;
  buyValue: number;
  sellValue: number;
  netShares: number;
  netValue: number;
  transactionCount: number;
  uniqueInsiders: number;
}

interface InsiderTradingProps {
  ticker: string;
  days?: number;
  showSummary?: boolean;
  compact?: boolean;
}

export function InsiderTrading({
  ticker,
  days = 90,
  showSummary = true,
  compact = false,
}: InsiderTradingProps) {
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);
  const [summary, setSummary] = useState<InsiderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/sec/insider?ticker=${ticker}&days=${days}`);
        if (!response.ok) throw new Error('Failed to fetch insider data');

        const data = await response.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      fetchData();
    }
  }, [ticker, days]);

  const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 min-h-[200px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500">Loading insider data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
        <p className="text-red-400 text-center text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Insider Trading</h2>
            <p className="text-xs text-gray-400">{ticker.toUpperCase()} • Last {days} days</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {showSummary && summary && (
        <div className="p-4 border-b border-gray-800 bg-[#141414]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-2 rounded-lg bg-[#1A1A1A] border border-gray-800/50">
              <p className="text-lg font-bold text-green-400 font-mono">
                {formatCurrency(summary.buyValue)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-1">Total Buys</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[#1A1A1A] border border-gray-800/50">
              <p className="text-lg font-bold text-red-400 font-mono">
                {formatCurrency(summary.sellValue)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-1">Total Sells</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[#1A1A1A] border border-gray-800/50">
              <p className={`text-lg font-bold ${summary.netValue >= 0 ? 'text-green-400' : 'text-red-400'} font-mono`}>
                {summary.netValue >= 0 ? '+' : ''}{formatCurrency(summary.netValue)}
              </p>
               <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-1">Net Activity</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[#1A1A1A] border border-gray-800/50">
              <p className="text-lg font-bold text-blue-400 font-mono">
                {summary.uniqueInsiders}
              </p>
               <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-1">Insiders</p>
            </div>
          </div>
          
          {/* Net Activity Bar */}
          <div className="mt-4 px-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
              <span>Selling Pressure</span>
              <span>Buying Pressure</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
               {/* Sells (Red) */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${summary.buyValue + summary.sellValue > 0 
                      ? (summary.sellValue / (summary.buyValue + summary.sellValue)) * 100 
                      : 50}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-red-500/80 h-full"
                />
                 {/* Buys (Green) */}
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${summary.buyValue + summary.sellValue > 0 
                      ? (summary.buyValue / (summary.buyValue + summary.sellValue)) * 100 
                      : 50}%` }}
                   transition={{ duration: 1, ease: "easeOut" }}
                   className="bg-green-500/80 h-full"
                />
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className={cn("custom-scrollbar", compact ? 'max-h-[300px]' : 'max-h-[500px]')} style={{ overflowY: 'auto' }}>
        {transactions.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
            <FileText className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-sm">No transactions found recently</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
          {transactions.map((tx, index) => (
            <motion.div
              key={`${tx.accessionNumber}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="p-4 hover:bg-[#212121] transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                    tx.transactionType === 'Buy' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  )}>
                    {tx.transactionType}
                  </span>
                  <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{tx.owner}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{formatDate(tx.date)}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 truncate max-w-[200px]">{tx.title}</span>
                <div className="flex gap-1">
                    {tx.isOfficer && (
                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20">
                        Officer
                    </span>
                    )}
                    {tx.isDirector && (
                    <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded border border-purple-500/20">
                        Director
                    </span>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs bg-[#111] p-2 rounded-lg border border-gray-800/50">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Shares</p>
                  <p className="text-white font-mono mt-0.5">{formatNumber(tx.shares)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Price</p>
                  <p className="text-white font-mono mt-0.5">
                    {tx.price ? `$${tx.price.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-[10px] uppercase">Value</p>
                  <p className={`font-mono font-medium mt-0.5 ${tx.transactionType === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(tx.value)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-[#1A1A1A]">
        <p className="text-[10px] text-gray-600 text-center flex items-center justify-center gap-1.5">
          <Activity className="w-3 h-3" />
          {transactions.length} transactions • Data from SEC Form 4 filings
        </p>
      </div>
    </div>
  );
}

export default InsiderTrading;
