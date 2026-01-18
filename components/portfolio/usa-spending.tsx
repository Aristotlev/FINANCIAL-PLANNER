"use client";

import { useEffect, useState, useMemo } from 'react';
import { DollarSign, Search, ExternalLink, FileText, Calendar, Building2, Loader2, RefreshCw, AlertCircle, MapPin, Award, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { tickerDomains } from '@/lib/ticker-domains';

// Generate a consistent color based on ticker
const getTickerColor = (ticker: string): string => {
  const colors = [
    'from-green-500 to-green-700',
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
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

// Company Icon Component - Same approach as SEC EDGAR page
const CompanyIcon = ({ ticker, className = "h-8 w-8", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
  const safeTicker = ticker || '';
  const upperTicker = safeTicker.toUpperCase();
  
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  
  // Build list of image sources to try
  const imageSources = useMemo(() => {
    if (!safeTicker) return [];
    
    const sources: string[] = [];
    
    // 1. Known domain from our mapping
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    
    // 2. Try logo.dev API (free tier, good coverage)
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    
    // 3. Try common domain patterns
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${safeTicker.toLowerCase()}.com&size=128`);
    
    return sources;
  }, [upperTicker, safeTicker]);
  
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [safeTicker]);
  
  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };
  
  // Safety check for undefined/null ticker - after hooks
  if (!safeTicker) {
    if (!showPlaceholder) return null;
    return (
      <div className={`${className} rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center font-bold text-white shadow-lg text-xs`}>
        ??
      </div>
    );
  }
  
  if (!imageError && imageSources.length > 0) {
    return (
      <img 
        src={imageSources[fallbackIndex]}
        alt={`${safeTicker} logo`} 
        className={`${className} rounded-lg object-contain bg-white p-1`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={`${className} rounded-lg bg-gradient-to-br ${getTickerColor(safeTicker)} flex items-center justify-center font-bold text-white shadow-lg text-xs`}>
      {safeTicker.slice(0, 2)}
    </div>
  );
};

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

// Popular defense, aerospace, and education contractors
const POPULAR_SYMBOLS = ['LMT', 'BA', 'RTX', 'NOC', 'GD', 'AAPL', 'MSFT', 'GOOG', 'AMZN', 'IBM'];
const ITEMS_PER_PAGE = 50;

export function USASpending() {
  const [activities, setActivities] = useState<USASpendingActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize with default date range (last 2 years)
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    
    setDateRange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
  }, []);

  const fetchUSASpendingData = async (symbol: string) => {
    if (!symbol.trim()) return;
    
    setLoading(true);
    setError(null);
    setSelectedSymbol(symbol.toUpperCase());
    
    try {
      const params = new URLSearchParams({
        operation: 'usa-spending',
        symbol: symbol.toUpperCase(),
        from: dateRange.from,
        to: dateRange.to
      });
      
      const response = await fetch(`/api/finnhub?${params}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch USA spending data');
      }
      
      setActivities(result.data?.data || []);
    } catch (err: any) {
      console.error('Error fetching USA spending data:', err);
      setError(err.message || 'Failed to fetch USA spending data');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      fetchUSASpendingData(searchSymbol.trim());
    }
  };

  const handleQuickSelect = (symbol: string) => {
    setSearchSymbol(symbol);
    fetchUSASpendingData(symbol);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Memoized calculations to avoid recalculating on every render
  const totalContractValue = useMemo(() => 
    activities.reduce((sum, a) => sum + (a.totalValue || 0), 0), 
    [activities]
  );
  
  const uniqueAgencies = useMemo(() => 
    new Set(activities.map(a => a.awardingAgencyName)).size, 
    [activities]
  );

  // Pagination
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return activities.slice(start, start + ITEMS_PER_PAGE);
  }, [activities, currentPage]);

  // Reset pagination when activities change
  useEffect(() => {
    setCurrentPage(1);
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
          <DollarSign className="w-6 h-6 text-blue-400" />
          USA Government Spending
        </h2>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300">
              Track government contract awards from the USASpending dataset. This data is especially valuable for analyzing 
              <span className="text-blue-400 font-medium"> Defense</span>, 
              <span className="text-indigo-400 font-medium"> Aerospace</span>, and 
              <span className="text-purple-400 font-medium"> Education</span> sector companies.
            </p>
            <p className="text-xs text-gray-500 mt-1">Only recent data is available via API. Historical data (pre-2024) available at usaspending.gov</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., LMT, BA, RTX)"
                className="w-full pl-10 pr-4 py-3 bg-[#212121] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchSymbol.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">Date Range:</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1.5 bg-[#212121] border border-[#333] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1.5 bg-[#212121] border border-[#333] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick Select */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">Defense & Tech:</span>
            {POPULAR_SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => handleQuickSelect(symbol)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-[#212121] border-[#333] text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Summary Stats */}
      {selectedSymbol && activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Contracts</p>
                <p className="text-xl font-bold text-white">{activities.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Contract Value</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(totalContractValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Briefcase className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Awarding Agencies</p>
                <p className="text-xl font-bold text-white">{uniqueAgencies}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 p-4 border-b border-[#2A2A2A] text-sm font-medium text-gray-400 bg-[#212121]">
          <div className="col-span-3">Recipient</div>
          <div className="col-span-3">Award Description</div>
          <div className="col-span-2">Agency</div>
          <div className="col-span-2 text-right">Contract Value</div>
          <div className="col-span-2 text-right">Details</div>
        </div>

        {/* Content */}
        <div className="divide-y divide-[#2A2A2A] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading government spending data for {selectedSymbol}...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={() => selectedSymbol && fetchUSASpendingData(selectedSymbol)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : !selectedSymbol ? (
            <div className="p-12 text-center">
              <DollarSign className="w-8 h-8 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Search for a stock symbol to view government contract awards</p>
              <p className="text-sm text-gray-500 mt-2">
                Discover companies winning big government contracts in Defense, Aerospace, and Education
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No government contracts found for {selectedSymbol}</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting the date range or searching for a different symbol
              </p>
            </div>
          ) : (
            <>
              {paginatedActivities.map((activity, index) => (
                <div
                  key={`${activity.symbol}-${activity.actionDate}-${index}`}
                  className="grid grid-cols-12 p-4 hover:bg-[#252525] transition-colors text-sm items-start"
                >
                  <div className="col-span-3">
                    <div className="flex items-start gap-3">
                      <CompanyIcon ticker={activity.symbol || selectedSymbol || 'N/A'} className="h-8 w-8 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{activity.recipientName}</p>
                        <p className="text-xs text-gray-500 truncate">{activity.recipientParentName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {activity.performanceCity}, {activity.performanceState}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <p className="text-gray-300 line-clamp-2">
                      {activity.awardDescription || 'No description available'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      NAICS: {activity.naicsCode || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white text-xs font-medium truncate">{activity.awardingAgencyName}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{activity.awardingSubAgencyName}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {formatDate(activity.actionDate)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-blue-400 font-mono font-bold">
                      {formatCurrency(activity.totalValue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(activity.performanceStartDate)} - {formatDate(activity.performanceEndDate)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    {activity.permalink ? (
                      <a
                        href={activity.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        USASpending
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">No link</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {activities.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between p-4 border-t border-[#2A2A2A] bg-[#212121]">
            <p className="text-sm text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, activities.length)} of {activities.length} contracts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#1A1A1A] border border-[#333] text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-[#1A1A1A] border border-[#333] text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-600 px-1">
        <p>* Data sourced from USASpending.gov via Finnhub API.</p>
        <p>* Only recent data is available. For historical data (pre-2021), visit usaspending.gov directly.</p>
      </div>
    </div>
  );
}
