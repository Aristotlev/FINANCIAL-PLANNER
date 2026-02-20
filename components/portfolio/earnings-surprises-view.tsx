"use client";

/**
 * OmniFolio Proprietary Earnings Surprises View
 * 
 * Full-featured earnings surprise analysis powered by our proprietary
 * DB cache/TTL system. All users get data from our Supabase cache instantly.
 * 
 * Same UX pattern as InsiderSentimentView and SenateLobbyingView.
 * 
 * Data Pipeline:
 *   1. Server in-memory cache → instant (~0ms)
 *   2. Supabase DB cache → fast (~50ms)
 *   3. SEC EDGAR XBRL API → slow (~2-5s, only on cache miss)
 * 
 * Features:
 *   - Proprietary OES (OmniFolio Earnings Surprise) score
 *   - EPS & revenue surprise analysis
 *   - Beat/miss streaks and consistency metrics
 *   - Margin trends (gross, operating, net)
 *   - YoY and QoQ growth comparisons
 *   - Company search with logo resolution
 *   - Recent searches with localStorage persistence
 *   - Client-side cache for instant tab switches
 * 
 * Copyright OmniFolio. All rights reserved.
 */

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
} from 'recharts';
import { 
  Loader2, TrendingUp, TrendingDown, Info, AlertCircle, Search, Target, X, 
  Clock, Sparkles, Zap, Trophy, ChevronDown, ChevronUp, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Database, Shield 
} from 'lucide-react';
import { tickerDomains } from '@/lib/ticker-domains';
import { motion, AnimatePresence } from 'framer-motion';

// ══════════════════════════════════════════════════════════════════
// CLIENT-SIDE CACHE — instant loads when switching back to a ticker
// ══════════════════════════════════════════════════════════════════

interface EarningsSurpriseQuarter {
  symbol: string;
  fiscalYear: number;
  fiscalQuarter: number;
  periodEndDate: string | null;
  reportDate: string | null;
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprise: number | null;
  epsSurprisePct: number | null;
  epsBasic: number | null;
  epsDiluted: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  revenueSurprise: number | null;
  revenueSurprisePct: number | null;
  netIncome: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  revenueYoyPct: number | null;
  epsYoyPct: number | null;
  revenueQoqPct: number | null;
  epsQoqPct: number | null;
  oesScore: number;
  surpriseLabel: string;
  beatCountLast4: number;
  missCountLast4: number;
  streakType: string;
  streakLength: number;
  filingType: string;
  filingUrl: string | null;
  accessionNumber: string | null;
}

interface EarningsSurpriseResponse {
  success: boolean;
  symbol: string;
  companyName: string | null;
  cik: string | null;
  currentScore: number;
  currentLabel: string;
  trend: 'improving' | 'declining' | 'stable';
  beatRate: number;
  avgSurprisePct: number;
  currentStreak: { type: string; length: number };
  quarters: EarningsSurpriseQuarter[];
  quarterCount: number;
  meta: {
    source: string;
    cachedAt: string | null;
    expiresAt: string | null;
    ttlSeconds: number;
    algorithm: string;
    dataSource: string;
  };
}

interface SearchResult {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

// Client-side cache (survives across tab switches within session)
const clientCache = new Map<string, { data: EarningsSurpriseResponse; timestamp: number }>();
const CLIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

// ── Color helper ─────────────────────────────────────────────────────
const getTickerColor = (ticker: string): string => {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-green-500 to-green-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
    'from-indigo-500 to-indigo-700',
    'from-teal-500 to-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ── Company Icon ─────────────────────────────────────────────────────
const CompanyIcon = ({ ticker, className = "h-10 w-10", showPlaceholder = true }: { ticker: string; className?: string; showPlaceholder?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();

  const imageSources = useMemo(() => {
    const sources: string[] = [];
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`);
    return sources;
  }, [upperTicker, ticker]);

  useEffect(() => { setImageError(false); setFallbackIndex(0); }, [ticker]);

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
        className={cn(className, "rounded-xl object-contain bg-white p-1")}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={cn(className, `rounded-xl bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`)}>
      {ticker.slice(0, 2)}
    </div>
  );
};

// ── Debounce hook ────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Popular tickers ──────────────────────────────────────────────────
const defaultPopularTickers = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.' },
  { ticker: 'NFLX', name: 'Netflix Inc.' },
  { ticker: 'AMD', name: 'Advanced Micro Devices' },
  { ticker: 'CRM', name: 'Salesforce Inc.' },
  { ticker: 'INTC', name: 'Intel Corp.' },
];

// ── Score badge helper ───────────────────────────────────────────────
function getOESBadge(score: number, label: string) {
  if (score >= 50) return { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Trophy };
  if (score >= 20) return { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: TrendingUp };
  if (score > -20) return { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: Minus };
  if (score > -50) return { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: TrendingDown };
  return { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: AlertCircle };
}

function formatRevenue(val: number | null): string {
  if (val === null) return '—';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

// ══════════════════════════════════════════════════════════════════
// ANTI-FLICKER: stable hook + constants + components
// ══════════════════════════════════════════════════════════════════

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    let ro: ResizeObserver | null = null;
    let rafId: number;

    const attach = (el: HTMLDivElement) => {
      const update = () => {
        const { width, height } = el.getBoundingClientRect();
        setSize(prev =>
          prev.width === Math.floor(width) && prev.height === Math.floor(height)
            ? prev
            : { width: Math.floor(width), height: Math.floor(height) }
        );
      };
      update();
      ro = new ResizeObserver(update);
      ro.observe(el);
    };

    if (ref.current) {
      attach(ref.current);
      return () => ro?.disconnect();
    }

    // Poll until element mounts (happens after async data load removes loading state)
    const poll = () => {
      if (ref.current) {
        attach(ref.current);
      } else {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return size;
}

const ES_CHART_MARGIN = { top: 20, right: 30, left: 20, bottom: 5 } as const;
const ES_CURSOR_STYLE = { fill: 'rgba(255,255,255,0.05)', radius: 4 } as const;
const ES_XAXIS_TICK = { fontSize: 12, fill: '#525252' } as const;
const ES_YAXIS_TICK = { fontSize: 12, fill: '#525252' } as const;
const ES_LEGEND_STYLE = { paddingTop: '20px' } as const;
const ES_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const esYAxisTickFormatter = (value: number) => `$${value}`;
const ES_GRADIENTS = (
  <defs>
    <linearGradient id="esPositiveGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
    </linearGradient>
    <linearGradient id="esNegativeGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
    </linearGradient>
    <linearGradient id="esEstimateGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#334155" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#334155" stopOpacity={0.3} />
    </linearGradient>
  </defs>
);

type ESTooltipPayloadEntry = {
  dataKey?: string;
  value?: number | null;
  payload?: {
    label?: string;
    surprisePct?: number | null;
    yoyPct?: number | null;
    hasEstimate?: boolean;
  };
};

const EarningsSurprisesTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: ESTooltipPayloadEntry[];
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const estimate = payload.find(p => p.dataKey === 'estimate');
  const actualPos = payload.find(p => p.dataKey === 'actualPositive' && p.value != null);
  const actualNeg = payload.find(p => p.dataKey === 'actualNegative' && p.value != null);
  const actual = actualPos || actualNeg;
  const isBeat = !!actualPos;
  const surprisePct = payload.find(p => p.dataKey === 'surprisePct');
  const hasEst = payload[0]?.payload?.hasEstimate;
  const yoyPct = payload[0]?.payload?.yoyPct;
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-2xl backdrop-blur-sm">
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {estimate && estimate.value != null && (
        <div className="flex items-center gap-3 mb-1 min-w-[160px]">
          <div className="w-2 h-2 rounded-full shrink-0 bg-slate-600" />
          <span className="text-gray-300 text-sm flex-1">Estimate:</span>
          <span className="text-white font-mono font-bold text-sm">${Number(estimate.value).toFixed(2)}</span>
        </div>
      )}
      {actual && actual.value != null && (
        <div className="flex items-center gap-3 mb-1 min-w-[160px]">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isBeat ? 'bg-blue-500' : 'bg-red-500'}`} />
          <span className="text-gray-300 text-sm flex-1">Actual EPS:</span>
          <span className="text-white font-mono font-bold text-sm">${Number(actual.value).toFixed(2)}</span>
        </div>
      )}
      {hasEst && surprisePct && surprisePct.value != null && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <span className={cn("text-xs font-mono font-bold", Number(surprisePct.value) >= 0 ? 'text-blue-400' : 'text-red-400')}>
            {Number(surprisePct.value) > 0 ? '+' : ''}{Number(surprisePct.value).toFixed(2)}% surprise
          </span>
        </div>
      )}
      {!hasEst && yoyPct != null && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <span className={cn("text-xs font-mono font-bold", yoyPct >= 0 ? 'text-blue-400' : 'text-red-400')}>
            {yoyPct > 0 ? '+' : ''}{yoyPct.toFixed(2)}% YoY EPS
          </span>
        </div>
      )}
    </div>
  );
};
const earningsSurprisesTooltipEl = <EarningsSurprisesTooltip />;

const EarningsSurprisesLegend = ({ hasEstimate }: { hasEstimate?: boolean }) => (
  <div className="flex justify-center gap-6 pt-4">
    {hasEstimate && (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-slate-600" />
        <span className="text-sm text-gray-400">EPS Estimate</span>
      </div>
    )}
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-blue-500" />
      <span className="text-sm text-gray-400">{hasEstimate ? 'EPS Actual (Beat)' : 'EPS Actual (Growth)'}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <span className="text-sm text-gray-400">{hasEstimate ? 'EPS Actual (Miss)' : 'EPS Actual (Decline)'}</span>
    </div>
  </div>
);
// Note: legend content needs hasEstimate — we pass it via the component render inside the chart JSX

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

interface EarningsSurprisesViewProps {
  initialTicker?: string;
}

export function EarningsSurprisesView({ initialTicker = 'AAPL' }: EarningsSurprisesViewProps) {
  const [ticker, setTicker] = useState(initialTicker);
  const [companyName, setCompanyName] = useState('Apple Inc.');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EarningsSurpriseResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialLoadDone = useRef(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartSize = useContainerSize(chartContainerRef);

  // Recent tickers (persisted in localStorage)
  const [recentTickers, setRecentTickers] = useState<{ ticker: string; name: string }[]>([]);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Load recent tickers
  useEffect(() => {
    try {
      const stored = localStorage.getItem('earnings-surprises-recent');
      if (stored) setRecentTickers(JSON.parse(stored));
    } catch {}
  }, []);

  const addRecentTicker = useCallback((t: string, name: string) => {
    setRecentTickers(prev => {
      const filtered = prev.filter(item => item.ticker !== t);
      const updated = [{ ticker: t, name }, ...filtered].slice(0, 8);
      try { localStorage.setItem('earnings-surprises-recent', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Search companies
  useEffect(() => {
    async function searchCompanies() {
      if (!debouncedSearch || debouncedSearch.length < 1) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // Check search cache
      const cacheKey = debouncedSearch.toLowerCase();
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        setSearchResults(cached.results);
        setShowDropdown(cached.results.length > 0);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/sec/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`);
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          searchCache.set(cacheKey, { results, timestamp: Date.now() });
          setSearchResults(results);
          setShowDropdown(results.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }
    searchCompanies();
  }, [debouncedSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch earnings surprises from proprietary API ──────────────
  const fetchData = useCallback(async (tickerToFetch: string, skipCache = false) => {
    if (!tickerToFetch) return;

    const cacheKey = tickerToFetch.toUpperCase();

    // Client-side cache hit
    if (!skipCache) {
      const cached = clientCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
        console.log(`[EarningsSurprisesView] ⚡ Client cache hit for ${tickerToFetch}`);
        setData(cached.data);
        setCompanyName(cached.data.companyName || tickerToFetch);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    // Show existing data while loading fresh
    if (!data || data.symbol !== cacheKey) {
      setIsLoading(true);
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setError(null);

    try {
      const response = await fetch(
        `/api/earnings-surprises?symbol=${cacheKey}&quarters=16${skipCache ? '&refresh=true' : ''}`,
        { signal: abortRef.current.signal }
      );

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        throw new Error('API unavailable or returned invalid format');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch earnings surprise data');
      }

      const result: EarningsSurpriseResponse = await response.json();

      // Update client cache
      clientCache.set(cacheKey, { data: result, timestamp: Date.now() });

      setData(result);
      setCompanyName(result.companyName || tickerToFetch);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[EarningsSurprisesView]', err);

      const errorMessage = err.message === 'Failed to fetch'
        ? 'Unable to connect to server. Please check your connection.'
        : err.message || 'An error occurred';

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchData(ticker);
    }
  }, []);

  // Ticker change
  useEffect(() => {
    if (initialLoadDone.current && ticker) {
      fetchData(ticker);
    }
  }, [ticker, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const selectCompany = (t: string, name: string) => {
    setIsLoading(true);
    setSearchInput('');
    setShowDropdown(false);
    setSearchResults([]);
    addRecentTicker(t, name);
    setTimeout(() => {
      setTicker(t.toUpperCase().trim());
      setCompanyName(name);
      setIsLoading(false);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0)); break;
      case 'ArrowUp': e.preventDefault(); setHighlightedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1)); break;
      case 'Enter': e.preventDefault(); if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) { const r = searchResults[highlightedIndex]; selectCompany(r.ticker, r.name); } break;
      case 'Escape': setShowDropdown(false); break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      selectCompany(searchInput.trim(), searchInput.toUpperCase().trim());
    }
  };

  // ── Chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data?.quarters) return [];
    return [...data.quarters]
      .filter(q => q.epsActual !== null)
      .sort((a, b) => {
        if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
        return a.fiscalQuarter - b.fiscalQuarter;
      })
      .slice(-12)
      .map(q => {
        // Beat = actual > estimate (when available), else positive YoY growth
        const isBeat = q.epsEstimate !== null
          ? (q.epsActual !== null && q.epsActual >= q.epsEstimate)
          : (q.epsYoyPct !== null ? q.epsYoyPct >= 0 : true);
        return {
          label: `Q${q.fiscalQuarter} ${q.fiscalYear}`,
          period: q.periodEndDate || `${q.fiscalYear}-Q${q.fiscalQuarter}`,
          estimate: q.epsEstimate,
          actualPositive: isBeat ? q.epsActual : null,
          actualNegative: !isBeat ? q.epsActual : null,
          surprise: q.epsSurprise,
          surprisePct: q.epsSurprisePct,
          yoyPct: q.epsYoyPct,
          oesScore: q.oesScore,
          hasEstimate: q.epsEstimate !== null,
        };
      });
  }, [data]);

  // ── Quarters with data for the table ───────────────────────────
  const quartersWithData = useMemo(() => {
    if (!data?.quarters) return [];
    return data.quarters.filter(q => q.epsActual !== null || q.epsEstimate !== null);
  }, [data]);

  // ── Whether analyst estimate data is available ─────────────────
  const hasEstimateData = useMemo(() => {
    if (!data?.quarters) return false;
    return data.quarters.some(q => q.epsEstimate !== null);
  }, [data]);

  // Stable legend element — memoized so recharts never creates a new reference on hover
  const esLegendEl = useMemo(
    () => <EarningsSurprisesLegend hasEstimate={hasEstimateData} />,
    [hasEstimateData]
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            Earnings Surprises
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400 items-center">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            Actual vs. estimated EPS pulled from SEC EDGAR filings — cached for instant loads
          </div>
        </div>
      </div>

      {/* Search Bar with Autocomplete */}
      <div ref={searchRef} className="relative z-50">
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
          <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="relative flex-1">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              )}
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Search by ticker or company name..."
                className="w-full pl-10 pr-8 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setSearchResults([]); setShowDropdown(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isLoading || !searchInput.trim()
                  ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                  : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
              )}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Analyze</span>
            </button>
          </form>
        </div>

        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
              style={{ zIndex: 9999 }}
            >
              {searchResults.map((result, index) => (
                <button
                  key={`${result.cik}-${index}`}
                  onClick={() => selectCompany(result.ticker, result.name)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                    index === highlightedIndex ? 'bg-blue-500/20' : 'hover:bg-[#212121]'
                  )}
                >
                  <CompanyIcon ticker={result.ticker} className="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">{result.ticker}</div>
                    <div className="text-xs text-gray-400 truncate">{result.name}</div>
                  </div>
                  {result.exchange && (
                    <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-gray-800 rounded">{result.exchange}</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Popular Companies */}
      <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Popular Companies
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {defaultPopularTickers.map((item) => (
            <button
              key={item.ticker}
              onClick={() => selectCompany(item.ticker, item.name)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
                ticker === item.ticker
                  ? 'bg-blue-500/10 border border-blue-500/30 ring-1 ring-blue-500/20'
                  : 'bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A]'
              )}
            >
              <CompanyIcon ticker={item.ticker} className="h-7 w-7 flex-shrink-0" />
              <div className="min-w-0">
                <div className={cn("text-xs font-semibold truncate", ticker === item.ticker ? 'text-blue-400' : 'text-white group-hover:text-white')}>
                  {item.ticker}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{item.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Analyses */}
      {recentTickers.length > 0 && (
        <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              Recent Analyses
            </h3>
            <span className="text-[10px] text-gray-600">{recentTickers.length} companies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTickers.map((item, index) => (
              <button
                key={`${item.ticker}-${index}`}
                onClick={() => selectCompany(item.ticker, item.name)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group",
                  ticker === item.ticker
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                    : 'bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A] text-gray-300 hover:text-white'
                )}
              >
                <CompanyIcon ticker={item.ticker} className="h-5 w-5" />
                <span className="text-xs font-medium">{item.ticker}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">

        {/* Company Header */}
        <div className="flex items-center gap-4 py-2 animate-in fade-in duration-500">
          <CompanyIcon ticker={ticker} className="h-14 w-14" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {ticker}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                SEC EDGAR
              </span>
            </h3>
            <p className="text-sm text-gray-400">{companyName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <BarChart3 className="w-3 h-3 text-gray-600" />
              Proprietary Earnings Surprise Report
            </p>
          </div>
          {data && data.meta && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-600">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>{data.meta.source === 'cache' ? 'DB Cache' : 'Fresh'}</span>
              {data.meta.cachedAt && (
                <span>· {new Date(data.meta.cachedAt).toLocaleTimeString()}</span>
              )}
            </div>
          )}
        </div>

        {/* Score Dashboard */}
        {data && !isLoading && !error && quartersWithData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* OES Score */}
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">OES Score</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const badge = getOESBadge(data.currentScore, data.currentLabel);
                  return (
                    <>
                      <span className={cn("text-2xl font-bold font-mono", data.currentScore >= 0 ? 'text-blue-400' : 'text-red-400')}>
                        {data.currentScore > 0 ? '+' : ''}{data.currentScore.toFixed(1)}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", badge.color)}>
                        {data.currentLabel}
                      </span>
                    </>
                  );
                })()}
              </div>
              {!hasEstimateData && (
                <p className="text-[9px] text-gray-600 mt-1">Based on growth signals</p>
              )}
            </div>

            {/* Beat Rate / Growth Rate */}
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                {hasEstimateData ? 'Beat Rate' : 'Growth Rate'}
              </p>
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold font-mono", data.beatRate >= 50 ? 'text-emerald-400' : 'text-orange-400')}>
                  {data.beatRate.toFixed(0)}%
                </span>
                <Trophy className={cn("w-4 h-4", data.beatRate >= 75 ? 'text-emerald-400' : data.beatRate >= 50 ? 'text-blue-400' : 'text-orange-400')} />
              </div>
              {!hasEstimateData && (
                <p className="text-[9px] text-gray-600 mt-1">Qtrs with positive YoY</p>
              )}
            </div>

            {/* Avg Surprise / Avg YoY */}
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                {hasEstimateData ? 'Avg Surprise' : 'Avg YoY EPS'}
              </p>
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold font-mono", data.avgSurprisePct >= 0 ? 'text-blue-400' : 'text-red-400')}>
                  {data.avgSurprisePct > 0 ? '+' : ''}{data.avgSurprisePct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Streak */}
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Streak</p>
              <div className="flex items-center gap-2">
                {data.currentStreak.type === 'beat_streak' ? (
                  <>
                    <span className="text-2xl font-bold font-mono text-emerald-400">{data.currentStreak.length}</span>
                    <span className="text-xs text-emerald-400">{hasEstimateData ? 'consecutive beats' : 'qtrs YoY growth'}</span>
                  </>
                ) : data.currentStreak.type === 'miss_streak' ? (
                  <>
                    <span className="text-2xl font-bold font-mono text-red-400">{data.currentStreak.length}</span>
                    <span className="text-xs text-red-400">{hasEstimateData ? 'consecutive misses' : 'qtrs YoY decline'}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Mixed</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-1 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-400">Loading earnings data from DB cache...</p>
              <p className="text-gray-500 text-sm mt-2">All data served from our proprietary database</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center m-4">
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
          ) : !data || quartersWithData.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No earnings history available for {ticker}.</p>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {/* Chart */}
              <div className="h-[350px] w-full" ref={chartContainerRef}>
                {chartSize.width > 0 && (
                  <BarChart data={chartData} width={chartSize.width} height={350} margin={ES_CHART_MARGIN}>
                    {ES_GRADIENTS}

                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />

                    <XAxis
                      dataKey="label"
                      tick={ES_XAXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />

                    <YAxis
                      tick={ES_YAXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={esYAxisTickFormatter}
                      dx={-10}
                    />

                    <Tooltip
                      cursor={ES_CURSOR_STYLE}
                      isAnimationActive={false}
                      content={earningsSurprisesTooltipEl}
                    />

                    <Legend
                      wrapperStyle={ES_LEGEND_STYLE}
                      content={esLegendEl}
                    />

                    <Bar dataKey="estimate" name="EPS Estimate" fill="url(#esEstimateGradient)" radius={ES_BAR_RADIUS} isAnimationActive={false} maxBarSize={60} />
                    <Bar dataKey="actualPositive" name="EPS Actual (Beat)" fill="url(#esPositiveGradient)" radius={ES_BAR_RADIUS} isAnimationActive={false} maxBarSize={60} legendType="none" />
                    <Bar dataKey="actualNegative" name="EPS Actual (Miss)" fill="url(#esNegativeGradient)" radius={ES_BAR_RADIUS} isAnimationActive={false} maxBarSize={60} legendType="none" />
                  </BarChart>
                )}
              </div>

              {/* Detailed Toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showDetails ? 'Hide' : 'Show'} Revenue & Margins
              </button>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#111] text-gray-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3 text-right">Estimate</th>
                      <th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3 text-right">Surprise</th>
                      <th className="px-4 py-3 text-right">% Surprise</th>
                      <th className="px-4 py-3 text-right">OES</th>
                      {showDetails && (
                        <>
                          <th className="px-4 py-3 text-right">Revenue</th>
                          <th className="px-4 py-3 text-right">YoY EPS</th>
                          <th className="px-4 py-3 text-right">Net Margin</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {quartersWithData.map((q, i) => {
                      const badge = getOESBadge(q.oesScore, q.surpriseLabel);
                      return (
                        <tr key={`${q.fiscalYear}-${q.fiscalQuarter}`} className="hover:bg-[#212121] transition-colors">
                          <td className="px-4 py-4 text-white font-medium">
                            <div className="flex flex-col">
                              <span>Q{q.fiscalQuarter} {q.fiscalYear}</span>
                              {q.periodEndDate && (
                                <span className="text-xs text-gray-500">{q.periodEndDate}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-gray-300">
                            {q.epsEstimate !== null ? `$${q.epsEstimate.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-white">
                            {q.epsActual !== null ? `$${q.epsActual.toFixed(2)}` : '—'}
                          </td>
                          <td className={cn("px-4 py-4 text-right font-mono", (q.epsSurprise ?? 0) > 0 ? 'text-blue-400' : (q.epsSurprise ?? 0) < 0 ? 'text-red-400' : 'text-gray-400')}>
                            {q.epsSurprise !== null ? `${q.epsSurprise > 0 ? '+' : ''}${q.epsSurprise.toFixed(4)}` : '—'}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {q.epsSurprisePct !== null ? (
                              <span className={cn("px-2 py-1 rounded text-xs border",
                                q.epsSurprisePct > 0
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : q.epsSurprisePct < 0
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                              )}>
                                {q.epsSurprisePct > 0 ? '+' : ''}{q.epsSurprisePct.toFixed(2)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={cn("px-2 py-1 rounded text-xs border font-mono", badge.color)}>
                              {q.oesScore > 0 ? '+' : ''}{q.oesScore.toFixed(0)}
                            </span>
                          </td>
                          {showDetails && (
                            <>
                              <td className="px-4 py-4 text-right font-mono text-gray-300 text-xs">
                                {formatRevenue(q.revenueActual)}
                              </td>
                              <td className={cn("px-4 py-4 text-right font-mono text-xs", (q.epsYoyPct ?? 0) > 0 ? 'text-emerald-400' : (q.epsYoyPct ?? 0) < 0 ? 'text-red-400' : 'text-gray-400')}>
                                {q.epsYoyPct !== null ? `${q.epsYoyPct > 0 ? '+' : ''}${q.epsYoyPct.toFixed(1)}%` : '—'}
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-gray-300 text-xs">
                                {q.netMarginPct !== null ? `${q.netMarginPct.toFixed(1)}%` : '—'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Data Source Footer */}
              <div className="flex items-center justify-between px-2 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>Data: SEC EDGAR XBRL (10-Q/10-K filings) · Algorithm: OES v1</span>
                </div>
                {data.meta && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-600">
                    <Database className="w-3 h-3" />
                    <span>TTL: {Math.round((data.meta.ttlSeconds || 0) / 3600)}h</span>
                    <span>· {data.meta.source === 'cache' ? 'Served from DB' : 'Fresh fetch'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
