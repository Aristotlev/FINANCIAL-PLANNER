"use client";

import { useEffect, useState, useCallback } from 'react';
import { Calendar, TrendingUp, Building2, DollarSign, Hash, AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, Search, Filter, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IPOEvent {
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number;
  price: string;
  status: 'expected' | 'priced' | 'withdrawn' | 'filed';
  symbol: string;
  totalSharesValue: number;
}

interface IPOCalendarResponse {
  ipoCalendar: IPOEvent[];
}

interface CachedIPOData {
  events: IPOEvent[];
  timestamp: number;
  version: number;
  dateRanges: string[];
}

const CACHE_KEY = 'omnifolio_ipo_calendar_cache_v3';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours (more frequent updates for IPOs)
const CACHE_VERSION = 3;

export function IPOCalendar() {
  const [ipoEvents, setIpoEvents] = useState<IPOEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'expected' | 'priced' | 'filed' | 'withdrawn'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const itemsPerPage = 50;

  // Load from localStorage cache
  const loadFromCache = useCallback((): CachedIPOData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedIPOData = JSON.parse(cached);
      
      // Check version and expiry
      if (data.version !== CACHE_VERSION) return null;
      if (Date.now() - data.timestamp > CACHE_DURATION) return null;
      
      return data;
    } catch {
      return null;
    }
  }, []);

  // Save to localStorage cache
  const saveToCache = useCallback((events: IPOEvent[], dateRanges: string[]) => {
    try {
      const cacheData: CachedIPOData = {
        events,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        dateRanges
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to cache IPO data:', err);
    }
  }, []);

  const fetchIPOCalendar = useCallback(async (forceRefresh = false) => {
    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log(`IPO Calendar: Loaded ${cached.events.length} events from cache`);
        setIpoEvents(cached.events);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setFetchProgress('Initializing...');
    
    try {
      const today = new Date();
      const allEvents: IPOEvent[] = [];
      const dateRangesUsed: string[] = [];
      
      // Optimized date range strategy for FREE TIER:
      // - Focus on actionable data: upcoming IPOs and recent priced ones
      // - Use larger chunks to minimize API calls
      // - Total: ~6-8 API calls maximum
      const dateRanges: { from: Date; to: Date; label: string }[] = [];
      
      // Historical: 1 year back in 4-month chunks (3 calls)
      for (let i = -3; i < 0; i++) {
        const fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() + (i * 4));
        const toDate = new Date(today);
        toDate.setMonth(today.getMonth() + ((i + 1) * 4));
        dateRanges.push({ 
          from: fromDate, 
          to: toDate, 
          label: `${fromDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`
        });
      }
      
      // Current & Future: 18 months forward in 3-month chunks for better upcoming IPO coverage (6 calls)
      for (let i = 0; i < 6; i++) {
        const fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() + (i * 3));
        const toDate = new Date(today);
        toDate.setMonth(today.getMonth() + ((i + 1) * 3));
        dateRanges.push({ 
          from: fromDate, 
          to: toDate,
          label: `${fromDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`
        });
      }

      // Fetch with rate limit handling via our API route
      const fetchRange = async (from: Date, to: Date, index: number, label: string): Promise<IPOEvent[]> => {
        // Stagger requests
        await new Promise(resolve => setTimeout(resolve, index * 200));
        
        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];
        dateRangesUsed.push(`${fromStr}:${toStr}`);
        
        try {
          const response = await fetch(`/api/finnhub/ipo-calendar?from=${fromStr}&to=${toStr}`);
          
          if (!response.ok) {
            if (response.status === 429) {
              console.warn(`Rate limited on ${label}, waiting...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              // Retry once
              const retryResponse = await fetch(`/api/finnhub/ipo-calendar?from=${fromStr}&to=${toStr}`);
              if (retryResponse.ok) {
                const data: IPOCalendarResponse = await retryResponse.json();
                return data.ipoCalendar || [];
              }
              return [];
            }
            console.warn(`IPO fetch failed for ${label}: ${response.status}`);
            return [];
          }
          
          const data: IPOCalendarResponse = await response.json();
          return data.ipoCalendar || [];
        } catch (err) {
          console.warn(`IPO fetch error for ${label}:`, err);
          return [];
        }
      };
      
      // Fetch in batches of 2 to respect rate limits (free tier is strict)
      const batchSize = 2;
      for (let i = 0; i < dateRanges.length; i += batchSize) {
        const batch = dateRanges.slice(i, i + batchSize);
        setFetchProgress(`Fetching ${Math.min(i + batchSize, dateRanges.length)} of ${dateRanges.length} periods...`);
        
        const results = await Promise.all(
          batch.map((range, idx) => fetchRange(range.from, range.to, idx, range.label))
        );
        results.flat().forEach(event => allEvents.push(event));
        
        // Pause between batches
        if (i + batchSize < dateRanges.length) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
      
      // Deduplicate by name+date+symbol
      const seenKeys = new Set<string>();
      const uniqueEvents: IPOEvent[] = [];
      allEvents.forEach(event => {
        const key = `${event.name}-${event.date}-${event.symbol || 'nosym'}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueEvents.push(event);
        }
      });
      
      console.log(`IPO Calendar: Fetched ${uniqueEvents.length} unique events from ${dateRanges.length} API calls`);
      
      // Sort by date (newest first for past, upcoming first for future)
      const sortedEvents = uniqueEvents.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const now = new Date();
        
        // Upcoming events first (sorted ascending), then past events (sorted descending)
        const aIsUpcoming = dateA >= now;
        const bIsUpcoming = dateB >= now;
        
        if (aIsUpcoming && !bIsUpcoming) return -1;
        if (!aIsUpcoming && bIsUpcoming) return 1;
        
        if (aIsUpcoming) {
          return dateA.getTime() - dateB.getTime(); // Ascending for upcoming
        }
        return dateB.getTime() - dateA.getTime(); // Descending for past
      });
      
      // Cache the results
      saveToCache(sortedEvents, dateRangesUsed);
      
      setIpoEvents(sortedEvents);
      setLastUpdated(new Date());
      setFetchProgress('');
    } catch (err) {
      console.error('Error fetching IPO calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch IPO data');
      
      // Try to use stale cache on error
      const cached = loadFromCache();
      if (cached) {
        setIpoEvents(cached.events);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchIPOCalendar();
  }, [fetchIPOCalendar]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatShares = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expected': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'priced': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'filed': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'withdrawn': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date(new Date().toDateString());
  };

  // Filter and search
  const filteredEvents = ipoEvents.filter(event => {
    const statusMatch = filter === 'all' || event.status === filter;
    const searchMatch = !searchQuery || 
      event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.exchange?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  // Stats
  const upcomingCount = ipoEvents.filter(e => isUpcoming(e.date) && e.status === 'expected').length;
  const pricedCount = ipoEvents.filter(e => e.status === 'priced').length;
  const filedCount = ipoEvents.filter(e => e.status === 'filed').length;
  const totalValue = ipoEvents.reduce((sum, e) => sum + (e.totalSharesValue || 0), 0);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5 text-purple-400" />
          IPO Calendar
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Upcoming:</span>
            <span className="text-blue-400 font-semibold">{upcomingCount}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Priced:</span>
            <span className="text-green-400 font-semibold">{pricedCount}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Filed:</span>
            <span className="text-yellow-400 font-semibold">{filedCount}</span>
          </div>
          <button
            onClick={() => fetchIPOCalendar(true)}
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
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, symbol, or exchange..."
              className="w-full bg-[#0D0D0D] border border-gray-800 text-white text-sm rounded-lg focus:ring-0 focus:border-gray-700 focus:outline-none block pl-10 p-2.5"
            />
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-purple-400" />
            Total Raise: <span className="text-purple-400 font-medium">{formatCurrency(totalValue)}</span>
          </span>
          <span>•</span>
          <span>{ipoEvents.length} IPOs tracked</span>
        </div>
      </div>

      {/* Filter Tabs + Pagination */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'expected', 'priced', 'filed', 'withdrawn'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === status 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center gap-3">
          {fromCache && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80" title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : ''}>
              <Database className="w-3 h-3" />
              <span>Cached</span>
            </div>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {filteredEvents.length} events
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400 min-w-[60px] text-center">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading || totalPages === 0}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#1A1A1A] rounded-xl border border-gray-800">
        {loading && ipoEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-gray-400 text-sm">{fetchProgress || 'Loading IPO calendar...'}</span>
          </div>
        ) : error && ipoEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="w-8 h-8 opacity-50 text-red-400" />
            <span className="text-red-400">{error}</span>
            <button 
              onClick={() => fetchIPOCalendar(true)}
              className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Calendar className="w-12 h-12 mb-3 opacity-30" />
            <p>No IPO events found</p>
            {(filter !== 'all' || searchQuery) && (
              <button
                onClick={() => { setFilter('all'); setSearchQuery(''); }}
                className="mt-2 text-purple-400 text-sm hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#212121] sticky top-0 z-10">
              <tr className="text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-center">Exchange</th>
                <th className="px-4 py-3 text-right">Price Range</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedEvents.map((ipo, idx) => {
                  const upcoming = isUpcoming(ipo.date);
                  
                  return (
                    <motion.tr
                      key={`${ipo.symbol || ipo.name}-${ipo.date}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-gray-800/50 hover:bg-[#212121]/50 transition-colors ${
                        !upcoming ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={`font-medium ${upcoming ? 'text-white' : 'text-gray-400'}`}>
                            {new Date(ipo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-600">
                            {new Date(ipo.date).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium truncate max-w-[200px] block" title={ipo.name}>
                          {ipo.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-cyan-400 font-semibold">
                          {ipo.symbol || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-400 text-xs">
                          {ipo.exchange || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white font-mono">
                          {ipo.price ? `$${ipo.price}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-purple-400 font-medium">
                          {ipo.totalSharesValue ? formatCurrency(ipo.totalSharesValue) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-400 text-xs">
                          {ipo.numberOfShares ? formatShares(ipo.numberOfShares) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium border capitalize ${getStatusColor(ipo.status)}`}>
                          {ipo.status}
                        </span>
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
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
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
      
      {/* Footer */}
      <div className="flex items-center justify-between px-2 text-xs text-gray-600">
        <span>
          Showing {paginatedEvents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
        </span>
        <span>IPO data by Finnhub • Dates subject to change</span>
      </div>
    </div>
  );
}
