"use client";

import { useEffect, useState, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, Users, DollarSign, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, Filter, ArrowUpRight, ArrowDownRight, Minus, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// Popular stocks to track - diversified across sectors
const DEFAULT_SYMBOLS = [
  // Tech Giants
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  // Finance
  'JPM', 'BAC', 'GS', 'BRK.B', 'V', 'MA',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK',
  // Consumer
  'WMT', 'HD', 'NKE', 'SBUX', 'MCD', 'DIS',
  // Energy
  'XOM', 'CVX', 'COP',
  // Industrial
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
        
        // Merge with existing transactions, deduplicate
        setTransactions(prev => {
          const existing = prev.filter(t => t.symbol !== customSymbol);
          const merged = [...existing, ...(data.data || [])];
          // Sort by transaction date
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

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log(`Insider Transactions: Loaded ${cached.transactions.length} from cache`);
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
      
      // Batch fetch - 3 symbols at a time with delays to respect rate limits
      const batchSize = 3;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        setFetchProgress(`Fetching ${i + 1}-${Math.min(i + batchSize, symbols.length)} of ${symbols.length} symbols...`);
        
        const results = await Promise.all(
          batch.map(async (symbol, idx) => {
            // Small stagger between requests
            await new Promise(resolve => setTimeout(resolve, idx * 150));
            
            try {
              const response = await fetch(`/api/finnhub/insider-transactions?symbol=${symbol}&limit=100`);
              if (!response.ok) {
                if (response.status === 429) {
                  console.warn(`Rate limited on ${symbol}, skipping...`);
                  return [];
                }
                return [];
              }
              const data: InsiderTransactionsResponse = await response.json();
              return data.data || [];
            } catch {
              return [];
            }
          })
        );
        
        results.flat().forEach(t => allTransactions.push(t));
        
        // Pause between batches to avoid rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by transaction date (newest first)
      const sortedTransactions = allTransactions.sort((a, b) => 
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );

      console.log(`Insider Transactions: Fetched ${sortedTransactions.length} transactions from ${symbols.length} symbols`);
      
      // Cache results
      saveToCache(sortedTransactions, symbols);
      
      setTransactions(sortedTransactions);
      setLastUpdated(new Date());
      setFetchProgress('');
    } catch (err) {
      console.error('Error fetching insider transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Try stale cache on error
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

  // Calculate stats
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

  // Get unique symbols for quick filter
  const uniqueSymbols = [...new Set(transactions.map(t => t.symbol))].sort();

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Users className="w-5 h-5 text-blue-400" />
          Insider Transactions
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Buys:</span>
            <span className="text-green-400 font-semibold">{buyCount}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Sells:</span>
            <span className="text-red-400 font-semibold">{sellCount}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Total Value:</span>
            <span className="text-blue-400 font-semibold">{formatCurrency(totalValue)}</span>
          </div>
          <button
            onClick={() => fetchInsiderTransactions(true)}
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
              placeholder="Search by ticker (e.g., TSLA, AAPL, NVDA)..."
              className="w-full bg-[#0D0D0D] border border-gray-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </form>
        
        {/* Quick Symbol Filters */}
        {uniqueSymbols.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 py-1">Quick filter:</span>
            {symbolFilter && (
              <button
                onClick={clearSymbolFilter}
                className="px-2 py-1 text-xs rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                Clear: {symbolFilter} ×
              </button>
            )}
            {uniqueSymbols.slice(0, 15).map(sym => (
              <button
                key={sym}
                onClick={() => setSymbolFilter(symbolFilter === sym ? '' : sym)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  symbolFilter === sym
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
                }`}
              >
                {sym}
              </button>
            ))}
            {uniqueSymbols.length > 15 && (
              <span className="text-xs text-gray-500 py-1">+{uniqueSymbols.length - 15} more</span>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs + Pagination */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'buy', 'sell', 'other'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize flex items-center gap-1.5 ${
                filter === type 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-[#212121] text-gray-400 hover:bg-[#2a2a2a] border border-transparent'
              }`}
            >
              {type === 'buy' && <ArrowUpRight className="w-3 h-3" />}
              {type === 'sell' && <ArrowDownRight className="w-3 h-3" />}
              {type}
            </button>
          ))}
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
            {filteredTransactions.length} transactions
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
        {loading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="text-gray-400 text-sm">{fetchProgress || 'Loading insider transactions...'}</span>
          </div>
        ) : error && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-red-400">{error}</span>
            <button
              onClick={() => fetchInsiderTransactions(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p>No insider transactions found</p>
            {symbolFilter && (
              <button
                onClick={clearSymbolFilter}
                className="mt-2 text-blue-400 text-sm hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#212121] sticky top-0 z-10">
              <tr className="text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-left">Insider Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Transaction Date</th>
                <th className="px-4 py-3 text-right">Filing Date</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedTransactions.map((transaction, idx) => {
                  const transactionValue = Math.abs(transaction.change) * (transaction.transactionPrice || 0);
                  const type = getTransactionType(transaction.transactionCode);
                  
                  return (
                    <motion.tr
                      key={`${transaction.symbol}-${transaction.name}-${transaction.transactionDate}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-gray-800/50 hover:bg-[#212121]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSymbolFilter(transaction.symbol)}
                          className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-semibold text-white">{transaction.symbol}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 truncate max-w-[200px] block" title={transaction.name}>
                          {transaction.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getTransactionColor(transaction.transactionCode)}`}>
                          {getTransactionIcon(transaction.transactionCode)}
                          {getTransactionLabel(transaction.transactionCode)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={type === 'buy' ? 'text-green-400' : type === 'sell' ? 'text-red-400' : 'text-gray-400'}>
                          {type === 'buy' ? '+' : type === 'sell' ? '-' : ''}
                          {formatShares(Math.abs(transaction.change))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {transaction.transactionPrice ? `$${transaction.transactionPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={type === 'buy' ? 'text-green-400' : type === 'sell' ? 'text-red-400' : 'text-gray-400'}>
                          {transactionValue > 0 ? formatCurrency(transactionValue) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {new Date(transaction.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {new Date(transaction.filingDate).toLocaleDateString()}
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
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
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
