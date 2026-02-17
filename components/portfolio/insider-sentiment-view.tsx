"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Loader2, LineChart, TrendingUp, Info, X, Clock, Star, Sparkles } from 'lucide-react';
import { InsiderSentiment } from '@/components/sec/InsiderSentiment';
import { tickerDomains } from '@/lib/ticker-domains';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

// ── Company Icon — same pattern as SEC page ──────────────────────────
const CompanyIcon = ({ ticker, className = "h-10 w-10", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
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

// ── Search result type ───────────────────────────────────────────────
interface CompanySearchResult {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

// ── Popular tickers with names ───────────────────────────────────────
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

// ── Main Component ───────────────────────────────────────────────────
export function InsiderSentimentView() {
  const [ticker, setTicker] = useState('AAPL');
  const [companyName, setCompanyName] = useState('Apple Inc.');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recent tickers (persisted in localStorage)
  const [recentTickers, setRecentTickers] = useState<{ ticker: string; name: string }[]>([]);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Load recent tickers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('insider-sentiment-recent');
      if (stored) setRecentTickers(JSON.parse(stored));
    } catch {}
  }, []);

  // Save recent ticker
  const addRecentTicker = useCallback((t: string, name: string) => {
    setRecentTickers(prev => {
      const filtered = prev.filter(item => item.ticker !== t);
      const updated = [{ ticker: t, name }, ...filtered].slice(0, 8);
      try { localStorage.setItem('insider-sentiment-recent', JSON.stringify(updated)); } catch {}
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
        const response = await fetch(`/api/sec/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
          setShowDropdown(data.results?.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (error) {
        console.error('Search error:', error);
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
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          const r = searchResults[highlightedIndex];
          selectCompany(r.ticker, r.name);
        }
        break;
      case 'Escape':
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

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LineChart className="w-6 h-6 text-blue-400" />
            Insider Sentiment Analysis
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
            Analyze Monthly Share Purchase Ratio (MSPR) & Insider Confidence
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
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
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
                  <span>Analyzing</span>
                </>
              ) : (
                <span>Analyze</span>
              )}
            </button>
          </form>
        </div>

        {/* Autocomplete Dropdown with Company Logos */}
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

      {/* Popular Companies — Grid with Logos (same style as SEC page) */}
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
                <div className={cn(
                  "text-xs font-semibold truncate",
                  ticker === item.ticker ? 'text-blue-400' : 'text-white group-hover:text-white'
                )}>
                  {item.ticker}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{item.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Analyses with Logos */}
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

        {/* Company Header with Logo */}
        <div className="flex items-center gap-4 py-2 animate-in fade-in duration-500">
          <CompanyIcon ticker={ticker} className="h-14 w-14" />
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {ticker}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                NYSE / NASDAQ
              </span>
            </h3>
            <p className="text-sm text-gray-400">{companyName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-gray-600" />
              Insider Sentiment Report
            </p>
          </div>
        </div>

        <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-1 min-h-[400px]">
          {/* We pass the ticker to the child component which handles data fetching and display */}
          <InsiderSentiment ticker={ticker} />
        </div>
      </div>
    </div>
  );
}
