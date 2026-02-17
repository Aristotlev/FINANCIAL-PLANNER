/**
 * OmniFolio Proprietary Earnings Calendar
 *
 * Powered entirely by SEC EDGAR public data — zero third-party API dependencies.
 * Mirrors the Proprietary IPO Calendar's UI/UX patterns.
 *
 * Features:
 * - SEC EDGAR sourced earnings filings (8-K Item 2.02, 10-Q, 10-K)
 * - Sector filter chips
 * - Filing type badges (8-K, 10-Q, 10-K)
 * - Expanded row detail panels
 * - Mobile-responsive card layout
 * - Auto-refresh with background polling
 * - Local cache with 4-hour TTL
 * - EPS / Revenue surprise tracking
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
  TrendingDown,
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

interface APIResponse {
  success: boolean;
  data: EarningsEvent[];
  stats: {
    total: number;
    upcoming: number;
    reported: number;
    withEPS: number;
    sectors: string[];
  };
  source?: string;
  lastRefresh?: string | null;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const CACHE_KEY = 'omnifolio_sec_earnings_cache_v1';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
const AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

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

const FILING_TYPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  '8-K': { label: '8-K', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', desc: 'Earnings Announcement' },
  '10-Q': { label: '10-Q', color: 'text-green-400 bg-green-500/10 border-green-500/20', desc: 'Quarterly Report' },
  '10-K': { label: '10-K', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', desc: 'Annual Report' },
  '10-Q/A': { label: '10-Q/A', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', desc: 'Amended Quarterly' },
  '10-K/A': { label: '10-K/A', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', desc: 'Amended Annual' },
  'estimated': { label: 'Est.', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', desc: 'Estimated Date' },
};

type FilingFilter = 'all' | '8-K' | '10-Q' | '10-K';

// ─── Component ────────────────────────────────────────────────────────

export function ProprietaryEarningsCalendar() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filingFilter, setFilingFilter] = useState<FilingFilter>('all');
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

  // ── Cache (localStorage as bonus speed layer) ──────────────────────
  const loadFromCache = useCallback((): { events: EarningsEvent[]; timestamp: number } | null => {
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

  const saveToCache = useCallback((data: EarningsEvent[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ events: data, timestamp: Date.now() }));
    } catch { /* quota exceeded */ }
  }, []);

  // ── Fetch (stale-while-revalidate) ─────────────────────────────────
  const fetchEarnings = useCallback(async (forceRefresh = false) => {
    // Layer 1: Show cached data instantly
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached && cached.events.length > 0) {
        setEvents(cached.events);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
      }
    }

    // Layer 2: Always fetch from API (DB is the source of truth)
    if (forceRefresh) {
      setLoading(true);
      setFetchProgress('Refreshing from SEC EDGAR...');
    } else if (events.length === 0) {
      setLoading(true);
      setFetchProgress('Loading Earnings Calendar...');
    }

    setError(null);

    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.set('refresh', 'true');

      const res = await fetch(`/api/calendar/earnings?${params}`);

      if (!res.ok) {
        throw new Error(`API responded with ${res.status}`);
      }

      const data: APIResponse = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        setEvents(data.data);
        saveToCache(data.data);
        setFromCache(false);
        setLastUpdated(new Date());
      } else if (data.success && data.data && data.data.length === 0) {
        if (events.length === 0) {
          setEvents([]);
        }
        console.log('[Earnings] API returned 0 events — DB may be empty');
      } else {
        throw new Error(data.error || 'Unknown API error');
      }
    } catch (err) {
      console.error('[Earnings] Fetch error:', err);
      if (events.length === 0) {
        const cached = loadFromCache();
        if (cached && cached.events.length > 0) {
          setEvents(cached.events);
          setFromCache(true);
          setLastUpdated(new Date(cached.timestamp));
        } else {
          setError('Unable to load earnings data. Please try refreshing.');
        }
      }
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchEarnings();
    refreshRef.current = setInterval(() => fetchEarnings(false), AUTO_REFRESH_MS);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchEarnings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filingFilter, sectorFilter, searchQuery]);

  // ── Row Expansion ──────────────────────────────────────────────────
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Formatting ─────────────────────────────────────────────────────
  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatEPS = (value: number | null) => {
    if (value === null) return '—';
    return `$${value.toFixed(2)}`;
  };

  const getEPSSurprise = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null) return null;
    const surprise = actual - estimate;
    const pct = estimate !== 0 ? ((surprise / Math.abs(estimate)) * 100) : 0;
    return { surprise, pct, beat: surprise > 0 };
  };

  const getRevenueSurprise = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null) return null;
    const surprise = actual - estimate;
    const pct = estimate !== 0 ? ((surprise / estimate) * 100) : 0;
    return { surprise, pct, beat: surprise > 0 };
  };

  const isUpcoming = (date: string) => {
    const eventDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateStr: string): string | null => {
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

  const getHourLabel = (hour: string) => {
    switch (hour) {
      case 'bmo': return { label: 'Before Open', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'amc': return { label: 'After Close', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'dmh': return { label: 'During Hours', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      default: return { label: 'TBD', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
    }
  };

  // ── Filter & Search ────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const filingMatch = filingFilter === 'all' || event.filingType === filingFilter || event.filingType === `${filingFilter}/A`;
      const sectorMatch = !sectorFilter || event.sector === sectorFilter;
      const searchMatch = !searchQuery ||
        event.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.sector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.exchange?.toLowerCase().includes(searchQuery.toLowerCase());
      return filingMatch && sectorMatch && searchMatch;
    });
  }, [events, filingFilter, sectorFilter, searchQuery]);

  // ── Derived data ───────────────────────────────────────────────────
  const sectors = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => { if (e.sector) s.add(e.sector); });
    return Array.from(s).sort();
  }, [events]);

  const stats = useMemo(() => {
    const nowStr = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e => e.date >= nowStr).length;
    const reported = events.filter(e => e.date < nowStr).length;
    const eightK = events.filter(e => e.filingType === '8-K').length;
    const tenQ = events.filter(e => e.filingType === '10-Q' || e.filingType === '10-Q/A').length;
    const tenK = events.filter(e => e.filingType === '10-K' || e.filingType === '10-K/A').length;
    return { upcoming, reported, eightK, tenQ, tenK, total: events.length };
  }, [events]);

  // ── Pagination ─────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ── Group by date ──────────────────────────────────────────────────
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
    return Array.from(dates);
  }, [paginatedEvents]);

  const hasActiveFilters = filingFilter !== 'all' || sectorFilter !== null || searchQuery !== '';

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-400" />
              Earnings Calendar
              <span className="text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">
                SEC EDGAR
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Proprietary data sourced directly from SEC EDGAR filings · 8-K, 10-Q, 10-K
            </p>
          </div>

          {/* Filing Type Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0D0D0D] p-1 rounded-lg border border-gray-800 flex-wrap">
            {([
              { key: 'all' as FilingFilter, label: 'All', count: stats.total },
              { key: '8-K' as FilingFilter, label: '8-K', count: stats.eightK },
              { key: '10-Q' as FilingFilter, label: '10-Q', count: stats.tenQ },
              { key: '10-K' as FilingFilter, label: '10-K', count: stats.tenK },
            ]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilingFilter(key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 font-mono',
                  filingFilter === key
                    ? 'bg-green-500/20 text-green-400 border border-green-500/20 shadow-sm'
                    : 'text-gray-400 hover:text-white',
                )}
              >
                {label}
                <span className={cn(
                  'text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center',
                  filingFilter === key ? 'bg-green-500/20 text-green-300' : 'bg-gray-800/50 text-gray-500',
                )}>
                  {count}
                </span>
              </button>
            ))}
            <button
              onClick={() => fetchEarnings(true)}
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
              <BarChart3 className="w-3 h-3" />
              Reported
            </div>
            <div className="text-lg font-bold text-green-400">{stats.reported}</div>
          </div>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FileText className="w-3 h-3" />
              8-K Announcements
            </div>
            <div className="text-lg font-bold text-amber-400">{stats.eightK}</div>
          </div>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign className="w-3 h-3" />
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
                  ? 'border-green-500/30 text-green-400'
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
                  const count = events.filter(e => e.sector === sector).length;
                  return (
                    <button
                      key={sector}
                      onClick={() => { setSectorFilter(sector); setShowSectorFilter(false); }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors',
                        sectorFilter === sector ? 'text-green-400 bg-green-500/10' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]',
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

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Showing {filteredEvents.length} of {events.length} filings</span>
            <button
              onClick={() => { setFilingFilter('all'); setSectorFilter(null); setSearchQuery(''); }}
              className="text-green-400 hover:text-green-300 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto space-y-8 pr-1 custom-scrollbar">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500/20 border-t-green-500 mb-4" />
              <Sparkles className="w-5 h-5 text-green-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-2" />
            </div>
            <p className="text-gray-400 text-sm mt-4">{fetchProgress || 'Loading Earnings Calendar...'}</p>
            <p className="text-xs text-gray-600 mt-2">Sourcing directly from SEC EDGAR</p>
          </div>
        ) : (
          <>
            {/* ─── Desktop Table Layout ──────────────────────────────────── */}
            <div className="hidden md:block space-y-8">
              {uniqueDatesInPage.map(date => (
                <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Date divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                    <span className="text-sm font-medium text-gray-400 border border-gray-800 rounded-full px-4 py-1 bg-[#0D0D0D] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {formatDate(date)}
                      {isUpcoming(date) && (
                        <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                          Upcoming
                        </span>
                      )}
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
                            <th className="px-4 py-3 font-medium text-center">Filing</th>
                            <th className="px-4 py-3 font-medium text-center">Quarter</th>
                            <th className="px-4 py-3 font-medium text-right">EPS Est</th>
                            <th className="px-4 py-3 font-medium text-right">EPS Actual</th>
                            <th className="px-4 py-3 font-medium text-right">Revenue</th>
                            <th className="px-4 py-3 font-medium text-center">SEC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {groupedEvents[date]?.map((event, idx) => {
                            const filingCfg = FILING_TYPE_LABELS[event.filingType] || {
                              label: event.filingType, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', desc: 'SEC Filing',
                            };
                            const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
                            const revenueSurprise = getRevenueSurprise(event.revenueActual, event.revenueEstimate);
                            const isExp = expandedRows.has(`${event.symbol}-${event.date}`);
                            const daysUntil = getDaysUntil(event.date);
                            const upcoming = isUpcoming(event.date);
                            const hourInfo = getHourLabel(event.hour);

                            return (
                              <tr
                                key={`${event.symbol}-${event.date}-${idx}`}
                                className={cn('group hover:bg-[#141414] transition-colors', !upcoming && 'opacity-75 hover:opacity-100')}
                              >
                                {/* Expand toggle */}
                                <td className="px-2 py-4">
                                  <button
                                    onClick={() => toggleRow(`${event.symbol}-${event.date}`)}
                                    className="p-1 rounded text-gray-600 hover:text-white transition-colors"
                                  >
                                    {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </td>

                                {/* Company */}
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors text-sm">
                                        {event.symbol}
                                      </span>
                                      {daysUntil && (
                                        <span className="text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
                                          {daysUntil}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {event.companyName && event.companyName !== event.symbol && (
                                        <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                          {event.companyName}
                                        </span>
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
                                  {isExp && (
                                    <div className="mt-3 pt-3 border-t border-gray-800/50">
                                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                                        <div>
                                          <span className="text-gray-500">Report Date:</span>
                                          <span className="text-gray-300 ml-2">{formatShortDate(event.date)}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Period:</span>
                                          <span className="text-gray-300 ml-2">
                                            {event.quarter > 0 ? `Q${event.quarter}` : 'FY'} {event.year}
                                          </span>
                                        </div>
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
                                        {event.hour && event.hour !== 'unknown' && (
                                          <div>
                                            <span className="text-gray-500">Timing:</span>
                                            <span className="text-gray-300 ml-2">{hourInfo.label}</span>
                                          </div>
                                        )}
                                        {event.epsEstimate !== null && (
                                          <div>
                                            <span className="text-gray-500">EPS Estimate:</span>
                                            <span className="text-gray-300 ml-2">{formatEPS(event.epsEstimate)}</span>
                                          </div>
                                        )}
                                        {event.revenueEstimate !== null && (
                                          <div>
                                            <span className="text-gray-500">Revenue Est:</span>
                                            <span className="text-gray-300 ml-2">{formatCurrency(event.revenueEstimate)}</span>
                                          </div>
                                        )}
                                        {event.secFilingUrl && (
                                          <div className="col-span-2">
                                            <a
                                              href={event.secFilingUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-400 hover:text-green-300 flex items-center gap-1 underline"
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

                                {/* Filing Type */}
                                <td className="px-4 py-4 text-center">
                                  <span
                                    className={cn('px-2 py-1 rounded text-[10px] font-mono font-medium border inline-block', filingCfg.color)}
                                    title={filingCfg.desc}
                                  >
                                    {filingCfg.label}
                                  </span>
                                </td>

                                {/* Quarter */}
                                <td className="px-4 py-4 text-center text-sm text-gray-400 font-mono">
                                  {event.quarter > 0 ? `Q${event.quarter}` : 'FY'}
                                </td>

                                {/* EPS Estimate */}
                                <td className="px-4 py-4 text-right">
                                  <span className="text-sm font-medium text-gray-400 font-mono">
                                    {formatEPS(event.epsEstimate)}
                                  </span>
                                </td>

                                {/* EPS Actual */}
                                <td className="px-4 py-4 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={cn(
                                      'text-sm font-medium font-mono',
                                      epsSurprise === null ? 'text-gray-500' : epsSurprise.beat ? 'text-green-400' : 'text-red-400',
                                    )}>
                                      {formatEPS(event.epsActual)}
                                    </span>
                                    {epsSurprise && (
                                      <span className={cn('text-[10px] flex items-center gap-0.5 mt-0.5', epsSurprise.beat ? 'text-green-500' : 'text-red-500')}>
                                        {epsSurprise.beat ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                        {epsSurprise.beat ? '+' : ''}{epsSurprise.pct.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Revenue */}
                                <td className="px-4 py-4 text-right">
                                  <div className="flex flex-col items-end">
                                    {event.revenueActual !== null ? (
                                      <>
                                        <span className={cn(
                                          'text-sm font-medium font-mono',
                                          revenueSurprise === null ? 'text-gray-300' : revenueSurprise.beat ? 'text-green-400' : 'text-red-400',
                                        )}>
                                          {formatCurrency(event.revenueActual)}
                                        </span>
                                        {revenueSurprise && (
                                          <span className={cn('text-[10px] flex items-center gap-0.5 mt-0.5', revenueSurprise.beat ? 'text-green-500' : 'text-red-500')}>
                                            {revenueSurprise.beat ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                            {revenueSurprise.beat ? '+' : ''}{revenueSurprise.pct.toFixed(1)}%
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

                                {/* SEC Link */}
                                <td className="px-4 py-4 text-center">
                                  {event.secFilingUrl ? (
                                    <a
                                      href={event.secFilingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-gray-600 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Mobile Card Layout ────────────────────────────────────── */}
            <div className="md:hidden space-y-6">
              {uniqueDatesInPage.map(date => (
                <div key={date}>
                  {/* Date divider */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-800" />
                    <span className="text-xs font-medium text-gray-400 bg-[#0D0D0D] border border-gray-800 rounded-full px-3 py-1 flex items-center gap-1.5">
                      {formatDate(date)}
                      {isUpcoming(date) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      )}
                    </span>
                    <div className="h-px flex-1 bg-gray-800" />
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {groupedEvents[date]?.map((event, idx) => {
                      const filingCfg = FILING_TYPE_LABELS[event.filingType] || {
                        label: event.filingType, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', desc: 'Filing',
                      };
                      const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
                      const revenueSurprise = getRevenueSurprise(event.revenueActual, event.revenueEstimate);
                      const isExp = expandedRows.has(`${event.symbol}-${event.date}`);
                      const daysUntil = getDaysUntil(event.date);
                      const upcoming = isUpcoming(event.date);

                      return (
                        <div
                          key={`${event.symbol}-${event.date}-${idx}`}
                          className={cn('bg-[#0D0D0D] border border-gray-800 rounded-xl p-4 space-y-3', !upcoming && 'opacity-75')}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-cyan-400 text-sm">{event.symbol}</span>
                                {event.secFilingUrl && (
                                  <a
                                    href={event.secFilingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-green-400 transition-colors flex-shrink-0"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {event.companyName && event.companyName !== event.symbol && (
                                  <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                                    {event.companyName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
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

                          {/* Key metrics */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Quarter</div>
                              <div className="text-sm font-mono text-gray-300">
                                {event.quarter > 0 ? `Q${event.quarter}` : 'FY'} {event.year}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">EPS</div>
                              <div className={cn(
                                'text-sm font-medium font-mono',
                                epsSurprise === null
                                  ? (event.epsActual !== null ? 'text-gray-300' : 'text-gray-500')
                                  : epsSurprise.beat ? 'text-green-400' : 'text-red-400',
                              )}>
                                {event.epsActual !== null ? formatEPS(event.epsActual) : `Est ${formatEPS(event.epsEstimate)}`}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Revenue</div>
                              <div className={cn(
                                'text-sm font-medium',
                                revenueSurprise === null
                                  ? (event.revenueActual !== null ? 'text-gray-300' : 'text-gray-500')
                                  : revenueSurprise.beat ? 'text-green-400' : 'text-red-400',
                              )}>
                                {event.revenueActual !== null ? formatCurrency(event.revenueActual) : `Est ${formatCurrency(event.revenueEstimate)}`}
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
                              onClick={() => toggleRow(`${event.symbol}-${event.date}`)}
                              className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              {isExp ? 'Less' : 'Details'}
                              {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Expanded details */}
                          {isExp && (
                            <div className="pt-2 border-t border-gray-800/50 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                {event.industry && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Industry:</span>
                                    <span className="text-gray-300 ml-1">{event.industry}</span>
                                  </div>
                                )}
                                {event.epsEstimate !== null && event.epsActual !== null && epsSurprise && (
                                  <div>
                                    <span className="text-gray-500">EPS Surprise:</span>
                                    <span className={cn('ml-1', epsSurprise.beat ? 'text-green-400' : 'text-red-400')}>
                                      {epsSurprise.beat ? '+' : ''}{epsSurprise.pct.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                                {event.revenueEstimate !== null && event.revenueActual !== null && revenueSurprise && (
                                  <div>
                                    <span className="text-gray-500">Rev Surprise:</span>
                                    <span className={cn('ml-1', revenueSurprise.beat ? 'text-green-400' : 'text-red-400')}>
                                      {revenueSurprise.beat ? '+' : ''}{revenueSurprise.pct.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              {event.secFilingUrl && (
                                <a
                                  href={event.secFilingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-400 hover:text-green-300 flex items-center gap-1 text-xs underline"
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
            <p className="text-lg">No earnings events found</p>
            <p className="text-sm mt-1 text-gray-600">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'SEC EDGAR data will appear after the first refresh'
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => { setFilingFilter('all'); setSectorFilter(null); setSearchQuery(''); }}
                className="mt-4 text-sm text-green-400 hover:text-green-300 underline"
              >
                Clear filters
              </button>
            )}
            {!hasActiveFilters && (
              <button
                onClick={() => fetchEarnings(true)}
                className="mt-4 text-sm text-green-400 hover:text-green-300 underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh from SEC EDGAR
              </button>
            )}
          </div>
        )}

        {/* Error State */}
        {error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Info className="w-10 h-10 text-red-500/50 mb-4" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => fetchEarnings(true)}
              className="mt-4 text-sm text-green-400 hover:text-green-300 underline flex items-center gap-1"
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
