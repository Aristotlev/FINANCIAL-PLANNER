'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Loader2, 
  AlertCircle,
  Building2,
  Globe,
  Phone,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Info,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Check,
  Clock
} from 'lucide-react';
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

  const clearSearch = () => {
    setSearchQuery('');
    setProfile(null);
    setSearchResults([]);
    setError(null);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  Company Lookup
              </h2>
              <div className="flex gap-3 text-sm mt-1 text-gray-400">
                Search companies by ticker symbol or company name
              </div>
          </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticker (AAPL) or company name..."
                className="w-full pl-10 pr-16 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />
              
              {searchQuery.trim() && (
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
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isLoading || !searchQuery.trim()
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
                <>
                  <span>Search</span>
                </>
              )}
            </button>
        </form>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">
          
          {/* Quick Lookup Chips */}
          {!profile && !searchResults.length && (
            <div>
                <p className="text-xs text-gray-500 mb-3 px-1">Popular Companies</p>
                <div className="flex flex-wrap gap-2">
                    {POPULAR_COMPANIES.map((company) => (
                    <button
                        key={company.symbol}
                        onClick={() => handleQuickLookup(company.symbol)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0D0D0D] hover:bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm transition-colors group"
                    >
                        <span className="text-gray-400 group-hover:text-white font-medium">{company.symbol}</span>
                        <span className="text-gray-600 text-[10px]">{company.name}</span>
                    </button>
                    ))}
                </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium text-sm">Error</p>
                <p className="text-red-400/80 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-gray-800 bg-[#141414]">
                <h3 className="font-semibold text-white text-sm">Search Results</h3>
                <p className="text-xs text-gray-500">Select a company to view details</p>
              </div>
              <div className="divide-y divide-gray-800">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors text-left group"
                  >
                    <div>
                      <p className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors">{result.name}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {result.symbol} • {result.exchangeShortName}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Company Profile Display */}
          {profile && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Company Header Card */}
              <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                     <Building2 className="w-64 h-64 text-white" />
                </div>

                <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                  {/* Logo */}
                  <div className="w-20 h-20 rounded-xl bg-[#1A1A1A] border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 p-2">
                    {profile.image && !profile.defaultImage ? (
                      <Image
                        src={profile.image}
                        alt={profile.companyName}
                        width={64}
                        height={64}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-600" />
                    )}
                  </div>

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
                    <p className="text-gray-400 mb-4 text-sm flex items-center gap-2">
                      {profile.sector} 
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      {profile.industry} 
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      {profile.exchange}
                    </p>

                    {/* Price Info */}
                    <div className="flex flex-wrap items-baseline gap-4">
                      <span className="text-3xl font-bold text-white font-mono">
                        ${profile.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium",
                        profile.changePercentage >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {profile.changePercentage >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>
                          {profile.changePercentage >= 0 ? '+' : ''}{profile.changePercentage?.toFixed(2)}%
                        </span>
                      </div>
                      <span className={cn(
                          "text-sm",
                          profile.change >= 0 ? "text-green-500/70" : "text-red-500/70"
                      )}>
                          ({profile.change >= 0 ? '+' : ''}${profile.change?.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Market Cap', value: formatMarketCap(profile.marketCap), icon: BarChart2 },
                  { label: 'Volume', value: formatLargeNumber(profile.volume), icon: BarChart2 },
                  { label: 'Avg Volume', value: formatLargeNumber(profile.averageVolume), icon: BarChart2 },
                  { label: 'Beta', value: profile.beta?.toFixed(2) || 'N/A', icon: TrendingUp },
                  { label: '52W Range', value: profile.range || 'N/A', icon: BarChart2 },
                  { label: 'Last Dividend', value: `$${profile.lastDividend?.toFixed(2) || '0.00'}`, icon: TrendingUp },
                  { label: 'Employees', value: parseInt(profile.fullTimeEmployees || '0').toLocaleString(), icon: User },
                  { label: 'IPO Date', value: profile.ipoDate || 'N/A', icon: Calendar },
                ].map((metric) => (
                  <div key={metric.label} className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs text-gray-500 uppercase tracking-wide">{metric.label}</span>
                    </div>
                    <p className="text-lg font-semibold text-white truncate font-mono">{metric.value}</p>
                  </div>
                ))}
              </div>

              {/* Company Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Description */}
                <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
                  <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    About
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {profile.description || 'No description available.'}
                  </p>
                </div>

                {/* Contact & Identifiers */}
                <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
                  <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Company Details
                  </h4>
                  <div className="space-y-4">
                    {profile.ceo && (
                      <div className="flex items-center justify-between border-b border-gray-800/50 pb-3">
                        <div className="flex items-center gap-2 text-gray-500">
                             <User className="w-3.5 h-3.5" />
                             <span className="text-xs">CEO</span>
                        </div>
                        <span className="text-white text-sm">{profile.ceo}</span>
                      </div>
                    )}
                    {(profile.city || profile.state) && (
                       <div className="flex items-start justify-between border-b border-gray-800/50 pb-3">
                        <div className="flex items-center gap-2 text-gray-500 mt-0.5">
                             <Building2 className="w-3.5 h-3.5" />
                             <span className="text-xs">Location</span>
                        </div>
                        <span className="text-white text-sm text-right max-w-[200px]">
                            {profile.city}, {profile.state}
                        </span>
                       </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center justify-between border-b border-gray-800/50 pb-3">
                        <div className="flex items-center gap-2 text-gray-500">
                             <Phone className="w-3.5 h-3.5" />
                             <span className="text-xs">Phone</span>
                        </div>
                        <span className="text-white text-sm">{profile.phone}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center justify-between border-b border-gray-800/50 pb-3">
                        <div className="flex items-center gap-2 text-gray-500">
                             <Globe className="w-3.5 h-3.5" />
                             <span className="text-xs">Website</span>
                        </div>
                        <a 
                          href={profile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm truncate max-w-[200px]"
                        >
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-[#1A1A1A] rounded p-2 text-center">
                        <span className="text-gray-500 text-[10px] block uppercase">CIK</span>
                        <span className="text-white text-xs font-mono">{profile.cik || '-'}</span>
                      </div>
                      <div className="bg-[#1A1A1A] rounded p-2 text-center">
                        <span className="text-gray-500 text-[10px] block uppercase">ISIN</span>
                        <span className="text-white text-xs font-mono truncate">{profile.isin || '-'}</span>
                      </div>
                      <div className="bg-[#1A1A1A] rounded p-2 text-center">
                        <span className="text-gray-500 text-[10px] block uppercase">CUSIP</span>
                        <span className="text-white text-xs font-mono">{profile.cusip || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {profile.isEtf && (
                  <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium rounded-lg">ETF</span>
                )}
                {profile.isFund && (
                  <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium rounded-lg">Fund</span>
                )}
                {profile.isAdr && (
                  <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium rounded-lg">ADR</span>
                )}
                <span className="px-3 py-1 bg-gray-800/50 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg">
                  {profile.currency}
                </span>
                <span className="px-3 py-1 bg-gray-800/50 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg">
                  {profile.country}
                </span>
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {!profile && !searchResults.length && !isLoading && recentSearches.length > 0 && (
            <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Recent Searches
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSearches.map((company) => (
                  <button
                    key={company.symbol}
                    onClick={() => handleQuickLookup(company.symbol)}
                    className="flex items-center gap-3 p-3 bg-[#1A1A1A] hover:bg-[#252525] border border-gray-800 rounded-xl transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                      {company.image && !company.defaultImage ? (
                        <Image
                          src={company.image}
                          alt={company.companyName}
                          width={32}
                          height={32}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate text-sm">{company.companyName}</p>
                      <p className="text-xs text-gray-500 font-mono">{company.symbol} • {company.sector}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State Instructions */}
          {!profile && !searchResults.length && !isLoading && !error && recentSearches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
               <div className="w-16 h-16 bg-[#0D0D0D] rounded-full flex items-center justify-center mb-4 border border-gray-800">
                    <Search className="w-8 h-8 opacity-40" />
               </div>
              <h3 className="text-lg font-semibold text-white mb-2">Company Lookup</h3>
              <p className="text-sm max-w-sm text-center opacity-60 leading-relaxed">
                Enter a ticker symbol (e.g., AAPL) or company name to view detailed financial data, metrics, and business information.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

export default CompanyLookup;
