"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { LazyRechartsWrapper, ChartLoadingPlaceholder } from "../ui/lazy-charts";
import { 
  TrendingUp, 
  DollarSign, 
  PieChart as PieChartIcon,
  Building2,
  ArrowUpDown,
  Target,
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowDownLeft
} from "lucide-react";
import { 
  SiApple, 
  SiAmazon, 
  SiGoogle, 
  SiTesla, 
  SiNvidia, 
  SiMeta
} from "react-icons/si";
import {
  AppleIconTV,
  MicrosoftIconTV,
  AmazonIconTV,
  GoogleIconTV,
  TeslaIconTV,
  NvidiaIconTV,
  MetaIconTV,
  ETFIcon,
  ChartIcon
} from "../../lib/tradingview-icons";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, ConditionalThemedStatBox, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { useAssetPrices } from "../../hooks/use-price";
import { formatNumber } from "../../lib/utils";
import { usePortfolioContext } from "../../contexts/portfolio-context";
import { AIRebalancing } from "../ui/ai-rebalancing";
import { SellPositionModal } from "../ui/sell-position-modal";
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";
import { DualCurrencyDisplay, LargeDualCurrency } from "../ui/dual-currency-display";
import { lttb } from "../../lib/chart-utils";
import { getBrandColor } from "../../lib/brand-colors";

// Stock Icon Component - TradingView style
function StockIcon({ symbol, className = "w-5 h-5" }: { symbol: string; className?: string }) {
  switch (symbol) {
    case 'AAPL':
      return <AppleIconTV className={className} />;
    case 'MSFT':
      return <MicrosoftIconTV className={className} />;
    case 'AMZN':
      return <AmazonIconTV className={className} />;
    case 'GOOGL':
    case 'GOOG':
      return <GoogleIconTV className={className} />;
    case 'TSLA':
      return <TeslaIconTV className={className} />;
    case 'NVDA':
      return <NvidiaIconTV className={className} />;
    case 'META':
      return <MetaIconTV className={className} />;
    case 'BRK.B':
      return <ETFIcon symbol="BRK.B" className={className} color="#1B4D99" />;
    case 'VOO':
      return <ETFIcon symbol="VOO" className={className} color="#B41E3E" />;
    case 'JNJ':
      return <ETFIcon symbol="JNJ" className={className} color="#D51920" />;
    case 'AMD':
      return <ETFIcon symbol="AMD" className={className} color="#ED1C24" />;
    case 'INTC':
      return <ETFIcon symbol="INTC" className={className} color="#0071C5" />;
    case 'WMT':
      return <ETFIcon symbol="WMT" className={className} color="#004C91" />;
    case 'V':
      return <ETFIcon symbol="V" className={className} color="#1A1F71" />;
    case 'MA':
      return <ETFIcon symbol="MA" className={className} color="#FF5F00" />;
    case 'JPM':
      return <ETFIcon symbol="JPM" className={className} color="#117ACA" />;
    case 'BAC':
      return <ETFIcon symbol="BAC" className={className} color="#E31837" />;
    case 'DIS':
      return <ETFIcon symbol="DIS" className={className} color="#113CCF" />;
    case 'NFLX':
      return <ETFIcon symbol="NFLX" className={className} color="#E50914" />;
    case 'ORCL':
      return <ETFIcon symbol="ORCL" className={className} color="#F80000" />;
    case 'CRM':
      return <ETFIcon symbol="CRM" className={className} color="#00A1E0" />;
    case 'ADBE':
      return <ETFIcon symbol="ADBE" className={className} color="#FF0000" />;
    case 'PYPL':
      return <ETFIcon symbol="PYPL" className={className} color="#003087" />;
    case 'CSCO':
      return <ETFIcon symbol="CSCO" className={className} color="#1BA0D7" />;
    case 'PEP':
      return <ETFIcon symbol="PEP" className={className} color="#0065A3" />;
    case 'KO':
      return <ETFIcon symbol="KO" className={className} color="#F40009" />;
    case 'PG':
      return <ETFIcon symbol="PG" className={className} color="#003DA5" />;
    case 'XOM':
      return <ETFIcon symbol="XOM" className={className} color="#FF0000" />;
    case 'UNH':
      return <ETFIcon symbol="UNH" className={className} color="#002677" />;
    case 'HD':
      return <ETFIcon symbol="HD" className={className} color="#F96302" />;
    case 'CVX':
      return <ETFIcon symbol="CVX" className={className} color="#005596" />;
    case 'ABBV':
      return <ETFIcon symbol="ABBV" className={className} color="#000000" />;
    case 'MRK':
      return <ETFIcon symbol="MRK" className={className} color="#00857C" />;
    case 'COST':
      return <ETFIcon symbol="COST" className={className} color="#E31837" />;
    case 'AVGO':
      return <ETFIcon symbol="AVGO" className={className} color="#CC092F" />;
    case 'LLY':
      return <ETFIcon symbol="LLY" className={className} color="#F05123" />;
    case 'NKE':
      return <ETFIcon symbol="NKE" className={className} color="#000000" />;
    case 'T':
      return <ETFIcon symbol="T" className={className} color="#00A8E0" />;
    case 'VZ':
      return <ETFIcon symbol="VZ" className={className} color="#CD040B" />;
    case 'PFE':
      return <ETFIcon symbol="PFE" className={className} color="#0000FF" />;
    case 'CMCSA':
      return <ETFIcon symbol="CMCSA" className={className} color="#FBA800" />;
    // Chinese Stocks
    case 'NIO':
      return <ETFIcon symbol="NIO" className={className} color="#00C3FF" />;
    case 'XPEV':
      return <ETFIcon symbol="XPEV" className={className} color="#FF6600" />;
    case 'LI':
      return <ETFIcon symbol="LI" className={className} color="#1E4FCD" />;
    case 'BABA':
      return <ETFIcon symbol="BABA" className={className} color="#FF6A00" />;
    case 'JD':
      return <ETFIcon symbol="JD" className={className} color="#E3001B" />;
    case 'BIDU':
      return <ETFIcon symbol="BIDU" className={className} color="#2932E1" />;
    case 'PDD':
      return <ETFIcon symbol="PDD" className={className} color="#E02020" />;
    case 'JFIN':
      return <ETFIcon symbol="JFIN" className={className} color="#FF3B3B" />;
    case 'NTES':
      return <ETFIcon symbol="NTES" className={className} color="#C8161D" />;
    case 'TME':
      return <ETFIcon symbol="TME" className={className} color="#07C160" />;
    case 'BILI':
      return <ETFIcon symbol="BILI" className={className} color="#00A1D6" />;
    case 'BEKE':
      return <ETFIcon symbol="BEKE" className={className} color="#00B050" />;
    case 'YUMC':
      return <ETFIcon symbol="YUMC" className={className} color="#E4002B" />;
    case 'IQ':
      return <ETFIcon symbol="IQ" className={className} color="#00BE06" />;
    case 'TAL':
      return <ETFIcon symbol="TAL" className={className} color="#FF6700" />;
    default:
      return <ChartIcon className={className} color="#2196F3" />;
  }
}

interface StockHolding {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  value: number;
  color: string;
  change: string;
  sector: string;
  entryPoint: number;
}

interface SearchResult {
  name: string;
  symbol: string;
  currentPrice?: number;
  sector: string;
  exchange?: string;
}

const initialStockHoldings: StockHolding[] = [
  { 
    id: '1',
    name: 'Apple Inc.', 
    symbol: 'AAPL', 
    shares: 50, 
    value: 8750, 
    color: '#8b5cf6', 
    change: '+5.2%', 
    sector: 'Technology',
    entryPoint: 150
  },
  { 
    id: '2',
    name: 'Microsoft Corp.', 
    symbol: 'MSFT', 
    shares: 25, 
    value: 8500, 
    color: '#a78bfa', 
    change: '+7.1%', 
    sector: 'Technology',
    entryPoint: 300
  },
  { 
    id: '3',
    name: 'Amazon.com Inc.', 
    symbol: 'AMZN', 
    shares: 30, 
    value: 12250, 
    color: '#c4b5fd', 
    change: '+12.3%', 
    sector: 'Consumer Discretionary',
    entryPoint: 350
  },
  { 
    id: '4',
    name: 'Vanguard S&P 500', 
    symbol: 'VOO', 
    shares: 100, 
    value: 38390, 
    color: '#ddd6fe', 
    change: '+8.9%', 
    sector: 'ETF',
    entryPoint: 350
  }
];

// Popular stocks for search
const popularStocks: SearchResult[] = [
  { name: 'Apple Inc.', symbol: 'AAPL', currentPrice: 175, sector: 'Technology' },
  { name: 'Microsoft Corp.', symbol: 'MSFT', currentPrice: 340, sector: 'Technology' },
  { name: 'Amazon.com Inc.', symbol: 'AMZN', currentPrice: 408, sector: 'Consumer Discretionary' },
  { name: 'Alphabet Inc.', symbol: 'GOOGL', currentPrice: 135, sector: 'Technology' },
  { name: 'Tesla Inc.', symbol: 'TSLA', currentPrice: 240, sector: 'Automotive' },
  { name: 'NVIDIA Corp.', symbol: 'NVDA', currentPrice: 450, sector: 'Technology' },
  { name: 'Meta Platforms', symbol: 'META', currentPrice: 320, sector: 'Technology' },
  { name: 'Berkshire Hathaway', symbol: 'BRK.B', currentPrice: 350, sector: 'Financial' },
  { name: 'Vanguard S&P 500', symbol: 'VOO', currentPrice: 384, sector: 'ETF' },
  { name: 'Johnson & Johnson', symbol: 'JNJ', currentPrice: 160, sector: 'Healthcare' },
  { name: 'JPMorgan Chase', symbol: 'JPM', currentPrice: 145, sector: 'Financial' },
  { name: 'Visa Inc.', symbol: 'V', currentPrice: 245, sector: 'Financial' },
  { name: 'Walmart Inc.', symbol: 'WMT', currentPrice: 160, sector: 'Consumer Staples' },
  { name: 'Procter & Gamble', symbol: 'PG', currentPrice: 150, sector: 'Consumer Staples' },
  { name: 'Mastercard Inc.', symbol: 'MA', currentPrice: 400, sector: 'Financial' },
  { name: 'Exxon Mobil', symbol: 'XOM', currentPrice: 105, sector: 'Energy' },
  { name: 'UnitedHealth Group', symbol: 'UNH', currentPrice: 480, sector: 'Healthcare' },
  { name: 'Home Depot', symbol: 'HD', currentPrice: 330, sector: 'Consumer Discretionary' },
  { name: 'Chevron Corp.', symbol: 'CVX', currentPrice: 150, sector: 'Energy' },
  { name: 'AbbVie Inc.', symbol: 'ABBV', currentPrice: 150, sector: 'Healthcare' },
  { name: 'Coca-Cola Co.', symbol: 'KO', currentPrice: 60, sector: 'Consumer Staples' },
  { name: 'PepsiCo Inc.', symbol: 'PEP', currentPrice: 170, sector: 'Consumer Staples' },
  { name: 'Merck & Co.', symbol: 'MRK', currentPrice: 105, sector: 'Healthcare' },
  { name: 'Costco Wholesale', symbol: 'COST', currentPrice: 550, sector: 'Consumer Staples' },
  { name: 'Broadcom Inc.', symbol: 'AVGO', currentPrice: 850, sector: 'Technology' },
  { name: 'Eli Lilly', symbol: 'LLY', currentPrice: 550, sector: 'Healthcare' },
  { name: 'Adobe Inc.', symbol: 'ADBE', currentPrice: 520, sector: 'Technology' },
  { name: 'Salesforce Inc.', symbol: 'CRM', currentPrice: 210, sector: 'Technology' },
  { name: 'AMD', symbol: 'AMD', currentPrice: 105, sector: 'Technology' },
  { name: 'Netflix Inc.', symbol: 'NFLX', currentPrice: 440, sector: 'Communication Services' },
  { name: 'Walt Disney', symbol: 'DIS', currentPrice: 85, sector: 'Communication Services' },
  { name: 'Nike Inc.', symbol: 'NKE', currentPrice: 100, sector: 'Consumer Discretionary' },
  { name: 'Intel Corp.', symbol: 'INTC', currentPrice: 35, sector: 'Technology' },
  { name: 'AT&T Inc.', symbol: 'T', currentPrice: 15, sector: 'Communication Services' },
  { name: 'Verizon', symbol: 'VZ', currentPrice: 33, sector: 'Communication Services' },
  { name: 'Pfizer Inc.', symbol: 'PFE', currentPrice: 33, sector: 'Healthcare' },
  { name: 'Cisco Systems', symbol: 'CSCO', currentPrice: 53, sector: 'Technology' },
  { name: 'Comcast Corp.', symbol: 'CMCSA', currentPrice: 44, sector: 'Communication Services' },
  { name: 'Oracle Corp.', symbol: 'ORCL', currentPrice: 110, sector: 'Technology' },
  // Chinese Stocks (ADRs)
  { name: 'NIO Inc.', symbol: 'NIO', currentPrice: 5.20, sector: 'Electric Vehicles' },
  { name: 'XPeng Inc.', symbol: 'XPEV', currentPrice: 9.85, sector: 'Electric Vehicles' },
  { name: 'Li Auto Inc.', symbol: 'LI', currentPrice: 20.45, sector: 'Electric Vehicles' },
  { name: 'Alibaba Group', symbol: 'BABA', currentPrice: 82.50, sector: 'E-commerce' },
  { name: 'JD.com Inc.', symbol: 'JD', currentPrice: 35.80, sector: 'E-commerce' },
  { name: 'Baidu Inc.', symbol: 'BIDU', currentPrice: 92.30, sector: 'Technology' },
  { name: 'PDD Holdings', symbol: 'PDD', currentPrice: 142.80, sector: 'E-commerce' },
  { name: 'Jiayin Group Inc.', symbol: 'JFIN', currentPrice: 4.25, sector: 'FinTech' },
  { name: 'NetEase Inc.', symbol: 'NTES', currentPrice: 98.50, sector: 'Gaming' },
  { name: 'Tencent Music', symbol: 'TME', currentPrice: 6.85, sector: 'Music Streaming' },
  { name: 'Bilibili Inc.', symbol: 'BILI', currentPrice: 14.20, sector: 'Video Streaming' },
  { name: 'KE Holdings', symbol: 'BEKE', currentPrice: 16.25, sector: 'Real Estate' },
  { name: 'Yum China', symbol: 'YUMC', currentPrice: 45.30, sector: 'Restaurants' },
  { name: 'iQIYI Inc.', symbol: 'IQ', currentPrice: 3.15, sector: 'Video Streaming' },
  { name: 'TAL Education', symbol: 'TAL', currentPrice: 6.50, sector: 'Education' }
];

const stockHistory = [
  { month: 'Jan', value: 58000 },
  { month: 'Feb', value: 61000 },
  { month: 'Mar', value: 59500 },
  { month: 'Apr', value: 64000 },
  { month: 'May', value: 66500 },
  { month: 'Jun', value: 67890 }
];

const dividendHistory = [
  { quarter: 'Q1', dividend: 245 },
  { quarter: 'Q2', dividend: 268 },
  { quarter: 'Q3', dividend: 287 },
  { quarter: 'Q4', dividend: 312 }
];

// Color palette for new holdings
const DEFAULT_COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f0abfc', '#e879f9', '#d946ef'];

// Popular stocks for search
function AddPositionModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onAdd: (holding: Omit<StockHolding, 'id' | 'value' | 'change' | 'color'>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  // Initialize with popular stocks
  const [searchResults, setSearchResults] = useState<SearchResult[]>(popularStocks);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [shares, setShares] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/yahoo-finance/search?q=${encodeURIComponent(searchTerm)}`);
          
          if (!response.ok) {
             throw new Error('Search failed');
          }

          const data = await response.json();
          
          if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const results: SearchResult[] = data.results
              .map((quote: any) => ({
                name: quote.name,
                symbol: quote.symbol,
                sector: quote.sector,
                exchange: quote.exchange,
                currentPrice: undefined // Search doesn't return price
              }));
            setSearchResults(results);
          } else {
            // Fallback to local filtering if API returns nothing
             const localResults = popularStocks.filter(stock => 
              stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(localResults);
          }
        } catch (error) {
          console.error('Error searching stocks:', error);
          // Fallback to local filtering on error
          const localResults = popularStocks.filter(stock => 
            stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setSearchResults(localResults);
        } finally {
          setIsSearching(false);
        }
      } else {
        // Reset to popular stocks when search is empty
        setSearchResults(popularStocks);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleAdd = () => {
    if (selectedStock && shares && entryPoint) {
      onAdd({
        name: selectedStock.name,
        symbol: selectedStock.symbol,
        shares: parseInt(shares),
        entryPoint: parseFloat(entryPoint),
        sector: selectedStock.sector
      });
      onClose();
      setSearchTerm('');
      setSelectedStock(null);
      setShares('');
      setEntryPoint('');
      setColor('#8b5cf6');
      setSearchResults([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000001] overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-8 sm:py-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-[384px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Stock Position</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Search Section */}
        <div className="mb-4 relative" ref={dropdownRef}>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Search Stock</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              placeholder="Search by symbol or name..."
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && !selectedStock && (
            <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-xl">
              {!searchTerm && <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">Popular Stocks</div>}
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => {
                    setSelectedStock(stock);
                    setSearchTerm('');
                    setShowDropdown(false);
                    // If it's a popular stock with a price, use it
                    if (stock.currentPrice) {
                      setEntryPoint(stock.currentPrice.toString());
                    }
                    setColor(getBrandColor(stock.symbol, 'stock'));
                  }}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                     <StockIcon symbol={stock.symbol} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">{stock.symbol}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {stock.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                    {stock.currentPrice ? `$${stock.currentPrice}` : stock.exchange}
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No stocks found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Stock */}
        {selectedStock && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <StockIcon symbol={selectedStock.symbol} />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{selectedStock.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedStock.symbol} • {selectedStock.exchange}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Shares Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Number of Shares</label>
          <input
            type="number"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            placeholder="Enter shares..."
          />
        </div>

        {/* Entry Point Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Entry Point ($)</label>
          <input
            type="number"
            step="any"
            value={entryPoint}
            onChange={(e) => setEntryPoint(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            placeholder="Enter price..."
          />
        </div>

        {/* Chart Color Picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Chart Color</label>
          <input
            className="w-full p-2 border rounded h-10 cursor-pointer"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Select a color for pie charts and visualizations</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedStock || !shares || !entryPoint}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Position
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// Edit Position Modal Component
function EditPositionModal({ 
  isOpen, 
  onClose, 
  holding,
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  holding: StockHolding | null;
  onUpdate: (id: string, updates: Partial<StockHolding>) => Promise<void>;
}) {
  const [shares, setShares] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#8b5cf6');

  useEffect(() => {
    if (holding) {
      setShares(holding.shares.toString());
      setEntryPoint(holding.entryPoint.toString());
      setColor(holding.color);
    }
  }, [holding]);

  const handleUpdate = async () => {
    if (holding && shares && entryPoint) {
      await onUpdate(holding.id, {
        shares: parseInt(shares),
        entryPoint: parseFloat(entryPoint),
        color: color
      });
      onClose();
    }
  };

  if (!isOpen || !holding) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-8 sm:py-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-[384px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Position</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Stock Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <StockIcon symbol={holding.symbol} />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{holding.name} ({holding.symbol})</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current Value: ${formatNumber(holding.value)} • {holding.sector}
              </div>
            </div>
          </div>
        </div>

        {/* Shares Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Number of Shares</label>
          <input
            type="number"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Entry Point Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Entry Point ($)</label>
          <input
            type="number"
            step="any"
            value={entryPoint}
            onChange={(e) => setEntryPoint(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Chart Color Picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Chart Color</label>
          <input
            className="w-full p-2 border rounded h-10 cursor-pointer"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Select a color for charts and visualizations
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Update
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// Custom label component for pie chart with neon hover effect
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Don't show labels for very small slices (less than 1%) or placeholder slices
  if (percent < 0.01 || !name) return null;

  // Display 100% instead of 99.99% for single-stock scenarios
  const displayPercent = percent >= 0.999 ? 100 : (percent * 100);

  return (
    <text
      x={x}
      y={y}
      className="pie-chart-label"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      data-fill={fill}
      style={{
        fontSize: '11px',
        fontWeight: 600,
        fill: fill,
        '--label-color': fill
      } as React.CSSProperties}
    >
      {name} {displayPercent.toFixed(1)}%
    </text>
  );
};

interface StockTransaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  date: string;
  originalPrice?: number; // For sell transactions: the price it was bought at
}

function StocksModalContent() {
  const [activeTab, setActiveTab] = useState<'holdings' | 'transactions' | 'performance' | 'dividends' | 'analysis'>('holdings');
  const { stockHoldings, setStockHoldings } = usePortfolioContext();
  const { formatMain } = useCurrencyConversion();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<StockHolding | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellingHolding, setSellingHolding] = useState<StockHolding | null>(null);

  // Helper to verify data consistency before dispatching events
  const verifyDataConsistency = async (checkFn: (holdings: StockHolding[]) => boolean) => {
    let retries = 0;
    const maxRetries = 5;
    const delay = 500;

    const check = async () => {
      const freshHoldings = await SupabaseDataService.getStockHoldings([]);
      if (checkFn(freshHoldings)) {
        setStockHoldings(freshHoldings);
        window.dispatchEvent(new Event('stockDataChanged'));
        window.dispatchEvent(new Event('financialDataChanged'));
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(check, delay);
      } else {
        // Fallback: dispatch anyway
        window.dispatchEvent(new Event('stockDataChanged'));
        window.dispatchEvent(new Event('financialDataChanged'));
      }
    };
    
    setTimeout(check, 200);
  };

  // Load data on component mount only
  useEffect(() => {
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getStockHoldings([]);
      setStockHoldings(savedHoldings);
    };
    
    loadHoldings();
    // We intentionally do NOT listen to stockDataChanged here
  }, [setStockHoldings]);

  // Get real-time prices for all holdings
  const symbols = stockHoldings.map(holding => holding.symbol);
  const { prices, loading } = useAssetPrices(symbols);

  // Update holdings with real-time prices - MEMOIZED
  const updatedHoldings = useMemo(() => {
    return stockHoldings.map(holding => {
      const currentPriceData = prices[holding.symbol];
      // Use current price if available, otherwise fallback to entry point
      const currentPrice = currentPriceData?.price || holding.entryPoint || 0;
      const value = holding.shares * currentPrice;
      
      // Calculate change
      let change = "0.00%";
      if (holding.entryPoint > 0) {
        const changePercent = ((currentPrice - holding.entryPoint) / holding.entryPoint * 100);
        change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
      }
      
      return {
        ...holding,
        value,
        change,
        currentPrice
      };
    });
  }, [stockHoldings, prices]);

  const addHolding = async (newHolding: Omit<StockHolding, 'id' | 'value' | 'change' | 'color'>) => {
    // Check if we already have a position in this symbol
    const existingHolding = stockHoldings.find(h => h.symbol === newHolding.symbol);
    
    if (existingHolding) {
      // Merge positions: calculate weighted average entry point
      const totalShares = existingHolding.shares + newHolding.shares;
      const totalCostBasis = (existingHolding.shares * existingHolding.entryPoint) + (newHolding.shares * newHolding.entryPoint);
      const avgEntryPoint = totalCostBasis / totalShares;
      
      // Get current price for value calculation
      const currentPriceData = prices[newHolding.symbol];
      const currentPrice = currentPriceData?.price || popularStocks.find(s => s.symbol === newHolding.symbol)?.currentPrice || avgEntryPoint;
      const value = totalShares * currentPrice;
      const changePercent = ((currentPrice - avgEntryPoint) / avgEntryPoint * 100);
      const change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
      
      const mergedHolding: StockHolding = {
        ...existingHolding,
        shares: totalShares,
        entryPoint: avgEntryPoint,
        value,
        change
      };
      
      // Update state optimistically
      setStockHoldings(stockHoldings.map(h => h.id === existingHolding.id ? mergedHolding : h));
      
      // Save to database
      await SupabaseDataService.saveStockHolding(mergedHolding);
      
      // Record transaction
      const transaction: StockTransaction = {
        id: crypto.randomUUID(),
        type: 'buy',
        symbol: newHolding.symbol,
        name: newHolding.name,
        shares: newHolding.shares,
        pricePerShare: newHolding.entryPoint,
        totalValue: newHolding.shares * newHolding.entryPoint,
        date: new Date().toISOString()
      };
      setTransactions([transaction, ...transactions]);
      return;
    }
    
    // No existing position - create new holding
    const id = crypto.randomUUID();
    const currentPriceData = prices[newHolding.symbol];
    const currentPrice = currentPriceData?.price || popularStocks.find(s => s.symbol === newHolding.symbol)?.currentPrice || newHolding.entryPoint;
    const value = newHolding.shares * currentPrice;
    const changePercent = ((currentPrice - newHolding.entryPoint) / newHolding.entryPoint * 100);
    const change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    
    const holding: StockHolding = {
      ...newHolding,
      id,
      value,
      change,
      color: DEFAULT_COLORS[stockHoldings.length % DEFAULT_COLORS.length]
    };

    // Update state optimistically
    setStockHoldings([...stockHoldings, holding]);

    // Save to database
    await SupabaseDataService.saveStockHolding(holding);
    
    // Verify consistency
    verifyDataConsistency((holdings) => !!holdings.find(h => h.id === id));

    // Record transaction
    const transaction: StockTransaction = {
      id: crypto.randomUUID(),
      type: 'buy',
      symbol: newHolding.symbol,
      name: newHolding.name,
      shares: newHolding.shares,
      pricePerShare: newHolding.entryPoint,
      totalValue: newHolding.shares * newHolding.entryPoint,
      date: new Date().toISOString()
    };
    setTransactions([transaction, ...transactions]);
  };

  const updateHolding = async (id: string, updates: Partial<StockHolding>) => {
    const updatedHoldingsList = stockHoldings.map((holding: StockHolding) => {
      if (holding.id === id) {
        const updatedHolding = { ...holding, ...updates };
        // Always recalculate value and change percentage when updating
        const currentPriceData = prices[holding.symbol];
        const currentPrice = currentPriceData?.price || popularStocks.find(s => s.symbol === holding.symbol)?.currentPrice || updatedHolding.entryPoint;
        updatedHolding.value = updatedHolding.shares * currentPrice;
        const changePercent = ((currentPrice - updatedHolding.entryPoint) / updatedHolding.entryPoint * 100);
        updatedHolding.change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
        return updatedHolding;
      }
      return holding;
    });
    
    // Update state optimistically
    setStockHoldings(updatedHoldingsList);

    // Save to database
    const updatedHolding = updatedHoldingsList.find(h => h.id === id);
    if (updatedHolding) {
      await SupabaseDataService.saveStockHolding(updatedHolding);
      
      // Verify consistency
      verifyDataConsistency((holdings) => {
        const h = holdings.find(item => item.id === id);
        return !!(h && Math.abs(h.shares - updatedHolding.shares) < 0.000001);
      });
    }
  };

  const deleteHolding = async (id: string) => {
    const holding = stockHoldings.find((h: StockHolding) => h.id === id);
    if (holding) {
       // Record sell transaction
       const currentPriceData = prices[holding.symbol];
       const currentPrice = currentPriceData?.price || holding.entryPoint;
       const transaction: StockTransaction = {
         id: crypto.randomUUID(),
         type: 'sell',
         symbol: holding.symbol,
         name: holding.name,
         shares: holding.shares,
         pricePerShare: currentPrice,
         totalValue: holding.shares * currentPrice,
         date: new Date().toISOString(),
         originalPrice: holding.entryPoint
       };
       setTransactions([transaction, ...transactions]);
    }

    // Update state optimistically
    const updatedHoldingsList = stockHoldings.filter((holding: StockHolding) => holding.id !== id);
    setStockHoldings(updatedHoldingsList);

    // Delete from database
    await SupabaseDataService.deleteStockHolding(id);
    
    // Verify consistency
    verifyDataConsistency((holdings) => !holdings.find(h => h.id === id));
  };

  const sellHolding = async (holdingId: string, sellShares: number, destination: any) => {
    const holding = stockHoldings.find((h: StockHolding) => h.id === holdingId);
    if (!holding) return;

    const currentPrice = prices[holding.symbol]?.price || holding.entryPoint;
    const proceeds = sellShares * currentPrice;

    // Update or delete the holding
    if (sellShares >= holding.shares) {
      // Selling entire position
      await SupabaseDataService.deleteStockHolding(holdingId);
      verifyDataConsistency((holdings) => !holdings.find(h => h.id === holdingId));
    } else {
      // Selling partial position
      const updatedHolding = {
        ...holding,
        shares: holding.shares - sellShares
      };
      await SupabaseDataService.saveStockHolding(updatedHolding);
      verifyDataConsistency((holdings) => {
        const h = holdings.find(item => item.id === holdingId);
        return !!(h && Math.abs(h.shares - updatedHolding.shares) < 0.000001);
      });
    }

    // Handle destination (stocks only go to bank or savings, no stablecoin option)
    if (destination.type === 'bank') {
      // Transfer to bank account
      const accounts = await SupabaseDataService.getCashAccounts([]);
      const account = accounts.find((a: any) => a.id === destination.id);
      if (account) {
        const updatedAccount = {
          ...account,
          balance: account.balance + proceeds
        };
        await SupabaseDataService.saveCashAccount(updatedAccount);
      }
    } else if (destination.type === 'savings') {
      // Transfer to savings goal
      const goals = await SupabaseDataService.getSavingsAccounts([]);
      const goal = goals.find((g: any) => g.id === destination.id);
      if (goal) {
        const updatedGoal = {
          ...goal,
          currentAmount: goal.currentAmount + proceeds
        };
        await SupabaseDataService.saveSavingsAccount(updatedGoal);
      }
    }

    // Record transaction
    const transaction: StockTransaction = {
      id: crypto.randomUUID(),
      type: 'sell',
      symbol: holding.symbol,
      name: holding.name,
      shares: sellShares,
      pricePerShare: currentPrice,
      totalValue: proceeds,
      date: new Date().toISOString(),
      originalPrice: holding.entryPoint
    };
    setTransactions([transaction, ...transactions]);
  };

  const totalValue = useMemo(() => 
    updatedHoldings.reduce((sum, holding) => sum + holding.value, 0)
  , [updatedHoldings]);

  const totalGainLoss = useMemo(() => 
    updatedHoldings.reduce((sum, holding) => {
      const costBasis = holding.shares * holding.entryPoint;
      return sum + (holding.value - costBasis);
    }, 0)
  , [updatedHoldings]);

  const totalReturn = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

  // Process stock history with LTTB downsampling for performance
  const processedStockHistory = useMemo(() => {
    return lttb(stockHistory, 100, 'month', 'value');
  }, []);

  // Calculate individual stock allocation for pie chart - memoized to prevent glitchy re-renders
  const stockAllocation = useMemo(() => {
    if (updatedHoldings.length === 0 || totalValue === 0) {
      return [];
    }
    
    const allocation = updatedHoldings
      .filter(holding => holding.value > 0)
      .map(holding => ({
        id: holding.id,
        name: holding.symbol,
        fullName: holding.name,
        value: (holding.value / totalValue) * 100,
        actualValue: holding.value,
        color: holding.color || '#8884d8',
        isPlaceholder: false
      }));
    
    return allocation;
  }, [updatedHoldings, totalValue]);

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
            <div className="flex overflow-x-auto scrollbar-hide w-full">
              {[
                { id: 'holdings', label: 'Holdings', icon: PieChartIcon },
                { id: 'transactions', label: 'Transactions', icon: TrendingUp },
                { id: 'performance', label: 'Performance', icon: TrendingUp },
                { id: 'dividends', label: 'Dividends', icon: DollarSign },
                { id: 'analysis', label: 'Analysis', icon: Target }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          
          {activeTab === 'holdings' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Position</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'holdings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Individual Stock Allocation */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Allocation</h3>
                {loading ? (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading prices...</p>
                    </div>
                  </div>
                ) : stockAllocation.length > 0 ? (
                  <div className="h-[280px] w-full [&_.recharts-pie-sector]:!opacity-100 [&_.recharts-pie]:!opacity-100 [&_.recharts-sector]:!opacity-100">
                    <LazyRechartsWrapper height={280}>
                      {({ PieChart, Pie, Cell, Tooltip, ResponsiveContainer }) => (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <Pie
                            data={stockAllocation}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={80}
                            innerRadius={0}
                            fill="#8884d8"
                            dataKey="value"
                            isAnimationActive={false}
                            animationDuration={0}
                            animationBegin={0}
                            animationEasing="linear"
                            paddingAngle={0}
                            startAngle={90}
                            endAngle={-270}
                            activeShape={false as any}
                          >
                            {stockAllocation.map((entry) => (
                              <Cell 
                                key={`cell-${entry.id}`} 
                                fill={entry.color}
                                stroke={stockAllocation.length > 1 ? "#fff" : "none"}
                                strokeWidth={stockAllocation.length > 1 ? 2 : 0}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            isAnimationActive={false}
                            animationDuration={0}
                            trigger="hover"
                            wrapperStyle={{
                              zIndex: 50,
                              pointerEvents: 'none',
                              visibility: 'visible'
                            }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            content={(props: any) => {
                              const { active, payload } = props;
                              if (!active || !payload || !payload.length) return null;
                              const data = payload[0];
                              const displayPercent = stockAllocation.length === 1 ? 100 : Number(data.value);
                              return (
                                <div 
                                  className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-2xl border-2 border-purple-200 dark:border-purple-700"
                                  style={{ 
                                    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3), 0 4px 20px rgba(0,0,0,0.15)',
                                    pointerEvents: 'none'
                                  }}
                                >
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {data.payload.fullName || data.name}
                                  </p>
                                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                    {data.name}
                                  </p>
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                                    {displayPercent.toFixed(1)}% • {formatMain(data.payload.actualValue)}
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </LazyRechartsWrapper>
                </div>
                ) : stockHoldings.length > 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Calculating allocation...</p>
                      <p className="text-sm mt-1">Please wait</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No stock holdings yet</p>
                      <p className="text-sm mt-1">Add a position to see your allocation</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Holdings List */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Stock Holdings</h3>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {updatedHoldings.sort((a, b) => b.value - a.value).map((holding) => (
                    <div key={holding.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <StockIcon symbol={holding.symbol} />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{holding.name} ({holding.symbol})</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {holding.shares} shares • Entry: ${formatNumber(holding.entryPoint)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <DualCurrencyDisplay 
                            amount={holding.value} 
                            originalCurrency="USD"
                            layout="stacked"
                            size="md"
                          />
                          <div className={`text-sm ${holding.change && holding.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.change || '0%'}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSellingHolding(holding);
                              setShowSellModal(true);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Sell"
                          >
                            <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400 dark:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingHolding(holding);
                              setShowEditModal(true);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await deleteHolding(holding.id);
                              } catch (error) {
                                console.error('Failed to delete holding:', error);
                                alert('Failed to delete holding. Please try again.');
                              }
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                          >
                            <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mx-2 py-2 -my-2">
              <ConditionalThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`}
                label="Total Return"
                valueType={totalReturn >= 0 ? 'positive' : 'negative'}
              />
              <ConditionalThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`${totalGainLoss >= 0 ? '+' : ''}$${formatNumber(totalGainLoss)}`}
                label={`Unrealized ${totalGainLoss >= 0 ? 'Gains' : 'Losses'}`}
                valueType={totalGainLoss >= 0 ? 'positive' : 'negative'}
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`$${(totalValue - totalGainLoss).toLocaleString()}`}
                label="Cost Basis"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={updatedHoldings.length}
                label="Positions"
              />
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Add stock holdings to see your transaction history</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions.map((tx) => {
                  const date = new Date(tx.date);
                  const formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Calculate profit/loss for sell transactions
                  let profitLoss = 0;
                  let profitLossPercent = 0;
                  if (tx.type === 'sell' && tx.originalPrice && tx.originalPrice > 0) {
                    profitLoss = (tx.pricePerShare - tx.originalPrice) * tx.shares;
                    profitLossPercent = ((tx.pricePerShare - tx.originalPrice) / tx.originalPrice) * 100;
                  }

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${tx.type === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          }`}>
                          {tx.type.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {Number(tx.shares).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })} {tx.symbol}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {tx.name} • {formattedDate}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {tx.type === 'sell' && tx.originalPrice ? (
                              <span>
                                Bought: ${tx.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • 
                                Sold: ${tx.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span>@ ${tx.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${tx.type === 'buy' ? 'text-gray-900 dark:text-white' : 'text-green-600 dark:text-green-400'
                          }`}>
                          ${tx.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {tx.type === 'sell' && (
                          <div className={`text-xs font-medium ${profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}% ({profitLoss >= 0 ? '+' : ''}${Math.abs(profitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Performance</h3>
              <div className="h-64">
                <LazyRechartsWrapper height={256}>
                  {({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processedStockHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => [`$${formatNumber(Number(value))}`, 'Portfolio Value']} />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </LazyRechartsWrapper>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ConditionalThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`}
                label="Total Return"
                valueType={totalReturn >= 0 ? 'positive' : 'negative'}
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`$${formatNumber(totalValue)}`}
                label="Portfolio Value"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={updatedHoldings.length}
                label="Positions"
              />
            </div>
          </div>
        )}

        {activeTab === 'dividends' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quarterly Dividends</h3>
              <div className="h-64">
                <LazyRechartsWrapper height={256}>
                  {({ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dividendHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" />
                        <YAxis />
                        <Tooltip cursor={false} formatter={(value: any) => [`$${value}`, 'Dividend']} />
                        <Bar dataKey="dividend" fill="#8b5cf6" isAnimationActive={true} animationDuration={300} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </LazyRechartsWrapper>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mx-2 py-2 -my-2">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`$${Math.round(updatedHoldings.reduce((sum, h) => {
                  const price = prices[h.symbol]?.price || 0;
                  const value = h.shares * price;
                  const estimatedYield = h.sector === 'Technology' ? 0.005 : 0.03;
                  return sum + (value * estimatedYield);
                }, 0) * 4).toLocaleString()}`}
                label="Est. Annual Dividends"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`${updatedHoldings.length > 0 ? (
                  (updatedHoldings.reduce((sum, h) => {
                    const estimatedYield = h.sector === 'Technology' ? 0.5 : 3.0;
                    return sum + estimatedYield;
                  }, 0) / updatedHoldings.length).toFixed(1)
                ) : '0.0'}%`}
                label="Avg. Yield"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={`$${Math.round(updatedHoldings.reduce((sum, h) => {
                  const price = prices[h.symbol]?.price || 0;
                  const value = h.shares * price;
                  const estimatedYield = h.sector === 'Technology' ? 0.005 : 0.03;
                  return sum + (value * estimatedYield);
                }, 0)).toLocaleString()}`}
                label="Est. Quarterly"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.stocks}
                value={updatedHoldings.length}
                label="Div. Stocks"
              />
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* AI Rebalancing Suggestions */}
            <AIRebalancing 
              holdings={updatedHoldings.map(h => ({
                symbol: h.symbol,
                name: h.name,
                value: h.value,
                shares: h.shares,
                currentPrice: h.value / h.shares
              }))}
              totalValue={totalValue}
              assetType="stocks"
            />

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Analysis</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Risk Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Volatility</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">Medium</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Diversification</span>
                    <span className={`font-semibold ${
                      updatedHoldings.length >= 5 ? 'text-green-600 dark:text-green-400' :
                      updatedHoldings.length >= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {updatedHoldings.length >= 5 ? 'Good' : updatedHoldings.length >= 3 ? 'Moderate' : 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Total Positions</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{updatedHoldings.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Portfolio Insights</h4>
                <div className="text-sm space-y-2">
                  {updatedHoldings.length < 5 && (
                    <p className="text-gray-700 dark:text-gray-300">• Consider adding more stocks for better diversification</p>
                  )}
                  {!updatedHoldings.some(h => h.symbol.includes('VOO') || h.symbol.includes('SPY')) && (
                    <p className="text-gray-700 dark:text-gray-300">• Consider index funds for broad market exposure</p>
                  )}
                  {updatedHoldings.filter(h => h.sector === 'Technology').length > updatedHoldings.length * 0.5 && (
                    <p className="text-gray-700 dark:text-gray-300">• Portfolio is tech-heavy, consider sector diversification</p>
                  )}
                  <p className="text-gray-700 dark:text-gray-300">• Review holdings quarterly for rebalancing</p>
                  {totalGainLoss > 0 && totalReturn > 20 && (
                    <p className="text-gray-700 dark:text-gray-300">• Strong performance - consider taking some profits</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPositionModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addHolding}
      />
      
      <EditPositionModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        holding={editingHolding}
        onUpdate={updateHolding}
      />
      
      <SellPositionModal
        isOpen={showSellModal}
        onClose={() => {
          setShowSellModal(false);
          setSellingHolding(null);
        }}
        assetType="stock"
        holding={sellingHolding}
        currentPrice={sellingHolding ? (prices[sellingHolding.symbol]?.price || sellingHolding.entryPoint) : 0}
        onSell={async (amount, destination) => {
          if (sellingHolding) {
            await sellHolding(sellingHolding.id, amount, destination);
          }
        }}
      />
    </div>
  );
}

function StocksHoverContent() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const symbols = stockHoldings.map(holding => holding.symbol);
  const { prices } = useAssetPrices(symbols);

  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: NodeJS.Timeout | null = null;

    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getStockHoldings([]);
      if (isMounted) {
        setStockHoldings(savedHoldings);
      }
    };
    loadHoldings();
    
    // Listen for data changes with debounce
    const handleDataChange = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        loadHoldings();
      }, 500);
    };
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      isMounted = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Calculate portfolio values with real-time prices
  const portfolioData = stockHoldings.map(holding => {
    const currentPriceData = prices[holding.symbol];
    // Fallback to entry price or calculated price from stored value if real-time price is missing
    const currentPrice = currentPriceData?.price || (holding.value && holding.shares ? holding.value / holding.shares : holding.entryPoint) || 0;
    const currentValue = holding.shares * currentPrice;
    const costBasis = holding.shares * holding.entryPoint;
    const gainLoss = currentValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
    return { ...holding, currentValue, gainLoss, gainLossPercent, currentPrice, costBasis };
  });

  const totalValue = portfolioData.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGainLoss = portfolioData.reduce((sum, h) => sum + h.gainLoss, 0);
  const totalCost = portfolioData.reduce((sum, h) => sum + h.costBasis, 0);
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  
  // Show top 2 holdings by value
  const topHoldings = [...portfolioData].sort((a, b) => b.currentValue - a.currentValue).slice(0, 2);
  const dayChange = portfolioData.reduce((sum, h) => {
    const priceData = prices[h.symbol];
    return sum + (priceData?.change24h || 0);
  }, 0) / (portfolioData.length || 1);

  return (
    <div className="space-y-1">
      {topHoldings.map((holding) => (
        <div key={holding.id} className="flex justify-between text-xs">
          <span className="flex items-center gap-1">
            <StockIcon symbol={holding.symbol} className="w-3 h-3" /> {holding.symbol} ({holding.shares} shares)
          </span>
          <span className="font-semibold" style={{ color: holding.color }}>${formatNumber(holding.currentValue)}</span>
        </div>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
        <div className="flex justify-between text-xs">
          <span>Total Gain/Loss</span>
          <span className={`font-semibold ${totalGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${formatNumber(totalGainLoss)} ({totalGainLossPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span>24h Change</span>
          <span className={`font-semibold ${dayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function StocksCardWithPrices() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();

  // Load data on component mount and when currency changes
  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: NodeJS.Timeout | null = null;

    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getStockHoldings([]);
      if (isMounted) {
        setStockHoldings(savedHoldings);
      }
    };
    loadHoldings();
    
    // Listen for data changes and reload with debounce
    const handleDataChange = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        loadHoldings();
      }, 500);
    };
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange); // Re-render on currency change
    
    return () => {
      isMounted = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, [mainCurrency.code]); // Re-load when currency changes

  const symbols = stockHoldings.map(holding => holding.symbol);
  const { prices, loading } = useAssetPrices(symbols);

  // Calculate portfolio values with real-time prices
  const portfolioData = stockHoldings.map(holding => {
    const currentPriceData = prices[holding.symbol];
    // Use current price if available, otherwise fallback to entry point (cost basis)
    const currentPrice = currentPriceData?.price || holding.entryPoint || 0;
    const value = holding.shares * currentPrice;
    
    // Calculate change
    let change = "0.00%";
    if (holding.entryPoint > 0) {
      const changePercent = ((currentPrice - holding.entryPoint) / holding.entryPoint * 100);
      change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    }
    
    return {
      ...holding,
      value,
      change,
      currentPrice
    };
  });

  const totalValue = portfolioData.reduce((sum, holding) => sum + holding.value, 0);
  const totalCostBasis = portfolioData.reduce((sum, holding) => sum + (holding.shares * holding.entryPoint), 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalReturn = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  
  // Format change display
  const changeDisplay = stockHoldings.length === 0 ? "0.0%" : `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
  const changeTypeCalc = totalReturn >= 0 ? "positive" as const : "negative" as const;

  // Get AAPL and VOO values for stats
  const aaplHolding = portfolioData.find(h => h.symbol === 'AAPL');
  const vooHolding = portfolioData.find(h => h.symbol === 'VOO');

  // Create chart data from holdings - sort by value and show top holdings
  const chartData = portfolioData
    .filter(holding => holding.value && !isNaN(holding.value) && isFinite(holding.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
    .map(holding => ({
      value: holding.value,
      change: holding.change
    }));

  // Currency conversion - show in user's selected currency
  const convertedValue = convertToMain(totalValue, 'USD');
  const displayAmount = loading ? "Loading..." : formatMain(convertedValue);
  const originalAmount = loading || mainCurrency.code === 'USD' ? undefined : `$${formatNumber(totalValue)}`;

  return (
    <EnhancedFinancialCard
      title="Stock Portfolio"
      description="Equity investments and dividend income"
      amount={displayAmount}
      change={loading ? "..." : changeDisplay}
      changeType={changeTypeCalc}
      mainColor="#6366f1"
      secondaryColor="#818cf8"
      gridColor="#6366f115"
      stats={[
        { 
          label: "AAPL", 
          value: loading || !aaplHolding ? "Loading..." : formatMain(convertToMain(aaplHolding.value, 'USD')), 
          color: "#8b5cf6" 
        },
        { 
          label: "VOO", 
          value: loading || !vooHolding ? "Loading..." : formatMain(convertToMain(vooHolding.value, 'USD')), 
          color: "#a78bfa" 
        }
      ]}
      icon={Building2}
      hoverContent={<StocksHoverContent />}
      modalContent={<StocksModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}

export function StocksCard() {
  return <StocksCardWithPrices />;
}
