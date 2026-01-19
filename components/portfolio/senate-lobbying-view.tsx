"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, FileText, ExternalLink, Landmark, Calendar, Globe, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tickerDomains } from '@/lib/ticker-domains';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Generate a consistent color based on ticker
const getTickerColor = (ticker: string): string => {
  const colors = [
    'from-amber-500 to-amber-700',
    'from-orange-500 to-orange-700',
    'from-yellow-500 to-yellow-700',
    'from-red-500 to-red-700',
    'from-pink-500 to-pink-700',
    'from-purple-500 to-purple-700',
    'from-blue-500 to-blue-700',
    'from-cyan-500 to-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Company Icon Component
const CompanyIcon = ({ ticker, className = "h-8 w-8", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();
  
  // Build list of image sources to try
  const imageSources = useMemo(() => {
    const sources: string[] = [];
    
    // 1. Known domain from our mapping
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    
    // 2. Try logo.dev API (free tier, good coverage)
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    
    // 3. Try common domain patterns
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`);
    
    return sources;
  }, [upperTicker, ticker]);
  
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [ticker]);
  
  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };
  
  if (!imageError && imageSources.length > 0) {
    return (
      <img 
        src={imageSources[fallbackIndex]}
        alt={`${ticker} logo`} 
        className={cn(className, "rounded-lg object-contain bg-white p-0.5")}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={cn(className, `rounded-lg bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg text-xs`)}>
      {ticker.slice(0, 2)}
    </div>
  );
};

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
  source?: 'api' | 'cache';
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
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA',
  'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'BMY',
  'LMT', 'RTX', 'BA', 'NOC', 'GD',
  'XOM', 'CVX', 'COP', 'OXY',
  'JPM', 'BAC', 'GS', 'MS', 'WFC',
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
        
        if (data.source === 'cache') {
          setFromCache(true);
        }

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

    // Try localStorage cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log(`Lobbying: Loaded ${cached.activities.length} from localStorage cache`);
        setActivities(cached.activities);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        return;
      }
    }

    // Try bulk database cache first (single request for all data) - FAST!
    if (!forceRefresh) {
      try {
        setFetchProgress('Loading from database...');
        const response = await fetch('/api/finnhub/bulk-cache?type=lobbying&limit=1000');
        if (response.ok) {
          const data = await response.json();
          if (data.lobbying && data.lobbying.length > 0) {
            console.log(`Lobbying: Loaded ${data.lobbying.length} from database cache`);
            const sortedActivities = data.lobbying.sort((a: LobbyingActivity, b: LobbyingActivity) => {
              if (b.year !== a.year) return b.year - a.year;
              return (b.period || '').localeCompare(a.period || '');
            });
            setActivities(sortedActivities);
            setFromCache(true);
            setLastUpdated(new Date(data.timestamp));
            saveToCache(sortedActivities, DEFAULT_SYMBOLS);
            setLoading(false);
            setFetchProgress('');
            return;
          }
        }
      } catch (err) {
        console.warn('Bulk cache unavailable, falling back to individual fetches');
      }
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setFetchProgress('Starting...');

    try {
      const allActivities: LobbyingActivity[] = [];
      const symbols = DEFAULT_SYMBOLS;
      
      // Batch fetch - 5 symbols at a time (faster since cache is now instant)
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        setFetchProgress(`Fetching ${i + 1}-${Math.min(i + batchSize, symbols.length)} of ${symbols.length} symbols...`);
        
        const results = await Promise.all(
          batch.map(async (symbol) => {
            try {
              const response = await fetch(`/api/finnhub/lobbying?symbol=${symbol}`);
              if (!response.ok) return [];
              const data: LobbyingResponse = await response.json();
              if (data.source === 'cache') setFromCache(true);
              return data.data || [];
            } catch {
              return [];
            }
          })
        );
        
        results.flat().forEach(a => allActivities.push(a));
        
        // Smaller pause between batches (cache is fast now)
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const sortedActivities = allActivities.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return (b.period || '').localeCompare(a.period || '');
      });
      
      saveToCache(sortedActivities, symbols);
      setActivities(sortedActivities);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
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

  const filteredActivities = activities.filter(a => {
    const symbolMatch = !symbolFilter || a.symbol === symbolFilter;
    return symbolMatch;
  });

  const totalExpenses = activities.reduce((sum, a) => sum + (a.expenses || 0), 0);
  const totalIncome = activities.reduce((sum, a) => sum + (a.income || 0), 0);
  const uniqueCompanies = new Set(activities.map(a => a.name)).size;

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueSymbols = [...new Set(activities.map(a => a.symbol))].sort();

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Landmark className="w-6 h-6 text-amber-500" />
            Senate Lobbying
           </h2>
            <div className="flex gap-3 text-sm mt-1 text-gray-400">
             Track Congressional lobbying activities and expenditures
          </div>
        </div>

        {/* Stats Controls */}
        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-4 mr-4 text-xs font-medium bg-[#1A1A1A] p-2 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">Companies:</span>
                    <span className="text-white">{uniqueCompanies}</span>
                </div>
                <div className="w-px h-3 bg-gray-700"></div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">Expenses:</span>
                    <span className="text-red-400">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="w-px h-3 bg-gray-700"></div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">Income:</span>
                    <span className="text-green-400">{formatCurrency(totalIncome)}</span>
                </div>
             </div>

            <button
                onClick={() => fetchLobbyingActivities(true)}
                disabled={loading}
                className="p-2.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 border border-gray-800 hover:border-gray-700"
                title="Refresh data"
            >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticker (e.g., AAPL, LMT, PFE)..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
             className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                loading || !searchInput.trim()
                  ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                  : "bg-amber-600/10 text-amber-400 border border-amber-600/20 hover:bg-amber-600/20"
              )}
          >
            Search
          </button>
        </form>
        
        {/* Quick Filters */}
        {uniqueSymbols.length > 0 && (
           <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar border-t border-gray-800 pt-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold shrink-0">Recent:</span>
              {symbolFilter && (
                <button
                  onClick={clearSymbolFilter}
                   className="px-2 py-1 text-[10px] rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 whitespace-nowrap"
                >
                  Clear: {symbolFilter}
                </button>
              )}
              {uniqueSymbols.slice(0, 15).map(sym => (
                <button
                  key={sym}
                  onClick={() => setSymbolFilter(symbolFilter === sym ? '' : sym)}
                  className={cn(
                      "px-2 py-1 text-[10px] rounded-md transition-colors whitespace-nowrap flex-shrink-0 border",
                       symbolFilter === sym
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-[#1A1A1A] text-gray-500 border-gray-800 hover:border-gray-700 hover:text-gray-300'
                  )}
                >
                  {sym}
                </button>
              ))}
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-[#1A1A1A] rounded-xl border border-gray-800 flex flex-col">
          {/* Grid Header */}
          <div className="border-b border-gray-800">
             <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-2">Symbol</div>
                <div className="col-span-3">Entity Name</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-1 text-center">Period</div>
                <div className="col-span-2 text-right">Income / Expenses</div>
                <div className="col-span-1 text-center">Doc</div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading && activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                     <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                    <p className="text-gray-400 text-sm">{fetchProgress || 'Loading lobbying activities...'}</p>
                 </div>
            ) : filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
                    <Landmark className="w-12 h-12 mb-3 opacity-20" />
                    <p>No lobbying activities matched your search.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-800/50">
                    <AnimatePresence mode="popLayout">
                        {paginatedActivities.map((activity, idx) => (
                           <motion.div
                             key={`${activity.symbol}-${activity.senateId || activity.registrantId}-${activity.year}-${activity.period}-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: idx * 0.01 }}
                              className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-[#222] transition-colors text-sm border-l-2 border-l-transparent hover:border-l-amber-500 group"
                           >
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className="w-8 h-8 flex-shrink-0">
                                        <CompanyIcon ticker={activity.symbol} className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <button 
                                            onClick={() => setSymbolFilter(activity.symbol)} 
                                            className="font-bold text-white hover:text-amber-400 transition-colors"
                                        >
                                            {activity.symbol}
                                        </button>
                                        <span className="block text-[10px] text-gray-600">{activity.country || 'USA'}</span>
                                    </div>
                                </div>

                                <div className="col-span-3">
                                     <div className="font-medium text-gray-300 truncate pr-2" title={activity.name}>
                                        {activity.name}
                                     </div>
                                      {activity.postedName && activity.postedName !== activity.name && (
                                        <div className="text-[10px] text-gray-500 truncate" title={activity.postedName}>
                                            Posted: {activity.postedName}
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-3">
                                     <div className="text-gray-400 text-xs line-clamp-2" title={activity.description}>
                                        {activity.description || '-'}
                                     </div>
                                </div>

                                <div className="col-span-1 text-center">
                                    <div className="inline-flex flex-col items-center justify-center text-[10px] font-mono bg-[#111] px-2 py-1 rounded border border-gray-800/50">
                                         <span className="text-gray-300">{activity.period}</span>
                                         <span className="text-gray-500">{activity.year}</span>
                                    </div>
                                </div>

                                <div className="col-span-2 text-right">
                                    {activity.expenses ? (
                                        <div className="text-red-400 font-mono font-medium">
                                            {formatCurrency(activity.expenses)}
                                            <div className="text-[10px] text-gray-600 uppercase">Expense</div>
                                        </div>
                                    ) : activity.income ? (
                                        <div className="text-green-400 font-mono font-medium">
                                            {formatCurrency(activity.income)}
                                             <div className="text-[10px] text-gray-600 uppercase">Income</div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-600">-</span>
                                    )}
                                </div>

                                <div className="col-span-1 text-center">
                                     {activity.documentUrl ? (
                                        <a
                                            href={activity.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:bg-amber-500/10 hover:text-amber-400 transition-colors border border-gray-700 hover:border-amber-500/30"
                                            title="View Filing"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </a>
                                        ) : (
                                        <span className="text-gray-700">-</span>
                                        )}
                                </div>
                           </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
          </div>
          
           {/* Pagination Footer */}
          <div className="border-t border-gray-800 bg-[#1A1A1A] p-2 flex justify-between items-center">
             <div className="text-xs text-gray-500 pl-4 flex items-center gap-2">
                 <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
                 {fromCache && <span className="text-amber-700 px-1.5 py-0.5 bg-amber-900/10 rounded border border-amber-900/20 text-[10px]">Cached</span>}
             </div>
             <div className="flex gap-1 pr-2">
                 <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <span className="text-xs text-gray-400">First</span>
                 </button>
                 <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                 </button>
                 <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                 </button>
                 <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <span className="text-xs text-gray-400">Last</span>
                 </button>
             </div>
          </div>
      </div>
    </div>
  );
}
