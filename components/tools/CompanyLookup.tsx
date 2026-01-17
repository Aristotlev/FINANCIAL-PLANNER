'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Search01Icon, 
  Loading01Icon, 
  AlertCircleIcon,
  Building02Icon,
  Globe02Icon,
  Call02Icon,
  UserIcon,
  Calendar01Icon,
  AnalyticsUpIcon,
  AnalyticsDownIcon,
  ChartBreakoutSquareIcon,
  InformationCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Tick01Icon
} from 'hugeicons-react';
import Image from 'next/image';
import { formatMarketCap, formatLargeNumber } from '@/lib/api/fmp-api';

// Types
interface CompanyProfile {
  symbol: string;
  price: number;
  marketCap: number;
  beta: number;
  lastDividend: number;
  range: string;
  change: number;
  changePercentage: number;
  volume: number;
  averageVolume: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchangeFullName: string;
  exchange: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

interface SearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

// Popular companies for quick lookup (using symbols - much more user-friendly)
const POPULAR_COMPANIES = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'JPM', name: 'JPMorgan' },
  { symbol: 'BRK.B', name: 'Berkshire' },
  { symbol: 'V', name: 'Visa' },
];

// Smart search type detection
function detectSearchType(query: string): 'symbol' | 'search' {
  const trimmed = query.trim().toUpperCase();
  
  // If it's 1-5 uppercase letters (possibly with dots like BRK.A), it's likely a ticker symbol
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(trimmed)) {
    return 'symbol';
  }
  
  // Otherwise, treat it as a company name search
  return 'search';
}

export function CompanyLookup() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<CompanyProfile[]>([]);
  const [detectedType, setDetectedType] = useState<'symbol' | 'search'>('search');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fmp-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Update detected type as user types
  useEffect(() => {
    if (searchQuery.trim()) {
      setDetectedType(detectSearchType(searchQuery));
    }
  }, [searchQuery]);

  // Save to recent searches
  const saveToRecent = useCallback((newProfile: CompanyProfile) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.cik !== newProfile.cik);
      const updated = [newProfile, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('fmp-recent-searches', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Fetch company profile - smart search that tries symbol first, then name search
  const fetchProfile = useCallback(async (query: string, forceType?: 'symbol' | 'search') => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    const type = forceType || detectSearchType(query);

    try {
      // For symbol-like queries, try direct lookup first
      if (type === 'symbol') {
        const params = new URLSearchParams();
        params.set('symbol', query.trim().toUpperCase());
        
        const response = await fetch(`/api/fmp/company-profile?${params.toString()}`);
        const data = await response.json();

        if (response.ok && data.data) {
          setProfile(data.data);
          setSearchResults([]);
          saveToRecent(data.data);
          setIsLoading(false);
          return;
        }
        
        // If symbol lookup fails, fall back to name search
        console.log('Symbol lookup failed, trying name search...');
      }

      // Name search
      const searchParams = new URLSearchParams();
      searchParams.set('search', query.trim());
      
      const searchResponse = await fetch(`/api/fmp/company-profile?${searchParams.toString()}`);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Failed to fetch company data');
      }

      if (searchData.type === 'search' && searchData.data?.length > 0) {
        // If we got search results, check if first result exactly matches query
        const exactMatch = searchData.data.find(
          (r: SearchResult) => r.symbol.toUpperCase() === query.trim().toUpperCase()
        );
        
        if (exactMatch) {
          // Auto-select exact match
          const profileParams = new URLSearchParams();
          profileParams.set('symbol', exactMatch.symbol);
          const profileResponse = await fetch(`/api/fmp/company-profile?${profileParams.toString()}`);
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

  // Handle search submission
  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    fetchProfile(searchQuery);
  }, [searchQuery, fetchProfile]);

  // Handle quick lookup from popular companies
  const handleQuickLookup = useCallback((symbol: string) => {
    setSearchQuery(symbol);
    fetchProfile(symbol, 'symbol');
  }, [fetchProfile]);

  // Handle selecting a search result
  const handleSelectSearchResult = useCallback((result: SearchResult) => {
    setSearchQuery(result.symbol);
    fetchProfile(result.symbol, 'symbol');
  }, [fetchProfile]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Company Lookup</h2>
          <p className="text-gray-400 text-sm">
            Search companies by ticker symbol or company name
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search01Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticker (AAPL) or company name (Apple)..."
                className="w-full pl-12 pr-4 py-3 bg-[#0D0D0D] border border-gray-800 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {/* Smart detection indicator */}
              {searchQuery.trim() && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Tick01Icon className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-gray-500">
                    {detectedType === 'symbol' ? 'Ticker' : 'Name search'}
                  </span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className={cn(
                "px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
                isLoading || !searchQuery.trim()
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {isLoading ? (
                <>
                  <Loading01Icon className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search01Icon className="w-5 h-5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Lookup */}
        <div className="mt-6">
          <p className="text-xs text-gray-500 mb-3">Popular Companies (Quick Lookup)</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_COMPANIES.map((company) => (
              <button
                key={company.symbol}
                onClick={() => handleQuickLookup(company.symbol)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0D0D0D] hover:bg-[#2A2A2A] border border-gray-800 rounded-lg text-sm transition-colors group"
              >
                <span className="text-gray-400 group-hover:text-white font-medium">{company.symbol}</span>
                <span className="text-gray-600 text-xs">{company.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results (for company name search) */}
      {searchResults.length > 0 && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Search Results</h3>
            <p className="text-xs text-gray-500 mt-1">Click a company to view full profile</p>
          </div>
          <div className="divide-y divide-gray-800">
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleSelectSearchResult(result)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-white">{result.name}</p>
                  <p className="text-sm text-gray-400">
                    {result.symbol} • {result.exchangeShortName}
                  </p>
                </div>
                <ArrowRight01Icon className="w-5 h-5 text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Company Profile Display */}
      {profile && (
        <div className="space-y-6">
          {/* Company Header */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Logo */}
              <div className="w-20 h-20 rounded-xl bg-[#0D0D0D] border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.image && !profile.defaultImage ? (
                  <Image
                    src={profile.image}
                    alt={profile.companyName}
                    width={80}
                    height={80}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <Building02Icon className="w-10 h-10 text-gray-600" />
                )}
              </div>

              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-white">{profile.companyName}</h3>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg">
                    {profile.symbol}
                  </span>
                  {profile.isActivelyTrading ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg">
                      <CheckmarkCircle01Icon className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg">
                      <Cancel01Icon className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mb-4">
                  {profile.sector} • {profile.industry} • {profile.exchangeFullName}
                </p>

                {/* Price Info */}
                <div className="flex flex-wrap items-baseline gap-4">
                  <span className="text-3xl font-bold text-white">
                    ${profile.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1",
                    profile.changePercentage >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {profile.changePercentage >= 0 ? (
                      <AnalyticsUpIcon className="w-5 h-5" />
                    ) : (
                      <AnalyticsDownIcon className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {profile.changePercentage >= 0 ? '+' : ''}{profile.changePercentage?.toFixed(2)}%
                    </span>
                    <span className="text-gray-500">
                      ({profile.change >= 0 ? '+' : ''}${profile.change?.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Market Cap', value: formatMarketCap(profile.marketCap), icon: ChartBreakoutSquareIcon },
              { label: 'Volume', value: formatLargeNumber(profile.volume), icon: ChartBreakoutSquareIcon },
              { label: 'Avg Volume', value: formatLargeNumber(profile.averageVolume), icon: ChartBreakoutSquareIcon },
              { label: 'Beta', value: profile.beta?.toFixed(2) || 'N/A', icon: AnalyticsUpIcon },
              { label: '52W Range', value: profile.range || 'N/A', icon: ChartBreakoutSquareIcon },
              { label: 'Last Dividend', value: `$${profile.lastDividend?.toFixed(2) || '0.00'}`, icon: AnalyticsUpIcon },
              { label: 'Employees', value: parseInt(profile.fullTimeEmployees || '0').toLocaleString(), icon: UserIcon },
              { label: 'IPO Date', value: profile.ipoDate || 'N/A', icon: Calendar01Icon },
            ].map((metric) => (
              <div key={metric.label} className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">{metric.label}</span>
                </div>
                <p className="text-lg font-semibold text-white truncate">{metric.value}</p>
              </div>
            ))}
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Description */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                About
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                {profile.description || 'No description available.'}
              </p>
            </div>

            {/* Contact & Identifiers */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building02Icon className="w-5 h-5 text-blue-500" />
                Company Details
              </h4>
              <div className="space-y-3">
                {profile.ceo && (
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 text-sm">CEO:</span>
                    <span className="text-white text-sm">{profile.ceo}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-start gap-3">
                    <Building02Icon className="w-4 h-4 text-gray-500 mt-0.5" />
                    <span className="text-gray-500 text-sm">Address:</span>
                    <span className="text-white text-sm">
                      {profile.address}, {profile.city}, {profile.state} {profile.zip}
                    </span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Call02Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 text-sm">Phone:</span>
                    <span className="text-white text-sm">{profile.phone}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-3">
                    <Globe02Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 text-sm">Website:</span>
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm truncate"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">CIK</span>
                    <span className="text-white text-xs font-mono">{profile.cik}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">ISIN</span>
                    <span className="text-white text-xs font-mono">{profile.isin || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">CUSIP</span>
                    <span className="text-white text-xs font-mono">{profile.cusip || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {profile.isEtf && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-lg">ETF</span>
            )}
            {profile.isFund && (
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-lg">Fund</span>
            )}
            {profile.isAdr && (
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-lg">ADR</span>
            )}
            <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-lg">
              {profile.currency}
            </span>
            <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-lg">
              {profile.country}
            </span>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {!profile && !searchResults.length && !isLoading && recentSearches.length > 0 && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Recent Searches</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSearches.map((company) => (
              <button
                key={company.symbol}
                onClick={() => handleQuickLookup(company.symbol)}
                className="flex items-center gap-3 p-4 bg-[#0D0D0D] hover:bg-[#2A2A2A] border border-gray-800 rounded-xl transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {company.image && !company.defaultImage ? (
                    <Image
                      src={company.image}
                      alt={company.companyName}
                      width={40}
                      height={40}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <Building02Icon className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{company.companyName}</p>
                  <p className="text-xs text-gray-400">{company.symbol} • {company.sector}</p>
                </div>
                <ArrowRight01Icon className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!profile && !searchResults.length && !isLoading && !error && recentSearches.length === 0 && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-12 text-center">
          <Building02Icon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Search for a Company</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter a CIK number, ticker symbol, or company name to view detailed company profile data including stock price, market cap, and more.
          </p>
        </div>
      )}
    </div>
  );
}

export default CompanyLookup;
