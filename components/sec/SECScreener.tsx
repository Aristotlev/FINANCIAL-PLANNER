'use client';

/**
 * SEC Screener Component
 * Filter companies based on SEC filing data
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScreenerFilter {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

interface ScreenerResult {
  ticker: string;
  companyName: string;
  cik: string;
  value: number;
  filingDate: string;
}

interface SECScreenerProps {
  onSelectCompany?: (ticker: string, cik: string) => void;
}

const SCREENER_PRESETS = [
  {
    name: 'Insider Buying > $1M',
    description: 'Companies with significant insider purchases',
    filters: [{ field: 'insiderBuying', operator: 'gt' as const, value: 1000000 }],
  },
  {
    name: 'Insider Selling > $10M',
    description: 'Companies with large insider sales',
    filters: [{ field: 'insiderSelling', operator: 'gt' as const, value: 10000000 }],
  },
  {
    name: 'Recent 8-K Filings',
    description: 'Companies with breaking news',
    filters: [{ field: 'recent8K', operator: 'gte' as const, value: 1 }],
  },
  {
    name: 'Risk Factor Changes',
    description: 'Major changes in disclosed risks',
    filters: [{ field: 'riskChange', operator: 'gt' as const, value: 20 }],
  },
];

const FILTER_FIELDS = [
  { value: 'insiderBuying', label: 'Insider Buying ($)' },
  { value: 'insiderSelling', label: 'Insider Selling ($)' },
  { value: 'netInsider', label: 'Net Insider Activity ($)' },
  { value: 'recent8K', label: 'Recent 8-K Count' },
  { value: 'riskChange', label: 'Risk Factor Change (%)' },
  { value: 'revenue', label: 'Revenue ($)' },
  { value: 'netIncome', label: 'Net Income ($)' },
  { value: 'debtToEquity', label: 'Debt to Equity Ratio' },
];

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'eq', label: '=' },
  { value: 'lte', label: '<=' },
  { value: 'lt', label: '<' },
];

export function SECScreener({ onSelectCompany }: SECScreenerProps) {
  const [filters, setFilters] = useState<ScreenerFilter[]>([
    { field: 'insiderBuying', operator: 'gt', value: 100000 },
  ]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const addFilter = () => {
    setFilters([...filters, { field: 'insiderBuying', operator: 'gt', value: 0 }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<ScreenerFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
    setActivePreset(null);
  };

  const applyPreset = (preset: typeof SCREENER_PRESETS[0]) => {
    setFilters(preset.filters);
    setActivePreset(preset.name);
  };

  const runScreener = async () => {
    setLoading(true);
    
    // Simulate screener results (in production, this would call the API)
    // The actual implementation would query the database based on filters
    setTimeout(() => {
      // Sample results for demonstration
      setResults([
        {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          cik: '0000320193',
          value: 2500000,
          filingDate: '2025-01-15',
        },
        {
          ticker: 'MSFT',
          companyName: 'Microsoft Corporation',
          cik: '0000789019',
          value: 1800000,
          filingDate: '2025-01-10',
        },
        {
          ticker: 'GOOGL',
          companyName: 'Alphabet Inc.',
          cik: '0001652044',
          value: 1200000,
          filingDate: '2025-01-08',
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const formatValue = (field: string, value: number): string => {
    if (field.includes('insider') || field === 'revenue' || field === 'netIncome') {
      if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    }
    if (field.includes('Change') || field.includes('Ratio')) {
      return `${value.toFixed(2)}%`;
    }
    return value.toString();
  };

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">SEC Screener</h2>
            <p className="text-xs text-gray-400">Filter companies by SEC filing data</p>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="p-4 border-b border-gray-800 bg-[#212121]">
        <p className="text-xs text-gray-400 mb-2">Quick Filters</p>
        <div className="flex flex-wrap gap-2">
          {SCREENER_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activePreset === preset.name
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-[#1A1A1A] text-gray-400 hover:bg-gray-700 border border-transparent'
              }`}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-800">
        <div className="space-y-3">
          {filters.map((filter, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <select
                value={filter.field}
                onChange={(e) => updateFilter(index, { field: e.target.value })}
                className="flex-1 px-3 py-2 bg-[#212121] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                {FILTER_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, { operator: e.target.value as ScreenerFilter['operator'] })}
                className="w-16 px-2 py-2 bg-[#212121] border border-gray-800 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500/50"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              <input
                type="number"
                value={filter.value}
                onChange={(e) => updateFilter(index, { value: parseFloat(e.target.value) || 0 })}
                className="w-32 px-3 py-2 bg-[#212121] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              />

              <button
                onClick={() => removeFilter(index)}
                disabled={filters.length === 1}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={addFilter}
            className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add Filter
          </button>
          <div className="flex-1" />
          <button
            onClick={runScreener}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20 font-medium"
          >
            {loading ? 'Searching...' : 'Run Screener'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[400px] overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Searching...</span>
              </div>
            ) : (
              'Configure filters and click Run Screener'
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#212121] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Company</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Filing Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {results.map((result, index) => (
                <motion.tr
                  key={`${result.cik}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-[#212121] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{result.ticker}</p>
                      <p className="text-xs text-gray-400">{result.companyName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-400 font-medium">
                      {formatValue(filters[0]?.field || 'insiderBuying', result.value)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-sm">
                    {new Date(result.filingDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSelectCompany?.(result.ticker, result.cik)}
                      className="px-3 py-1 text-xs bg-[#212121] text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors border border-gray-800"
                    >
                      View
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-800 bg-[#212121]">
          <p className="text-xs text-gray-500 text-center">
            Found {results.length} companies matching your criteria
          </p>
        </div>
      )}
    </div>
  );
}

export default SECScreener;
