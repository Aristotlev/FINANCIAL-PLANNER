"use client";

import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, AlertCircle, Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { useFavoriteStocks } from '../../hooks/use-favorite-stocks';

interface EarningsEvent {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh';
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

// Common company name to ticker mappings for smart search
const COMPANY_MAPPINGS: Record<string, string> = {
  'apple': 'AAPL',
  'microsoft': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'meta': 'META',
  'facebook': 'META',
  'tesla': 'TSLA',
  'nvidia': 'NVDA',
  'netflix': 'NFLX',
  'disney': 'DIS',
  'walmart': 'WMT',
  'jpmorgan': 'JPM',
  'jp morgan': 'JPM',
  'johnson': 'JNJ',
  'johnson & johnson': 'JNJ',
  'visa': 'V',
  'mastercard': 'MA',
  'coca cola': 'KO',
  'coca-cola': 'KO',
  'pepsi': 'PEP',
  'pepsico': 'PEP',
  'intel': 'INTC',
  'amd': 'AMD',
  'advanced micro': 'AMD',
  'paypal': 'PYPL',
  'adobe': 'ADBE',
  'salesforce': 'CRM',
  'oracle': 'ORCL',
  'ibm': 'IBM',
  'cisco': 'CSCO',
  'verizon': 'VZ',
  'at&t': 'T',
  'att': 'T',
  'boeing': 'BA',
  'nike': 'NKE',
  'starbucks': 'SBUX',
  'mcdonalds': 'MCD',
  "mcdonald's": 'MCD',
  'uber': 'UBER',
  'airbnb': 'ABNB',
  'spotify': 'SPOT',
  'zoom': 'ZM',
  'snowflake': 'SNOW',
  'palantir': 'PLTR',
  'coinbase': 'COIN',
  'robinhood': 'HOOD',
  'square': 'SQ',
  'block': 'SQ',
  'shopify': 'SHOP',
  'twitter': 'X',
  'berkshire': 'BRK.B',
  'bank of america': 'BAC',
  'wells fargo': 'WFC',
  'goldman': 'GS',
  'goldman sachs': 'GS',
  'morgan stanley': 'MS',
  'blackrock': 'BLK',
  'chevron': 'CVX',
  'exxon': 'XOM',
  'exxonmobil': 'XOM',
};

type ViewMode = 'all' | 'favorites';

export function EarningsCalendar() {
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('favorites');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'beat' | 'miss'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTicker, setSearchedTicker] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    const to = new Date(today);
    to.setDate(today.getDate() + 60); // Extended range for favorites
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  });

  const { 
    favorites, 
    toggleFavorite, 
    isFavorite, 
    getFavoriteSymbols,
    favoriteCount, 
    maxFavorites, 
    canAddMore,
    isLoaded 
  } = useFavoriteStocks();

  // Convert search query to ticker symbol
  const getTickerFromQuery = (query: string): string => {
    const normalized = query.toLowerCase().trim();
    if (COMPANY_MAPPINGS[normalized]) {
      return COMPANY_MAPPINGS[normalized];
    }
    // Otherwise treat as ticker symbol (uppercase)
    return query.toUpperCase().trim();
  };

  const fetchEarningsCalendar = async (symbolOverride?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      });
      
      // Use symbolOverride if explicitly provided (including empty string to clear)
      // Otherwise, convert searchQuery for non-explicit calls
      let symbol: string;
      if (symbolOverride !== undefined) {
        symbol = symbolOverride;
      } else if (searchQuery.trim()) {
        symbol = getTickerFromQuery(searchQuery);
      } else {
        symbol = '';
      }
      
      if (symbol) {
        params.append('symbol', symbol);
      }
      
      const url = `/api/calendar/earnings?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Check for 403 / premium access error from Finnhub
      if (response.status === 403) {
        // API returned 403 - might be rate limiting or premium feature
        console.warn('Finnhub API returned 403 - may be rate limited or premium feature');
        throw new Error('Unable to fetch earnings data. Please try again in a moment.');
      }
      
      // Check for error in response body
      if (data.error && !data.success) {
        throw new Error(data.error);
      }
      
      if (data.success) {
        setEarningsEvents(data.data || []);
      } else {
        throw new Error('Failed to fetch earnings data');
      }
    } catch (err) {
      console.error('Error fetching earnings calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchEarningsCalendar();
    }
  }, [dateRange, isLoaded]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (query) {
      setIsSearching(true);
      const ticker = getTickerFromQuery(query);
      setSearchedTicker(ticker);
      fetchEarningsCalendar(ticker);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchedTicker('');
    setIsSearching(false);
    fetchEarningsCalendar('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleFavorite = (symbol: string) => {
    toggleFavorite(symbol);
  };

  const shiftDateRange = (days: number) => {
    const newFrom = new Date(dateRange.from);
    const newTo = new Date(dateRange.to);
    newFrom.setDate(newFrom.getDate() + days);
    newTo.setDate(newTo.getDate() + days);
    setDateRange({
      from: newFrom.toISOString().split('T')[0],
      to: newTo.toISOString().split('T')[0]
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatEPS = (value: number | null) => {
    if (value === null) return '—';
    return `$${value.toFixed(2)}`;
  };

  const getHourLabel = (hour: string) => {
    switch (hour) {
      case 'bmo': return { label: 'Before Open', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'amc': return { label: 'After Close', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'dmh': return { label: 'During Hours', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
      default: return { label: 'TBD', color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  const getEPSSurprise = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null) return null;
    const surprise = actual - estimate;
    const surprisePercent = estimate !== 0 ? ((surprise / Math.abs(estimate)) * 100) : 0;
    return { surprise, surprisePercent, beat: surprise > 0 };
  };

  const getRevenueSurprise = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null) return null;
    const surprise = actual - estimate;
    const surprisePercent = estimate !== 0 ? ((surprise / estimate) * 100) : 0;
    return { surprise, surprisePercent, beat: surprise > 0 };
  };

  const isUpcoming = (date: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  // Get favorite symbols for filtering
  const favoriteSymbols = getFavoriteSymbols();

  // Filter events based on view mode and filter
  const filteredEvents = earningsEvents.filter(event => {
    // If searching, show all search results (don't filter by favorites)
    if (isSearching && searchedTicker) {
      // Just apply the beat/miss/upcoming filter to search results, skip favorites filter
    } else if (viewMode === 'favorites') {
      // Only show favorites
      if (!favoriteSymbols.includes(event.symbol.toUpperCase())) {
        return false;
      }
    }
    
    // Apply filter
    if (filter === 'upcoming') return isUpcoming(event.date);
    if (filter === 'beat') {
      const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
      return epsSurprise?.beat === true;
    }
    if (filter === 'miss') {
      const epsSurprise = getEPSSurprise(event.epsActual, event.epsEstimate);
      return epsSurprise !== null && epsSurprise.beat === false;
    }
    return true;
  });

  // Limit display based on context
  const displayedEvents = (isSearching || viewMode === 'favorites') 
    ? filteredEvents 
    : filteredEvents.slice(0, 10);
  const hasMoreEvents = !isSearching && viewMode === 'all' && filteredEvents.length > 10;

  const upcomingCount = filteredEvents.filter(e => isUpcoming(e.date)).length;
  const reportedCount = filteredEvents.filter(e => e.epsActual !== null).length;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5 text-green-400" />
          Earnings Calendar
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">{favoriteCount}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-500">{maxFavorites}</span>
          </div>
          <button
            onClick={() => fetchEarningsCalendar()}
            disabled={loading}
            className="p-2 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Mode Toggle & Search */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* View Mode Toggle */}
        <div className="flex bg-[#212121] rounded-lg p-1 border border-[#2A2A2A]">
          <button
            onClick={() => { setViewMode('favorites'); setIsSearching(false); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'favorites' && !isSearching
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            My Watchlist
          </button>
          <button
            onClick={() => { setViewMode('all'); setIsSearching(false); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'all' && !isSearching
                ? 'bg-green-500/20 text-green-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            All Earnings
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#212121] rounded-lg px-3 py-2 border border-[#2A2A2A] flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search company or ticker..."
            className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 flex-1"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={handleClearSearch} 
              className="text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2"
          >
            Search
          </button>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDateRange(-30)}
            className="p-2 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400 px-1 whitespace-nowrap">
            {new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => shiftDateRange(30)}
            className="p-2 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 ml-auto">
          {(['all', 'upcoming'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === status 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Indicator */}
      {isSearching && searchedTicker && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Search className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-400">
            Searching for <span className="font-mono font-bold">{searchedTicker}</span>
            {searchQuery.toLowerCase() !== searchedTicker.toLowerCase() && (
              <span className="text-gray-500"> (from "{searchQuery}")</span>
            )}
            {' '}— {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''} found
          </span>
          <button onClick={handleClearSearch} className="ml-auto text-xs text-blue-400 hover:text-blue-300">
            Clear search
          </button>
        </div>
      )}

      <div className="flex-1 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden flex flex-col shadow-lg">
        {/* Header */}
        <div className="grid grid-cols-13 p-4 border-b border-[#2A2A2A] text-sm font-medium text-gray-400 bg-[#212121]">
          <div className="col-span-1"></div>
          <div className="col-span-1">Date</div>
          <div className="col-span-2">Symbol</div>
          <div className="col-span-1 text-center">Time</div>
          <div className="col-span-1 text-center">Q</div>
          <div className="col-span-2 text-right">EPS Est.</div>
          <div className="col-span-2 text-right">EPS Act.</div>
          <div className="col-span-3 text-right">Revenue</div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin opacity-50 mb-2" />
              <p>Loading earnings...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 opacity-50 mb-2 text-red-400" />
              <p className="text-red-400">{error}</p>
              <button 
                onClick={() => fetchEarningsCalendar()}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
              >
                Try again
              </button>
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              {viewMode === 'favorites' && !isSearching ? (
                <>
                  <Star className="w-10 h-10 opacity-20 mb-3" />
                  <p className="text-lg font-medium text-gray-400">No favorites yet</p>
                  <p className="text-sm text-gray-600 mt-1 max-w-md">
                    Search for companies and click the star icon to add them to your watchlist. 
                    Track up to {maxFavorites} stocks.
                  </p>
                  <button 
                    onClick={() => setViewMode('all')}
                    className="mt-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                  >
                    Browse All Earnings
                  </button>
                </>
              ) : (
                <>
                  <Calendar className="w-8 h-8 opacity-20 mb-2" />
                  <p>No earnings events found</p>
                  {searchQuery && (
                    <button 
                      onClick={handleClearSearch}
                      className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Clear search
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
                {displayedEvents.map((earnings, index) => {
                  const epsSurprise = getEPSSurprise(earnings.epsActual, earnings.epsEstimate);
                  const revenueSurprise = getRevenueSurprise(earnings.revenueActual, earnings.revenueEstimate);
                  const hourInfo = getHourLabel(earnings.hour);
                  const upcoming = isUpcoming(earnings.date);
                  const isFav = isFavorite(earnings.symbol);
                  
                  return (
                    <div
                      key={`${earnings.symbol}-${earnings.date}-${index}`}
                      className={`grid grid-cols-13 p-4 hover:bg-[#252525] transition-colors text-sm items-center ${
                        !upcoming ? 'opacity-70' : ''
                      }`}
                    >
                      {/* Favorite Star */}
                      <div className="col-span-1">
                        <button
                          onClick={() => handleToggleFavorite(earnings.symbol)}
                          className={`p-1 rounded transition-colors ${
                            isFav 
                              ? 'text-yellow-400 hover:text-yellow-300' 
                              : 'text-gray-600 hover:text-gray-400'
                          }`}
                          title={isFav ? 'Remove from watchlist' : canAddMore ? 'Add to watchlist' : 'Watchlist full (50 max)'}
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Date */}
                      <div className="col-span-1">
                        <div className="flex flex-col">
                          <span className={`font-medium ${upcoming ? 'text-white' : 'text-gray-400'}`}>
                            {new Date(earnings.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-600">
                            {earnings.year}
                          </span>
                        </div>
                      </div>

                      {/* Symbol */}
                      <div className="col-span-2">
                        <span className="font-mono text-cyan-400 font-bold text-base">
                          {earnings.symbol}
                        </span>
                      </div>

                      {/* Time */}
                      <div className="col-span-1 text-center">
                        {earnings.hour ? (
                          <span className={`text-xs px-2 py-1 rounded ${hourInfo.bg} ${hourInfo.color}`}>
                            {earnings.hour.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </div>

                      {/* Quarter */}
                      <div className="col-span-1 text-center">
                        <span className="text-gray-400 font-mono">
                          Q{earnings.quarter}
                        </span>
                      </div>

                      {/* EPS Estimate */}
                      <div className="col-span-2 text-right">
                        <span className="text-gray-300 font-mono">
                          {formatEPS(earnings.epsEstimate)}
                        </span>
                      </div>

                      {/* EPS Actual + Surprise */}
                      <div className="col-span-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono font-medium ${
                            epsSurprise === null ? 'text-gray-500' :
                            epsSurprise.beat ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatEPS(earnings.epsActual)}
                          </span>
                          {epsSurprise && (
                            <span className={`text-xs flex items-center gap-0.5 ${
                              epsSurprise.beat ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {epsSurprise.beat ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {epsSurprise.beat ? '+' : ''}{epsSurprise.surprisePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="col-span-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          {/* Actual Revenue - Primary display */}
                          {earnings.revenueActual !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono text-sm font-semibold ${
                                revenueSurprise === null ? 'text-white' :
                                revenueSurprise.beat ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatCurrency(earnings.revenueActual)}
                              </span>
                              {revenueSurprise && (
                                <span className={`text-xs flex items-center gap-0.5 ${
                                  revenueSurprise.beat ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {revenueSurprise.beat ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                  {revenueSurprise.beat ? '+' : ''}{revenueSurprise.surprisePercent.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs italic">Pending</span>
                          )}
                          {/* Estimate - Secondary display */}
                          {earnings.revenueEstimate !== null && (
                            <span className="text-[11px] text-gray-500">
                              Est: {formatCurrency(earnings.revenueEstimate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Show message when there are more events */}
                {hasMoreEvents && (
                  <div className="p-4 text-center border-t border-[#2A2A2A] bg-[#1A1A1A]">
                    <p className="text-gray-500 text-sm">
                      Showing 10 of {filteredEvents.length} earnings
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Search for a specific company or add to your watchlist
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600 px-1 flex justify-between items-center">
        <p>* Non-GAAP figures. BMO = Before Market Open, AMC = After Market Close</p>
        <p>
          {viewMode === 'favorites' && !isSearching && (
            <span className="text-yellow-500/70">
              Tracking {favoriteCount} of {maxFavorites} stocks
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
