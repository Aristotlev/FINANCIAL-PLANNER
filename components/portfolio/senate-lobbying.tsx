"use client";

import { useEffect, useState } from 'react';
import { Landmark, Search, ExternalLink, DollarSign, FileText, Calendar, Building2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LobbyingActivity {
  clientId: string;
  country: string;
  date?: string;
  description: string;
  documentUrl: string;
  expenses: number | null;
  houseRegistrantId: string;
  income: number | null;
  name: string;
  period: string;
  postedName: string;
  registrantId: string;
  senateId: string;
  symbol: string;
  year: number;
  uuid?: string;
  type?: string;
  dtPosted?: string;
}

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'BAC', 'XOM'];

// Initialize date range outside component
const getInitialDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 2);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  };
};

export function SenateLobbying() {
  const [activities, setActivities] = useState<LobbyingActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const fetchLobbyingData = async (symbol: string) => {
    if (!symbol.trim()) return;
    
    setLoading(true);
    setError(null);
    setSelectedSymbol(symbol.toUpperCase());
    
    try {
      const params = new URLSearchParams({
        operation: 'lobbying',
        symbol: symbol.toUpperCase(),
        from: dateRange.from,
        to: dateRange.to
      });
      
      const response = await fetch(`/api/finnhub?${params}`);
      const result = await response.json();
      
      // Check for premium access error
      if (response.status === 403 || (result.error && result.error.includes("don't have access"))) {
        throw new Error('This feature requires a Finnhub Premium subscription. Lobbying data is not available on the free tier.');
      }
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch lobbying data');
      }
      
      setActivities(result.data?.data || []);
    } catch (err: any) {
      console.error('Error fetching lobbying data:', err);
      setError(err.message || 'Failed to fetch lobbying data');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      fetchLobbyingData(searchSymbol.trim());
    }
  };

  const handleQuickSelect = (symbol: string) => {
    setSearchSymbol(symbol);
    fetchLobbyingData(symbol);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPeriod = (period: string) => {
    const periodMap: Record<string, string> = {
      'first_quarter': 'Q1',
      'second_quarter': 'Q2',
      'third_quarter': 'Q3',
      'fourth_quarter': 'Q4',
      'Q1': 'Q1',
      'Q2': 'Q2',
      'Q3': 'Q3',
      'Q4': 'Q4',
    };
    return periodMap[period] || period;
  };

  const totalExpenses = activities.reduce((sum, a) => sum + (a.expenses || 0), 0);
  const totalIncome = activities.reduce((sum, a) => sum + (a.income || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-3 text-white">
          <Landmark className="w-5 h-5 text-blue-400" />
          Senate Lobbying
        </h2>
      </div>

      {/* Search Section */}
      <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
             <div className="flex items-center gap-2 text-sm bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-gray-800">
                <span className="text-gray-500 text-xs">Range:</span>
                <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="bg-transparent text-white focus:outline-none text-xs w-24"
                />
                <span className="text-gray-600">-</span>
                <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="bg-transparent text-white focus:outline-none text-xs w-24"
                />
            </div>

            <button
              type="submit"
              disabled={loading || !searchSymbol.trim()}
              className="px-4 py-2 bg-blue-600/10 border border-blue-600/20 text-blue-400 hover:bg-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-lg transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>

          {/* Quick Select */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold shrink-0">Popular:</span>
            {POPULAR_SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => handleQuickSelect(symbol)}
                className={cn(
                    "px-2 py-1 text-[10px] rounded-md border transition-colors whitespace-nowrap",
                   selectedSymbol === symbol
                    ? 'bg-blue-600/20 border-blue-600/30 text-blue-400'
                    : 'bg-[#1A1A1A] border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                )}
              >
                {symbol}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Summary Stats */}
      {selectedSymbol && activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold">Total Filings</p>
                <p className="text-xl font-bold text-white font-mono">{activities.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                 <p className="text-[10px] uppercase text-gray-500 font-bold">Total Income (Firms)</p>
                <p className="text-xl font-bold text-green-400 font-mono">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <div>
                 <p className="text-[10px] uppercase text-gray-500 font-bold">Total Expenses (Co)</p>
                <p className="text-xl font-bold text-red-400 font-mono">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 p-3 border-b border-gray-800 bg-[#1A1A1A] text-xs font-medium text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Company</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2 text-center">Period</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Document</div>
        </div>

        {/* Content */}
        <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Loading lobbying data...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2 text-sm">{error}</p>
              <button
                onClick={() => selectedSymbol && fetchLobbyingData(selectedSymbol)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mx-auto text-sm"
              >
                <RefreshCw className="w-3 h-3" />
                Try Again
              </button>
            </div>
          ) : !selectedSymbol ? (
            <div className="p-12 text-center">
              <Landmark className="w-8 h-8 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Search for a stock symbol to view lobbying activities</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">No lobbying activities found.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activities.map((activity, index) => (
                <motion.div
                  key={`${activity.senateId}-${activity.year}-${activity.period}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="grid grid-cols-12 p-3 hover:bg-[#212121] transition-colors text-sm items-center border-l-2 border-l-transparent hover:border-l-blue-500"
                >
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#252525] rounded-lg">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate text-xs">{activity.name}</p>
                        <p className="text-[10px] text-gray-500">{activity.country}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <p className="text-gray-400 text-xs line-clamp-2" title={activity.description}>
                      {activity.description || '-'}
                    </p>
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-300 text-xs">
                        {formatPeriod(activity.period)} {activity.year}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    {activity.income !== null ? (
                      <p className="text-green-400 font-mono text-xs font-medium">
                        +{formatCurrency(activity.income)}
                      </p>
                    ) : activity.expenses !== null ? (
                      <p className="text-red-400 font-mono text-xs font-medium">
                        -{formatCurrency(activity.expenses)}
                      </p>
                    ) : (
                      <p className="text-gray-600 text-xs">-</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right flex justify-end">
                    {activity.documentUrl ? (
                      <a
                        href={activity.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors text-[10px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Filing
                      </a>
                    ) : (
                      <span className="text-gray-600 text-[10px]">-</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-[10px] text-gray-600 px-2 text-center">
        Data sourced from Senate and House lobbying disclosure reports via Finnhub.
      </div>
    </div>
  );
}
