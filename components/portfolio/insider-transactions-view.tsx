"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Users, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tickerDomains } from '@/lib/ticker-domains';
import { cn } from '@/lib/utils';

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

// Company Icon Component
const CompanyIcon = ({ ticker, className = "h-8 w-8", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
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
        className={cn(className, "rounded-lg object-contain bg-white p-0.5")}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={cn(className, `rounded-lg bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg text-xs`)}>
      {ticker.slice(0, 2)}
    </div>
  );
};

interface InsiderTransaction {
  change: number;
  filingDate: string;
  name: string;
  share: number;
  symbol: string;
  transactionCode: string;
  transactionDate: string;
  transactionPrice: number;
}

interface InsiderTransactionsResponse {
  data: InsiderTransaction[];
  symbol: string;
  source?: 'api' | 'cache';
}

interface CachedInsiderData {
  transactions: InsiderTransaction[];
  timestamp: number;
  version: number;
  symbols: string[];
}

const CACHE_KEY = 'omnifolio_insider_transactions_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_VERSION = 1;

// Transaction code descriptions
const TRANSACTION_CODES: Record<string, { label: string; type: 'buy' | 'sell' | 'other' }> = {
  'P': { label: 'Purchase', type: 'buy' },
  'S': { label: 'Sale', type: 'sell' },
  'A': { label: 'Award/Grant', type: 'other' },
  'D': { label: 'Sale to Issuer', type: 'sell' },
  'F': { label: 'Tax Withholding', type: 'sell' },
  'I': { label: 'Discretionary', type: 'other' },
  'M': { label: 'Option Exercise', type: 'buy' },
  'C': { label: 'Conversion', type: 'other' },
  'E': { label: 'Expiration', type: 'other' },
  'G': { label: 'Gift', type: 'other' },
  'H': { label: 'Expiration (Short)', type: 'other' },
  'O': { label: 'Out-of-the-Money', type: 'other' },
  'X': { label: 'Option Exercise', type: 'buy' },
  'J': { label: 'Other', type: 'other' },
  'K': { label: 'Swap', type: 'other' },
  'L': { label: 'Small Acquisition', type: 'buy' },
  'W': { label: 'Will/Inheritance', type: 'other' },
  'Z': { label: 'Trust', type: 'other' },
  'U': { label: 'Tender', type: 'other' },
};

// Popular stocks to track
const DEFAULT_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'JPM', 'BAC', 'GS', 'BRK.B', 'V', 'MA',
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK',
  'WMT', 'HD', 'NKE', 'SBUX', 'MCD', 'DIS',
  'XOM', 'CVX', 'COP',
  'BA', 'CAT', 'GE', 'HON',
];

export function InsiderTransactionsView() {
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'other'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const itemsPerPage = 50;

  // Load from localStorage cache
  const loadFromCache = useCallback((): CachedInsiderData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedInsiderData = JSON.parse(cached);
      
      if (data.version !== CACHE_VERSION) return null;
      if (Date.now() - data.timestamp > CACHE_DURATION) return null;
      
      return data;
    } catch {
      return null;
    }
  }, []);

  // Save to localStorage cache
  const saveToCache = useCallback((transactions: InsiderTransaction[], symbols: string[]) => {
    try {
      const cacheData: CachedInsiderData = {
        transactions,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        symbols
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to cache insider transactions:', err);
    }
  }, []);

  const fetchInsiderTransactions = useCallback(async (forceRefresh = false, customSymbol?: string) => {
    // If searching for a specific symbol, just fetch that one
    if (customSymbol) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/finnhub/insider-transactions?symbol=${customSymbol}&limit=100`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data: InsiderTransactionsResponse = await response.json();
        
        if (data.source === 'cache') {
          setFromCache(true);
        }

        // Merge with existing transactions, deduplicate
        setTransactions(prev => {
          const existing = prev.filter(t => t.symbol !== customSymbol);
          const merged = [...existing, ...(data.data || [])];
          return merged.sort((a, b) => 
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
          );
        });
        setSymbolFilter(customSymbol);
      } catch (err) {
        setError(`Failed to fetch ${customSymbol} insider transactions`);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        setTransactions(cached.transactions);
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
      const allTransactions: InsiderTransaction[] = [];
      const symbols = DEFAULT_SYMBOLS;
      const batchSize = 3;

      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        setFetchProgress(`Fetching ${i + 1}-${Math.min(i + batchSize, symbols.length)} of ${symbols.length} symbols...`);
        
        const results = await Promise.all(
          batch.map(async (symbol, idx) => {
            await new Promise(resolve => setTimeout(resolve, idx * 150));
            try {
              const response = await fetch(`/api/finnhub/insider-transactions?symbol=${symbol}&limit=100`);
              if (!response.ok) return [];
              const data: InsiderTransactionsResponse = await response.json();
              if (data.source === 'cache') setFromCache(true);
              return data.data || [];
            } catch {
              return [];
            }
          })
        );
        
        results.flat().forEach(t => allTransactions.push(t));
        
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const sortedTransactions = allTransactions.sort((a, b) => 
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
      
      saveToCache(sortedTransactions, symbols);
      setTransactions(sortedTransactions);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      const cached = loadFromCache();
      if (cached) {
        setTransactions(cached.transactions);
        setFromCache(true);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchInsiderTransactions();
  }, [fetchInsiderTransactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, symbolFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const symbol = searchInput.toUpperCase().trim();
      fetchInsiderTransactions(false, symbol);
      setSearchInput('');
    }
  };

  const clearSymbolFilter = () => {
    setSymbolFilter('');
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    if (!value) return '-';
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatShares = (value: number) => {
    if (!value) return '-';
    const absValue = Math.abs(value);
    if (absValue >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getTransactionType = (code: string): 'buy' | 'sell' | 'other' => {
    return TRANSACTION_CODES[code]?.type || 'other';
  };

  const getTransactionLabel = (code: string): string => {
    return TRANSACTION_CODES[code]?.label || code;
  };

  const getTransactionColor = (code: string) => {
    const type = getTransactionType(code);
    switch (type) {
      case 'buy': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'sell': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getTransactionIcon = (code: string) => {
    const type = getTransactionType(code);
    switch (type) {
      case 'buy': return <ArrowUpRight className="w-3 h-3" />;
      case 'sell': return <ArrowDownRight className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const typeMatch = filter === 'all' || getTransactionType(t.transactionCode) === filter;
    const symbolMatch = !symbolFilter || t.symbol === symbolFilter;
    return typeMatch && symbolMatch;
  });

  const buyCount = transactions.filter(t => getTransactionType(t.transactionCode) === 'buy').length;
  const sellCount = transactions.filter(t => getTransactionType(t.transactionCode) === 'sell').length;
  const totalValue = transactions.reduce((sum, t) => {
    const value = Math.abs(t.change) * (t.transactionPrice || 0);
    return sum + value;
  }, 0);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueSymbols = [...new Set(transactions.map(t => t.symbol))].sort();

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Users className="w-6 h-6 text-blue-400" />
            Insider Transactions
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
             Track buying and selling activity by corporate insiders
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-4 mr-4 text-xs font-medium bg-[#1A1A1A] p-2 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-400">Buys:</span>
                    <span className="text-white">{buyCount}</span>
                </div>
                <div className="w-px h-3 bg-gray-700"></div>
                <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-gray-400">Sells:</span>
                    <span className="text-white">{sellCount}</span>
                </div>
                <div className="w-px h-3 bg-gray-700"></div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">Volume:</span>
                    <span className="text-blue-400">{formatCurrency(totalValue)}</span>
                </div>
             </div>

            <button
                onClick={() => fetchInsiderTransactions(true)}
                disabled={loading}
                className="p-2.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 border border-gray-800 hover:border-gray-700"
                title="Refresh data"
            >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search ticker (e.g. NVDA)..."
                className="w-full pl-10 pr-4 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />
            </div>
             <button
              type="submit"
              disabled={loading}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                loading || !searchInput.trim()
                  ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                  : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
              )}
            >
               Search
            </button>
        </form>

        {/* Categories */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
            <div className="flex gap-2">
                {(['all', 'buy', 'sell', 'other'] as const).map((type) => (
                    <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize flex items-center gap-1.5",
                        filter === type 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-[#1A1A1A] text-gray-500 hover:text-gray-300 border border-transparent hover:bg-[#222]'
                    )}
                    >
                        {filter === type && (
                             type === 'buy' ? <ArrowUpRight className="w-3 h-3" /> :
                             type === 'sell' ? <ArrowDownRight className="w-3 h-3" /> :
                             <div className="w-1 h-1 rounded-full bg-current" />
                        )}
                        {type}
                    </button>
                ))}
            </div>

            {uniqueSymbols.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto max-w-[400px] no-scrollbar">
                    {symbolFilter && (
                         <button
                         onClick={clearSymbolFilter}
                         className="px-2 py-1 text-[10px] rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 whitespace-nowrap"
                        >
                            Clear {symbolFilter}
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-[#1A1A1A] rounded-xl border border-gray-800 flex flex-col">
          {/* Table Header */}
          <div className="border-b border-gray-800">
             <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-2">Symbol</div>
                <div className="col-span-3">Insider Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2 text-right">Shares</div>
                <div className="col-span-1 text-right">Value</div>
                <div className="col-span-2 text-right">Date</div>
             </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading && transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-400 text-sm">{fetchProgress || 'Loading insider data...'}</p>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p>No transactions found matching your criteria</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-800/50">
                    <AnimatePresence mode="popLayout">
                        {paginatedTransactions.map((transaction, idx) => {
                             const transactionValue = Math.abs(transaction.change) * (transaction.transactionPrice || 0);
                             const type = getTransactionType(transaction.transactionCode);

                             return (
                                <motion.div
                                    key={`${transaction.symbol}-${transaction.name}-${transaction.transactionDate}-${idx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ delay: idx * 0.01 }} // faster stagger
                                    className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-[#222] transition-colors text-sm border-l-2 border-l-transparent hover:border-l-blue-500"
                                >
                                    <div className="col-span-2 flex items-center gap-3">
                                        <div className="w-8 h-8 flex-shrink-0">
                                            <CompanyIcon ticker={transaction.symbol} className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <button 
                                                onClick={() => setSymbolFilter(transaction.symbol)} 
                                                className="font-bold text-white hover:text-blue-400 transition-colors"
                                            >
                                                {transaction.symbol}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="col-span-3">
                                        <div className="font-medium text-gray-300 truncate pr-2" title={transaction.name}>
                                            {transaction.name}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className={`
                                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border
                                            ${getTransactionColor(transaction.transactionCode)}
                                        `}>
                                            {getTransactionIcon(transaction.transactionCode)}
                                            {getTransactionLabel(transaction.transactionCode)}
                                        </div>
                                    </div>

                                    <div className="col-span-2 text-right">
                                        <div className={`font-mono ${type === 'buy' ? 'text-green-400' : type === 'sell' ? 'text-red-400' : 'text-gray-400'}`}>
                                             {type === 'buy' ? '+' : type === 'sell' ? '-' : ''}
                                             {formatShares(Math.abs(transaction.change))}
                                        </div>
                                        <div className="text-xs text-gray-600 font-mono mt-0.5">
                                            @{transaction.transactionPrice ? `$${transaction.transactionPrice.toFixed(2)}` : '-'}
                                        </div>
                                    </div>

                                    <div className="col-span-1 text-right">
                                         <div className="text-white font-medium">
                                            {transactionValue > 0 ? formatCurrency(transactionValue) : '-'}
                                         </div>
                                    </div>

                                    <div className="col-span-2 text-right">
                                        <div className="text-gray-400 text-xs">
                                            {new Date(transaction.transactionDate).toLocaleDateString()}
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
          <div className="border-t border-gray-800 bg-[#1A1A1A] p-2 flex justify-between items-center">
             <div className="text-xs text-gray-500 pl-4">
                 Page {currentPage} of {Math.max(1, totalPages)}
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
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                 </button>
                 <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
      </div>
    </div>
  );
}
