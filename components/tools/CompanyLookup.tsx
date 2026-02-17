'use client';

/**
 * OmniFolio Proprietary Company Lookup
 *
 * 100% proprietary — zero paid third-party APIs.
 * Data sourced from SEC EDGAR (public), Yahoo Finance (public), Google Favicon (public).
 *
 * Copyright OmniFolio. All rights reserved.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { tickerDomains } from '@/lib/ticker-domains';
import {
  Search,
  Loader2,
  AlertCircle,
  Building2,
  Globe,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Shield,
  ExternalLink,
  MapPin,
  Hash,
  Landmark,
  Briefcase,
  Users,
  X,
  Sparkles,
} from 'lucide-react';
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
  const safeTicker = ticker || '';
  const upperTicker = safeTicker.toUpperCase();

  const imageSources = useMemo(() => {
    const sources: string[] = [];
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${safeTicker.toLowerCase()}.com&size=128`);
    return sources;
  }, [upperTicker, safeTicker]);

  useEffect(() => { setImageError(false); setFallbackIndex(0); }, [safeTicker]);

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
        alt={`${safeTicker} logo`}
        className={cn(className, "rounded-xl object-contain bg-white p-1")}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={cn(className, `rounded-xl bg-gradient-to-br ${getTickerColor(safeTicker)} flex items-center justify-center font-bold text-white shadow-lg`)}>
      {safeTicker.slice(0, 2)}
    </div>
  );
};

// ── Types ────────────────────────────────────────────────────────────

interface CompanyProfile {
  symbol: string;
  companyName: string;
  cik: string;
  sic: string;
  sicDescription: string;
  ein: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  addresses: {
    business: { street1: string; street2?: string; city: string; state: string; zip: string; country?: string };
    mailing: { street1: string; street2?: string; city: string; state: string; zip: string; country?: string };
  };
  phone: string;
  website: string;
  exchange: string;
  exchangeFullName: string;
  category: string;
  logoUrl: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  currency: string;
  isActivelyTrading: boolean;
  recentFilings: Array<{
    form: string;
    filingDate: string;
    accessionNumber: string;
    primaryDocument: string;
    primaryDocumentUrl: string;
    description: string;
  }>;
  financials: Array<{
    periodEndDate: string;
    fiscalYear: string;
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    operatingCashFlow: number | null;
    earningsPerShareBasic: number | null;
    earningsPerShareDiluted: number | null;
  }>;
  source: string;
  lastUpdated: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  cik: string;
  exchange: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toLocaleString()}`;
}

function formatEPS(value: number | null | undefined): string {
  if (value == null) return '—';
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getFormBadgeColor(form: string): string {
  if (form === '10-K') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (form === '10-Q') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (form === '8-K') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (form === '4') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (form.startsWith('13F')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (form.includes('DEF') || form.includes('14A')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (form.startsWith('S-')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

function detectSearchType(query: string): 'symbol' | 'search' {
  const trimmed = query.trim().toUpperCase();
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(trimmed)) return 'symbol';
  return 'search';
}

// Popular companies for quick lookup
const POPULAR_COMPANIES = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
];

// ── Component ────────────────────────────────────────────────────────

export function CompanyLookup() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<CompanyProfile[]>([]);
  const [detectedType, setDetectedType] = useState<'symbol' | 'search'>('search');
  const [showAllFilings, setShowAllFilings] = useState(false);
  const [activeFinancialTab, setActiveFinancialTab] = useState<'income' | 'balance' | 'cash'>('income');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<SearchResult[]>([]);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('omni-company-lookup-recent');
      if (saved) {
        const parsed = JSON.parse(saved) as CompanyProfile[];
        // Filter out corrupted entries with missing critical data
        const valid = parsed.filter(p => p.symbol?.trim() && p.companyName?.trim());
        setRecentSearches(valid.slice(0, 5));
        // Clean up localStorage if we filtered anything out
        if (valid.length !== parsed.length) {
          localStorage.setItem('omni-company-lookup-recent', JSON.stringify(valid.slice(0, 5)));
        }
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  useEffect(() => {
    if (searchQuery?.trim()) {
      setDetectedType(detectSearchType(searchQuery));
    }
  }, [searchQuery]);

  // Autocomplete search when input changes
  useEffect(() => {
    async function searchCompanies() {
      if (!debouncedSearch || debouncedSearch.length < 1) {
        setAutocompleteResults([]);
        setShowDropdown(false);
        return;
      }
      setIsAutoSearching(true);
      try {
        const response = await fetch(`/api/sec/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`);
        if (response.ok) {
          const data = await response.json();
          setAutocompleteResults(data.results || []);
          setShowDropdown((data.results?.length || 0) > 0);
          setHighlightedIndex(-1);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      } finally {
        setIsAutoSearching(false);
      }
    }
    searchCompanies();
  }, [debouncedSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToRecent = useCallback((newProfile: CompanyProfile) => {
    // Don't save profiles with missing critical data
    if (!newProfile.symbol?.trim() || !newProfile.companyName?.trim()) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.symbol !== newProfile.symbol);
      const updated = [newProfile, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('omni-company-lookup-recent', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Fetch company profile — fully proprietary
  const fetchProfile = useCallback(async (query: string, forceType?: 'symbol' | 'search') => {
    if (!query?.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setShowAllFilings(false);

    const type = forceType || detectSearchType(query);

    try {
      // Symbol direct lookup
      if (type === 'symbol') {
        const params = new URLSearchParams({ symbol: query.trim().toUpperCase() });
        const response = await fetch(`/api/company-lookup?${params.toString()}`);
        const data = await response.json();

        if (response.ok && data.data) {
          setProfile(data.data);
          setSearchResults([]);
          saveToRecent(data.data);
          setIsLoading(false);
          return;
        }

        // Fallback to name search
        console.log('Symbol lookup failed, trying name search...');
      }

      // Name search
      const searchParams = new URLSearchParams({ search: query.trim() });
      const searchResponse = await fetch(`/api/company-lookup?${searchParams.toString()}`);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Failed to fetch company data');
      }

      if (searchData.type === 'search' && searchData.data?.length > 0) {
        // Check for exact ticker match
        const exactMatch = searchData.data.find(
          (r: SearchResult) => r.symbol.toUpperCase() === query.trim().toUpperCase()
        );

        if (exactMatch) {
          // Auto-select exact match
          const profileParams = new URLSearchParams({ symbol: exactMatch.symbol });
          const profileResponse = await fetch(`/api/company-lookup?${profileParams.toString()}`);
          const profileData = await profileResponse.json();

          if (profileResponse.ok && profileData.data) {
            setProfile(profileData.data);
            setSearchResults([]);
            saveToRecent(profileData.data);
            setIsLoading(false);
            return;
          }
        }

        setSearchResults(searchData.data);
        setProfile(null);
      } else if (searchData.data) {
        setProfile(searchData.data);
        setSearchResults([]);
        saveToRecent(searchData.data);
      } else {
        setError('No companies found. Try a different search term.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setProfile(null);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [saveToRecent]);

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    fetchProfile(searchQuery);
  }, [searchQuery, fetchProfile]);

  const handleQuickLookup = useCallback((symbol: string) => {
    setSearchQuery(symbol || '');
    fetchProfile(symbol, 'symbol');
  }, [fetchProfile]);

  const handleSelectSearchResult = useCallback((result: SearchResult) => {
    setSearchQuery(result.symbol || '');
    fetchProfile(result.symbol, 'symbol');
  }, [fetchProfile]);

  const clearSearch = () => {
    setSearchQuery('');
    setProfile(null);
    setSearchResults([]);
    setAutocompleteResults([]);
    setShowDropdown(false);
    setError(null);
  };

  const handleAutocompleteKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || autocompleteResults.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < autocompleteResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : autocompleteResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < autocompleteResults.length) {
          const r = autocompleteResults[highlightedIndex];
          setShowDropdown(false);
          setAutocompleteResults([]);
          const sym = r.symbol || (r as any).ticker || '';
          setSearchQuery(sym);
          fetchProfile(sym, 'symbol');
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleSelectAutocomplete = (result: SearchResult) => {
    setShowDropdown(false);
    setAutocompleteResults([]);
    setSearchQuery(result.symbol || (result as any).ticker || '');
    fetchProfile(result.symbol || (result as any).ticker || '', 'symbol');
  };

  const filingsToShow = showAllFilings ? profile?.recentFilings : profile?.recentFilings?.slice(0, 5);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            Company Lookup
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
            Search companies by ticker symbol or company name
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Proprietary • SEC EDGAR
            </span>
          </div>
        </div>
      </div>

      {/* ── Search Bar with Autocomplete ──────────────────────── */}
      <div ref={searchContainerRef} className="relative z-50">
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
          <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="relative flex-1">
              {isAutoSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery ?? ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleAutocompleteKeyDown}
                onFocus={() => autocompleteResults.length > 0 && setShowDropdown(true)}
                placeholder="Search by ticker (AAPL) or company name..."
                className="w-full pl-10 pr-16 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />

              {searchQuery?.trim() && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                    detectedType === 'symbol'
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  )}>
                    {detectedType === 'symbol' ? 'Ticker' : 'Name'}
                  </span>
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-1 hover:text-white text-gray-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !searchQuery?.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isLoading || !searchQuery?.trim()
                  ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                  : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching</span>
                </>
              ) : (
                <span>Search</span>
              )}
            </button>
          </form>
        </div>

        {/* Autocomplete Dropdown with Company Logos */}
        <AnimatePresence>
          {showDropdown && autocompleteResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
              style={{ zIndex: 9999 }}
            >
              {autocompleteResults.map((result, index) => {
                const sym = result.symbol || (result as any).ticker;
                return (
                  <button
                    key={`${result.cik}-${index}`}
                    onClick={() => handleSelectAutocomplete(result)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                      index === highlightedIndex ? 'bg-blue-500/20' : 'hover:bg-[#212121]'
                    )}
                  >
                    <CompanyIcon ticker={sym} className="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white">{sym}</div>
                      <div className="text-xs text-gray-400 truncate">{result.name}</div>
                    </div>
                    {result.exchange && (
                      <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-gray-800 rounded">
                        {result.exchange}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">

        {/* Popular Companies — Grid with Logos */}
        {!profile && !searchResults.length && (
          <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Popular Companies
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {POPULAR_COMPANIES.map((company) => (
                <button
                  key={company.symbol}
                  onClick={() => handleQuickLookup(company.symbol)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A]"
                >
                  <CompanyIcon ticker={company.symbol} className="h-7 w-7 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-white group-hover:text-white">
                      {company.symbol}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{company.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium text-sm">Error</p>
              <p className="text-red-400/80 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Search Results with Company Logos */}
        {searchResults.length > 0 && (
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-gray-800 bg-[#141414]">
              <h3 className="font-semibold text-white text-sm">Search Results</h3>
              <p className="text-xs text-gray-500">Select a company to view details</p>
            </div>
            <div className="divide-y divide-gray-800">
              {searchResults.map((result) => (
                <button
                  key={`${result.symbol}-${result.cik}`}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1A1A1A] transition-colors text-left group"
                >
                  <CompanyIcon ticker={result.symbol} className="h-9 w-9 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors">{result.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {result.symbol} • CIK {result.cik.replace(/^0+/, '')} {result.exchange && `• ${result.exchange}`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Company Profile ──────────────────────────────────── */}
        {profile && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Card */}
            <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Building2 className="w-64 h-64 text-white" />
              </div>

              <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                {/* Logo */}
                <CompanyIcon ticker={profile.symbol} className="w-20 h-20 flex-shrink-0" />

                {/* Company Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white">{profile.companyName}</h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-mono font-medium rounded">
                      {profile.symbol}
                    </span>
                    {profile.isActivelyTrading ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-full">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-gray-400 mb-4 text-sm flex flex-wrap items-center gap-2">
                    {profile.sicDescription}
                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                    {profile.exchangeFullName || profile.exchange}
                    {profile.category && (
                      <>
                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                        {profile.category}
                      </>
                    )}
                  </p>

                  {/* Price */}
                  {profile.price != null && (
                    <div className="flex flex-wrap items-baseline gap-4">
                      <span className="text-3xl font-bold text-white font-mono">
                        ${profile.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {profile.changePercent != null && (
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium",
                          (profile.changePercent ?? 0) >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {(profile.changePercent ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{(profile.changePercent ?? 0) >= 0 ? '+' : ''}{profile.changePercent?.toFixed(2)}%</span>
                        </div>
                      )}
                      {profile.change != null && (
                        <span className={cn(
                          "text-sm",
                          (profile.change ?? 0) >= 0 ? "text-green-500/70" : "text-red-500/70"
                        )}>
                          ({(profile.change ?? 0) >= 0 ? '+' : ''}${profile.change?.toFixed(2)})
                        </span>
                      )}
                      <span className="text-xs text-gray-600">{profile.currency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Company Details Grid ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Company Information */}
              <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
                <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Company Information
                </h4>
                <div className="space-y-3">
                  {[
                    { icon: Landmark, label: 'Exchange', value: profile.exchangeFullName || profile.exchange },
                    { icon: Briefcase, label: 'SIC Code', value: `${profile.sic} — ${profile.sicDescription}` },
                    { icon: MapPin, label: 'Incorporated', value: profile.stateOfIncorporation || '—' },
                    { icon: Calendar, label: 'Fiscal Year End', value: profile.fiscalYearEnd ? `Month ${profile.fiscalYearEnd}` : '—' },
                    { icon: Hash, label: 'CIK', value: profile.cik?.replace(/^0+/, '') || '—' },
                    { icon: Hash, label: 'EIN', value: profile.ein || '—' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-gray-800/50 pb-2.5">
                      <div className="flex items-center gap-2 text-gray-500">
                        <item.icon className="w-3.5 h-3.5" />
                        <span className="text-xs">{item.label}</span>
                      </div>
                      <span className="text-white text-sm text-right max-w-[60%] truncate">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact & Location */}
              <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
                <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Contact & Location
                </h4>
                <div className="space-y-3">
                  {profile.addresses?.business?.city && (
                    <div className="flex items-start justify-between border-b border-gray-800/50 pb-2.5">
                      <div className="flex items-center gap-2 text-gray-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs">Address</span>
                      </div>
                      <span className="text-white text-sm text-right max-w-[60%]">
                        {profile.addresses.business.street1}
                        {profile.addresses.business.street2 && <><br />{profile.addresses.business.street2}</>}
                        <br />
                        {profile.addresses.business.city}, {profile.addresses.business.state} {profile.addresses.business.zip}
                      </span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center justify-between border-b border-gray-800/50 pb-2.5">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-xs">Phone</span>
                      </div>
                      <span className="text-white text-sm">{profile.phone}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center justify-between border-b border-gray-800/50 pb-2.5">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="text-xs">Website</span>
                      </div>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm truncate max-w-[60%] flex items-center gap-1"
                      >
                        {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                  {profile.category && (
                    <div className="flex items-center justify-between border-b border-gray-800/50 pb-2.5">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs">Filer Category</span>
                      </div>
                      <span className="text-white text-sm">{profile.category}</span>
                    </div>
                  )}
                </div>

                {/* Identifier badges */}
                <div className="grid grid-cols-2 gap-2 pt-4">
                  <div className="bg-[#1A1A1A] rounded p-2 text-center">
                    <span className="text-gray-500 text-[10px] block uppercase">CIK</span>
                    <span className="text-white text-xs font-mono">{profile.cik.replace(/^0+/, '')}</span>
                  </div>
                  <div className="bg-[#1A1A1A] rounded p-2 text-center">
                    <span className="text-gray-500 text-[10px] block uppercase">SIC</span>
                    <span className="text-white text-xs font-mono">{profile.sic || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── XBRL Financials ──────────────────────────────── */}
            {profile.financials.length > 0 && (
              <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-[#141414] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Financial Statements <span className="text-xs text-gray-500 font-normal">(Annual 10-K)</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Source: SEC EDGAR XBRL</p>
                  </div>
                  <div className="flex gap-1 bg-[#0D0D0D] rounded-lg p-0.5 border border-gray-800">
                    {[
                      { key: 'income' as const, label: 'Income' },
                      { key: 'balance' as const, label: 'Balance' },
                      { key: 'cash' as const, label: 'Cash Flow' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFinancialTab(tab.key)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                          activeFinancialTab === tab.key
                            ? "bg-blue-600/15 text-blue-400"
                            : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Metric</th>
                        {profile.financials.map((f) => (
                          <th key={f.periodEndDate} className="px-4 py-3 text-right text-xs text-gray-500 font-medium whitespace-nowrap">
                            FY {f.fiscalYear || f.periodEndDate.substring(0, 4)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeFinancialTab === 'income' && (
                        <>
                          <tr className="border-b border-gray-800/50 hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">Revenue</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className="px-4 py-2.5 text-right text-white text-xs font-mono">{formatCurrency(f.revenue)}</td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50 hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">Net Income</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className={cn("px-4 py-2.5 text-right text-xs font-mono", (f.netIncome ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                                {formatCurrency(f.netIncome)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50 hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">EPS (Basic)</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className="px-4 py-2.5 text-right text-white text-xs font-mono">{formatEPS(f.earningsPerShareBasic)}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">EPS (Diluted)</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className="px-4 py-2.5 text-right text-white text-xs font-mono">{formatEPS(f.earningsPerShareDiluted)}</td>
                            ))}
                          </tr>
                        </>
                      )}
                      {activeFinancialTab === 'balance' && (
                        <>
                          <tr className="border-b border-gray-800/50 hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">Total Assets</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className="px-4 py-2.5 text-right text-white text-xs font-mono">{formatCurrency(f.totalAssets)}</td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50 hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">Total Liabilities</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className="px-4 py-2.5 text-right text-red-400 text-xs font-mono">{formatCurrency(f.totalLiabilities)}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2.5 text-gray-300 text-xs">Stockholders&#39; Equity</td>
                            {profile.financials.map((f) => (
                              <td key={f.periodEndDate} className={cn("px-4 py-2.5 text-right text-xs font-mono", (f.totalEquity ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                                {formatCurrency(f.totalEquity)}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                      {activeFinancialTab === 'cash' && (
                        <tr className="hover:bg-[#1A1A1A] transition-colors">
                          <td className="px-4 py-2.5 text-gray-300 text-xs">Operating Cash Flow</td>
                          {profile.financials.map((f) => (
                            <td key={f.periodEndDate} className={cn("px-4 py-2.5 text-right text-xs font-mono", (f.operatingCashFlow ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                              {formatCurrency(f.operatingCashFlow)}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SEC Filings ──────────────────────────────────── */}
            {profile.recentFilings.length > 0 && (
              <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-[#141414]">
                  <h4 className="text-base font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Recent SEC Filings
                    <span className="text-xs text-gray-500 font-normal">({profile.recentFilings.length} filings)</span>
                  </h4>
                </div>

                <div className="divide-y divide-gray-800/50">
                  {filingsToShow?.map((filing) => (
                    <a
                      key={filing.accessionNumber}
                      href={filing.primaryDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#1A1A1A] transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded border flex-shrink-0",
                          getFormBadgeColor(filing.form)
                        )}>
                          {filing.form}
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate group-hover:text-blue-400 transition-colors">
                            {filing.description || filing.primaryDocument}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">{filing.accessionNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">{formatDate(filing.filingDate)}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>

                {profile.recentFilings.length > 5 && (
                  <button
                    onClick={() => setShowAllFilings(!showAllFilings)}
                    className="w-full px-4 py-2.5 text-xs text-gray-500 hover:text-gray-300 border-t border-gray-800 flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllFilings ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Show All {profile.recentFilings.length} Filings
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Source attribution */}
            <div className="flex items-center justify-between text-[10px] text-gray-600 px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>OmniFolio Proprietary • Data: SEC EDGAR (Public) • Price: Yahoo Finance (Public)</span>
              </div>
              <span>Updated {formatDate(profile.lastUpdated)}</span>
            </div>
          </div>
        )}

        {/* Recent Searches with Company Logos */}
        {!profile && !searchResults.length && !isLoading && recentSearches.length > 0 && (
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Recent Searches
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSearches.map((company, index) => (
                <button
                  key={`${company.symbol}-${index}`}
                  onClick={() => handleQuickLookup(company.symbol)}
                  className="flex items-center gap-3 p-3 bg-[#1A1A1A] hover:bg-[#252525] border border-gray-800 rounded-xl transition-colors text-left group"
                >
                  <CompanyIcon ticker={company.symbol} className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate text-sm">{company.companyName}</p>
                    <p className="text-xs text-gray-500 font-mono">{company.symbol} • {company.sicDescription?.split(' — ')[0]}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!profile && !searchResults.length && !isLoading && !error && recentSearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-16 h-16 bg-[#0D0D0D] rounded-full flex items-center justify-center mb-4 border border-gray-800">
              <Search className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Company Lookup</h3>
            <p className="text-sm max-w-sm text-center opacity-60 leading-relaxed">
              Enter a ticker symbol (e.g., AAPL) or company name to view SEC filings, financial statements, and business information.
            </p>
            <p className="text-[10px] text-gray-600 mt-4 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Proprietary — powered by SEC EDGAR public data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyLookup;
