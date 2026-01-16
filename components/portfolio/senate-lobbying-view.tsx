"use client";

import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, Building2, FileText, DollarSign, ExternalLink, Landmark, Calendar, Globe } from 'lucide-react';
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

interface LobbyingResponse {
  data: LobbyingActivity[];
  symbol: string;
}

interface CachedLobbyingData {
  activities: LobbyingActivity[];
  timestamp: number;
  version: number;
  symbols: string[];
}

const CACHE_KEY = 'omnifolio_lobbying_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_VERSION = 1;

// Popular stocks to track lobbying activities
const DEFAULT_SYMBOLS = [
  // Tech Giants (heavy lobbyists)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA',
  // Pharma (major lobbying)
  'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'BMY',
  // Defense (government contracts)
  'LMT', 'RTX', 'BA', 'NOC', 'GD',
  // Energy
  'XOM', 'CVX', 'COP', 'OXY',
  // Finance
  'JPM', 'BAC', 'GS', 'MS', 'WFC',
  // Telecom
  'T', 'VZ', 'TMUS',
];

export function SenateLobbyingView() {
  const [activities, setActivities] = useState<LobbyingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const itemsPerPage = 50;

  // Load from localStorage cache
  const loadFromCache = useCallback((): CachedLobbyingData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedLobbyingData = JSON.parse(cached);
      
      if (data.version !== CACHE_VERSION) return null;
      if (Date.now() - data.timestamp > CACHE_DURATION) return null;
      
      return data;
    } catch {
      return null;
    }
  }, []);

  // Save to localStorage cache
  const saveToCache = useCallback((activities: LobbyingActivity[], symbols: string[]) => {
    try {
      const cacheData: CachedLobbyingData = {
        activities,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        symbols
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to cache lobbying data:', err);
    }
  }, []);

  const fetchLobbyingActivities = useCallback(async (forceRefresh = false, customSymbol?: string) => {
    // If searching for a specific symbol, just fetch that one
    if (customSymbol) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/finnhub/lobbying?symbol=${customSymbol}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data: LobbyingResponse = await response.json();
        
        // Merge with existing activities, deduplicate
        setActivities(prev => {
          const existing = prev.filter(a => a.symbol !== customSymbol);
          const merged = [...existing, ...(data.data || [])];
          // Sort by year and period
          return merged.sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return (b.period || '').localeCompare(a.period || '');
          });
        });
        setSymbolFilter(customSymbol);
      } catch (err) {
        setError(`Failed to fetch ${customSymbol} lobbying data`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log(`Lobbying: Loaded ${cached.activities.length} from cache`);
        setActivities(cached.activities);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setFetchProgress('Starting...');

    try {
      const allActivities: LobbyingActivity[] = [];
      const symbols = DEFAULT_SYMBOLS;
      
      // Batch fetch - 3 symbols at a time with delays to respect rate limits
      const batchSize = 3;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        setFetchProgress(`Fetching ${i + 1}-${Math.min(i + batchSize, symbols.length)} of ${symbols.length} symbols...`);
        
        const results = await Promise.all(
          batch.map(async (symbol, idx) => {
            // Small stagger between requests
            await new Promise(resolve => setTimeout(resolve, idx * 150));
            
            try {
              const response = await fetch(`/api/finnhub/lobbying?symbol=${symbol}`);
              if (!response.ok) {
                if (response.status === 429) {
                  console.warn(`Rate limited on ${symbol}, skipping...`);
                  return [];
                }
                return [];
              }
              const data: LobbyingResponse = await response.json();
              return data.data || [];
            } catch {
              return [];
            }
          })
        );
        
        results.flat().forEach(a => allActivities.push(a));
        
        // Pause between batches to avoid rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by year and period (newest first)
      const sortedActivities = allActivities.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return (b.period || '').localeCompare(a.period || '');
      });

      console.log(`Lobbying: Fetched ${sortedActivities.length} activities from ${symbols.length} symbols`);
      
      // Cache results
      saveToCache(sortedActivities, symbols);
      
      setActivities(sortedActivities);
      setLastUpdated(new Date());
      setFetchProgress('');
    } catch (err) {
      console.error('Error fetching lobbying activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Try stale cache on error
      const cached = loadFromCache();
      if (cached) {
        setActivities(cached.activities);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchLobbyingActivities();
  }, [fetchLobbyingActivities]);

  useEffect(() => {
    setCurrentPage(1);
  }, [symbolFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const symbol = searchInput.toUpperCase().trim();
      fetchLobbyingActivities(false, symbol);
      setSearchInput('');
    }
  };

  const clearSymbolFilter = () => {
    setSymbolFilter('');
    setCurrentPage(1);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  // Filter activities
  const filteredActivities = activities.filter(a => {
    const symbolMatch = !symbolFilter || a.symbol === symbolFilter;
    return symbolMatch;
  });

  // Calculate stats
  const totalExpenses = activities.reduce((sum, a) => sum + (a.expenses || 0), 0);
  const totalIncome = activities.reduce((sum, a) => sum + (a.income || 0), 0);
  const uniqueCompanies = new Set(activities.map(a => a.name)).size;

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique symbols for quick filter
  const uniqueSymbols = [...new Set(activities.map(a => a.symbol))].sort();

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Landmark className="w-5 h-5 text-amber-400" />
          Senate Lobbying
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Companies:</span>
            <span className="text-blue-400 font-semibold">{uniqueCompanies}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Expenses:</span>
            <span className="text-red-400 font-semibold">{formatCurrency(totalExpenses)}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Income:</span>
            <span className="text-green-400 font-semibold">{formatCurrency(totalIncome)}</span>
          </div>
          <button
            onClick={() => fetchLobbyingActivities(true)}
            disabled={loading}
            className="p-2 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticker (e.g., AAPL, LMT, PFE)..."
              className="w-full bg-[#0D0D0D] border border-gray-800 text-white text-sm rounded-lg focus:ring-0 focus:border-gray-700 focus:outline-none block pl-10 p-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-0 focus:outline-none transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </form>
        
        {/* Quick Symbol Filters */}
        {uniqueSymbols.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 py-1">Quick filter:</span>
            {symbolFilter && (
              <button
                onClick={clearSymbolFilter}
                className="px-2 py-1 text-xs rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
              >
                Clear: {symbolFilter} ×
              </button>
            )}
            {uniqueSymbols.slice(0, 15).map(sym => (
              <button
                key={sym}
                onClick={() => setSymbolFilter(symbolFilter === sym ? '' : sym)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  symbolFilter === sym
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
                }`}
              >
                {sym}
              </button>
            ))}
            {uniqueSymbols.length > 15 && (
              <span className="text-xs text-gray-500 py-1">+{uniqueSymbols.length - 15} more</span>
            )}
          </div>
        )}
      </div>

      {/* Pagination + Info */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Landmark className="w-3.5 h-3.5 text-amber-400" />
          <span>Congressional lobbying activities reported to the Senate and House</span>
        </div>
        
        {/* Pagination at top */}
        <div className="flex items-center gap-2">
          {fromCache && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80 mr-2">
              <Database className="w-3 h-3" />
              <span>Cached</span>
            </div>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500 mr-2">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {filteredActivities.length} activities
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400 min-w-[60px] text-center">
            {currentPage} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#1A1A1A] rounded-xl border border-gray-800">
        {loading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-gray-400 text-sm">{fetchProgress || 'Loading lobbying activities...'}</span>
          </div>
        ) : error && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-red-400">{error}</span>
            <button
              onClick={() => fetchLobbyingActivities(true)}
              className="px-4 py-2 bg-amber-600 rounded-lg text-sm hover:bg-amber-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Landmark className="w-12 h-12 mb-3 opacity-30" />
            <p>No lobbying activities found</p>
            {symbolFilter && (
              <button
                onClick={clearSymbolFilter}
                className="mt-2 text-amber-400 text-sm hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#212121] sticky top-0 z-10">
              <tr className="text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-center">Period</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Income</th>
                <th className="px-4 py-3 text-center">Country</th>
                <th className="px-4 py-3 text-center">Document</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedActivities.map((activity, idx) => {
                  return (
                    <motion.tr
                      key={`${activity.symbol}-${activity.senateId || activity.registrantId}-${activity.year}-${activity.period}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-gray-800/50 hover:bg-[#212121]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSymbolFilter(activity.symbol)}
                          className="flex items-center gap-2 hover:text-amber-400 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="font-semibold text-white">{activity.symbol}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 truncate max-w-[180px] block" title={activity.name}>
                          {activity.name}
                        </span>
                        {activity.postedName && activity.postedName !== activity.name && (
                          <span className="text-xs text-gray-500 truncate block" title={activity.postedName}>
                            {activity.postedName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 truncate max-w-[250px] block text-xs" title={activity.description}>
                          {activity.description || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-300">
                            {activity.period} {activity.year}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-red-400 font-medium">
                          {formatCurrency(activity.expenses)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-400 font-medium">
                          {formatCurrency(activity.income)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Globe className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-400 text-xs">
                            {activity.country || 'USA'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {activity.documentUrl ? (
                          <a
                            href={activity.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          
          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
