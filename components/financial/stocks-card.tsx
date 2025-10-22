"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
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
  RefreshCw
} from "lucide-react";
import { 
  SiApple, 
  SiAmazon, 
  SiGoogle, 
  SiTesla, 
  SiNvidia, 
  SiMeta
} from "react-icons/si";
import { TbBrandWindows, TbChartLine, TbBuildingBank, TbHeartPlus, TbCpu, TbShoppingCart, TbCreditCard } from "react-icons/tb";
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
import { useAssetPrices } from "../../hooks/use-price";
import { formatNumber } from "../../lib/utils";
import { usePortfolioContext } from "../../contexts/portfolio-context";
import { useTechnicalAnalysis } from "../../hooks/use-technical-analysis";
import { BarChart3 } from "lucide-react";
import { AIRebalancing } from "../ui/ai-rebalancing";
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";
import { DualCurrencyDisplay, LargeDualCurrency } from "../ui/dual-currency-display";

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
  currentPrice: number;
  sector: string;
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
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [shares, setShares] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#8b5cf6');

  const filteredStocks = popularStocks.filter(stock => 
    stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Stock Position</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Search Stock</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              placeholder="Search stock..."
            />
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && (
          <div className="mb-4 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {filteredStocks.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => {
                  setSelectedStock(stock);
                  setSearchTerm('');
                  setEntryPoint(stock.currentPrice.toString());
                }}
                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
              >
                <StockIcon symbol={stock.symbol} />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{stock.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stock.symbol} • ${formatNumber(stock.currentPrice)} • {stock.sector}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Stock */}
        {selectedStock && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <StockIcon symbol={selectedStock.symbol} />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{selectedStock.name} ({selectedStock.symbol})</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Price: ${formatNumber(selectedStock.currentPrice)} • {selectedStock.sector}
                </div>
              </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
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
  );
}

// Custom label component for pie chart with neon hover effect
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.01) return null; // Don't show labels for very small slices (less than 1%)

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
      {name} {(percent * 100).toFixed(1)}%
    </text>
  );
};

function StocksModalContent() {
  const [activeTab, setActiveTab] = useState<'holdings' | 'performance' | 'dividends' | 'analysis'>('holdings');
  const { stockHoldings, setStockHoldings } = usePortfolioContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<StockHolding | null>(null);
  const [colorPickerHolding, setColorPickerHolding] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const { openTechnicalAnalysis, TechnicalAnalysisComponent } = useTechnicalAnalysis();

  // Load data on component mount
  useEffect(() => {
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getStockHoldings([]);
      setStockHoldings(savedHoldings);
    };
    loadHoldings();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadHoldings();
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, [setStockHoldings]);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all holdings changes

  // Get real-time prices for all holdings
  const symbols = stockHoldings.map(holding => holding.symbol);
  const { prices, loading } = useAssetPrices(symbols);

  // Update holdings with real-time prices
  const updatedHoldings = stockHoldings.map(holding => {
    const currentPriceData = prices[holding.symbol];
    if (currentPriceData) {
      const currentPrice = currentPriceData.price;
      const value = holding.shares * currentPrice;
      const changePercent = ((currentPrice - holding.entryPoint) / holding.entryPoint * 100);
      
      return {
        ...holding,
        value,
        change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
        currentPrice
      };
    }
    return holding;
  });

  const addHolding = async (newHolding: Omit<StockHolding, 'id' | 'value' | 'change' | 'color'>) => {
    const id = Date.now().toString();
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

    // Save to database first
    await SupabaseDataService.saveStockHolding(holding);
    
    setStockHoldings([...stockHoldings, holding]);
    
    // Notify other components that stock data changed
    window.dispatchEvent(new Event('stockDataChanged'));
  };

  const updateHolding = async (id: string, updates: Partial<StockHolding>) => {
    const updatedHoldings = stockHoldings.map((holding: StockHolding) => {
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
    
    // Save to database immediately
    const updatedHolding = updatedHoldings.find(h => h.id === id);
    if (updatedHolding) {
      await SupabaseDataService.saveStockHolding(updatedHolding);
    }
    
    setStockHoldings(updatedHoldings);
    // Notify other components
    window.dispatchEvent(new Event('stockDataChanged'));
  };

  const deleteHolding = async (id: string) => {
    await SupabaseDataService.deleteStockHolding(id);
    const updatedHoldings = stockHoldings.filter((holding: StockHolding) => holding.id !== id);
    setStockHoldings(updatedHoldings);
    // Notify other components that stock data changed
    window.dispatchEvent(new Event('stockDataChanged'));
  };

  const totalValue = updatedHoldings.reduce((sum, holding) => sum + holding.value, 0);
  const totalGainLoss = updatedHoldings.reduce((sum, holding) => {
    const costBasis = holding.shares * holding.entryPoint;
    return sum + (holding.value - costBasis);
  }, 0);
  const totalReturn = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

  // Calculate individual stock allocation for pie chart - memoized to prevent glitchy re-renders
  const stockAllocation = useMemo(() => {
    if (updatedHoldings.length === 0 || totalValue === 0) {
      return [];
    }
    
    return updatedHoldings
      .filter(holding => holding.value > 0)
      .map(holding => ({
        id: holding.id,
        name: holding.symbol,
        fullName: holding.name,
        value: (holding.value / totalValue) * 100,
        actualValue: holding.value,
        color: holding.color || '#8884d8'
      }));
  }, [updatedHoldings, totalValue, prices]);

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'holdings', label: 'Holdings', icon: PieChartIcon },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'dividends', label: 'Dividends', icon: DollarSign },
              { id: 'analysis', label: 'Analysis', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          {activeTab === 'holdings' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Plus className="w-4 h-4" />
              Add Position
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'holdings' && (
          <div className="space-y-6" style={{ overflow: 'visible' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ overflow: 'visible' }}>
              {/* Individual Stock Allocation */}
              <div className="relative" style={{ zIndex: 1, overflow: 'visible' }}>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Allocation</h3>
                {loading ? (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading prices...</p>
                    </div>
                  </div>
                ) : stockAllocation.length > 0 ? (
                  <div className="relative" style={{ overflow: 'visible', padding: '20px', paddingTop: '10px', zIndex: 10, height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                      <Pie
                        data={stockAllocation}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={CustomPieLabel}
                        outerRadius={70}
                        innerRadius={0}
                        fill="#8884d8"
                        dataKey="value"
                        isAnimationActive={false}
                        paddingAngle={2}
                        style={{ cursor: 'pointer' }}
                      >
                        {stockAllocation.map((entry) => (
                          <Cell 
                            key={`cell-${entry.id}`} 
                            fill={entry.color}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <div 
                                className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                                style={{ zIndex: 10000 }}
                              >
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {data.payload.fullName || data.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {data.name}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {Number(data.value).toFixed(1)}% • ${formatNumber(data.payload.actualValue)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
                            onClick={() => openTechnicalAnalysis({
                              symbol: holding.symbol,
                              assetType: 'stock',
                              assetName: holding.name
                            })}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Technical Analysis (RSI, MACD, etc.)"
                          >
                            <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400 dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
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
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Return</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 cursor-pointer">
                <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}${formatNumber(totalGainLoss)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unrealized {totalGainLoss >= 0 ? 'Gains' : 'Losses'}</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/50 dark:hover:shadow-indigo-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-indigo-600">${(totalValue - totalGainLoss).toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Cost Basis</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">{updatedHoldings.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Positions</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stockHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${formatNumber(Number(value))}`, 'Portfolio Value']} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/50 dark:hover:shadow-green-500/30 cursor-pointer">
                <div className={`text-xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Return</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 cursor-pointer">
                <div className="text-xl font-bold text-blue-600">${formatNumber(totalValue)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Portfolio Value</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/50 dark:hover:shadow-yellow-500/30 cursor-pointer">
                <div className="text-xl font-bold text-yellow-600">{updatedHoldings.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Positions</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dividends' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quarterly Dividends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dividendHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip cursor={false} formatter={(value) => [`$${value}`, 'Dividend']} />
                    <Bar dataKey="dividend" fill="#8b5cf6" isAnimationActive={true} animationDuration={300} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mx-2 py-2 -my-2">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-xl font-bold text-purple-600">
                  ${Math.round(updatedHoldings.reduce((sum, h) => {
                    const price = prices[h.symbol]?.price || 0;
                    const value = h.shares * price;
                    const estimatedYield = h.sector === 'Technology' ? 0.005 : 0.03;
                    return sum + (value * estimatedYield);
                  }, 0) * 4).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Est. Annual Dividends</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/50 dark:hover:shadow-indigo-500/30 cursor-pointer">
                <div className="text-xl font-bold text-indigo-600">
                  {updatedHoldings.length > 0 ? (
                    (updatedHoldings.reduce((sum, h) => {
                      const estimatedYield = h.sector === 'Technology' ? 0.5 : 3.0;
                      return sum + estimatedYield;
                    }, 0) / updatedHoldings.length).toFixed(1)
                  ) : '0.0'}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Yield</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 cursor-pointer">
                <div className="text-xl font-bold text-blue-600">
                  ${Math.round(updatedHoldings.reduce((sum, h) => {
                    const price = prices[h.symbol]?.price || 0;
                    const value = h.shares * price;
                    const estimatedYield = h.sector === 'Technology' ? 0.005 : 0.03;
                    return sum + (value * estimatedYield);
                  }, 0)).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Est. Quarterly</div>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/50 dark:hover:shadow-violet-500/30 cursor-pointer">
                <div className="text-xl font-bold text-violet-600">{updatedHoldings.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Div. Stocks</div>
              </div>
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
      
      <TechnicalAnalysisComponent />
    </div>
  );
}

function StocksHoverContent() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const symbols = stockHoldings.map(holding => holding.symbol);
  const { prices } = useAssetPrices(symbols);

  useEffect(() => {
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getStockHoldings([]);
      setStockHoldings(savedHoldings);
    };
    loadHoldings();
    
    // Listen for data changes
    const handleDataChange = () => loadHoldings();
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Calculate portfolio values with real-time prices
  const portfolioData = stockHoldings.map(holding => {
    const currentPriceData = prices[holding.symbol];
    const currentPrice = currentPriceData?.price || 0;
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
  // Estimate annual dividends based on typical yields by sector
  const estimatedDividends = stockHoldings.reduce((sum, h) => {
    const price = prices[h.symbol]?.price || 0;
    const value = h.shares * price;
    // Tech stocks typically yield 0-1%, other sectors 2-4%
    const estimatedYield = h.sector === 'Technology' ? 0.005 : 0.03;
    return sum + (value * estimatedYield);
  }, 0);
  
  // Show top 2 holdings by value
  const topHoldings = [...portfolioData].sort((a, b) => b.currentValue - a.currentValue).slice(0, 2);

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
          <span>Est. Annual Dividends</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">${formatNumber(estimatedDividends)}</span>
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
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getStockHoldings([]);
      setStockHoldings(savedHoldings);
    };
    loadHoldings();
    
    // Listen for data changes and reload
    const handleDataChange = () => {
      loadHoldings();
    };
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange); // Re-render on currency change
    
    return () => {
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
    if (currentPriceData) {
      const currentPrice = currentPriceData.price;
      const value = holding.shares * currentPrice;
      const changePercent = ((currentPrice - holding.entryPoint) / holding.entryPoint * 100);
      
      return {
        ...holding,
        value,
        change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
        currentPrice
      };
    }
    return holding;
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
