"use client";

import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, Building2, DollarSign, ExternalLink, MapPin, Calendar, Shield, Plane, GraduationCap, Factory, Globe, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface USASpendingActivity {
  actionDate: string;
  awardDescription: string;
  awardingAgencyName: string;
  awardingOfficeName: string;
  awardingSubAgencyName: string;
  country: string;
  naicsCode: string;
  performanceCity: string;
  performanceCongressionalDistrict: string;
  performanceCountry: string;
  performanceCounty: string;
  performanceEndDate: string;
  performanceStartDate: string;
  performanceState: string;
  performanceZipCode: string;
  permalink: string;
  recipientName: string;
  recipientParentName: string;
  symbol: string;
  totalValue: number;
}

interface USASpendingResponse {
  data: USASpendingActivity[];
  symbol: string;
}

interface CachedUSASpendingData {
  activities: USASpendingActivity[];
  timestamp: number;
  version: number;
  symbols: string[];
}

const CACHE_KEY = 'omnifolio_usa_spending_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_VERSION = 1;

// Top government contractors - Defense, Aerospace, Tech, Healthcare
const DEFAULT_SYMBOLS = [
  // Defense & Aerospace (top contractors)
  'LMT', 'RTX', 'BA', 'NOC', 'GD', 'LHX', 'HII', 'TXT', 'TDG',
  // Tech with gov contracts
  'MSFT', 'AMZN', 'GOOGL', 'ORCL', 'IBM', 'PLTR', 'CRM',
  // Healthcare gov contractors
  'UNH', 'HUM', 'CVS', 'CI', 'MCK',
  // Engineering & Construction
  'FLR', 'J', 'KBR', 'LDOS', 'SAIC',
];

// Agency icon mapping
const getAgencyIcon = (agencyName: string) => {
  const lowerName = agencyName?.toLowerCase() || '';
  if (lowerName.includes('defense') || lowerName.includes('army') || lowerName.includes('navy') || lowerName.includes('air force')) {
    return <Shield className="w-4 h-4 text-red-400" />;
  }
  if (lowerName.includes('nasa') || lowerName.includes('aerospace')) {
    return <Plane className="w-4 h-4 text-blue-400" />;
  }
  if (lowerName.includes('education')) {
    return <GraduationCap className="w-4 h-4 text-green-400" />;
  }
  if (lowerName.includes('health') || lowerName.includes('hhs')) {
    return <Factory className="w-4 h-4 text-pink-400" />;
  }
  return <Building2 className="w-4 h-4 text-gray-400" />;
};

export function USASpendingView() {
  const [activities, setActivities] = useState<USASpendingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [agencyFilter, setAgencyFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const itemsPerPage = 50;

  // Load from localStorage cache
  const loadFromCache = useCallback((): CachedUSASpendingData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedUSASpendingData = JSON.parse(cached);
      
      if (data.version !== CACHE_VERSION) return null;
      if (Date.now() - data.timestamp > CACHE_DURATION) return null;
      
      return data;
    } catch {
      return null;
    }
  }, []);

  // Save to localStorage cache
  const saveToCache = useCallback((activities: USASpendingActivity[], symbols: string[]) => {
    try {
      const cacheData: CachedUSASpendingData = {
        activities,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        symbols
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to cache USA spending data:', err);
    }
  }, []);

  const fetchUSASpending = useCallback(async (forceRefresh = false, customSymbol?: string) => {
    // If searching for a specific symbol, just fetch that one
    if (customSymbol) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/finnhub/usa-spending?symbol=${customSymbol}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data: USASpendingResponse = await response.json();
        
        // Merge with existing activities, deduplicate
        setActivities(prev => {
          const existing = prev.filter(a => a.symbol !== customSymbol);
          const merged = [...existing, ...(data.data || [])];
          // Sort by action date (newest first)
          return merged.sort((a, b) => 
            new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()
          );
        });
        setSymbolFilter(customSymbol);
      } catch (err) {
        setError(`Failed to fetch ${customSymbol} USA spending data`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log(`USA Spending: Loaded ${cached.activities.length} from cache`);
        setActivities(cached.activities);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setFetchProgress('Starting...');

    try {
      const allActivities: USASpendingActivity[] = [];
      const symbols = DEFAULT_SYMBOLS;
      
      // Batch fetch - 3 symbols at a time with delays to respect rate limits
      const batchSize = 3;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        setFetchProgress(`Fetching ${i + 1}-${Math.min(i + batchSize, symbols.length)} of ${symbols.length} contractors...`);
        
        const results = await Promise.all(
          batch.map(async (symbol, idx) => {
            // Small stagger between requests
            await new Promise(resolve => setTimeout(resolve, idx * 150));
            
            try {
              const response = await fetch(`/api/finnhub/usa-spending?symbol=${symbol}`);
              if (!response.ok) {
                if (response.status === 429) {
                  console.warn(`Rate limited on ${symbol}, skipping...`);
                  return [];
                }
                return [];
              }
              const data: USASpendingResponse = await response.json();
              return data.data || [];
            } catch {
              return [];
            }
          })
        );
        
        results.flat().forEach(a => allActivities.push(a));
        
        // Pause between batches to avoid rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by action date (newest first)
      const sortedActivities = allActivities.sort((a, b) => 
        new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()
      );

      console.log(`USA Spending: Fetched ${sortedActivities.length} contracts from ${symbols.length} symbols`);
      
      // Cache results
      saveToCache(sortedActivities, symbols);
      
      setActivities(sortedActivities);
      setLastUpdated(new Date());
      setFetchProgress('');
    } catch (err) {
      console.error('Error fetching USA spending:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Try stale cache on error
      const cached = loadFromCache();
      if (cached) {
        setActivities(cached.activities);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchUSASpending();
  }, [fetchUSASpending]);

  useEffect(() => {
    setCurrentPage(1);
  }, [symbolFilter, agencyFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const symbol = searchInput.toUpperCase().trim();
      fetchUSASpending(false, symbol);
      setSearchInput('');
    }
  };

  const clearFilters = () => {
    setSymbolFilter('');
    setAgencyFilter('');
    setCurrentPage(1);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(a => {
    const symbolMatch = !symbolFilter || a.symbol === symbolFilter;
    const agencyMatch = !agencyFilter || a.awardingAgencyName === agencyFilter;
    return symbolMatch && agencyMatch;
  });

  // Calculate stats
  const totalContractValue = activities.reduce((sum, a) => sum + (a.totalValue || 0), 0);
  const uniqueContractors = new Set(activities.map(a => a.symbol)).size;
  const uniqueAgencies = new Set(activities.map(a => a.awardingAgencyName)).size;

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique symbols and agencies for quick filters
  const uniqueSymbols = [...new Set(activities.map(a => a.symbol))].sort();
  const uniqueAgenciesList = [...new Set(activities.map(a => a.awardingAgencyName))].filter(Boolean).sort();

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          USA Government Spending
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Contractors:</span>
            <span className="text-blue-400 font-semibold">{uniqueContractors}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Agencies:</span>
            <span className="text-purple-400 font-semibold">{uniqueAgencies}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Total Value:</span>
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalContractValue)}</span>
          </div>
          <button
            onClick={() => fetchUSASpending(true)}
            disabled={loading}
            className="p-2 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search contractor by ticker (e.g., LMT, BA, RTX)..."
              className="w-full bg-[#0D0D0D] border border-gray-800 text-white text-sm rounded-lg focus:ring-0 focus:border-gray-700 focus:outline-none block pl-10 p-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:ring-0 focus:outline-none transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </form>
        
        {/* Quick Symbol Filters */}
        {uniqueSymbols.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 py-1 whitespace-nowrap">Contractors:</span>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none">
              {(symbolFilter || agencyFilter) && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-1 text-xs rounded-md bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  Clear filters ×
                </button>
              )}
              {uniqueSymbols.map(sym => (
                <button
                  key={sym}
                  onClick={() => setSymbolFilter(symbolFilter === sym ? '' : sym)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                    symbolFilter === sym
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Agency Filters */}
        {uniqueAgenciesList.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500 py-1 whitespace-nowrap">Agencies:</span>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none">
              {uniqueAgenciesList.map(agency => (
                <button
                  key={agency}
                  onClick={() => setAgencyFilter(agencyFilter === agency ? '' : agency)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                    agencyFilter === agency
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
                  }`}
                >
                  {getAgencyIcon(agency)}
                  <span className="truncate max-w-[150px]">{agency}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info + Pagination */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Federal contracts from USASpending.gov - Defense, Aerospace, Education & more</span>
        </div>
        
        {/* Pagination at top */}
        <div className="flex items-center gap-2">
          {fromCache && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80 mr-2">
              <Database className="w-3 h-3" />
              <span>Cached</span>
            </div>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500 mr-2">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {filteredActivities.length} contracts
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400 min-w-[60px] text-center">
            {currentPage} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#1A1A1A] rounded-xl border border-gray-800">
        {loading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-gray-400 text-sm">{fetchProgress || 'Loading government contracts...'}</span>
          </div>
        ) : error && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-red-400">{error}</span>
            <button
              onClick={() => fetchUSASpending(true)}
              className="px-4 py-2 bg-emerald-600 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <DollarSign className="w-12 h-12 mb-3 opacity-30" />
            <p>No government contracts found</p>
            {(symbolFilter || agencyFilter) && (
              <button
                onClick={clearFilters}
                className="mt-2 text-emerald-400 text-sm hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#212121] sticky top-0 z-10">
              <tr className="text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Contractor</th>
                <th className="px-4 py-3 text-left">Awarding Agency</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Contract Value</th>
                <th className="px-4 py-3 text-center">Action Date</th>
                <th className="px-4 py-3 text-center">Performance</th>
                <th className="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedActivities.map((activity, idx) => {
                  const location = [activity.performanceCity, activity.performanceState].filter(Boolean).join(', ');
                  
                  return (
                    <motion.tr
                      key={`${activity.symbol}-${activity.actionDate}-${activity.recipientName}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-gray-800/50 hover:bg-[#212121]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSymbolFilter(activity.symbol)}
                          className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="text-left">
                            <span className="font-semibold text-white block">{activity.symbol}</span>
                            <span className="text-xs text-gray-500 truncate max-w-[120px] block" title={activity.recipientName}>
                              {activity.recipientName}
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAgencyFilter(activity.awardingAgencyName)}
                          className="flex items-center gap-2 hover:text-purple-400 transition-colors"
                        >
                          {getAgencyIcon(activity.awardingAgencyName)}
                          <div className="text-left">
                            <span className="text-gray-300 truncate max-w-[150px] block text-xs" title={activity.awardingAgencyName}>
                              {activity.awardingAgencyName || '-'}
                            </span>
                            {activity.awardingSubAgencyName && (
                              <span className="text-xs text-gray-500 truncate max-w-[150px] block" title={activity.awardingSubAgencyName}>
                                {activity.awardingSubAgencyName}
                              </span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 truncate max-w-[200px] block text-xs" title={activity.awardDescription}>
                          {activity.awardDescription || '-'}
                        </span>
                        {activity.naicsCode && (
                          <span className="text-xs text-gray-600">NAICS: {activity.naicsCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${activity.totalValue > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {formatCurrency(activity.totalValue)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-300 text-xs">
                            {formatDate(activity.actionDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {location ? (
                          <div className="flex items-center justify-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-400 text-xs truncate max-w-[100px]" title={location}>
                              {location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                        {activity.performanceStartDate && activity.performanceEndDate && (
                          <span className="text-xs text-gray-600 block">
                            {formatDate(activity.performanceStartDate)} - {formatDate(activity.performanceEndDate)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {activity.permalink ? (
                          <a
                            href={activity.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          
          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
