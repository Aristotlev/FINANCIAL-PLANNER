"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Info, AlertCircle, Search, Target, X } from 'lucide-react';
import { FinnhubEarnings } from '../../lib/api/finnhub-api';
import { tickerDomains } from '@/lib/ticker-domains';

// Client-side cache for instant loads
const earningsCache = new Map<string, { data: FinnhubEarnings[]; timestamp: number }>();
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes local cache
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for search results

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
}

// Generate a consistent color based on ticker
const getTickerColor = (ticker: string): string => {
  const colors = [
    'from-purple-500 to-purple-700',
    'from-blue-500 to-blue-700',
    'from-cyan-500 to-cyan-700',
    'from-green-500 to-green-700',
    'from-yellow-500 to-yellow-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-indigo-500 to-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Company Icon Component - Same approach as SEC EDGAR page
const CompanyIcon = ({ ticker, className = "h-10 w-10", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
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
        className={`${className} rounded-lg object-contain bg-white p-1`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={`${className} rounded-lg bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`}>
      {ticker.slice(0, 2)}
    </div>
  );
};

interface EarningsSurprisesViewProps {
  initialTicker?: string;
}

export function EarningsSurprisesView({ initialTicker = 'AAPL' }: EarningsSurprisesViewProps) {
  const [ticker, setTicker] = useState(initialTicker);
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<FinnhubEarnings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialLoadDone = useRef(false);
  
  // Search autocomplete state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search for stocks by ticker or company name
  const searchStocks = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    
    const cacheKey = query.toLowerCase();
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      setSearchResults(cached.results);
      setShowDropdown(cached.results.length > 0);
      return;
    }
    
    // Cancel any pending search request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = new AbortController();
    
    setSearchLoading(true);
    
    try {
      const response = await fetch(`/api/yahoo-finance/search?q=${encodeURIComponent(query)}`, {
        signal: searchAbortRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${response.status}`);
      }
      
      const data = await response.json();
      const results: SearchResult[] = data.results || [];
      
      // Cache the results
      searchCache.set(cacheKey, { results, timestamp: Date.now() });
      
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      // Silently handle network errors for search - just show no results
      // This prevents console spam when the user is typing quickly or has network issues
      if (err.message === 'Failed to fetch') {
        console.warn('Search: Network unavailable or server not responding');
      } else {
        console.error('Search error:', err);
      }
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search handler
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      searchStocks(value.trim());
    }, 200);
  }, [searchStocks]);

  // Handle selecting a search result
  const handleSelectResult = useCallback((result: SearchResult) => {
    setTicker(result.symbol);
    setSearchInput('');
    setShowDropdown(false);
    setSearchResults([]);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch with cache-first strategy for instant loads
  const fetchData = useCallback(async (tickerToFetch: string, skipCache = false) => {
    if (!tickerToFetch) return;
    
    const cacheKey = tickerToFetch.toUpperCase();
    const cached = earningsCache.get(cacheKey);
    
    // Return cached data immediately if available and not expired
    if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }
    
    // Show cached data immediately while fetching fresh data
    if (cached) {
      setData(cached.data);
    }
    
    // Only show loading spinner if no cached data
    if (!cached) {
      setLoading(true);
    }
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setError(null);
    
    try {
      const response = await fetch(`/api/finnhub/earnings?symbol=${tickerToFetch}&limit=4`, {
        signal: abortControllerRef.current.signal,
      });
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        const text = await response.text();
        console.error("API returned non-JSON response:", text.substring(0, 100));
        throw new Error("API unavailable or returned invalid format");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch earnings surprise data');
      }
      
      const result: FinnhubEarnings[] = await response.json();
      
      // Sort by date (oldest to newest) for the chart
      const sortedData = (result || []).sort((a, b) => {
        return new Date(a.period).getTime() - new Date(b.period).getTime();
      });
      
      // Update cache
      earningsCache.set(cacheKey, { data: sortedData, timestamp: Date.now() });
      
      setData(sortedData);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      console.error('Earnings fetch error:', err);
      
      // Handle network errors gracefully
      const errorMessage = err.message === 'Failed to fetch' 
        ? 'Unable to connect to server. Please check your connection.'
        : err.message || 'An error occurred';
      
      // Only show error if we have no cached data to show
      if (!cached) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load - only once
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchData(ticker);
    }
  }, []);

  // Handle ticker changes (from search)
  useEffect(() => {
    if (initialLoadDone.current && ticker) {
      fetchData(ticker);
    }
  }, [ticker, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTicker(searchInput.toUpperCase().trim());
      setSearchInput('');
      setShowDropdown(false);
      setSearchResults([]);
    }
  };

  // Prepare chart data - split into positive and negative for stable rendering
  const chartData = useMemo(() => data.map(item => {
    const isPositive = item.actual >= item.estimate;
    return {
      period: item.period,
      estimate: item.estimate,
      surprise: item.surprise,
      surprisePercent: item.surprisePercent,
      label: `Q${item.quarter} ${item.year}`,
      // Split actual into two separate data keys for positive/negative
      // This avoids dynamic Cell components which cause flickering
      actualPositive: isPositive ? item.actual : null,
      actualNegative: !isPositive ? item.actual : null,
    };
  }), [data]);

  // Calculate average surprise
  const avgSurprise = data.length > 0 
    ? data.reduce((acc, curr) => acc + curr.surprisePercent, 0) / data.length 
    : 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Target className="w-6 h-6 text-blue-400" />
          Earnings Surprises
        </h2>
      </div>

       {/* Search Bar */}
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3" ref={dropdownRef}>
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onFocus={() => searchInput.trim() && searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search by ticker or company name..."
              className="w-full pl-10 pr-10 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setShowDropdown(false);
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <button
                      key={`${result.symbol}-${idx}`}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left border-b border-gray-800 last:border-b-0"
                    >
                      <CompanyIcon ticker={result.symbol} className="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{result.symbol}</span>
                          <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                            {result.exchange}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{result.name}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-sm text-center">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
              loading || !searchInput.trim()
                ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Analyze</span>
          </button>
        </form>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 min-h-[400px]">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             <CompanyIcon ticker={ticker} className="h-10 w-10" />
             <div>
                <h3 className="text-lg font-semibold text-white">Earnings History for {ticker}</h3>
                <p className="text-sm text-gray-400">Actual vs Estimated EPS</p>
             </div>
           </div>
           
           {!loading && !error && data.length > 0 && (
             <div className="flex items-center gap-4 bg-[#212121] px-4 py-2 rounded-lg border border-gray-700">
                <div className="text-right">
                    <p className="text-xs text-gray-400">Avg Surprise</p>
                    <p className={`font-mono font-bold ${avgSurprise >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {avgSurprise > 0 ? '+' : ''}{avgSurprise.toFixed(2)}%
                    </p>
                </div>
                <div className="h-8 w-px bg-gray-700"></div>
                <div className="text-right">
                    <p className="text-xs text-gray-400">Last Reported</p>
                    <p className="font-mono font-bold text-white">
                        {data[data.length - 1].period}
                    </p>
                </div>
             </div>
           )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">Loading earnings data...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few seconds...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to load data</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchData(ticker, true)}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
             <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
             <p>No earnings history available for {ticker}.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Chart */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="estimateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#334155" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#334155" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  
                  <XAxis 
                    dataKey="period" 
                    stroke="#525252" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                        const date = new Date(val);
                        return `${date.getFullYear()}-${date.getMonth() + 1}`;
                    }}
                    dy={10}
                  />
                  
                  <YAxis 
                    stroke="#525252" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                    dx={-10}
                  />
                  
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }}
                    isAnimationActive={false}
                    content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) {
                          return null;
                        }
                        
                        // Find the actual value from either positive or negative bar
                        const estimate = payload.find(p => p.dataKey === 'estimate');
                        const actualPositive = payload.find(p => p.dataKey === 'actualPositive' && p.value != null);
                        const actualNegative = payload.find(p => p.dataKey === 'actualNegative' && p.value != null);
                        const actual = actualPositive || actualNegative;
                        const isBeat = !!actualPositive;
                        
                        return (
                            <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-2xl backdrop-blur-sm transition-all duration-150 ease-out">
                                <p className="text-gray-400 text-xs mb-2">{label} (EPS)</p>
                                {estimate && estimate.value != null && (
                                    <div className="flex items-center gap-3 mb-1 min-w-[140px]">
                                        <div className="w-2 h-2 rounded-full shrink-0 bg-slate-600" />
                                        <span className="text-gray-300 text-sm flex-1">Estimate:</span>
                                        <span className="text-white font-mono font-bold text-sm">
                                            ${Number(estimate.value).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {actual && actual.value != null && (
                                    <div className="flex items-center gap-3 mb-1 min-w-[140px]">
                                        <div 
                                            className={`w-2 h-2 rounded-full shrink-0 ${isBeat ? 'bg-blue-500' : 'bg-red-500'}`}
                                        />
                                        <span className="text-gray-300 text-sm flex-1">Actual:</span>
                                        <span className="text-white font-mono font-bold text-sm">
                                            ${Number(actual.value).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    }}
                  />
                  
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }} 
                    content={() => (
                      <div className="flex justify-center gap-6 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-600" />
                          <span className="text-sm text-gray-400">EPS Estimate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-gray-400">EPS Actual (Beat)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm text-gray-400">EPS Actual (Miss)</span>
                        </div>
                      </div>
                    )}
                  />
                  
                  <Bar 
                    dataKey="estimate" 
                    name="EPS Estimate" 
                    fill="url(#estimateGradient)" 
                    radius={[4, 4, 0, 0]} 
                    isAnimationActive={false}
                    maxBarSize={60}
                  />
                  
                  {/* Split into two Bar components to avoid dynamic Cell flickering */}
                  <Bar 
                    dataKey="actualPositive" 
                    name="EPS Actual (Beat)" 
                    fill="url(#positiveGradient)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    maxBarSize={60}
                    legendType="none"
                  />
                  
                  <Bar 
                    dataKey="actualNegative" 
                    name="EPS Actual (Miss)" 
                    fill="url(#negativeGradient)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    animationDuration={300}
                    maxBarSize={60}
                    legendType="none"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#111] text-gray-400 font-medium">
                  <tr>
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3 text-right">Estimate</th>
                    <th className="px-6 py-3 text-right">Actual</th>
                    <th className="px-6 py-3 text-right">Surprise</th>
                    <th className="px-6 py-3 text-right">% Surprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...data].reverse().map((item, i) => (
                    <tr key={i} className="hover:bg-[#212121] transition-colors">
                      <td className="px-6 py-4 text-white font-medium">
                         <div className="flex flex-col">
                            <span>Q{item.quarter} {item.year}</span>
                            <span className="text-xs text-gray-500">{item.period}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-300">
                        {item.estimate?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white">
                        {item.actual?.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono ${item.surprise > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {item.surprise > 0 ? '+' : ''}{item.surprise.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2 py-1 rounded text-xs border ${
                              item.surprisePercent > 0 
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                              {item.surprisePercent > 0 ? '+' : ''}{item.surprisePercent.toFixed(2)}%
                          </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
