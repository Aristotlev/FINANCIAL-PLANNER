"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useBetterAuth } from '../../../contexts/better-auth-context';
import { Preloader } from '../../../components/ui/preloader';
import { 
  SECFilingFeed, 
  InsiderTrading, 
  FilingDiffTool, 
  SECScreener 
} from '../../../components/sec';
import { 
  FileText, 
  Users, 
  GitCompare, 
  Search as SearchIcon,
  Bell,
  ArrowLeft,
  BarChart3,
  Building2,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  ChevronDown,
  Star,
  Loader2,
  X,
  Zap,
  Shield,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'filings' | 'insider' | 'holdings' | 'diff' | 'screener';

interface CompanySearchResult {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

const tabs: { id: TabType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'filings', label: 'SEC Filings', icon: FileText, description: 'Browse 10-K, 10-Q, 8-K filings' },
  { id: 'insider', label: 'Insider Trading', icon: Users, description: 'Form 4 transactions' },
  { id: 'holdings', label: 'Institutional', icon: Building2, description: '13F holdings' },
  { id: 'diff', label: 'Filing Diff', icon: GitCompare, description: 'Compare filings' },
  { id: 'screener', label: 'Screener', icon: BarChart3, description: 'Filter companies' },
];

const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM'];

import { tickerDomains } from '../../../lib/ticker-domains';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Generate a consistent color based on ticker
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

const CompanyIcon = ({ ticker, className = "h-12 w-12", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();
  
  // Build list of image sources to try
  const imageSources = useMemo(() => {
    const sources: string[] = [];
    
    // 1. Known domain from our mapping
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    
    // 2. Try logo.dev API (free tier, good coverage)
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    
    // 3. Try common domain patterns
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`);
    
    return sources;
  }, [upperTicker, ticker]);
  
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [ticker]);
  
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
        className={`${className} rounded-xl object-contain bg-white p-1`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={`${className} rounded-xl bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`}>
      {ticker.slice(0, 2)}
    </div>
  );
};

export default function SECPage() {
  const { user, isAuthenticated, isLoading } = useBetterAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<TabType>('filings');
  const [searchTicker, setSearchTicker] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [selectedCompanyName, setSelectedCompanyName] = useState('Apple Inc.');
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [popularTickers, setPopularTickers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Load watchlist and popular tickers
  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated) return;

      try {
        // Load watchlist from API
        const watchlistRes = await fetch('/api/sec/watchlist');
        if (watchlistRes.ok) {
          const data = await watchlistRes.json();
          setWatchlist(data.watchlist || []);
        }

        // Load popular tickers
        const popularRes = await fetch('/api/sec/popular?limit=8');
        if (popularRes.ok) {
          const data = await popularRes.json();
          setPopularTickers(data.results || []);
        }
      } catch (error) {
        console.error('Failed to load SEC data', error);
      }
    }

    loadData();
  }, [isAuthenticated]);

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const sidebarSearchRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearch = useDebounce(searchTicker, 300);

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
      if (
        searchRef.current && !searchRef.current.contains(event.target as Node) &&
        sidebarSearchRef.current && !sidebarSearchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle URL params for tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['filings', 'insider', 'holdings', 'diff', 'screener'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
    const ticker = searchParams.get('ticker');
    if (ticker) {
      setSelectedTicker(ticker.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const selectCompany = async (result: CompanySearchResult) => {
    setSelectedTicker(result.ticker);
    setSelectedCompanyName(result.name);
    setSearchTicker('');
    setShowDropdown(false);
    setSearchResults([]);

    // Record search
    try {
      await fetch(`/api/sec/search?record=true&ticker=${result.ticker}&cik=${result.cik}&name=${encodeURIComponent(result.name)}`);
      
      // Refresh popular tickers after recording a search
      const popularRes = await fetch('/api/sec/popular?limit=8');
      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopularTickers(data.results || []);
      }
    } catch (error) {
      console.error('Failed to record search', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          selectCompany(searchResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      setSelectedTicker(searchTicker.toUpperCase().trim());
      setSearchTicker('');
      setShowDropdown(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Refresh watchlist
      const watchlistRes = await fetch('/api/sec/watchlist');
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlist(data.watchlist || []);
      }

      // Refresh popular
      const popularRes = await fetch('/api/sec/popular?limit=8');
      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopularTickers(data.results || []);
      }
    } catch (error) {
      console.error('Refresh failed', error);
    }
    
    setIsRefreshing(false);
  };

  const toggleWatchlist = async (ticker: string, name?: string) => {
    const isWatched = watchlist.some(item => item.ticker === ticker);
    
    try {
      if (isWatched) {
        // Remove from watchlist
        const res = await fetch(`/api/sec/watchlist?ticker=${ticker}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setWatchlist(prev => prev.filter(item => item.ticker !== ticker));
        }
      } else {
        // Add to watchlist
        const res = await fetch('/api/sec/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ticker, name })
        });
        if (res.ok) {
          const data = await res.json();
          setWatchlist(prev => [data.watchlistItem, ...prev]);
        }
      }
    } catch (error) {
      console.error('Failed to toggle watchlist', error);
    }
  };

  if (isLoading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex-shrink-0 font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 font-serif">
                OmniFolio
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</Link>
                  <Link href="/community" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Community</Link>
                  <Link href="/markets/sec" className="bg-white/10 text-white px-3 py-2 rounded-md text-sm font-medium border border-white/10">SEC Filings</Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div ref={searchRef} className="relative hidden md:block">
                <form onSubmit={handleSearch}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    ) : (
                      <SearchIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchTicker}
                    onChange={(e) => setSearchTicker(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    className="bg-gray-800/50 border border-gray-700/50 text-gray-300 text-sm rounded-full focus:ring-cyan-500 focus:border-cyan-500 block w-64 pl-10 pr-8 p-2.5 backdrop-blur-sm transition-all focus:bg-gray-800"
                    placeholder="Search company or ticker..."
                  />
                  {searchTicker && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTicker('');
                        setSearchResults([]);
                        setShowDropdown(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                  )}
                </form>
                
                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-gray-900/90 border border-gray-700/50 rounded-xl shadow-xl overflow-hidden z-50 backdrop-blur-xl"
                    >
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.cik}-${index}`}
                          onClick={() => selectCompany(result)}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                            index === highlightedIndex
                              ? 'bg-cyan-500/20'
                              : 'hover:bg-gray-800/50'
                          }`}
                        >
                          <CompanyIcon ticker={result.ticker} className="h-8 w-8" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-white">{result.ticker}</div>
                            <div className="text-xs text-gray-400 truncate">{result.name}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <Link href="/dashboard" className="h-8 w-8 rounded-full overflow-hidden border border-gray-700/50 ring-2 ring-transparent hover:ring-cyan-500/50 transition-all">
                <img src={user?.avatarUrl || '/api/auth/avatar'} alt="User" className="h-full w-full object-cover" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb & Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-700/50" />
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h1 className="text-lg font-semibold text-white">SEC EDGAR</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 transition-colors disabled:opacity-50 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 backdrop-blur-sm">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Ticker Selection */}
          <div className="lg:col-span-3 space-y-6" style={{ overflow: 'visible' }}>
            {/* Current Ticker */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-4 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Current Ticker</h3>
                <button
                  onClick={() => toggleWatchlist(selectedTicker, selectedCompanyName)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    watchlist.some(item => item.ticker === selectedTicker)
                      ? 'text-yellow-400 bg-yellow-400/10'
                      : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10'
                  }`}
                >
                  <Star className={`h-4 w-4 ${watchlist.some(item => item.ticker === selectedTicker) ? 'fill-current' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <CompanyIcon ticker={selectedTicker} className="h-12 w-12" />
                <div>
                  <div className="font-semibold text-lg text-white">{selectedTicker}</div>
                  <div className="text-sm text-gray-400 truncate max-w-[150px]" title={selectedCompanyName}>{selectedCompanyName}</div>
                </div>
              </div>
            </div>

            {/* Search Ticker */}
            <div ref={sidebarSearchRef} className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-4 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 relative z-40">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Search Company</h3>
              <div className="relative">
                <div className="relative">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 animate-spin" />
                  ) : (
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  )}
                  <input
                    type="text"
                    value={searchTicker}
                    onChange={(e) => setSearchTicker(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Enter ticker or company name..."
                    className="w-full pl-10 pr-8 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-500"
                  />
                  {searchTicker && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTicker('');
                        setSearchResults([]);
                        setShowDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                  )}
                </div>
                
                {/* Sidebar Autocomplete Dropdown */}
                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
                      style={{ zIndex: 9999 }}
                    >
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.cik}-${index}`}
                          onClick={() => selectCompany(result)}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                            index === highlightedIndex
                              ? 'bg-cyan-500/20'
                              : 'hover:bg-gray-800/50'
                          }`}
                        >
                          <CompanyIcon ticker={result.ticker} className="h-8 w-8" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-white">{result.ticker}</div>
                            <div className="text-xs text-gray-400 truncate">{result.name}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Popular Tickers */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-4 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 relative z-10">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Popular</h3>
              <div className="flex flex-wrap gap-2">
                {popularTickers.length > 0 ? (
                  popularTickers.map((item, index) => (
                    <button
                      key={`${item.ticker}-${index}`}
                      onClick={() => {
                        setSelectedTicker(item.ticker);
                        setSelectedCompanyName(item.company_name || item.ticker);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                        selectedTicker === item.ticker
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-transparent hover:border-gray-700'
                      }`}
                    >
                      <CompanyIcon ticker={item.ticker} className="h-4 w-4" showPlaceholder={false} />
                      {item.ticker}
                    </button>
                  ))
                ) : (
                  ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM'].map(ticker => (
                    <button
                      key={ticker}
                      onClick={() => setSelectedTicker(ticker)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                        selectedTicker === ticker
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-transparent hover:border-gray-700'
                      }`}
                    >
                      <CompanyIcon ticker={ticker} className="h-4 w-4" showPlaceholder={false} />
                      {ticker}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Watchlist */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-4 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Watchlist</h3>
                <span className="text-xs text-gray-500">{watchlist.length} stocks</span>
              </div>
              <div className="space-y-2">
                {watchlist.map((item, index) => (
                  <button
                    key={`${item.ticker}-${index}`}
                    onClick={() => {
                      setSelectedTicker(item.ticker);
                      setSelectedCompanyName(item.company?.company_name || item.ticker);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedTicker === item.ticker
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-white'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CompanyIcon ticker={item.ticker} className="h-6 w-6" />
                      <span className="font-medium">{item.ticker}</span>
                    </div>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  </button>
                ))}
                {watchlist.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">Your watchlist is empty</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-6">
            {/* Tabs */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-2">
              <div className="flex flex-wrap gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'filings' && (
                  <div className="space-y-4">
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-white">Viewing filings for: <span className="text-cyan-400 font-bold">{selectedTicker}</span></h3>
                      </div>
                    </div>
                    <SECFilingFeed 
                      ticker={selectedTicker}
                      maxItems={20}
                    />
                  </div>
                )}

                {activeTab === 'insider' && (
                  <InsiderTrading 
                    ticker={selectedTicker}
                    days={90}
                    showSummary={true}
                  />
                )}

                {activeTab === 'holdings' && (
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-8 text-center hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                    <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-white">13F Institutional Holdings</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Track hedge fund and institutional investor positions from quarterly 13F filings.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                      <Clock className="h-4 w-4" />
                      Coming soon - Q1 2025
                    </div>
                  </div>
                )}

                {activeTab === 'diff' && (
                  <FilingDiffTool 
                    ticker={selectedTicker}
                    formType="10-K"
                  />
                )}

                {activeTab === 'screener' && (
                  <SECScreener 
                    onSelectCompany={(ticker: string, cik: string) => {
                      setSelectedTicker(ticker);
                      // Find company name from results if possible, or just use ticker
                      setSelectedCompanyName(ticker);
                      setActiveTab('filings');
                      
                      // Record search/selection
                      fetch(`/api/sec/search?record=true&ticker=${ticker}&cik=${cik}`).catch(console.error);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
