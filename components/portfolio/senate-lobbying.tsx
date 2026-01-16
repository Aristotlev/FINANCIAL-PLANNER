"use client";

import { useEffect, useState } from 'react';
import { Landmark, Search, ExternalLink, DollarSign, FileText, Calendar, Building2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// Initialize date range outside component to avoid hydration issues
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
        <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
          <Landmark className="w-6 h-6 text-blue-400" />
          Senate Lobbying
        </h2>
      </div>

      {/* Search Section */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="w-full pl-10 pr-4 py-3 bg-[#212121] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchSymbol.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">Date Range:</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1.5 bg-[#212121] border border-[#333] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1.5 bg-[#212121] border border-[#333] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick Select */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">Popular:</span>
            {POPULAR_SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => handleQuickSelect(symbol)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-[#212121] border-[#333] text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
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
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Filings</p>
                <p className="text-xl font-bold text-white">{activities.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Income (Lobbying Firms)</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Expenses (Company)</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 p-4 border-b border-[#2A2A2A] text-sm font-medium text-gray-400 bg-[#212121]">
          <div className="col-span-3">Company</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2 text-center">Period</div>
          <div className="col-span-2 text-right">Income / Expenses</div>
          <div className="col-span-2 text-right">Document</div>
        </div>

        {/* Content */}
        <div className="divide-y divide-[#2A2A2A] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading lobbying data for {selectedSymbol}...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={() => selectedSymbol && fetchLobbyingData(selectedSymbol)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : !selectedSymbol ? (
            <div className="p-12 text-center">
              <Landmark className="w-8 h-8 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Search for a stock symbol to view lobbying activities</p>
              <p className="text-sm text-gray-500 mt-2">
                See reported lobbying activities in the Senate and the House
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No lobbying activities found for {selectedSymbol}</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting the date range or searching for a different symbol
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activities.map((activity, index) => (
                <motion.div
                  key={`${activity.senateId}-${activity.year}-${activity.period}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="grid grid-cols-12 p-4 hover:bg-[#252525] transition-colors text-sm items-center"
                >
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#252525] rounded-lg">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{activity.name}</p>
                        <p className="text-xs text-gray-500">{activity.symbol} • {activity.country}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <p className="text-gray-300 line-clamp-2">
                      {activity.description || 'No description available'}
                    </p>
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-white">
                        {formatPeriod(activity.period)} {activity.year}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    {activity.income !== null ? (
                      <p className="text-green-400 font-mono">
                        +{formatCurrency(activity.income)}
                      </p>
                    ) : activity.expenses !== null ? (
                      <p className="text-red-400 font-mono">
                        -{formatCurrency(activity.expenses)}
                      </p>
                    ) : (
                      <p className="text-gray-500">N/A</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {activity.income !== null ? 'Income' : activity.expenses !== null ? 'Expenses' : ''}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    {activity.documentUrl ? (
                      <a
                        href={activity.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Filing
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">No document</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-600 px-1">
        <p>* Data sourced from Senate and House lobbying disclosure reports via Finnhub.</p>
        <p>* Income is reported by lobbying firms, expenses are reported by the company.</p>
      </div>
    </div>
  );
}
