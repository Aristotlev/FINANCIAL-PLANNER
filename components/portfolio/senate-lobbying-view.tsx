"use client";

/**
 * OmniFolio Proprietary Senate Lobbying View
 *
 * Per-company lobbying disclosure lookup powered by the US Senate LDA database.
 * Same UX pattern as InsiderSentimentView and InsiderTransactionsProprietaryView.
 *
 * Features:
 *   - Search bar with autocomplete (SEC EDGAR company search)
 *   - Popular tickers grid + recent lookups
 *   - OLI (OmniFolio Lobbying Influence) scoring
 *   - Quarterly spend chart
 *   - Issue area breakdown
 *   - Lobbyist detail table
 *   - Government entity reach
 *   - Filing-level detail with document links
 *
 * 100% proprietary — zero paid third-party APIs.
 * Data Source: US Senate LDA Database (public, free, no API key)
 * Copyright OmniFolio. All rights reserved.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Loader2,
  Landmark,
  TrendingUp,
  TrendingDown,
  X,
  Clock,
  Sparkles,
  Shield,
  Minus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  ExternalLink,
  DollarSign,
  Users,
  Globe,
  BarChart3,
  AlertCircle,
  Tag,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tickerDomains } from "@/lib/ticker-domains";
import { motion, AnimatePresence } from "framer-motion";

// ── Debounce hook ────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Color helper ─────────────────────────────────────────────────────
const getTickerColor = (ticker: string): string => {
  const colors = [
    "from-amber-500 to-amber-700",
    "from-orange-500 to-orange-700",
    "from-yellow-500 to-yellow-700",
    "from-red-500 to-red-700",
    "from-pink-500 to-pink-700",
    "from-purple-500 to-purple-700",
    "from-blue-500 to-blue-700",
    "from-cyan-500 to-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ── Company Icon ─────────────────────────────────────────────────────
const CompanyIcon = ({
  ticker,
  className = "h-10 w-10",
  showPlaceholder = true,
}: {
  ticker: string;
  className?: string;
  showPlaceholder?: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();

  const imageSources = useMemo(() => {
    const sources: string[] = [];
    if (tickerDomains[upperTicker]) {
      sources.push(
        `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`
      );
    }
    sources.push(
      `https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`
    );
    sources.push(
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`
    );
    return sources;
  }, [upperTicker, ticker]);

  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [ticker]);

  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex((prev) => prev + 1);
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
    <div
      className={cn(
        className,
        `rounded-xl bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`
      )}
    >
      {ticker.slice(0, 2)}
    </div>
  );
};

// ── Types ────────────────────────────────────────────────────────────

interface CompanySearchResult {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

interface LobbyingQuarter {
  symbol: string;
  year: number;
  quarter: string;
  oliScore: number;
  influenceLabel: string;
  totalSpend: number;
  filingCount: number;
  uniqueLobbyists: number;
  uniqueIssues: number;
  uniqueGovEntities: number;
  topIssues: { code: string; name: string; count: number }[];
  topRegistrants: { name: string; amount: number }[];
  latestFilingDate: string | null;
}

interface LobbyingActivityItem {
  symbol: string;
  filingUuid: string;
  filingDate: string;
  filingYear: number;
  filingPeriod: string;
  filingType: string;
  clientName: string;
  clientDescription: string | null;
  registrantName: string;
  amount: number | null;
  expenses: number | null;
  income: number | null;
  lobbyistNames: string[];
  issueAreas: string[];
  issueDescriptions: string[];
  governmentEntities: string[];
  specificIssues: string[];
  documentUrl: string | null;
  country: string;
}

interface LobbyingSummary {
  totalSpend: number;
  totalFilings: number;
  totalQuarters: number;
  averagePerQuarter: number;
  uniqueLobbyists: number;
  uniqueIssueAreas: number;
  uniqueGovEntities: number;
  uniqueRegistrants: number;
  topIssueAreas: { code: string; name: string; count: number; totalSpend: number }[];
  topRegistrants: { name: string; filingCount: number; totalSpend: number }[];
  topLobbyists: { name: string; coveredPosition: string | null; filingCount: number }[];
  spendByYear: { year: number; spend: number; filingCount: number }[];
}

interface LobbyingDataResponse {
  success: boolean;
  symbol: string;
  companyName: string | null;
  currentScore: number;
  currentLabel: string;
  trend: string;
  quarters: LobbyingQuarter[];
  activities: LobbyingActivityItem[];
  summary: LobbyingSummary;
  meta: {
    source: string;
    cachedAt: string | null;
    expiresAt: string | null;
    ttlSeconds: number;
    algorithm: string;
    dataSource: string;
  };
}

// ── Popular tickers (lobbying-heavy companies) ───────────────────────
const defaultPopularTickers = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corp." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "META", name: "Meta Platforms Inc." },
  { ticker: "LMT", name: "Lockheed Martin Corp." },
  { ticker: "BA", name: "Boeing Company" },
  { ticker: "PFE", name: "Pfizer Inc." },
  { ticker: "JPM", name: "JPMorgan Chase & Co." },
  { ticker: "XOM", name: "Exxon Mobil Corp." },
  { ticker: "RTX", name: "RTX Corporation" },
  { ticker: "CVX", name: "Chevron Corporation" },
];

// ── Helpers ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-amber-400";
  if (score >= 20) return "text-blue-400";
  return "text-gray-400";
};

const getTrendIcon = (trend: string) => {
  if (trend === "increasing") return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === "decreasing") return <TrendingDown className="w-3.5 h-3.5 text-green-400" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
};

// ── OLI Score Gauge ──────────────────────────────────────────────────
const OLIScoreGauge = ({ score, label }: { score: number; label: string }) => {
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-gray-800"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={getScoreColor(score)}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-lg font-bold font-mono", getScoreColor(score))}>
          {score.toFixed(0)}
        </span>
        <span className="text-[8px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
};

// ── Spend Bar Chart ──────────────────────────────────────────────────
const SpendBarChart = ({ quarters }: { quarters: LobbyingQuarter[] }) => {
  const activeQuarters = quarters
    .filter(q => q.filingCount > 0)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter.localeCompare(b.quarter);
    })
    .slice(-12);

  if (activeQuarters.length === 0) return null;

  const maxSpend = Math.max(...activeQuarters.map(q => q.totalSpend), 1);

  return (
    <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
      <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
        Quarterly Spend
      </h4>
      <div className="flex items-end gap-1 h-24">
        {activeQuarters.map((q) => {
          const height = Math.max(4, (q.totalSpend / maxSpend) * 100);
          return (
            <div
              key={`${q.year}-${q.quarter}`}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-amber-600/60 to-amber-400/80 transition-all duration-300 hover:from-amber-500/70 hover:to-amber-300/90 min-w-[8px]"
                style={{ height: `${height}%` }}
              />
              <span className="text-[8px] text-gray-600 truncate w-full text-center">
                {q.quarter}
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-[10px] z-10 whitespace-nowrap shadow-xl">
                <div className="font-medium text-white">{q.quarter} {q.year}</div>
                <div className="text-amber-400">{formatCurrency(q.totalSpend)}</div>
                <div className="text-gray-500">{q.filingCount} filings</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-gray-600">
          {activeQuarters[0]?.year}
        </span>
        <span className="text-[8px] text-gray-600">
          {activeQuarters[activeQuarters.length - 1]?.year}
        </span>
      </div>
    </div>
  );
};

// ── Client-side cache ────────────────────────────────────────────────
// Stores lobbying results in localStorage so switching tabs, re-mounting,
// or re-selecting the same ticker is INSTANT (0 API calls).
// TTL: 20 minutes.  Force refresh bypasses this.
const CLIENT_CACHE_KEY = "omnifolio_lobbying_client_cache";
const CLIENT_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min

interface ClientCacheEntry {
  data: LobbyingDataResponse;
  storedAt: number;
}

function getClientCache(ticker: string, years: number): LobbyingDataResponse | null {
  try {
    const raw = sessionStorage.getItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`);
    if (!raw) return null;
    const entry: ClientCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.storedAt > CLIENT_CACHE_TTL_MS) {
      sessionStorage.removeItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setClientCache(ticker: string, years: number, data: LobbyingDataResponse): void {
  try {
    const entry: ClientCacheEntry = { data, storedAt: Date.now() };
    sessionStorage.setItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`, JSON.stringify(entry));
  } catch { /* sessionStorage full or unavailable — ignore */ }
}

// ── Skeleton Loader ──────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 animate-pulse">
    <div className="h-2.5 bg-gray-800 rounded w-20 mb-3" />
    <div className="h-5 bg-gray-800 rounded w-24 mb-1" />
    <div className="h-2 bg-gray-800/50 rounded w-16" />
  </div>
);

const SkeletonGauge = () => (
  <div className="md:col-span-1 bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 flex flex-col items-center justify-center animate-pulse">
    <div className="h-2.5 bg-gray-800 rounded w-14 mb-3" />
    <div className="w-24 h-24 rounded-full border-4 border-gray-800" />
    <div className="h-2 bg-gray-800/50 rounded w-16 mt-3" />
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <SkeletonGauge />
      <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
    <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 animate-pulse">
      <div className="h-2.5 bg-gray-800 rounded w-28 mb-3" />
      <div className="flex items-end gap-1 h-24">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 bg-gray-800 rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────
export function SenateLobbyingView() {
  const [ticker, setTicker] = useState("LMT");
  const [companyName, setCompanyName] = useState("Lockheed Martin Corp.");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [data, setData] = useState<LobbyingDataResponse | null>(null);

  // Filters & pagination
  const [yearsFilter, setYearsFilter] = useState<number>(3);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recent tickers
  const [recentTickers, setRecentTickers] = useState<{ ticker: string; name: string }[]>([]);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Load recent tickers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("senate-lobbying-prop-recent");
      if (stored) setRecentTickers(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save recent ticker
  const addRecentTicker = useCallback((t: string, name: string) => {
    setRecentTickers((prev) => {
      const filtered = prev.filter((item) => item.ticker !== t);
      const updated = [{ ticker: t, name }, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("senate-lobbying-prop-recent", JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // Search companies when input changes
  useEffect(() => {
    async function searchCompanies() {
      if (!debouncedSearch || debouncedSearch.length < 1) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/sec/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`
        );
        if (response.ok) {
          const result = await response.json();
          setSearchResults(result.results || []);
          setShowDropdown(result.results?.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error("Search error:", err);
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch lobbying data with client-side cache
  const fetchLobbyingData = useCallback(
    async (tickerToFetch: string, years: number, forceRefresh = false) => {
      // ── 1. Check client-side cache first (instant, 0 API calls) ──
      if (!forceRefresh) {
        const cached = getClientCache(tickerToFetch.toUpperCase(), years);
        if (cached) {
          console.log(`[SenateLobbyingView] ⚡ Client cache hit for ${tickerToFetch}`);
          setData(cached);
          if (cached.companyName) setCompanyName(cached.companyName);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          symbol: tickerToFetch,
          years: String(years),
        });
        if (forceRefresh) params.set("refresh", "true");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000); // 55s for first-ever lookups (Senate API can be slow)

        const response = await fetch(`/api/lobbying?${params}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch data (${response.status})`);
        }
        const result: LobbyingDataResponse = await response.json();
        setData(result);
        if (result.companyName) {
          setCompanyName(result.companyName);
        }
        // ── Store in client cache ──
        setClientCache(tickerToFetch.toUpperCase(), years, result);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("The Senate LDA database is slow to respond. This is common for first-time lookups — please try again in a moment.");
        } else {
          const message = err instanceof Error ? err.message : "An error occurred";
          console.error("[SenateLobbyingView]", err);
          setError(message);
        }
        // Don't clear existing data on error — keep showing stale results
        setData((prev) => prev ?? null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch on mount and when ticker/years change
  useEffect(() => {
    fetchLobbyingData(ticker, yearsFilter);
  }, [ticker, yearsFilter, fetchLobbyingData]);

  // Reset page when ticker changes
  useEffect(() => {
    setCurrentPage(1);
  }, [ticker]);

  const selectCompany = (t: string, name: string) => {
    setSearchInput("");
    setShowDropdown(false);
    setSearchResults([]);
    addRecentTicker(t, name);
    setTicker(t.toUpperCase().trim());
    setCompanyName(name);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          const r = searchResults[highlightedIndex];
          selectCompany(r.ticker, r.name);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      selectCompany(searchInput.trim(), searchInput.toUpperCase().trim());
    }
  };

  // Pagination for activities
  const paginatedActivities = useMemo(() => {
    if (!data?.activities) return [];
    return data.activities.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [data?.activities, currentPage]);

  const totalPages = Math.ceil((data?.activities?.length || 0) / itemsPerPage);

  const summary = data?.summary;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-500" />
            Senate Lobbying
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
            Congressional lobbying disclosure data &amp; influence scoring
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Proprietary &bull; US Senate LDA
            </span>
          </div>
        </div>
      </div>

      {/* ── Search Bar with Autocomplete ──────────────────── */}
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
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
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
                  : "bg-amber-600/10 text-amber-400 border border-amber-600/20 hover:bg-amber-600/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading</span>
                </>
              ) : (
                <span>Lookup</span>
              )}
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
                    index === highlightedIndex ? "bg-amber-500/20" : "hover:bg-[#212121]"
                  )}
                >
                  <CompanyIcon ticker={result.ticker} className="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">{result.ticker}</div>
                    <div className="text-xs text-gray-400 truncate">{result.name}</div>
                  </div>
                  {result.exchange && (
                    <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-gray-800 rounded">
                      {result.exchange}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Popular Companies Grid ────────────────────────── */}
      <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Top Lobbying Companies
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
                  ? "bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-500/20"
                  : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A]"
              )}
            >
              <CompanyIcon ticker={item.ticker} className="h-7 w-7 flex-shrink-0" />
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-xs font-semibold truncate",
                    ticker === item.ticker ? "text-amber-400" : "text-white group-hover:text-white"
                  )}
                >
                  {item.ticker}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{item.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Lookups ────────────────────────────────── */}
      {recentTickers.length > 0 && (
        <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              Recent Lookups
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
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A] text-gray-300 hover:text-white"
                )}
              >
                <CompanyIcon ticker={item.ticker} className="h-5 w-5" />
                <span className="text-xs font-medium">{item.ticker}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Area ─────────────────────────────────── */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">
        {/* Company Header */}
        <div className="flex items-center gap-4 py-2 animate-in fade-in duration-500">
          <CompanyIcon ticker={ticker} className="h-14 w-14" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {ticker}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-800/50">
                US Senate LDA
              </span>
            </h3>
            <p className="text-sm text-gray-400">{companyName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Landmark className="w-3 h-3 text-gray-600" />
              Congressional Lobbying Disclosures
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Years filter */}
            <div className="flex gap-1 bg-[#1A1A1A] rounded-lg p-0.5 border border-gray-800">
              {[1, 2, 3, 5].map((y) => (
                <button
                  key={y}
                  onClick={() => setYearsFilter(y)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    yearsFilter === y ? "bg-amber-600/15 text-amber-400" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {y}y
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchLobbyingData(ticker, yearsFilter, true)}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 border border-gray-800 hover:border-gray-700"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Loading state — skeleton instead of spinner */}
        {isLoading && !data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-400/80">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>
                Fetching lobbying disclosures from the US Senate LDA database...
                First lookups may take up to 30 seconds while data is cached.
              </span>
            </div>
            <LoadingSkeleton />
          </div>
        )}

        {/* Subtle refresh indicator when we have data but are refreshing */}
        {isLoading && data && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[11px] text-amber-400/70">
            <Loader2 className="w-3 h-3 animate-spin" />
            Refreshing from US Senate LDA Database...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Data</h3>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchLobbyingData(ticker, yearsFilter, true)}
              className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        {data && !error && (
          <>
            {/* OLI Score + Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* OLI Score Card */}
              <div className="md:col-span-1 bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">OLI Score</div>
                <OLIScoreGauge score={data.currentScore} label={data.currentLabel} />
                <div className="flex items-center gap-1.5 mt-2">
                  {getTrendIcon(data.trend)}
                  <span className="text-[10px] text-gray-500 capitalize">{data.trend}</span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Total Spend
                  </div>
                  <div className="text-lg font-bold text-amber-400 font-mono">
                    {formatCurrency(summary?.totalSpend || 0)}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {formatCurrency(summary?.averagePerQuarter || 0)}/quarter
                  </div>
                </div>

                <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Total Filings
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {summary?.totalFilings || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {summary?.totalQuarters || 0} active quarters
                  </div>
                </div>

                <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Lobbyists
                  </div>
                  <div className="text-lg font-bold text-blue-400 font-mono">
                    {summary?.uniqueLobbyists || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {summary?.uniqueRegistrants || 0} lobbying firms
                  </div>
                </div>

                <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Gov Reach
                  </div>
                  <div className="text-lg font-bold text-purple-400 font-mono">
                    {summary?.uniqueGovEntities || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {summary?.uniqueIssueAreas || 0} issue areas
                  </div>
                </div>
              </div>
            </div>

            {/* Quarterly Spend Chart */}
            {data.quarters && data.quarters.length > 0 && (
              <SpendBarChart quarters={data.quarters} />
            )}

            {/* Year-by-Year Spend */}
            {summary && summary.spendByYear.length > 0 && (
              <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                <h4 className="text-xs font-medium text-gray-400 mb-3">Annual Spending</h4>
                <div className="space-y-2">
                  {summary.spendByYear.map((yearData) => {
                    const maxYearSpend = Math.max(...summary.spendByYear.map(y => y.spend), 1);
                    const pct = (yearData.spend / maxYearSpend) * 100;
                    return (
                      <div key={yearData.year} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400 w-10">{yearData.year}</span>
                        <div className="flex-1 bg-gray-800/50 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-amber-400 w-20 text-right">
                          {formatCurrency(yearData.spend)}
                        </span>
                        <span className="text-[10px] text-gray-600 w-16 text-right">
                          {yearData.filingCount} filings
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Issue Areas */}
            {summary && summary.topIssueAreas.length > 0 && (
              <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Top Issue Areas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.topIssueAreas.slice(0, 8).map((issue) => (
                    <div
                      key={issue.code}
                      className="flex items-center gap-3 px-3 py-2 bg-[#141414] rounded-lg border border-gray-800/50"
                    >
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {issue.code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{issue.name}</div>
                        <div className="text-[10px] text-gray-600">
                          {issue.count} filings &bull; {formatCurrency(issue.totalSpend)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Lobbying Firms */}
            {summary && summary.topRegistrants.length > 0 && (
              <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  Lobbying Firms
                </h4>
                <div className="space-y-2">
                  {summary.topRegistrants.slice(0, 8).map((reg, idx) => (
                    <div
                      key={reg.name}
                      className="flex items-center gap-3 px-3 py-2 bg-[#141414] rounded-lg border border-gray-800/50"
                    >
                      <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{reg.name}</div>
                        <div className="text-[10px] text-gray-600">{reg.filingCount} filings</div>
                      </div>
                      <div className="text-xs font-mono text-amber-400">
                        {formatCurrency(reg.totalSpend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Lobbyists */}
            {summary && summary.topLobbyists.length > 0 && (
              <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
                <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-green-400" />
                  Active Lobbyists
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.topLobbyists.slice(0, 10).map((lobbyist) => (
                    <div
                      key={lobbyist.name}
                      className="flex items-center gap-3 px-3 py-2 bg-[#141414] rounded-lg border border-gray-800/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Users className="w-3 h-3 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{lobbyist.name}</div>
                        {lobbyist.coveredPosition && (
                          <div className="text-[10px] text-gray-600 truncate">
                            {lobbyist.coveredPosition}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {lobbyist.filingCount} filings
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filing Detail Table */}
            {data.activities && data.activities.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
                {/* Table Header */}
                <div className="border-b border-gray-800 px-4 py-2 flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Filing Details ({data.activities.length})
                  </h4>
                </div>
                <div className="border-b border-gray-800">
                  <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="col-span-2">Registrant</div>
                    <div className="col-span-3">Description / Issues</div>
                    <div className="col-span-2">Lobbyists</div>
                    <div className="col-span-1 text-center">Period</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2 text-right">Gov Entities</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                  <div className="divide-y divide-gray-800/50">
                    <AnimatePresence mode="popLayout">
                      {paginatedActivities.map((activity, idx) => (
                        <motion.div
                          key={`${activity.filingUuid}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.01 }}
                          className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-[#222] transition-colors text-sm border-l-2 border-l-transparent hover:border-l-amber-500"
                        >
                          {/* Registrant */}
                          <div className="col-span-2">
                            <div className="font-medium text-white text-xs truncate" title={activity.registrantName}>
                              {activity.registrantName}
                            </div>
                            <div className="text-[10px] text-gray-600 truncate mt-0.5">
                              {activity.clientName}
                            </div>
                          </div>

                          {/* Description / Issues */}
                          <div className="col-span-3">
                            {activity.specificIssues.length > 0 ? (
                              <div className="text-xs text-gray-400 line-clamp-2" title={activity.specificIssues.join('; ')}>
                                {activity.specificIssues[0]}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {activity.issueDescriptions.slice(0, 3).map((desc, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                    {desc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Lobbyists */}
                          <div className="col-span-2">
                            <div className="text-xs text-gray-400">
                              {activity.lobbyistNames.length > 0 ? (
                                <div className="truncate" title={activity.lobbyistNames.join(', ')}>
                                  {activity.lobbyistNames.slice(0, 2).join(', ')}
                                  {activity.lobbyistNames.length > 2 && (
                                    <span className="text-gray-600"> +{activity.lobbyistNames.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-600">&mdash;</span>
                              )}
                            </div>
                          </div>

                          {/* Period */}
                          <div className="col-span-1 text-center">
                            <div className="inline-flex flex-col items-center text-[10px] font-mono bg-[#111] px-2 py-1 rounded border border-gray-800/50">
                              <span className="text-gray-300">{activity.filingPeriod}</span>
                              <span className="text-gray-500">{activity.filingYear}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="col-span-2 text-right">
                            {activity.amount ? (
                              <div className="text-amber-400 font-mono font-medium text-xs">
                                {formatCurrency(activity.amount)}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">&mdash;</span>
                            )}
                            {activity.documentUrl && (
                              <a
                                href={activity.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-amber-400 transition-colors mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Filing
                              </a>
                            )}
                          </div>

                          {/* Government Entities */}
                          <div className="col-span-2 text-right">
                            <div className="text-xs text-gray-400">
                              {activity.governmentEntities.length > 0 ? (
                                <div className="truncate" title={activity.governmentEntities.join(', ')}>
                                  {activity.governmentEntities.slice(0, 2).join(', ')}
                                  {activity.governmentEntities.length > 2 && (
                                    <span className="text-gray-600"> +{activity.governmentEntities.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-600">&mdash;</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Pagination Footer */}
                {data.activities.length > 0 && (
                  <div className="border-t border-gray-800 bg-[#1A1A1A] p-2 flex justify-between items-center">
                    <div className="text-xs text-gray-500 pl-4">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.activities.length)}&ndash;
                      {Math.min(currentPage * itemsPerPage, data.activities.length)} of {data.activities.length}
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
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
                )}
              </div>
            )}

            {/* No data state */}
            {data.activities.length === 0 && data.summary.totalFilings === 0 && (
              <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-12 text-center">
                <Landmark className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Lobbying Data Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  No lobbying disclosure filings were found for {ticker} in the US Senate LDA database
                  for the selected time period. Try a different company or expand the time range.
                </p>
              </div>
            )}

            {/* Source attribution */}
            <div className="flex items-center justify-between text-[10px] text-gray-600 px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>
                  OmniFolio Proprietary &bull; OLI Algorithm v1 &bull; Data: US Senate LDA Database (Public)
                </span>
              </div>
              <div className="flex items-center gap-3">
                {data.meta?.cachedAt && (
                  <span>Updated: {new Date(data.meta.cachedAt).toLocaleString()}</span>
                )}
                <span>{data.meta?.source === 'cache' ? 'Cached' : 'Fresh'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SenateLobbyingView;