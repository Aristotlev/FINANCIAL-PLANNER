'use client';

/**
 * Insider Trading Component
 * Displays Form 4 insider transactions for a company
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 p-6">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 p-6">
        <p className="text-red-400 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Insider Trading</h2>
            <p className="text-xs text-gray-400">{ticker.toUpperCase()} • Last {days} days</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {showSummary && summary && (
        <div className="p-4 border-b border-gray-800 bg-[#212121]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.buyValue)}
              </p>
              <p className="text-xs text-gray-400">Total Buys</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(summary.sellValue)}
              </p>
              <p className="text-xs text-gray-400">Total Sells</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${summary.netValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.netValue >= 0 ? '+' : ''}{formatCurrency(summary.netValue)}
              </p>
              <p className="text-xs text-gray-400">Net Activity</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">
                {summary.uniqueInsiders}
              </p>
              <p className="text-xs text-gray-400">Unique Insiders</p>
            </div>
          </div>
          
          {/* Net Activity Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Selling</span>
              <span>Buying</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ 
                    width: `${summary.buyValue + summary.sellValue > 0 
                      ? (summary.sellValue / (summary.buyValue + summary.sellValue)) * 100 
                      : 50}%` 
                  }}
                />
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ 
                    width: `${summary.buyValue + summary.sellValue > 0 
                      ? (summary.buyValue / (summary.buyValue + summary.sellValue)) * 100 
                      : 50}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className={compact ? 'max-h-[300px]' : 'max-h-[500px]'} style={{ overflowY: 'auto' }}>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No insider transactions in the last {days} days
          </div>
        ) : (
          transactions.map((tx, index) => (
            <motion.div
              key={`${tx.accessionNumber}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="p-4 border-b border-gray-800 hover:bg-[#212121] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    tx.transactionType === 'Buy' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {tx.transactionType}
                  </span>
                  <span className="text-sm font-medium text-white">{tx.owner}</span>
                </div>
                <span className="text-xs text-gray-500">{formatDate(tx.date)}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">{tx.title}</span>
                {tx.isOfficer && (
                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">
                    Officer
                  </span>
                )}
                {tx.isDirector && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded">
                    Director
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Shares</p>
                  <p className="text-white font-medium">{formatNumber(tx.shares)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Price</p>
                  <p className="text-white font-medium">
                    {tx.price ? `$${tx.price.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Value</p>
                  <p className={`font-medium ${tx.transactionType === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(tx.value)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800 bg-[#212121]">
        <p className="text-xs text-gray-500 text-center">
          {transactions.length} transactions • Data from SEC Form 4 filings
        </p>
      </div>
    </div>
  );
}

export default InsiderTrading;
