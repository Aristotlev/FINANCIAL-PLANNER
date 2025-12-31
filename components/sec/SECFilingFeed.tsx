'use client';

/**
 * SEC Filing Feed Component
 * Displays a chronological timeline of SEC filings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilingItem {
  title: string;
  company: string;
  formType: string;
  formDescription: string;
  link: string;
  pubDate: string;
  pubDateFormatted: string;
  description: string;
}

interface SECFilingFeedProps {
  initialFormType?: string;
  watchlistOnly?: boolean;
  refreshInterval?: number; // in seconds
  maxItems?: number;
}

const FORM_TYPES = [
  { value: '', label: 'All Filings' },
  { value: '10-K', label: '10-K (Annual)' },
  { value: '10-Q', label: '10-Q (Quarterly)' },
  { value: '8-K', label: '8-K (Current)' },
  { value: '4', label: 'Form 4 (Insider)' },
  { value: '13F-HR', label: '13F (Holdings)' },
];

const getFormTypeColor = (formType: string): string => {
  const colors: Record<string, string> = {
    '10-K': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '10-Q': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    '8-K': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '13F-HR': 'bg-green-500/20 text-green-400 border-green-500/30',
    '13F-NT': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return colors[formType] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

const getFormTypeIcon = (formType: string): string => {
  const icons: Record<string, string> = {
    '10-K': '📊',
    '10-Q': '📈',
    '8-K': '📰',
    '4': '👤',
    '13F-HR': '🏦',
    '13F-NT': '🏦',
  };
  return icons[formType] || '📄';
};

export function SECFilingFeed({
  initialFormType = '',
  watchlistOnly = false,
  refreshInterval = 60,
  maxItems = 50,
}: SECFilingFeedProps) {
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formType, setFormType] = useState(initialFormType);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchFilings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (formType) params.set('formType', formType);
      params.set('limit', maxItems.toString());

      const response = await fetch(`/api/sec/feed?${params}`);
      if (!response.ok) throw new Error('Failed to fetch filings');

      const data = await response.json();
      setFilings(data.filings);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [formType, maxItems]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchFilings, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchFilings]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">SEC Filing Feed</h2>
              <p className="text-xs text-gray-400">
                {lastUpdated && `Updated ${formatTimeAgo(lastUpdated.toISOString())}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-700/50 text-gray-400'
              }`}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={fetchFilings}
              disabled={loading}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-300 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FORM_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setFormType(type.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                formType === type.value
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border border-transparent'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading && filings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-gray-400">Loading filings...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchFilings}
              className="mt-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filings.map((filing, index) => (
              <motion.a
                key={`${filing.link}-${index}`}
                href={filing.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.02 }}
                className="block p-4 border-b border-gray-700/30 hover:bg-gray-800/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" role="img" aria-label={filing.formType}>
                    {getFormTypeIcon(filing.formType)}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getFormTypeColor(filing.formType)}`}>
                        {filing.formType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(filing.pubDate)}
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                      {filing.company}
                    </h3>
                    
                    <p className="text-sm text-gray-400 mt-1">
                      {filing.formDescription}
                    </p>
                  </div>

                  <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
        <p className="text-xs text-gray-500 text-center">
          Showing {filings.length} recent filings • Data from SEC EDGAR
        </p>
      </div>
    </div>
  );
}

export default SECFilingFeed;
