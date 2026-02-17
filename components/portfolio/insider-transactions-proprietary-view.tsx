"use client";

/**
 * OmniFolio Proprietary Insider Transactions View
 *
 * Per-company insider transaction lookup powered by SEC EDGAR Form 4 filings.
 * Same UX pattern as InsiderSentimentView and CompanyLookup — search bar with
 * autocomplete, popular tickers grid, recent lookups, company header + data.
 *
 * 100% proprietary — zero paid third-party APIs.
 * Copyright OmniFolio. All rights reserved.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Loader2,
  Users,
  TrendingUp,
  X,
  Clock,
  Sparkles,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  ExternalLink,
  DollarSign,
  Hash,
  Info,
  AlertCircle,
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
    "from-blue-500 to-blue-700",
    "from-purple-500 to-purple-700",
    "from-green-500 to-green-700",
    "from-orange-500 to-orange-700",
    "from-pink-500 to-pink-700",
    "from-cyan-500 to-cyan-700",
    "from-indigo-500 to-indigo-700",
    "from-teal-500 to-teal-700",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ── Company Icon — same pattern as other views ───────────────────────
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

interface InsiderTransaction {
  date: string;
  filingDate: string;
  owner: string;
  title: string;
  isOfficer: boolean;
  isDirector: boolean;
  transactionType: "Buy" | "Sell";
  transactionCode: string;
  transactionDescription: string;
  shares: number;
  price: number;
  value: number;
  sharesOwnedAfter: number;
  securityTitle: string;
  accessionNumber: string;
}

interface InsiderSummary {
  totalBuys: number;
  totalSells: number;
  buyValue: number;
  sellValue: number;
  netShares: number;
  netValue: number;
  transactionCount: number;
  uniqueInsiders: number;
}

interface InsiderDataResponse {
  company: {
    cik: string;
    ticker: string;
    name: string;
    exchange?: string;
  } | null;
  summary: InsiderSummary;
  transactions: InsiderTransaction[];
}

// ── Popular tickers ──────────────────────────────────────────────────
const defaultPopularTickers = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corp." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "TSLA", name: "Tesla Inc." },
  { ticker: "NVDA", name: "NVIDIA Corp." },
  { ticker: "META", name: "Meta Platforms Inc." },
  { ticker: "JPM", name: "JPMorgan Chase & Co." },
  { ticker: "NFLX", name: "Netflix Inc." },
  { ticker: "AMD", name: "Advanced Micro Devices" },
  { ticker: "CRM", name: "Salesforce Inc." },
  { ticker: "INTC", name: "Intel Corp." },
];

// ── Helpers ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatShares = (value: number) => {
  if (!value) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
};

// ── Main Component ───────────────────────────────────────────────────
export function InsiderTransactionsProprietaryView() {
  const [ticker, setTicker] = useState("AAPL");
  const [companyName, setCompanyName] = useState("Apple Inc.");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [data, setData] = useState<InsiderDataResponse | null>(null);

  // Filter & pagination
  const [filter, setFilter] = useState<"all" | "Buy" | "Sell">("all");
  const [daysFilter, setDaysFilter] = useState<number>(90);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recent tickers
  const [recentTickers, setRecentTickers] = useState<
    { ticker: string; name: string }[]
  >([]);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Load recent tickers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("insider-transactions-prop-recent");
      if (stored) setRecentTickers(JSON.parse(stored));
    } catch {}
  }, []);

  // Save recent ticker
  const addRecentTicker = useCallback((t: string, name: string) => {
    setRecentTickers((prev) => {
      const filtered = prev.filter((item) => item.ticker !== t);
      const updated = [{ ticker: t, name }, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(
          "insider-transactions-prop-recent",
          JSON.stringify(updated)
        );
      } catch {}
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
          const data = await response.json();
          setSearchResults(data.results || []);
          setShowDropdown(data.results?.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }
    searchCompanies();
  }, [debouncedSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch insider transactions from SEC EDGAR API
  const fetchInsiderData = useCallback(
    async (tickerToFetch: string, days: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sec/insider?ticker=${encodeURIComponent(tickerToFetch)}&days=${days}`
        );
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Failed to fetch data (${response.status})`
          );
        }
        const result: InsiderDataResponse = await response.json();
        setData(result);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        console.error("[InsiderTransactionsProprietary]", err);
        setError(message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch data on mount and when ticker/days change
  useEffect(() => {
    fetchInsiderData(ticker, daysFilter);
  }, [ticker, daysFilter, fetchInsiderData]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, daysFilter, ticker]);

  const selectCompany = (t: string, name: string) => {
    setSearchInput("");
    setShowDropdown(false);
    setSearchResults([]);
    addRecentTicker(t, name);
    setTicker(t.toUpperCase().trim());
    setCompanyName(name);
    setFilter("all");
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < searchResults.length
        ) {
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

  // Filtered & paginated transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (filter === "all") return data.transactions;
    return data.transactions.filter((t) => t.transactionType === filter);
  }, [data?.transactions, filter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const summary = data?.summary;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Insider Transactions
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
            SEC EDGAR Form 4 insider buying & selling activity
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Proprietary • SEC EDGAR
            </span>
          </div>
        </div>
      </div>

      {/* ── Search Bar with Autocomplete ──────────────────── */}
      <div ref={searchRef} className="relative z-50">
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
          <form
            onSubmit={handleSearch}
            className="flex gap-4 items-center"
          >
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
                onFocus={() =>
                  searchResults.length > 0 && setShowDropdown(true)
                }
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
                  : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
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
                    index === highlightedIndex
                      ? "bg-blue-500/20"
                      : "hover:bg-[#212121]"
                  )}
                >
                  <CompanyIcon
                    ticker={result.ticker}
                    className="h-8 w-8"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">
                      {result.ticker}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {result.name}
                    </div>
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
                  ? "bg-blue-500/10 border border-blue-500/30 ring-1 ring-blue-500/20"
                  : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A]"
              )}
            >
              <CompanyIcon
                ticker={item.ticker}
                className="h-7 w-7 flex-shrink-0"
              />
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-xs font-semibold truncate",
                    ticker === item.ticker
                      ? "text-blue-400"
                      : "text-white group-hover:text-white"
                  )}
                >
                  {item.ticker}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {item.name}
                </div>
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
            <span className="text-[10px] text-gray-600">
              {recentTickers.length} companies
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTickers.map((item, index) => (
              <button
                key={`${item.ticker}-${index}`}
                onClick={() => selectCompany(item.ticker, item.name)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group",
                  ticker === item.ticker
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                    : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A] text-gray-300 hover:text-white"
                )}
              >
                <CompanyIcon
                  ticker={item.ticker}
                  className="h-5 w-5"
                />
                <span className="text-xs font-medium">{item.ticker}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Area ─────────────────────────────────── */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">
        {/* Company Header with Logo */}
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
              <FileText className="w-3 h-3 text-gray-600" />
              Form 4 Insider Transactions
            </p>
          </div>
          <button
            onClick={() => fetchInsiderData(ticker, daysFilter)}
            disabled={isLoading}
            className="p-2.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 border border-gray-800 hover:border-gray-700"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Days filter + Type filter bar */}
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Type filters */}
            <div className="flex gap-2">
              {(["all", "Buy", "Sell"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize flex items-center gap-1.5",
                    filter === type
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-[#1A1A1A] text-gray-500 hover:text-gray-300 border border-transparent hover:bg-[#222]"
                  )}
                >
                  {filter === type &&
                    (type === "Buy" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : type === "Sell" ? (
                      <ArrowDownRight className="w-3 h-3" />
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-current" />
                    ))}
                  {type === "all" ? "All" : type}
                </button>
              ))}
            </div>

            {/* Days filter */}
            <div className="flex gap-1 bg-[#1A1A1A] rounded-lg p-0.5 border border-gray-800">
              {[30, 90, 180, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysFilter(days)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    daysFilter === days
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-20">
            <CompanyIcon ticker={ticker} className="h-12 w-12 mb-4" />
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">
              Loading insider transactions for {ticker}...
            </p>
            <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Sourcing from SEC EDGAR Form 4
              filings
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <CompanyIcon
              ticker={ticker}
              className="h-10 w-10 mx-auto mb-3 opacity-50"
            />
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">
              Failed to Load Data
            </h3>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchInsiderData(ticker, daysFilter)}
              className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        {data && summary && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                Total Buys
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {formatShares(summary.totalBuys)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {formatCurrency(summary.buyValue)}
              </div>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                Total Sells
              </div>
              <div className="text-lg font-bold text-red-400 font-mono">
                {formatShares(summary.totalSells)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {formatCurrency(summary.sellValue)}
              </div>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                Net Shares
              </div>
              <div
                className={cn(
                  "text-lg font-bold font-mono",
                  summary.netShares >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {summary.netShares > 0 ? "+" : ""}
                {formatShares(summary.netShares)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {formatCurrency(summary.netValue)}
              </div>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                Unique Insiders
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {summary.uniqueInsiders}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {summary.transactionCount} transactions
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {data && !error && (
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="border-b border-gray-800">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Insider</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2 text-right">Shares</div>
                <div className="col-span-1 text-right">Value</div>
                <div className="col-span-2 text-right">Date</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[600px]">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p>No transactions found</p>
                  <p className="text-xs mt-1 text-gray-600">
                    Try a different time range or filter
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  <AnimatePresence mode="popLayout">
                    {paginatedTransactions.map((tx, idx) => {
                      const isBuy = tx.transactionType === "Buy";
                      return (
                        <motion.div
                          key={`${tx.accessionNumber}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.01 }}
                          className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-[#222] transition-colors text-sm border-l-2 border-l-transparent hover:border-l-blue-500"
                        >
                          {/* Insider Name */}
                          <div className="col-span-3">
                            <div
                              className="font-medium text-white text-xs truncate"
                              title={tx.owner}
                            >
                              {tx.owner}
                            </div>
                            <div className="text-[10px] text-gray-600 truncate mt-0.5">
                              {tx.securityTitle}
                            </div>
                          </div>

                          {/* Role */}
                          <div className="col-span-2 text-xs">
                            {tx.title === "Director" ? (
                              <span className="text-purple-400">
                                Director
                              </span>
                            ) : tx.isOfficer ? (
                              <span className="text-blue-400">
                                {tx.title}
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                {tx.title}
                              </span>
                            )}
                          </div>

                          {/* Transaction Type */}
                          <div className="col-span-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                                isBuy
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              )}
                            >
                              {isBuy ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {tx.transactionDescription}
                            </span>
                          </div>

                          {/* Shares */}
                          <div className="col-span-2 text-right">
                            <div
                              className={cn(
                                "font-mono text-xs",
                                isBuy
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              )}
                            >
                              {isBuy ? "+" : "-"}
                              {formatShares(tx.shares)}
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                              @{tx.price ? `$${tx.price.toFixed(2)}` : "—"}
                            </div>
                          </div>

                          {/* Value */}
                          <div className="col-span-1 text-right">
                            <div className="text-white font-medium text-xs">
                              {tx.value > 0
                                ? formatCurrency(tx.value)
                                : "—"}
                            </div>
                          </div>

                          {/* Date */}
                          <div className="col-span-2 text-right">
                            <div className="text-gray-400 text-xs">
                              {tx.date
                                ? new Date(tx.date).toLocaleDateString()
                                : "—"}
                            </div>
                            <div className="text-[10px] text-gray-600 mt-0.5">
                              Filed{" "}
                              {tx.filingDate
                                ? new Date(
                                    tx.filingDate
                                  ).toLocaleDateString()
                                : "—"}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {filteredTransactions.length > 0 && (
              <div className="border-t border-gray-800 bg-[#1A1A1A] p-2 flex justify-between items-center">
                <div className="text-xs text-gray-500 pl-4">
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredTransactions.length
                  )}
                  –
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredTransactions.length
                  )}{" "}
                  of {filteredTransactions.length}
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
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
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

        {/* Source attribution */}
        {data && !error && (
          <div className="flex items-center justify-between text-[10px] text-gray-600 px-1">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span>
                OmniFolio Proprietary • Data: SEC EDGAR Form 4 (Public)
              </span>
            </div>
            <span>
              Last {daysFilter} days •{" "}
              {data.summary.transactionCount} transactions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InsiderTransactionsProprietaryView;
