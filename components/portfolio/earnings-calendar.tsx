"use client";

import { useEffect, useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, AlertCircle, Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, Star, X, Filter, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavoriteStocks } from '../../hooks/use-favorite-stocks';
import { cn } from '../../lib/utils';

interface EarningsEvent {
  date: string;
  companyName: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
  filingType: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  secFilingUrl: string | null;
  country: string;
  surprisePercent: number | null;
}

// Common company name to ticker mappings for smart search
const COMPANY_MAPPINGS: Record<string, string> = {
  'apple': 'AAPL',
  'microsoft': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'meta': 'META',
  'facebook': 'META',
  'tesla': 'TSLA',
  'nvidia': 'NVDA',
  'netflix': 'NFLX',
  'disney': 'DIS',
  'walmart': 'WMT',
  'jpmorgan': 'JPM',
  'jp morgan': 'JPM',
  'johnson': 'JNJ',
  'johnson & johnson': 'JNJ',
  'visa': 'V',
  'mastercard': 'MA',
  'coca cola': 'KO',
  'coca-cola': 'KO',
  'pepsi': 'PEP',
  'pepsico': 'PEP',
  'intel': 'INTC',
  'amd': 'AMD',
  'advanced micro': 'AMD',
  'paypal': 'PYPL',
  'adobe': 'ADBE',
  'salesforce': 'CRM',
  'oracle': 'ORCL',
  'ibm': 'IBM',
  'cisco': 'CSCO',
  'verizon': 'VZ',
  'at&t': 'T',
  'att': 'T',
  'boeing': 'BA',
  'nike': 'NKE',
  'starbucks': 'SBUX',
  'mcdonalds': 'MCD',
  "mcdonald's": 'MCD',
  'uber': 'UBER',
  'airbnb': 'ABNB',
  'spotify': 'SPOT',
  'zoom': 'ZM',
  'snowflake': 'SNOW',
  'palantir': 'PLTR',
  'coinbase': 'COIN',
  'robinhood': 'HOOD',
  'square': 'SQ',
  'block': 'SQ',
  'shopify': 'SHOP',
  'twitter': 'X',
  'berkshire': 'BRK.B',
  'bank of america': 'BAC',
  'wells fargo': 'WFC',
  'goldman': 'GS',
  'goldman sachs': 'GS',
  'morgan stanley': 'MS',
  'blackrock': 'BLK',
  'chevron': 'CVX',
  'exxon': 'XOM',
  'exxonmobil': 'XOM',
};

type ViewMode = 'all' | 'favorites';

export function EarningsCalendar() {
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('favorites');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'beat' | 'miss'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTicker, setSearchedTicker] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    const to = new Date(today);
    to.setDate(today.getDate() + 60); // Extended range for favorites
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  });

  const itemsPerPage = 50;

  const { 
    favorites, 
    toggleFavorite, 
    isFavorite, 
    getFavoriteSymbols,
    favoriteCount, 
    maxFavorites, 
    canAddMore,
    isLoaded 
  } = useFavoriteStocks();

  // Convert search query to ticker symbol
  const getTickerFromQuery = (query: string): string => {
    const normalized = query.toLowerCase().trim();
    if (COMPANY_MAPPINGS[normalized]) {
      return COMPANY_MAPPINGS[normalized];
    }
    // Otherwise treat as ticker symbol (uppercase)
    return query.toUpperCase().trim();
  };

  const fetchEarningsCalendar = async (symbolOverride?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      });
      
      // Use symbolOverride if explicitly provided (including empty string to clear)
      // Otherwise, convert searchQuery for non-explicit calls
      let symbol: string;
      if (symbolOverride !== undefined) {
        symbol = symbolOverride;
      } else if (searchQuery.trim()) {
        symbol = getTickerFromQuery(searchQuery);
      } else {
        symbol = '';
      }
      
      if (symbol) {
        params.append('symbol', symbol);
      }
      
      const url = `/api/calendar/earnings?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Check for 403 / premium access error
      if (response.status === 403) {
        // API returned 403 - might be rate limiting
        console.warn('Earnings API returned 403 - may be rate limited');
        throw new Error('Unable to fetch earnings data. Please try again in a moment.');
      }
      
      // Check for error in response body
      if (data.error && !data.success) {
        throw new Error(data.error);
      }
      
      if (data.success) {
        setEarningsEvents(data.data || []);
      } else {
        throw new Error('Failed to fetch earnings data');
      }
    } catch (err) {
      console.error('Error fetching earnings calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchEarningsCalendar();
    }
  }, [dateRange, isLoaded]);
  
  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, filter, searchQuery, dateRange]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (query) {
      setIsSearching(true);
      const ticker = getTickerFromQuery(query);
      setSearchedTicker(ticker);
      fetchEarningsCalendar(ticker);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchedTicker('');
    setIsSearching(false);
    fetchEarningsCalendar('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleFavorite = (symbol: string) => {
    toggleFavorite(symbol);
  };

  const shiftDateRange = (days: number) => {
    const newFrom = new Date(dateRange.from);
    const newTo = new Date(dateRange.to);
    newFrom.setDate(newFrom.getDate() + days);
    newTo.setDate(newTo.getDate() + days);
    setDateRange({
      from: newFrom.toISOString().split('T')[0],
      to: newTo.toISOString().split('T')[0]
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatEPS = (value: number | null) => {
    if (value === null) return '—';
    return `$${value.toFixed(2)}`;
  };

  const getHourLabel = (hour: string) => {
    switch (hour) {
      case 'bmo': return { label: 'Before Open', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'amc': return { label: 'After Close', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'dmh': return { label: 'During Hours', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
      case 'unknown': return { label: 'TBD', color: 'text-gray-500', bg: 'bg-gray-500/10' };
      default: return { label: 'TBD', color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  const getFilingTypeLabel = (filingType: string) => {
    switch (filingType) {
      case '8-K': return { label: '8-K', color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Earnings Announcement' };
      case '10-Q': return { label: '10-Q', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Quarterly Report' };
      case '10-K': return { label: '10-K', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Annual Report' };
      case '10-Q/A': return { label: '10-Q/A', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Amended Quarterly' };
      case '10-K/A': return { label: '10-K/A', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Amended Annual' };
      case 'estimated': return { label: 'Est.', color: 'text-gray-400', bg: 'bg-gray-500/10', desc: 'Estimated Date' };
      default: return { label: filingType, color: 'text-gray-400', bg: 'bg-gray-500/10', desc: 'SEC Filing' };
    }
  };

  const getEPSSurprise = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null) return null;
    const surprise = actual - estimate;
    const surprisePercent = estimate !== 0 ? ((surprise / Math.abs(estimate)) * 100) : 0;
    return { surprise, surprisePercent, beat: surprise > 0 };
  };

  const getRevenueSurprise = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null) return null;
    const surprise = actual - estimate;
    const surprisePercent = estimate !== 0 ? ((surprise / estimate) * 100) : 0;
    return { surprise, surprisePercent, beat: surprise > 0 };
  };

  const isUpcoming = (date: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Get favorite symbols for filtering
  const favoriteSymbols = getFavoriteSymbols();

  // Filter events based on view mode and filter
  const filteredEvents = earningsEvents.filter(event => {
    // If searching, show all search results (don't filter by favorites)
    if (isSearching && searchedTicker) {
      // Just apply the beat/miss/upcoming filter to search results, skip favorites filter
    } else if (viewMode === 'favorites') {
      // Only show favorites
      if (!favoriteSymbols.includes(event.symbol.toUpperCase())) {
        return false;
      }
    }
    
    // Apply filter
    if (filter === 'upcoming') return isUpcoming(event.date);
    if (filter === 'beat') {
      const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
      return epsSurprise?.beat === true;
    }
    if (filter === 'miss') {
      const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
      return epsSurprise !== null && epsSurprise.beat === false;
    }
    return true;
  });

  // Calculate stats
  const upcomingCount = filteredEvents.filter(e => isUpcoming(e.date)).length;
  // Use filter-invariant counts for the header if desired, but sticking to filtered scope is usually safer
  const totalInFilter = filteredEvents.length;

  // Pagination logic
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = (viewMode === 'favorites' && !isSearching && filteredEvents.length <= itemsPerPage) 
     ? filteredEvents // Show all if it fits in one page or prefer no pagination for short favorites list
     : filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Grouping logic
  const groupedEvents = useMemo(() => {
     const groups: Record<string, EarningsEvent[]> = {};
     paginatedEvents.forEach(e => {
         if (!groups[e.date]) groups[e.date] = [];
         groups[e.date].push(e);
     });
     return groups;
  }, [paginatedEvents]);

  const uniqueDatesInPage = useMemo(() => {
    const dates = new Set<string>();
    paginatedEvents.forEach(e => dates.add(e.date));
    return Array.from(dates).sort((a,b) => new Date(a).getTime() - new Date(b).getTime()); 
  }, [paginatedEvents]);


  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold flex items-center gap-2">
               <Calendar className="w-6 h-6 text-green-400" />
               Earnings Calendar
           </h2>
           <div className="flex gap-3 text-sm mt-1">
             <div className="flex items-center gap-2">
                 <span className="text-gray-400">Viewing:</span>
                 <span className="text-white font-medium">
                    {viewMode === 'favorites' ? 'Watchlist' : 'All Events'}
                 </span>
             </div>
             {viewMode === 'favorites' && (
               <>
                 <span className="text-gray-600">|</span>
                 <div className="flex items-center gap-1.5">
                   <Star className="w-3.5 h-3.5 text-yellow-400" />
                   <span className="text-yellow-400 font-semibold">{favoriteCount}</span>
                   <span className="text-gray-500">/ {maxFavorites}</span>
                 </div>
               </>
             )}
           </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
             {/* View Mode Toggle */}
             <div className="flex bg-[#0D0D0D] p-1 rounded-lg border border-gray-800">
                <button
                    onClick={() => { setViewMode('favorites'); setIsSearching(false); setSearchQuery(''); }}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5", 
                        viewMode === 'favorites' && !isSearching
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 shadow-sm"
                            : 'text-gray-400 hover:text-white'
                    )}
                >
                    <Star className="w-3.5 h-3.5" /> Watchlist
                </button>
                <button
                    onClick={() => { setViewMode('all'); setIsSearching(false); setSearchQuery(''); }}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all", 
                        viewMode === 'all' && !isSearching
                            ? "bg-green-500/20 text-green-400 border border-green-500/20 shadow-sm"
                            : 'text-gray-400 hover:text-white'
                    )}
                >
                    All Earnings
                </button>
             </div>

             {/* Date Nav (only if not searching specific symbol) */}
             {!searchedTicker && (
                 <div className="flex items-center gap-1 bg-[#0D0D0D] p-1 rounded-lg border border-gray-800">
                    <button
                        onClick={() => shiftDateRange(-30)}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400 px-2 whitespace-nowrap font-mono">
                        {new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                        onClick={() => shiftDateRange(30)}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
             )}
             
             <button
                onClick={() => fetchEarningsCalendar()}
                disabled={loading}
                className="p-2 ml-1 bg-[#0D0D0D] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Refresh"
              >
                 <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
        </div>
      </div>

       {/* Search Bar & Filters */}
       <div className="flex flex-col md:flex-row gap-4">
           {/* Search */}
           <div className="flex-1 bg-[#0D0D0D] border border-gray-800 rounded-xl p-3 flex gap-4 items-center">
                <Search className="w-4 h-4 text-gray-500 ml-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search company or ticker..."
                  className="bg-transparent border-none text-sm text-white focus:ring-0 flex-1 placeholder:text-gray-600 focus:outline-none"
                />
                {searchQuery && (
                    <button 
                      type="button"
                      onClick={handleClearSearch} 
                      className="text-gray-500 hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                )}
                {/* Mobile search button */}
                 <button
                    type="button"
                    onClick={handleSearch}
                    className="md:hidden text-xs text-blue-400 hover:text-blue-300 font-medium px-2"
                >
                    Search
                </button>
           </div>
           
           {/* Quick Filters */}
           <div className="flex items-center gap-2 bg-[#0D0D0D] p-1.5 rounded-xl border border-gray-800 overflow-x-auto">
              {(['all', 'upcoming', 'beat', 'miss'] as const).map((status) => (
                <button 
                    key={status}
                    onClick={() => setFilter(status)}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize whitespace-nowrap", 
                        filter === status 
                            ? "bg-green-500/20 text-green-400 border border-green-500/20 shadow-sm"
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                >
                    {status}
                </button>
              ))}
           </div>
       </div>

      {/* Content */}
      <div className="flex-1 overflow-auto space-y-8 pr-2 custom-scrollbar">
          {loading && earningsEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin h-12 w-12 text-green-500 mb-4 opacity-70" />
                <p className="text-gray-400 text-sm">Loading earnings...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4 opacity-70" />
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <button onClick={() => fetchEarningsCalendar()} className="text-blue-400 underline text-sm">Retry</button>
            </div>
          ) : uniqueDatesInPage.map(date => (
              <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
                      <span className="text-sm font-medium text-gray-400 border border-gray-800 rounded-full px-4 py-1 bg-[#0D0D0D]">
                          {formatDate(date)}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
                  </div>

                  <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#141414] border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-medium w-10"></th>
                                    <th className="px-6 py-3 font-medium">Company</th>
                                    <th className="px-4 py-3 font-medium text-center">Filing</th>
                                    <th className="px-4 py-3 font-medium text-center">Sector</th>
                                    <th className="px-6 py-3 font-medium text-center">Time</th>
                                    <th className="px-6 py-3 font-medium text-center">Quarter</th>
                                    <th className="px-6 py-3 font-medium text-right">EPS Est</th>
                                    <th className="px-6 py-3 font-medium text-right">EPS Act</th>
                                    <th className="px-6 py-3 font-medium text-right">Revenue</th>
                                    <th className="px-4 py-3 font-medium text-center">SEC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {groupedEvents[date].map((event, idx) => {
                                    const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
                                    const revenueSurprise = getRevenueSurprise(event.revenueActual, event.revenueEstimate);
                                    const hourInfo = getHourLabel(event.hour);
                                    const filingInfo = getFilingTypeLabel(event.filingType);
                                    const upcoming = isUpcoming(event.date);
                                    const isFav = isFavorite(event.symbol);
                                    
                                    return (
                                    <tr key={idx} className={cn("group hover:bg-[#1A1A1A] transition-colors", !upcoming && "opacity-75 hover:opacity-100")}>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleFavorite(event.symbol)}
                                                className={cn("p-1.5 rounded transition-colors", isFav ? "text-yellow-400 hover:text-yellow-300" : "text-gray-800 group-hover:text-gray-500 hover:text-yellow-400")}
                                            >
                                                <Star className={cn("w-4 h-4", isFav && "fill-current")} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                                                    {event.symbol}
                                                </span>
                                                {event.companyName && event.companyName !== event.symbol && (
                                                    <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                                                        {event.companyName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded border inline-block font-mono font-medium", filingInfo.bg, filingInfo.color, "border-transparent")}
                                                  title={filingInfo.desc}>
                                                {filingInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {event.sector ? (
                                                <span className="text-[10px] text-gray-400 truncate max-w-[90px] inline-block">
                                                    {event.sector}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-700">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {event.hour && event.hour !== 'unknown' ? (
                                                <span className={cn("text-xs px-2 py-0.5 rounded border inline-block", hourInfo.bg, hourInfo.color, "border-transparent bg-opacity-10")}>
                                                    {hourInfo.label}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-400 font-mono">
                                            Q{event.quarter}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-gray-400 font-mono">
                                                {formatEPS(event.epsEstimate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={cn("text-sm font-medium font-mono", epsSurprise === null ? 'text-gray-500' : epsSurprise.beat ? 'text-green-400' : 'text-red-400')}>
                                                    {formatEPS(event.epsActual)}
                                                </span>
                                                {epsSurprise && (
                                                    <span className={cn("text-[10px] flex items-center gap-0.5 mt-0.5", epsSurprise.beat ? 'text-green-500' : 'text-red-500')}>
                                                        {epsSurprise.beat ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                        {epsSurprise.beat ? '+' : ''}{epsSurprise.surprisePercent.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                               {event.revenueActual !== null ? (
                                                    <>
                                                        <span className={cn("text-sm font-medium font-mono", revenueSurprise === null ? 'text-gray-300' : revenueSurprise.beat ? 'text-green-400' : 'text-red-400')}>
                                                            {formatCurrency(event.revenueActual)}
                                                        </span>
                                                        {revenueSurprise && (
                                                            <span className={cn("text-[10px] flex items-center gap-0.5 mt-0.5", revenueSurprise.beat ? 'text-green-500' : 'text-red-500')}>
                                                                {revenueSurprise.beat ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                                {revenueSurprise.beat ? '+' : ''}{revenueSurprise.surprisePercent.toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </>
                                               ) : (
                                                    <span className="text-xs text-gray-600 font-mono italic">
                                                        Est: {formatCurrency(event.revenueEstimate)}
                                                    </span>
                                               )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {event.secFilingUrl ? (
                                                <a
                                                    href={event.secFilingUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors"
                                                    title="View SEC Filing"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-gray-700">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          ))}
          
          {/* Empty State */}
          {!loading && filteredEvents.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                 {viewMode === 'favorites' && !isSearching ? (
                    <>
                        <Star className="w-12 h-12 mb-4 opacity-30 text-yellow-500" />
                        <p className="text-lg">No favorite earnings tracked</p>
                        <p className="text-sm mt-2 max-w-sm text-center opacity-70">
                            Add stocks to your watchlist to track their earnings events here.
                        </p>
                        <button 
                            onClick={() => setViewMode('all')}
                            className="mt-6 px-4 py-2 bg-[#212121] border border-gray-700 rounded-lg text-sm hover:bg-[#333] transition-colors"
                        >
                            Browse All Earnings
                        </button>
                    </>
                 ) : (
                    <>
                        <Calendar className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-lg">No earnings events found</p>
                        <button 
                            onClick={handleClearSearch}
                            className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                            Clear search
                        </button>
                    </>
                 )}
             </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4 pt-8">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="First Page"
              >
                <ChevronLeft className="w-4 h-4 rotate-180 transform-none" /> <span className="text-xs">First</span>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex gap-1">
                <span className="px-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm text-white">
                    Page {currentPage} of {totalPages}
                </span>
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
               <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="text-xs">Last</span>
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between px-2 text-xs text-gray-600 pb-4">
             <p>* Non-GAAP figures. Sourced from SEC EDGAR public filings (8-K, 10-Q, 10-K).</p>
             <div className="flex items-center gap-2">
                 <span className="flex items-center gap-1">
                     <FileText className="w-3 h-3" />
                     Proprietary SEC EDGAR Data
                 </span>
             </div>
          </div>
      </div>
    </div>
  );
}
