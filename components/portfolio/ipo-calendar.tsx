"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, TrendingUp, Building2, DollarSign, Hash, AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, Search, Filter, ExternalLink, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

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

  const groupedEvents = useMemo(() => {
     const groups: Record<string, IPOEvent[]> = {};
     paginatedEvents.forEach(e => {
         if (!groups[e.date]) groups[e.date] = [];
         groups[e.date].push(e);
     });
     return groups;
  }, [paginatedEvents]);

  const uniqueDatesInPage = useMemo(() => {
    // Determine order from paginatedEvents to preserve sorting
    const dates = new Set<string>();
    paginatedEvents.forEach(e => dates.add(e.date));
    return Array.from(dates);
  }, [paginatedEvents]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-purple-400" />
                  IPO Calendar
              </h2>
              <div className="flex gap-3 text-sm mt-1">
                <span className="text-gray-400">Upcoming: <span className="text-blue-400 font-semibold">{upcomingCount}</span></span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400">Priced: <span className="text-green-400 font-semibold">{pricedCount}</span></span>
              </div>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0D0D0D] p-1 rounded-lg border border-gray-800 flex-wrap">
              {(['all', 'expected', 'priced', 'filed', 'withdrawn'] as const).map((status) => (
                <button 
                    key={status}
                    onClick={() => setFilter(status)}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize", 
                        filter === status 
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-sm"
                            : 'text-gray-400 hover:text-white'
                    )}
                >
                    {status}
                </button>
              ))}
              <button
                onClick={() => fetchIPOCalendar(true)}
                disabled={loading}
                className="p-1.5 ml-2 text-gray-400 hover:text-white transition-colors"
                title="Refresh"
              >
                 <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
          </div>
      </div>

       {/* Search Bar */}
       <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3 flex gap-4 items-center">
            <Search className="w-4 h-4 text-gray-500 ml-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies, symbols..."
              className="bg-transparent border-none text-sm text-white focus:ring-0 flex-1 placeholder:text-gray-600 focus:outline-none"
            />
            <div className="text-xs text-gray-500 whitespace-nowrap hidden sm:block pr-2">
                 Total Raise: <span className="text-purple-400 font-medium">{formatCurrency(totalValue)}</span>
            </div>
       </div>

      {/* Content */}
      <div className="flex-1 overflow-auto space-y-8 pr-2 custom-scrollbar">
          {loading && ipoEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                <p className="text-gray-400 text-sm">{fetchProgress || 'Loading IPO Calendar...'}</p>
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
                                    <th className="px-6 py-3 font-medium">Company</th>
                                    <th className="px-6 py-3 font-medium text-center">Status</th>
                                    <th className="px-6 py-3 font-medium text-center">Exchange</th>
                                    <th className="px-6 py-3 font-medium text-right">Price</th>
                                    <th className="px-6 py-3 font-medium text-right">Shares</th>
                                    <th className="px-6 py-3 font-medium text-right">Valuation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {groupedEvents[date].map((event, idx) => (
                                    <tr key={idx} className="group hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                                                    {event.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/50">
                                                        {event.symbol || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border capitalize inline-block", getStatusColor(event.status))}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-400">
                                            {event.exchange || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-gray-300">
                                                 {event.price ? `$${event.price}` : 'TBD'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                                            {event.numberOfShares ? formatShares(event.numberOfShares) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-purple-400">
                                                {event.totalSharesValue ? formatCurrency(event.totalSharesValue) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          ))}
          
          {/* Empty State */}
          {!loading && filteredEvents.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                 <Calendar className="w-12 h-12 mb-4 opacity-30" />
                 <p className="text-lg">No IPO events found</p>
                 <button 
                    onClick={() => { setFilter('all'); setSearchQuery(''); }}
                    className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
                 >
                     Clear filters
                 </button>
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
             <div className="flex items-center gap-2">
                {fromCache && (
                    <span className="flex items-center gap-1 text-amber-500/50">
                        <Database className="w-3 h-3" /> Cached
                    </span>
                )}
                <span>Updated: {lastUpdated?.toLocaleTimeString()}</span>
             </div>
             <span>IPO data by Finnhub</span>
          </div>
      </div>
    </div>
  );
}
