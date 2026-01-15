'use client';

/**
 * SEC Filing Diff Tool Component
 * Compare risk factors and other sections between two filings
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SectionComparison {
  name: string;
  similarity: number;
  addedTerms: number;
  removedTerms: number;
}

interface DiffResult {
  currentFiling: {
    accessionNumber: string;
    filingDate: string;
    form: string;
  };
  previousFiling: {
    accessionNumber: string;
    filingDate: string;
    form: string;
  };
  section: string;
  diff: {
    added: string[];
    removed: string[];
    similarity: number;
    summary: string;
  } | null;
  overallSimilarity: number;
  significantChanges: Array<{
    type: string;
    location: string;
    significance: string;
  }>;
  newRisks: string[];
  removedRisks: string[];
  allSections: SectionComparison[];
}

interface FilingDiffToolProps {
  ticker?: string;
  formType?: '10-K' | '10-Q';
}

const SECTIONS = [
  { value: 'risk_factors', label: 'Risk Factors' },
  { value: 'mda', label: "Management's Discussion" },
  { value: 'business', label: 'Business' },
  { value: 'legal_proceedings', label: 'Legal Proceedings' },
  { value: 'market_risk', label: 'Market Risk' },
];

export function FilingDiffTool({
  ticker: initialTicker = '',
  formType: initialFormType = '10-K',
}: FilingDiffToolProps) {
  const [ticker, setTicker] = useState(initialTicker);
  const [formType, setFormType] = useState(initialFormType);
  const [section, setSection] = useState('risk_factors');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sec/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          formType,
          section,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Comparison failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.9) return 'text-green-400';
    if (similarity >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSimilarityLabel = (similarity: number): string => {
    if (similarity >= 0.9) return 'Almost Identical';
    if (similarity >= 0.8) return 'Minor Changes';
    if (similarity >= 0.7) return 'Moderate Changes';
    if (similarity >= 0.5) return 'Significant Changes';
    return 'Major Changes';
  };

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Filing Diff Tool</h2>
            <p className="text-xs text-gray-400">Compare sections between filings</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full px-3 py-2 bg-[#212121] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Filing Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as '10-K' | '10-Q')}
              className="w-full px-3 py-2 bg-[#212121] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="10-K">10-K (Annual)</option>
              <option value="10-Q">10-Q (Quarterly)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 bg-[#212121] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            >
              {SECTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={runComparison}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Comparing...
                </span>
              ) : (
                'Compare'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="p-4">
          {/* Filing Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-[#212121] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Current Filing</p>
              <p className="text-white font-medium">{result.currentFiling.form}</p>
              <p className="text-sm text-gray-400">{result.currentFiling.filingDate}</p>
            </div>
            <div className="p-3 bg-[#212121] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Previous Filing</p>
              <p className="text-white font-medium">{result.previousFiling.form}</p>
              <p className="text-sm text-gray-400">{result.previousFiling.filingDate}</p>
            </div>
          </div>

          {/* Overall Similarity */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Overall Similarity</span>
              <span className={`font-bold ${getSimilarityColor(result.overallSimilarity)}`}>
                {(result.overallSimilarity * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.overallSimilarity * 100}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full ${
                  result.overallSimilarity >= 0.9 ? 'bg-green-500' :
                  result.overallSimilarity >= 0.7 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {getSimilarityLabel(result.overallSimilarity)}
            </p>
          </div>

          {/* Section Similarities */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Section Analysis</h3>
            <div className="space-y-2">
              {result.allSections.map((s, index) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-2 bg-[#212121] rounded-lg"
                >
                  <span className="text-sm text-gray-300 capitalize">
                    {s.name.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    {s.addedTerms > 0 && (
                      <span className="text-xs text-green-400">+{s.addedTerms}</span>
                    )}
                    {s.removedTerms > 0 && (
                      <span className="text-xs text-red-400">-{s.removedTerms}</span>
                    )}
                    <span className={`text-sm font-medium ${getSimilarityColor(s.similarity)}`}>
                      {(s.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* New Risks */}
          {result.newRisks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                New Risk Factors ({result.newRisks.length})
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {result.newRisks.map((risk, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                  >
                    <p className="text-sm text-gray-300">{risk}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Risks */}
          {result.removedRisks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                Removed Risk Factors ({result.removedRisks.length})
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {result.removedRisks.map((risk, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <p className="text-sm text-gray-300">{risk}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Diff Details */}
          {result.diff && (
            <div className="grid grid-cols-2 gap-4">
              {result.diff.added.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-green-400 mb-2">New Terms</h4>
                  <div className="flex flex-wrap gap-1">
                    {result.diff.added.slice(0, 20).map((term, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                        {term}
                      </span>
                    ))}
                    {result.diff.added.length > 20 && (
                      <span className="text-xs text-gray-500">+{result.diff.added.length - 20} more</span>
                    )}
                  </div>
                </div>
              )}
              {result.diff.removed.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-red-400 mb-2">Removed Terms</h4>
                  <div className="flex flex-wrap gap-1">
                    {result.diff.removed.slice(0, 20).map((term, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">
                        {term}
                      </span>
                    ))}
                    {result.diff.removed.length > 20 && (
                      <span className="text-xs text-gray-500">+{result.diff.removed.length - 20} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="p-8 text-center">
          <p className="text-gray-400">Enter a ticker and click Compare to analyze filing changes</p>
        </div>
      )}
    </div>
  );
}

export default FilingDiffTool;
