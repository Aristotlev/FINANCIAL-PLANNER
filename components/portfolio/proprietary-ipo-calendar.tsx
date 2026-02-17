/**
 * OmniFolio Proprietary IPO Calendar
 * 
 * Mirrors the existing IPO Calendar UI/UX but powered entirely
 * by SEC EDGAR public data — zero third-party API dependencies.
 * 
 * Features:
 * - SEC EDGAR sourced IPO filings (S-1, F-1, 424B4)
 * - Sector filter chips
 * - Filing type badges
 * - Expanded row detail panels
 * - Mobile-responsive card layout
 * - Auto-refresh with background polling
 * - Local cache with 4-hour TTL
 * 
 * Copyright OmniFolio. All rights reserved.
 */

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Calendar,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  FileText,
  TrendingUp,
  Building2,
  Globe,
  Filter,
  X,
  Info,
  Clock,
  DollarSign,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────

type IPOStatus = 'filed' | 'expected' | 'priced' | 'withdrawn';

interface IPOEvent {
  id: string;
  companyName: string;
  symbol: string | null;
  exchange: string | null;
  filingDate: string;
  expectedDate: string | null;
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  offerPrice: number | null;
  sharesOffered: number | null;
  dealSize: number | null;
  status: IPOStatus;
  filingType: string;
  sector: string | null;
  industry: string | null;
  secFilingUrl: string | null;
  country: string;
}

interface APIResponse {
  success: boolean;
  events: IPOEvent[];
  stats: {
    total: number;
    filed: number;
    expected: number;
    priced: number;
    withdrawn: number;
  };
  source?: string;
  lastRefresh?: string | null;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const CACHE_KEY = 'omnifolio_sec_ipo_cache_v2';
const CACHE_DURATION = 4 * 60 * 60 * 1000;
const AUTO_REFRESH_MS = 10 * 60 * 1000;

const SECTOR_COLORS: Record<string, string> = {
  'Technology': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Healthcare': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Financial Services': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Consumer': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Energy': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Industrial': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Real Estate': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Materials': 'bg-stone-500/10 text-stone-400 border-stone-500/20',
  'Other': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const FILING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'S-1': { label: 'S-1', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  'S-1/A': { label: 'S-1/A', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  'F-1': { label: 'F-1', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  'F-1/A': { label: 'F-1/A', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  '424B4': { label: '424B4', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
};

// ─── Component ────────────────────────────────────────────────────────

export function ProprietaryIPOCalendar() {
  const [ipoEvents, setIpoEvents] = useState<IPOEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | IPOStatus>('all');
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchProgress, setFetchProgress] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showSectorFilter, setShowSectorFilter] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const itemsPerPage = 50;

  // ── Cache (localStorage as bonus speed layer, NOT primary source) ──
  const loadFromCache = useCallback((): { events: IPOEvent[]; timestamp: number } | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((events: IPOEvent[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ events, timestamp: Date.now() }));
    } catch { /* quota exceeded — ignore */ }
  }, []);

  // ── Fetch (stale-while-revalidate: show cached instantly, then replace with DB data) ──
  const fetchIPOCalendar = useCallback(async (forceRefresh = false) => {
    // Layer 1: Show cached data immediately (if available) for instant UI
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached && cached.events.length > 0) {
        setIpoEvents(cached.events);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        // Don't return — always revalidate from DB below
      }
    }

    // Layer 2: Always fetch from API (DB is the source of truth, responds in <100ms)
    if (forceRefresh) {
      setLoading(true);
      setFetchProgress('Refreshing from SEC EDGAR...');
    } else if (ipoEvents.length === 0) {
      // Only show full loading spinner if we have no data yet
      setLoading(true);
      setFetchProgress('Loading IPO Calendar...');
    }
    // If we already have cached data, no spinner — silent background revalidation

    setError(null);

    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.set('refresh', 'true');

      const res = await fetch(`/api/calendar/ipo?${params}`);

      if (!res.ok) {
        throw new Error(`API responded with ${res.status}`);
      }

      const data: APIResponse = await res.json();

      if (data.success && data.events && data.events.length > 0) {
        setIpoEvents(data.events);
        saveToCache(data.events);
        setFromCache(false);
        setLastUpdated(new Date());
      } else if (data.success && data.events && data.events.length === 0) {
        // DB is empty — keep cached data if we had it, show info
        if (ipoEvents.length === 0) {
          setIpoEvents([]);
        }
        console.log('[SEC IPO] API returned 0 events — DB may be empty');
      } else {
        throw new Error(data.error || 'Unknown API error');
      }
    } catch (err) {
      console.error('[SEC IPO] Fetch error:', err);
      // Only show error if we have no data at all
      if (ipoEvents.length === 0) {
        const cached = loadFromCache();
        if (cached && cached.events.length > 0) {
          setIpoEvents(cached.events);
          setFromCache(true);
          setLastUpdated(new Date(cached.timestamp));
        } else {
          setError('Unable to load IPO data. Please try refreshing.');
        }
      }
      // If we already have data (cached or previous fetch), silently ignore the error
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchIPOCalendar();
    // Auto-revalidate on a slower cadence (10 min) — API checks DB, not SEC
    refreshRef.current = setInterval(() => fetchIPOCalendar(false), AUTO_REFRESH_MS);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchIPOCalendar]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sectorFilter, searchQuery]);

  // ── Row Expansion ───────────────────────────────────
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Formatting ──────────────────────────────────────
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatShares = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'expected': return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Expected' };
      case 'priced': return { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Priced' };
      case 'filed': return { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Filed' };
      case 'withdrawn': return { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Withdrawn' };
      default: return { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: status };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatPrice = (event: IPOEvent): string => {
    if (event.offerPrice) return `$${event.offerPrice.toFixed(2)}`;
    if (event.priceRangeLow && event.priceRangeHigh) {
      return `$${event.priceRangeLow}-$${event.priceRangeHigh}`;
    }
    return 'TBD';
  };

  const getDaysUntil = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 0 && diff <= 7) return `${diff}d`;
    if (diff > 7 && diff <= 30) return `${Math.floor(diff / 7)}w`;
    if (diff > 30) return `${Math.floor(diff / 30)}mo`;
    if (diff < 0 && diff >= -7) return `${Math.abs(diff)}d ago`;
    if (diff < -7) return `${Math.floor(Math.abs(diff) / 7)}w ago`;
    return null;
  };

  // ── Filter & Search ─────────────────────────────────
  const filteredEvents = useMemo(() => {
    return ipoEvents.filter(event => {
      const statusMatch = statusFilter === 'all' || event.status === statusFilter;
      const sectorMatch = !sectorFilter || event.sector === sectorFilter;
      const searchMatch = !searchQuery ||
        event.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.exchange?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.sector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.industry?.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && sectorMatch && searchMatch;
    });
  }, [ipoEvents, statusFilter, sectorFilter, searchQuery]);

  // ── Derived data ────────────────────────────────────
  const sectors = useMemo(() => {
    const s = new Set<string>();
    ipoEvents.forEach(e => { if (e.sector) s.add(e.sector); });
    return Array.from(s).sort();
  }, [ipoEvents]);

  const stats = useMemo(() => {
    const upcoming = ipoEvents.filter(e => e.status === 'expected' || e.status === 'filed').length;
    const priced = ipoEvents.filter(e => e.status === 'priced').length;
    const withdrawn = ipoEvents.filter(e => e.status === 'withdrawn').length;
    const filed = ipoEvents.filter(e => e.status === 'filed').length;
    const expected = ipoEvents.filter(e => e.status === 'expected').length;
    const totalValue = ipoEvents.reduce((sum, e) => sum + (e.dealSize || 0), 0);
    return { upcoming, priced, withdrawn, filed, expected, totalValue, total: ipoEvents.length };
  }, [ipoEvents]);

  // ── Pagination ──────────────────────────────────────
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ── Group by date ───────────────────────────────────
  const groupedEvents = useMemo(() => {
    const groups: Record<string, IPOEvent[]> = {};
    paginatedEvents.forEach(e => {
      const dateKey = e.expectedDate || e.filingDate;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [paginatedEvents]);

  const uniqueDatesInPage = useMemo(() => {
    const dates = new Set<string>();
    paginatedEvents.forEach(e => dates.add(e.expectedDate || e.filingDate));
    return Array.from(dates);
  }, [paginatedEvents]);

  const hasActiveFilters = statusFilter !== 'all' || sectorFilter !== null || searchQuery !== '';

  // ── Render ──────────────────────────────────────────
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-400" />
              IPO Calendar
              <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">
                SEC EDGAR
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Proprietary data sourced directly from SEC EDGAR filings
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0D0D0D] p-1 rounded-lg border border-gray-800 flex-wrap">
            {(['all', 'expected', 'priced', 'filed', 'withdrawn'] as const).map(status => {
              const count = status === 'all' ? stats.total :
                status === 'expected' ? stats.expected :
                status === 'filed' ? stats.filed :
                status === 'priced' ? stats.priced :
                stats.withdrawn;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize flex items-center gap-1.5',
                    statusFilter === status
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-sm'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  {status}
                  <span className={cn(
                    'text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center',
                    statusFilter === status ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-800/50 text-gray-500',
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => fetchIPOCalendar(true)}
              disabled={loading}
              className="p-1.5 ml-1 text-gray-400 hover:text-white transition-colors"
              title="Refresh from SEC EDGAR"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <TrendingUp className="w-3 h-3" />
              Upcoming
            </div>
            <div className="text-lg font-bold text-blue-400">{stats.upcoming}</div>
          </div>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign className="w-3 h-3" />
              Priced
            </div>
            <div className="text-lg font-bold text-green-400">{stats.priced}</div>
          </div>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <BarChart3 className="w-3 h-3" />
              Total Raise
            </div>
            <div className="text-lg font-bold text-purple-400">
              {stats.totalValue > 0 ? formatCurrency(stats.totalValue) : 'N/A'}
            </div>
          </div>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FileText className="w-3 h-3" />
              Total Filings
            </div>
            <div className="text-lg font-bold text-gray-300">{stats.total}</div>
          </div>
        </div>

        {/* Search & Sector Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-[#0D0D0D] border border-gray-800 rounded-xl p-3 flex gap-3 items-center">
            <Search className="w-4 h-4 text-gray-500 ml-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search companies, symbols, sectors..."
              className="bg-transparent border-none text-sm text-white focus:ring-0 flex-1 placeholder:text-gray-600 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSectorFilter(!showSectorFilter)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 bg-[#0D0D0D] border rounded-xl text-sm transition-all whitespace-nowrap',
                sectorFilter
                  ? 'border-purple-500/30 text-purple-400'
                  : 'border-gray-800 text-gray-400 hover:text-white',
              )}
            >
              <Filter className="w-4 h-4" />
              {sectorFilter || 'Sector'}
              {sectorFilter && (
                <button
                  onClick={e => { e.stopPropagation(); setSectorFilter(null); setShowSectorFilter(false); }}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>

            {showSectorFilter && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#141414] border border-gray-800 rounded-xl shadow-2xl z-50 py-1 max-h-64 overflow-y-auto">
                {sectors.map(sector => {
                  const count = ipoEvents.filter(e => e.sector === sector).length;
                  return (
                    <button
                      key={sector}
                      onClick={() => { setSectorFilter(sector); setShowSectorFilter(false); }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors',
                        sectorFilter === sector ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]',
                      )}
                    >
                      <span>{sector}</span>
                      <span className="text-xs text-gray-600">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Showing {filteredEvents.length} of {ipoEvents.length} filings</span>
            <button
              onClick={() => { setStatusFilter('all'); setSectorFilter(null); setSearchQuery(''); }}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto space-y-8 pr-1 custom-scrollbar">
        {loading && ipoEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500/20 border-t-purple-500 mb-4" />
              <Sparkles className="w-5 h-5 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-2" />
            </div>
            <p className="text-gray-400 text-sm mt-4">{fetchProgress || 'Loading IPO Calendar...'}</p>
            <p className="text-xs text-gray-600 mt-2">Sourcing directly from SEC EDGAR</p>
          </div>
        ) : (
          <>
            {/* Desktop Table Layout */}
            <div className="hidden md:block space-y-8">
              {uniqueDatesInPage.map(date => (
                <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Date divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                    <span className="text-sm font-medium text-gray-400 border border-gray-800 rounded-full px-4 py-1 bg-[#0D0D0D] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {formatDate(date)}
                      <span className="text-xs text-gray-600">
                        ({groupedEvents[date]?.length})
                      </span>
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                  </div>

                  {/* Table */}
                  <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#111111] border-b border-gray-800 text-[11px] text-gray-500 uppercase tracking-wider">
                            <th className="px-3 py-3 font-medium w-8"></th>
                            <th className="px-4 py-3 font-medium">Company</th>
                            <th className="px-4 py-3 font-medium text-center">Status</th>
                            <th className="px-4 py-3 font-medium text-center">Filing</th>
                            <th className="px-4 py-3 font-medium text-center">Exchange</th>
                            <th className="px-4 py-3 font-medium text-right">Price</th>
                            <th className="px-4 py-3 font-medium text-right">Shares</th>
                            <th className="px-4 py-3 font-medium text-right">Deal Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {groupedEvents[date]?.map((event, idx) => {
                            const statusCfg = getStatusConfig(event.status);
                            const filingCfg = FILING_TYPE_LABELS[event.filingType] || {
                              label: event.filingType, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                            };
                            const isExpanded = expandedRows.has(event.id);
                            const daysUntil = getDaysUntil(event.expectedDate);

                            return (
                              <tr key={event.id || idx} className="group hover:bg-[#141414] transition-colors">
                                {/* Expand toggle */}
                                <td className="px-2 py-4">
                                  <button
                                    onClick={() => toggleRow(event.id)}
                                    className="p-1 rounded text-gray-600 hover:text-white transition-colors"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </td>

                                {/* Company */}
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-200 group-hover:text-white transition-colors text-sm">
                                        {event.companyName}
                                      </span>
                                      {event.secFilingUrl && (
                                        <a
                                          href={event.secFilingUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-gray-600 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                                          title="View SEC Filing"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                      {daysUntil && (
                                        <span className="text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
                                          {daysUntil}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {event.symbol ? (
                                        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/50">
                                          {event.symbol}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-600 italic">No ticker</span>
                                      )}
                                      {event.sector && (
                                        <span className={cn(
                                          'text-[10px] px-1.5 py-0.5 rounded border',
                                          SECTOR_COLORS[event.sector] || SECTOR_COLORS['Other'],
                                        )}>
                                          {event.sector}
                                        </span>
                                      )}
                                      {event.country && event.country !== 'US' && (
                                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                          <Globe className="w-2.5 h-2.5" />
                                          {event.country}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expanded Detail */}
                                  {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-gray-800/50">
                                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                                        <div>
                                          <span className="text-gray-500">Filing Date:</span>
                                          <span className="text-gray-300 ml-2">{formatShortDate(event.filingDate)}</span>
                                        </div>
                                        {event.expectedDate && (
                                          <div>
                                            <span className="text-gray-500">Expected Date:</span>
                                            <span className="text-gray-300 ml-2">{formatShortDate(event.expectedDate)}</span>
                                          </div>
                                        )}
                                        {event.industry && (
                                          <div>
                                            <span className="text-gray-500">Industry:</span>
                                            <span className="text-gray-300 ml-2">{event.industry}</span>
                                          </div>
                                        )}
                                        {event.exchange && (
                                          <div>
                                            <span className="text-gray-500">Exchange:</span>
                                            <span className="text-gray-300 ml-2">{event.exchange}</span>
                                          </div>
                                        )}
                                        {event.priceRangeLow && event.priceRangeHigh && (
                                          <div>
                                            <span className="text-gray-500">Price Range:</span>
                                            <span className="text-gray-300 ml-2">
                                              ${event.priceRangeLow} – ${event.priceRangeHigh}
                                            </span>
                                          </div>
                                        )}
                                        {event.secFilingUrl && (
                                          <div className="col-span-2">
                                            <a
                                              href={event.secFilingUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 underline"
                                            >
                                              <FileText className="w-3 h-3" />
                                              View SEC Filing on EDGAR
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4 text-center">
                                  <span className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-medium border capitalize inline-block',
                                    statusCfg.color,
                                  )}>
                                    {event.status}
                                  </span>
                                </td>

                                {/* Filing Type */}
                                <td className="px-4 py-4 text-center">
                                  <span className={cn(
                                    'px-2 py-1 rounded text-[10px] font-mono font-medium border inline-block',
                                    filingCfg.color,
                                  )}>
                                    {filingCfg.label}
                                  </span>
                                </td>

                                {/* Exchange */}
                                <td className="px-4 py-4 text-center text-sm text-gray-400">
                                  {event.exchange || '—'}
                                </td>

                                {/* Price */}
                                <td className="px-4 py-4 text-right">
                                  <span className={cn(
                                    'text-sm font-medium',
                                    event.offerPrice ? 'text-green-400' : 'text-gray-400',
                                  )}>
                                    {formatPrice(event)}
                                  </span>
                                </td>

                                {/* Shares */}
                                <td className="px-4 py-4 text-right text-sm text-gray-500">
                                  {event.sharesOffered ? formatShares(event.sharesOffered) : '—'}
                                </td>

                                {/* Deal Size */}
                                <td className="px-4 py-4 text-right">
                                  <span className="text-sm font-medium text-purple-400">
                                    {event.dealSize ? formatCurrency(event.dealSize) : '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-6">
              {uniqueDatesInPage.map(date => (
                <div key={date}>
                  {/* Date divider */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-800" />
                    <span className="text-xs font-medium text-gray-400 bg-[#0D0D0D] border border-gray-800 rounded-full px-3 py-1">
                      {formatDate(date)}
                    </span>
                    <div className="h-px flex-1 bg-gray-800" />
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {groupedEvents[date]?.map((event, idx) => {
                      const statusCfg = getStatusConfig(event.status);
                      const filingCfg = FILING_TYPE_LABELS[event.filingType] || {
                        label: event.filingType, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                      };
                      const isExpanded = expandedRows.has(event.id);
                      const daysUntil = getDaysUntil(event.expectedDate);

                      return (
                        <div
                          key={event.id || idx}
                          className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-4 space-y-3"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-200 text-sm truncate">{event.companyName}</h3>
                                {event.secFilingUrl && (
                                  <a
                                    href={event.secFilingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-purple-400 transition-colors flex-shrink-0"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {event.symbol ? (
                                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/50">
                                    {event.symbol}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-600 italic">No ticker</span>
                                )}
                                <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono border', filingCfg.color)}>
                                  {filingCfg.label}
                                </span>
                                {event.sector && (
                                  <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded border',
                                    SECTOR_COLORS[event.sector] || SECTOR_COLORS['Other'],
                                  )}>
                                    {event.sector}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium border capitalize flex-shrink-0',
                              statusCfg.color,
                            )}>
                              {event.status}
                            </span>
                          </div>

                          {/* Key metrics */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Price</div>
                              <div className={cn(
                                'text-sm font-medium',
                                event.offerPrice ? 'text-green-400' : 'text-gray-400',
                              )}>
                                {formatPrice(event)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Shares</div>
                              <div className="text-sm text-gray-400">
                                {event.sharesOffered ? formatShares(event.sharesOffered) : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Deal Size</div>
                              <div className="text-sm font-medium text-purple-400">
                                {event.dealSize ? formatCurrency(event.dealSize) : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Footer / Expand */}
                          <div className="flex items-center justify-between pt-1 border-t border-gray-800/50">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              {event.exchange && <span>{event.exchange}</span>}
                              {daysUntil && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {daysUntil}
                                </span>
                              )}
                              {event.country && event.country !== 'US' && (
                                <span className="flex items-center gap-0.5">
                                  <Globe className="w-2.5 h-2.5" /> {event.country}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => toggleRow(event.id)}
                              className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              {isExpanded ? 'Less' : 'Details'}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-gray-800/50 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-500">Filed:</span>
                                  <span className="text-gray-300 ml-1">{formatShortDate(event.filingDate)}</span>
                                </div>
                                {event.expectedDate && (
                                  <div>
                                    <span className="text-gray-500">Expected:</span>
                                    <span className="text-gray-300 ml-1">{formatShortDate(event.expectedDate)}</span>
                                  </div>
                                )}
                                {event.industry && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Industry:</span>
                                    <span className="text-gray-300 ml-1">{event.industry}</span>
                                  </div>
                                )}
                              </div>
                              {event.secFilingUrl && (
                                <a
                                  href={event.secFilingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-xs underline"
                                >
                                  <FileText className="w-3 h-3" />
                                  View SEC Filing
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Calendar className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">No IPO events found</p>
            <p className="text-sm mt-1 text-gray-600">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'SEC EDGAR data will appear after the first refresh'
              }
            </p>
            <button
              onClick={() => { setStatusFilter('all'); setSectorFilter(null); setSearchQuery(''); }}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300 underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Error State */}
        {error && ipoEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Info className="w-10 h-10 text-red-500/50 mb-4" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => fetchIPOCalendar(true)}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4 pt-8">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm text-white">
              {currentPage} / {totalPages}
            </span>

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
              className="px-3 py-2 rounded-lg bg-[#0D0D0D] border border-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-2 text-xs text-gray-600 pb-4">
          <div className="flex items-center gap-3">
            {fromCache && (
              <span className="flex items-center gap-1 text-amber-500/50">
                <Database className="w-3 h-3" /> Cached
              </span>
            )}
            {lastUpdated && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-gray-700" />
            <span>Proprietary data · SEC EDGAR</span>
          </div>
        </div>
      </div>

      {/* Click outside to close sector filter */}
      {showSectorFilter && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSectorFilter(false)} />
      )}
    </div>
  );
}
