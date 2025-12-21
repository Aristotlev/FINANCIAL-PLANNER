"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Plus, 
  Edit3, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  Filter,
  Globe,
  Zap,
  Coins,
  Building2,
  Tag,
  BarChart2,
  Activity as VolumeIcon,
  Briefcase,
  User,
  MapPin,
  Users,
  Percent,
  PieChart,
  Coins as CoinsIcon,
  TrendingUp as TrendingUpIcon
} from "lucide-react";
import { TbChartCandle, TbBrandWindows, TbChartLine, TbBuildingBank, TbHeartPlus, TbCpu, TbShoppingCart, TbCreditCard, TbCurrencyEuro, TbCurrencyYen, TbCurrencyPound, TbDiamond } from "react-icons/tb";
import { 
  SiApple, 
  SiAmazon, 
  SiGoogle, 
  SiTesla, 
  SiNvidia, 
  SiMeta,
  SiBitcoin,
  SiEthereum,
  SiCardano
} from "react-icons/si";
import {
  AppleIconTV,
  MicrosoftIconTV,
  AmazonIconTV,
  GoogleIconTV,
  TeslaIconTV,
  NvidiaIconTV,
  MetaIconTV,
  BTCIconTV,
  ETHIconTV,
  BNBIconTV,
  SOLIconTV,
  GoldIcon,
  SilverIcon,
  OilIcon,
  USDIcon,
  EURIcon,
  GBPIcon,
  JPYIcon,
  CHFIcon,
  AUDIcon,
  CADIcon,
  NZDIcon,
  EURUSDIcon,
  GBPUSDIcon,
  USDJPYIcon,
  USDCHFIcon,
  AUDUSDIcon,
  USDCADIcon,
  NZDUSDIcon,
  EURGBPIcon,
  EURJPYIcon,
  GBPJPYIcon,
  SP500Icon,
  DJIIcon,
  NASDAQIndexIcon,
  ETFIcon,
  ChartIcon
} from "../../lib/tradingview-icons";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, ConditionalThemedStatBox, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { priceService, AssetPrice } from "../../lib/price-service";
import { 
  TRADING_DATABASE, 
  TradingInstrument, 
  searchTradingInstruments, 
  getAllCategories, 
  getAllTypes, 
  getInstrumentBySymbol,
  getInstrumentsByType,
  getInstrumentColor
} from "../../lib/trading-database";
import { InstrumentTooltip } from "../ui/instrument-tooltip";
import { formatNumber } from "../../lib/utils";
import { useTechnicalAnalysis } from "../../hooks/use-technical-analysis";
import { AITradingSignals } from "../ui/ai-trading-signals";
import { AIRebalancing } from "../ui/ai-rebalancing";
import { TradingCalculatorPanel } from "../ui/trading-calculator-panel";
import { ForexTradingTab } from "../ui/forex-trading-tab";
import { CryptoFuturesTradingTab } from "../ui/crypto-futures-trading-tab";
import { OptionsTradingTab } from "../ui/options-trading-tab";
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";

// Trading Icon Component - TradingView style icons
function TradingIcon({ symbol, className = "w-5 h-5" }: { symbol: string; className?: string }) {
  const iconProps = { className };
  
  // Handle undefined or null symbol
  if (!symbol) {
    return <ETFIcon symbol="?" className={className} color="#64748b" />;
  }
  
  switch (symbol.toUpperCase()) {
    // Stocks - TradingView exact style
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
    case 'V':
      return <ETFIcon symbol="V" className={className} color="#1A1F71" />;
    case 'JPM':
      return <ETFIcon symbol="JPM" className={className} color="#1B4D99" />;
    case 'BAC':
      return <ETFIcon symbol="BAC" className={className} color="#E31837" />;
    
    // Chinese Stocks - TradingView style
    case 'NIO':
      return <ETFIcon symbol="NIO" className={className} color="#00D8FF" />;
    case 'BABA':
      return <ETFIcon symbol="BABA" className={className} color="#FF6900" />;
    case 'JD':
      return <ETFIcon symbol="JD" className={className} color="#E3002B" />;
    case 'BIDU':
      return <ETFIcon symbol="BIDU" className={className} color="#2319DC" />;
    case 'TCEHY':
      return <ETFIcon symbol="TCEHY" className={className} color="#07C160" />;
    case 'PDD':
      return <ETFIcon symbol="PDD" className={className} color="#E02E24" />;
    case 'XPEV':
      return <ETFIcon symbol="XPEV" className={className} color="#4B9BFF" />;
    case 'LI':
      return <ETFIcon symbol="LI" className={className} color="#4169E1" />;
    case 'NTES':
      return <ETFIcon symbol="NTES" className={className} color="#D4237A" />;
    case 'WB':
      return <ETFIcon symbol="WB" className={className} color="#E6162D" />;
    
    // ETFs and Indices - TradingView style
    case 'SPY':
    case 'SPX':
      return <SP500Icon className={className} />;
    case 'QQQ':
      return <NASDAQIndexIcon className={className} />;
    case 'DIA':
      return <DJIIcon className={className} />;
    case 'VOO':
    case 'IVV':
      return <ETFIcon symbol={symbol} className={className} color="#B41E3E" />;
    case 'FXI':
      return <ETFIcon symbol="FXI" className={className} color="#DC143C" />;
    case 'ASHR':
      return <ETFIcon symbol="ASHR" className={className} color="#FF4500" />;
    case 'YANG':
      return <ETFIcon symbol="YANG" className={className} color="#8B0000" />;
    
    // Sector ETFs - SPDR Select Sector
    case 'XLK':
      return <ETFIcon symbol="XLK" className={className} color="#4169E1" />; // Technology
    case 'XLF':
      return <ETFIcon symbol="XLF" className={className} color="#2E7D32" />; // Financials
    case 'XLE':
      return <ETFIcon symbol="XLE" className={className} color="#E65100" />; // Energy
    case 'XLV':
      return <ETFIcon symbol="XLV" className={className} color="#D32F2F" />; // Healthcare
    case 'XLY':
      return <ETFIcon symbol="XLY" className={className} color="#7B1FA2" />; // Consumer Discretionary
    case 'XLP':
      return <ETFIcon symbol="XLP" className={className} color="#00796B" />; // Consumer Staples
    case 'XLI':
      return <ETFIcon symbol="XLI" className={className} color="#5D4037" />; // Industrials
    case 'XLRE':
      return <ETFIcon symbol="XLRE" className={className} color="#0288D1" />; // Real Estate
    case 'XLB':
      return <ETFIcon symbol="XLB" className={className} color="#F57C00" />; // Materials
    case 'XLC':
      return <ETFIcon symbol="XLC" className={className} color="#C2185B" />; // Communications
    case 'XLU':
      return <ETFIcon symbol="XLU" className={className} color="#1976D2" />; // Utilities
    
    // Popular ETFs
    case 'IWM':
      return <ETFIcon symbol="IWM" className={className} color="#FF6B6B" />; // Russell 2000
    case 'VTI':
      return <ETFIcon symbol="VTI" className={className} color="#B41E3E" />; // Total Stock Market
    case 'EFA':
      return <ETFIcon symbol="EFA" className={className} color="#1565C0" />; // EAFE
    case 'EEM':
      return <ETFIcon symbol="EEM" className={className} color="#00897B" />; // Emerging Markets
    case 'VWO':
      return <ETFIcon symbol="VWO" className={className} color="#00695C" />; // Emerging Markets
    case 'AGG':
      return <ETFIcon symbol="AGG" className={className} color="#455A64" />; // Aggregate Bond
    case 'TLT':
      return <ETFIcon symbol="TLT" className={className} color="#37474F" />; // Long-Term Treasury
    case 'GLD':
      return <ETFIcon symbol="GLD" className={className} color="#FFD700" />; // Gold
    case 'SLV':
      return <ETFIcon symbol="SLV" className={className} color="#C0C0C0" />; // Silver
    case 'USO':
      return <ETFIcon symbol="USO" className={className} color="#424242" />; // Oil
    case 'VNQ':
      return <ETFIcon symbol="VNQ" className={className} color="#0288D1" />; // Real Estate
    case 'HYG':
      return <ETFIcon symbol="HYG" className={className} color="#6A1B9A" />; // High Yield Bond
    case 'LQD':
      return <ETFIcon symbol="LQD" className={className} color="#303F9F" />; // Investment Grade
    
    // More Popular Stocks
    case 'NFLX':
      return <ETFIcon symbol="NFLX" className={className} color="#E50914" />;
    case 'DIS':
      return <ETFIcon symbol="DIS" className={className} color="#0066CC" />;
    case 'V':
      return <ETFIcon symbol="V" className={className} color="#1A1F71" />;
    case 'MA':
      return <ETFIcon symbol="MA" className={className} color="#EB001B" />;
    case 'PYPL':
      return <ETFIcon symbol="PYPL" className={className} color="#003087" />;
    case 'INTC':
      return <ETFIcon symbol="INTC" className={className} color="#0071C5" />;
    case 'AMD':
      return <ETFIcon symbol="AMD" className={className} color="#ED1C24" />;
    case 'CRM':
      return <ETFIcon symbol="CRM" className={className} color="#00A1E0" />;
    case 'ORCL':
      return <ETFIcon symbol="ORCL" className={className} color="#F80000" />;
    case 'ADBE':
      return <ETFIcon symbol="ADBE" className={className} color="#FF0000" />;
    case 'CSCO':
      return <ETFIcon symbol="CSCO" className={className} color="#1BA0D7" />;
    case 'AVGO':
      return <ETFIcon symbol="AVGO" className={className} color="#FF6C00" />;
    case 'TXN':
      return <ETFIcon symbol="TXN" className={className} color="#E61E25" />;
    case 'QCOM':
      return <ETFIcon symbol="QCOM" className={className} color="#3253DC" />;
    
    // Major Indices
    case 'NDX':
    case 'IXIC':
      return <NASDAQIndexIcon className={className} />;
    case 'DJI':
    case 'INDU':
      return <DJIIcon className={className} />;
    case 'RUT':
    case 'RTY':
      return <ETFIcon symbol="RUT" className={className} color="#FF6B6B" />;
    case 'VIX':
      return <ETFIcon symbol="VIX" className={className} color="#FF3B30" />;
    
    // International Indices
    case 'FTSE':
    case 'UKX':
      return <ETFIcon symbol="FTSE" className={className} color="#00247D" />;
    case 'DAX':
      return <ETFIcon symbol="DAX" className={className} color="#000000" />;
    case 'CAC':
      return <ETFIcon symbol="CAC" className={className} color="#0055A4" />;
    case 'NKY':
    case 'NIKKEI':
      return <ETFIcon symbol="NKY" className={className} color="#BC002D" />;
    case 'HSI':
      return <ETFIcon symbol="HSI" className={className} color="#DE2910" />;
    case 'STOXX50E':
      return <ETFIcon symbol="SX5E" className={className} color="#003399" />;
    case 'SHCOMP':
      return <ETFIcon symbol="SSE" className={className} color="#DE2910" />;
    
    // Stablecoins
    case 'USDT':
    case 'USDTUSD':
      return <ETFIcon symbol="USDT" className={className} color="#26A17B" />;
    case 'USDC':
    case 'USDCUSD':
      return <ETFIcon symbol="USDC" className={className} color="#2775CA" />;
    case 'DAI':
    case 'DAIUSD':
      return <ETFIcon symbol="DAI" className={className} color="#F5AC37" />;
    case 'BUSD':
    case 'BUSDUSD':
      return <ETFIcon symbol="BUSD" className={className} color="#F0B90B" />;
    
    // More Cryptocurrencies
    case 'ATOM':
    case 'ATOMUSD':
      return <ETFIcon symbol="ATOM" className={className} color="#2E3148" />;
    case 'NEAR':
    case 'NEARUSD':
      return <ETFIcon symbol="NEAR" className={className} color="#000000" />;
    case 'FTM':
    case 'FTMUSD':
      return <ETFIcon symbol="FTM" className={className} color="#13B5EC" />;
    case 'ALGO':
    case 'ALGOUSD':
      return <ETFIcon symbol="ALGO" className={className} color="#000000" />;
    case 'VET':
    case 'VETUSD':
      return <ETFIcon symbol="VET" className={className} color="#15BDFF" />;
    case 'ICP':
    case 'ICPUSD':
      return <ETFIcon symbol="ICP" className={className} color="#29ABE2" />;
    case 'APT':
    case 'APTUSD':
      return <ETFIcon symbol="APT" className={className} color="#000000" />;
    case 'ARB':
    case 'ARBUSD':
      return <ETFIcon symbol="ARB" className={className} color="#28A0F0" />;
    case 'OP':
    case 'OPUSD':
      return <ETFIcon symbol="OP" className={className} color="#FF0420" />;
    
    // Cryptocurrencies - TradingView exact style
    case 'BTC':
    case 'BTCUSD':
      return <BTCIconTV className={className} />;
    case 'ETH':
    case 'ETHUSD':
      return <ETHIconTV className={className} />;
    case 'BNB':
    case 'BNBUSD':
      return <BNBIconTV className={className} />;
    case 'SOL':
    case 'SOLUSD':
      return <SOLIconTV className={className} />;
    case 'ADA':
    case 'ADAUSD':
      return <ETFIcon symbol="ADA" className={className} color="#0033AD" />;
    case 'XRP':
    case 'XRPUSD':
      return <ETFIcon symbol="XRP" className={className} color="#23292F" />;
    case 'DOT':
    case 'DOTUSD':
      return <ETFIcon symbol="DOT" className={className} color="#E6007A" />;
    case 'DOGE':
    case 'DOGEUSD':
      return <ETFIcon symbol="DOGE" className={className} color="#C2A633" />;
    case 'AVAX':
    case 'AVAXUSD':
      return <ETFIcon symbol="AVAX" className={className} color="#E84142" />;
    case 'MATIC':
    case 'MATICUSD':
      return <ETFIcon symbol="MATIC" className={className} color="#8247E5" />;
    case 'LINK':
    case 'LINKUSD':
      return <ETFIcon symbol="LINK" className={className} color="#375BD2" />;
    
    // Forex Pairs - TradingView dual currency style
    case 'EURUSD':
    case 'EUR/USD':
      return <EURUSDIcon className={className} />;
    case 'GBPUSD':
    case 'GBP/USD':
      return <GBPUSDIcon className={className} />;
    case 'USDJPY':
    case 'USD/JPY':
      return <USDJPYIcon className={className} />;
    case 'EURGBP':
    case 'EUR/GBP':
      return <EURGBPIcon className={className} />;
    case 'EURJPY':
    case 'EUR/JPY':
      return <EURJPYIcon className={className} />;
    case 'GBPJPY':
    case 'GBP/JPY':
      return <GBPJPYIcon className={className} />;
    case 'USDCAD':
    case 'USD/CAD':
      return <USDCADIcon className={className} />;
    case 'AUDUSD':
    case 'AUD/USD':
      return <AUDUSDIcon className={className} />;
    case 'NZDUSD':
    case 'NZD/USD':
      return <NZDUSDIcon className={className} />;
    case 'USDCHF':
    case 'USD/CHF':
      return <USDCHFIcon className={className} />;
    
    // Commodities - TradingView style
    case 'GC':
    case 'GOLD':
    case 'XAU/USD':
    case 'XAUUSD':
      return <GoldIcon className={className} />;
    case 'SI':
    case 'SILVER':
    case 'XAG/USD':
    case 'XAGUSD':
      return <SilverIcon className={className} />;
    case 'CL':
    case 'WTI':
    case 'CRUDE':
      return <OilIcon className={className} />;
    case 'NG':
    case 'NATGAS':
      return <ETFIcon symbol="NG" className={className} color="#4169E1" />;
    case 'HG':
    case 'COPPER':
      return <ETFIcon symbol="CU" className={className} color="#B87333" />;
    case 'PL':
    case 'PLATINUM':
      return <ETFIcon symbol="PT" className={className} color="#E5E4E2" />;
    case 'PA':
    case 'PALLADIUM':
      return <ETFIcon symbol="PD" className={className} color="#CED0DD" />;
    
    // Agricultural Commodities
    case 'ZC':
    case 'CORN':
      return <ETFIcon symbol="CORN" className={className} color="#DAA520" />;
    case 'ZW':
    case 'WHEAT':
      return <ETFIcon symbol="WHEAT" className={className} color="#F4A460" />;
    case 'ZS':
    case 'SOYBEANS':
      return <ETFIcon symbol="SOY" className={className} color="#6B8E23" />;
    case 'KC':
    case 'COFFEE':
      return <ETFIcon symbol="COFF" className={className} color="#6F4E37" />;
    case 'SB':
    case 'SUGAR':
      return <ETFIcon symbol="SUGR" className={className} color="#FFFFFF" />;
    case 'CC':
    case 'COCOA':
      return <ETFIcon symbol="COCO" className={className} color="#D2691E" />;
    case 'CT':
    case 'COTTON':
      return <ETFIcon symbol="COTN" className={className} color="#FFFFF0" />;
    
    // Livestock
    case 'LE':
    case 'CATTLE':
      return <ETFIcon symbol="CATL" className={className} color="#8B4513" />;
    case 'HE':
    case 'HOGS':
      return <ETFIcon symbol="HOGS" className={className} color="#CD853F" />;
    
    // Default - generic chart icon
    default:
      return <ChartIcon className={className} color="#2196F3" />;
  }
}

interface TradingPosition {
  id: string;
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  entryDate: string;
  positionType: 'long' | 'short';
  stopLoss?: number;
  takeProfit?: number;
  notes: string;
  color: string;
  // Calculated fields
  profitLoss?: number;
  profitLossPercent?: number;
  potentialLoss?: number;
  potentialGain?: number;
  riskRewardRatio?: number;
}

const initialTradingPositions: TradingPosition[] = [
  {
    id: "1",
    symbol: "TSLA",
    shares: 15,
    avgPrice: 245.50,
    currentPrice: 252.30,
    entryDate: "2024-09-15",
    positionType: "long",
    stopLoss: 220.00,
    takeProfit: 280.00,
    notes: "Electric vehicle growth play",
    color: "#dc2626"
  },
  {
    id: "2", 
    symbol: "SPX",
    shares: 2,
    avgPrice: 4315.20,
    currentPrice: 4327.50,
    entryDate: "2024-09-10",
    positionType: "long",
    stopLoss: 4250.00,
    notes: "S&P 500 index futures",
    color: "#8b5cf6"
  },
  {
    id: "3",
    symbol: "EUR/USD",
    shares: 100000,
    avgPrice: 1.0825,
    currentPrice: 1.0845,
    entryDate: "2024-09-20",
    positionType: "long",
    stopLoss: 1.0780,
    takeProfit: 1.0920,
    notes: "Euro strength play",
    color: "#0ea5e9"
  },
  {
    id: "4",
    symbol: "XAU/USD",
    shares: 5,
    avgPrice: 1965.50,
    currentPrice: 1978.45,
    entryDate: "2024-09-22",
    positionType: "long",
    stopLoss: 1920.00,
    takeProfit: 2050.00,
    notes: "Gold hedge against inflation",
    color: "#f59e0b"
  },
  {
    id: "5",
    symbol: "WTI",
    shares: -3,
    avgPrice: 91.20,
    currentPrice: 89.23,
    entryDate: "2024-09-25",
    positionType: "short",
    stopLoss: 95.00,
    takeProfit: 82.00,
    notes: "Oil bearish on recession fears",
    color: "#059669"
  }
];

// Trading Instrument Search Modal Component
function TradingInstrumentSearchModal({
  isOpen,
  onClose,
  onSelectInstrument
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectInstrument: (instrument: TradingInstrument) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredInstruments, setFilteredInstruments] = useState<TradingInstrument[]>(TRADING_DATABASE);

  useEffect(() => {
    let results = TRADING_DATABASE;

    // Apply search query filter
    if (searchQuery.trim()) {
      results = searchTradingInstruments(searchQuery);
    }

    // Apply type filter
    if (selectedType) {
      results = results.filter((instrument: TradingInstrument) => instrument.type === selectedType);
    }

    // Apply category filter
    if (selectedCategory) {
      results = results.filter((instrument: TradingInstrument) => instrument.category === selectedCategory);
    }

    setFilteredInstruments(results);
  }, [searchQuery, selectedType, selectedCategory]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedCategory('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select Trading Instrument</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose from stocks, indices, forex, commodities & more</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300" />
              <input
                type="text"
                placeholder="Search instruments, symbols, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Types</option>
              {getAllTypes().map((type: string) => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Categories</option>
              {getAllCategories().map((category: string) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedType || selectedCategory) && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Filter className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstruments.map((instrument) => {
              const instrumentColor = getInstrumentColor(instrument);

              return (
                <InstrumentTooltip key={instrument.symbol} instrument={instrument}>
                  <div
                    onClick={() => {
                      onSelectInstrument(instrument);
                      onClose();
                    }}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 cursor-pointer transition-all hover:shadow-md"
                  >
                  {/* Instrument Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <TradingIcon symbol={instrument.symbol} className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{instrument.symbol}</h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          {instrument.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{instrument.name}</p>
                    </div>
                  </div>

                  {/* Instrument Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        Price:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {instrument.currency === 'JPY' ? '¥' : instrument.currency === 'EUR' ? '€' : instrument.currency === 'GBP' ? '£' : '$'}
                        {instrument.currentPrice}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        Exchange:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{instrument.exchange}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        Category:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate ml-2">{instrument.category}</span>
                    </div>
                    {instrument.marketCap && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <BarChart2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                          Market Cap:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{instrument.marketCap}</span>
                      </div>
                    )}
                    {instrument.volume && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <VolumeIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                          Volume:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{instrument.volume}</span>
                      </div>
                    )}
                    {instrument.sector && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                          Sector:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{instrument.sector}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                      {instrument.description}
                    </p>
                  </div>

                  {/* Additional Company Info for Stocks */}
                  {instrument.type === 'stock' && (instrument.ceo || instrument.founded || instrument.employees) && (
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {instrument.ceo && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">CEO:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.ceo}</span>
                          </div>
                        )}
                        {instrument.founded && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Founded:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.founded}</span>
                          </div>
                        )}
                        {instrument.employees && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Employees:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.employees}</span>
                          </div>
                        )}
                        {instrument.headquarters && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">HQ:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.headquarters}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Financial Metrics for Stocks and ETFs */}
                  {(instrument.type === 'stock' || instrument.type === 'etf') && (instrument.peRatio || instrument.dividendYield || instrument.eps) && (
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {instrument.peRatio && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">P/E Ratio:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.peRatio}</span>
                          </div>
                        )}
                        {instrument.dividendYield && (
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Dividend:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.dividendYield}</span>
                          </div>
                        )}
                        {instrument.eps && (
                          <div className="flex items-center gap-1">
                            <TrendingUpIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">EPS:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.eps}</span>
                          </div>
                        )}
                        {instrument.revenue && (
                          <div className="flex items-center gap-1">
                            <PieChart className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                            <span className="font-medium ml-1 text-gray-900 dark:text-gray-200">{instrument.revenue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                </InstrumentTooltip>
              );
            })}
          </div>

          {filteredInstruments.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No instruments found matching your criteria</p>
              <button
                onClick={clearFilters}
                className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Clear filters to see all instruments
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradingAccountHoverContent() {
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [forexBalance, setForexBalance] = useState(0);
  const [cryptoBalance, setCryptoBalance] = useState(0);
  const [optionsBalance, setOptionsBalance] = useState(0);

  useEffect(() => {
    const loadPositions = async () => {
      const savedPositions = await SupabaseDataService.getTradingAccounts([]);
      setPositions(savedPositions);
    };
    
    const loadBalances = () => {
      if (typeof window !== 'undefined') {
        const forex = localStorage.getItem('forexAccountBalance');
        const crypto = localStorage.getItem('cryptoAccountBalance');
        const options = localStorage.getItem('optionsAccountBalance');
        setForexBalance(forex ? parseFloat(forex) : 0);
        setCryptoBalance(crypto ? parseFloat(crypto) : 0);
        setOptionsBalance(options ? parseFloat(options) : 0);
      }
    };
    
    loadPositions();
    loadBalances();
    
    // Listen for data changes
    const handleDataChange = () => {
      loadPositions();
      loadBalances();
    };
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('tradingDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('tradingDataChanged', handleDataChange);
    };
  }, []);

  // Calculate positions value
  const positionsValue = positions.reduce((sum, pos) => {
    const pnl = pos.positionType === 'long' 
      ? (pos.currentPrice - pos.avgPrice) * pos.shares
      : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares);
    return sum + (Math.abs(pos.shares) * pos.avgPrice) + pnl;
  }, 0);
  
  // Total value = all three account balances + positions value
  const totalValue = forexBalance + cryptoBalance + optionsBalance + positionsValue;

  const totalPnL = positions.reduce((sum, pos) => {
    return sum + (pos.positionType === 'long' 
      ? (pos.currentPrice - pos.avgPrice) * pos.shares
      : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares));
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Portfolio Value</span>
        <span className="text-sm font-bold text-cyan-600">${formatNumber(totalValue)}</span>
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Open Positions:</span>
          <span>{positions.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Today's P&L:</span>
          <span className={totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Long Positions:</span>
          <span>{positions.filter(p => p.positionType === 'long').length}</span>
        </div>
        <div className="flex justify-between">
          <span>Short Positions:</span>
          <span>{positions.filter(p => p.positionType === 'short').length}</span>
        </div>
      </div>
    </div>
  );
}

function AddTradingPositionModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (position: Omit<TradingPosition, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    symbol: '',
    shares: 0,
    avgPrice: 0,
    currentPrice: 0,
    entryDate: '',
    positionType: 'long' as 'long' | 'short',
    stopLoss: undefined as number | undefined,
    takeProfit: undefined as number | undefined,
    notes: '',
    color: '#8b5cf6'
  });

  const [showStockSearch, setShowStockSearch] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<TradingInstrument | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [autoCalculating, setAutoCalculating] = useState(false);

  // Auto-fetch current price when instrument is selected
  useEffect(() => {
    if (selectedInstrument) {
      const currentPrice = selectedInstrument.currentPrice || 0;
      setFormData(prev => ({
        ...prev,
        symbol: selectedInstrument.symbol,
        currentPrice: currentPrice,
        avgPrice: prev.avgPrice || currentPrice, // Set avgPrice to current if not already set
        color: getInstrumentColor(selectedInstrument)
      }));
    }
  }, [selectedInstrument]);

  // Auto-calculate stop loss and take profit when avgPrice or positionType changes
  useEffect(() => {
    if (formData.avgPrice > 0 && autoCalculating) {
      const stopLossPercent = 0.02; // 2% stop loss
      const takeProfitPercent = 0.04; // 4% take profit (1:2 risk/reward)

      if (formData.positionType === 'long') {
        setFormData(prev => ({
          ...prev,
          stopLoss: Number((prev.avgPrice * (1 - stopLossPercent)).toFixed(2)),
          takeProfit: Number((prev.avgPrice * (1 + takeProfitPercent)).toFixed(2))
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          stopLoss: Number((prev.avgPrice * (1 + stopLossPercent)).toFixed(2)),
          takeProfit: Number((prev.avgPrice * (1 - takeProfitPercent)).toFixed(2))
        }));
      }
    }
  }, [formData.avgPrice, formData.positionType, autoCalculating]);

  // Calculate current position metrics
  const calculateMetrics = () => {
    if (formData.shares === 0 || formData.avgPrice === 0) return null;

    const { shares, avgPrice, currentPrice, positionType, stopLoss, takeProfit } = formData;
    
    // Current P&L
    let profitLoss = 0;
    if (positionType === 'long') {
      profitLoss = (currentPrice - avgPrice) * shares;
    } else {
      profitLoss = (avgPrice - currentPrice) * shares;
    }
    const profitLossPercent = ((currentPrice - avgPrice) / avgPrice) * 100 * (positionType === 'long' ? 1 : -1);

    // Potential loss (if stop loss is set)
    let potentialLoss = 0;
    if (stopLoss) {
      if (positionType === 'long') {
        potentialLoss = (avgPrice - stopLoss) * shares;
      } else {
        potentialLoss = (stopLoss - avgPrice) * shares;
      }
    }

    // Potential gain (if take profit is set)
    let potentialGain = 0;
    if (takeProfit) {
      if (positionType === 'long') {
        potentialGain = (takeProfit - avgPrice) * shares;
      } else {
        potentialGain = (avgPrice - takeProfit) * shares;
      }
    }

    // Risk/reward ratio
    let riskRewardRatio = 0;
    if (potentialLoss > 0 && potentialGain > 0) {
      riskRewardRatio = potentialGain / potentialLoss;
    }

    return {
      profitLoss,
      profitLossPercent,
      potentialLoss,
      potentialGain,
      riskRewardRatio
    };
  };

  const metrics = calculateMetrics();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInstrument) {
      onAdd(formData);
      setFormData({ 
        symbol: '', 
        shares: 0, 
        avgPrice: 0, 
        currentPrice: 0, 
        entryDate: '', 
        positionType: 'long', 
        stopLoss: undefined, 
        takeProfit: undefined, 
        notes: '',
        color: '#8b5cf6'
      });
      setSelectedInstrument(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Trading Position</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
              <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Trading Instrument Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Trading Instrument</label>
              <button
                type="button"
                onClick={() => setShowStockSearch(true)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 text-left flex items-center justify-between"
              >
                {selectedInstrument ? (
                  <div className="flex items-center gap-2">
                    <TradingIcon symbol={selectedInstrument.symbol} className="w-5 h-5" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedInstrument.symbol}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {selectedInstrument.currency === 'JPY' ? '¥' : 
                         selectedInstrument.currency === 'EUR' ? '€' : 
                         selectedInstrument.currency === 'GBP' ? '£' : '$'}
                        {selectedInstrument.currentPrice}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Search for trading instrument...</span>
                )}
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-300" />
              </button>
            </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Position Type</label>
            <select
              value={formData.positionType}
              onChange={(e) => setFormData({...formData, positionType: e.target.value as 'long' | 'short'})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value="long">Long (Buy)</option>
              <option value="short">Short (Sell)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Shares</label>
            <input
              type="number"
              value={formData.shares}
              onChange={(e) => setFormData({...formData, shares: parseInt(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Average Price</label>
            <input
              type="number"
              value={formData.avgPrice}
              onChange={(e) => setFormData({...formData, avgPrice: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Current Price</label>
            <input
              type="number"
              value={formData.currentPrice}
              onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Entry Date</label>
            <input
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData({...formData, entryDate: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          
          {/* Auto-Calculate Toggle */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="autoCalc"
              checked={autoCalculating}
              onChange={(e) => setAutoCalculating(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded focus:ring-2 focus:ring-cyan-500"
            />
            <label htmlFor="autoCalc" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Auto-calculate Stop Loss & Take Profit (2% risk, 1:2 R:R)
            </label>
          </div>

          {/* Live Metrics Display */}
          {metrics && formData.shares > 0 && (
            <div className="p-4 bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-cyan-200 dark:border-gray-700 space-y-2">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Trade Analysis
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Position Size</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    ${(formData.shares * formData.avgPrice).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Current P&L</div>
                  <div className={`font-semibold ${metrics.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.profitLoss >= 0 ? '+' : ''}${metrics.profitLoss.toFixed(2)}
                    <span className="text-xs ml-1">({metrics.profitLossPercent.toFixed(2)}%)</span>
                  </div>
                </div>

                {metrics.potentialLoss > 0 && (
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Max Risk</div>
                    <div className="font-semibold text-red-600">
                      -${metrics.potentialLoss.toFixed(2)}
                    </div>
                  </div>
                )}

                {metrics.potentialGain > 0 && (
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Target Profit</div>
                    <div className="font-semibold text-green-600">
                      +${metrics.potentialGain.toFixed(2)}
                    </div>
                  </div>
                )}

                {metrics.riskRewardRatio > 0 && (
                  <div className="col-span-2">
                    <div className="text-gray-600 dark:text-gray-400">Risk/Reward Ratio</div>
                    <div className={`font-semibold ${metrics.riskRewardRatio >= 2 ? 'text-green-600' : metrics.riskRewardRatio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                      1:{metrics.riskRewardRatio.toFixed(2)}
                      {metrics.riskRewardRatio < 1.5 && (
                        <span className="text-xs ml-2 text-orange-600">(Low R:R)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Stop Loss (Optional)</label>
            <input
              type="number"
              value={formData.stopLoss || ''}
              onChange={(e) => setFormData({...formData, stopLoss: e.target.value ? parseFloat(e.target.value) : undefined})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              placeholder="Risk management level"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Take Profit (Optional)</label>
            <input
              type="number"
              value={formData.takeProfit || ''}
              onChange={(e) => setFormData({...formData, takeProfit: e.target.value ? parseFloat(e.target.value) : undefined})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              placeholder="Target profit level"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              rows={2}
              placeholder="Trade thesis or strategy notes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Chart Color</label>
            <input
              className="w-full p-2 border rounded h-10 cursor-pointer"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Select a color for charts and visualizations
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedInstrument}
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>

            <TradingInstrumentSearchModal
        isOpen={showStockSearch}
        onClose={() => setShowStockSearch(false)}
        onSelectInstrument={(instrument) => {
          setSelectedInstrument(instrument);
        }}
      />
    </>
  );
}

function EditTradingPositionModal({ 
  isOpen, 
  onClose, 
  position, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  position: TradingPosition | null;
  onUpdate: (position: TradingPosition) => Promise<void>;
}) {
  const [formData, setFormData] = useState<TradingPosition>({
    id: '',
    symbol: '',
    shares: 0,
    avgPrice: 0,
    currentPrice: 0,
    entryDate: '',
    positionType: 'long',
    stopLoss: undefined,
    takeProfit: undefined,
    notes: '',
    color: '#8b5cf6'
  });

  React.useEffect(() => {
    if (position) {
      setFormData(position);
    }
  }, [position]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    onClose();
  };

  if (!isOpen || !position) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Trading Position</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Position Type</label>
            <select
              value={formData.positionType}
              onChange={(e) => setFormData({...formData, positionType: e.target.value as 'long' | 'short'})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value="long">Long (Buy)</option>
              <option value="short">Short (Sell)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Shares</label>
            <input
              type="number"
              value={formData.shares}
              onChange={(e) => setFormData({...formData, shares: parseInt(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Average Price</label>
            <input
              type="number"
              value={formData.avgPrice}
              onChange={(e) => setFormData({...formData, avgPrice: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Current Price</label>
            <input
              type="number"
              value={formData.currentPrice}
              onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Entry Date</label>
            <input
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData({...formData, entryDate: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Stop Loss (Optional)</label>
            <input
              type="number"
              value={formData.stopLoss || ''}
              onChange={(e) => setFormData({...formData, stopLoss: e.target.value ? parseFloat(e.target.value) : undefined})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Take Profit (Optional)</label>
            <input
              type="number"
              value={formData.takeProfit || ''}
              onChange={(e) => setFormData({...formData, takeProfit: e.target.value ? parseFloat(e.target.value) : undefined})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              rows={2}
            />
          </div>
          
          {/* Chart Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Chart Color</label>
            <input
              className="w-full p-2 border rounded h-10 cursor-pointer"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Select a color for charts and visualizations
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600"
            >
              Update Position
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white dark:text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TradingAccountModalContent() {
  const [activeTab, setActiveTab] = useState<'positions' | 'analytics' | 'performance' | 'signals'>('positions');
  const [tradingSubTab, setTradingSubTab] = useState<'forex' | 'crypto-futures' | 'options' | 'overview'>('overview');
  
  // Separate account balances for each trading category - load from localStorage
  // Default to 0 if user hasn't set any balance
  const [forexAccountBalance, setForexAccountBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forexAccountBalance');
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });
  
  const [cryptoAccountBalance, setCryptoAccountBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cryptoAccountBalance');
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });
  
  const [optionsAccountBalance, setOptionsAccountBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('optionsAccountBalance');
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });
  
  // Track positions and stats for each trading category
  const [forexPositions, setForexPositions] = useState<any[]>([]);
  const [cryptoPositions, setCryptoPositions] = useState<any[]>([]);
  const [optionsPositions, setOptionsPositions] = useState<any[]>([]);
  
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<TradingPosition | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const { openTechnicalAnalysis, TechnicalAnalysisComponent } = useTechnicalAnalysis();

  // Save forex balance to localStorage and trigger updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forexAccountBalance', forexAccountBalance.toString());
      window.dispatchEvent(new Event('tradingDataChanged'));
      window.dispatchEvent(new Event('financialDataChanged'));
    }
  }, [forexAccountBalance]);
  
  // Save crypto balance to localStorage and trigger updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptoAccountBalance', cryptoAccountBalance.toString());
      window.dispatchEvent(new Event('tradingDataChanged'));
      window.dispatchEvent(new Event('financialDataChanged'));
    }
  }, [cryptoAccountBalance]);
  
  // Save options balance to localStorage and trigger updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('optionsAccountBalance', optionsAccountBalance.toString());
      window.dispatchEvent(new Event('tradingDataChanged'));
      window.dispatchEvent(new Event('financialDataChanged'));
    }
  }, [optionsAccountBalance]);

  // Calculate position metrics
  const calculatePositionMetrics = (position: TradingPosition) => {
    const { shares, avgPrice, currentPrice, positionType, stopLoss, takeProfit } = position;
    
    // Calculate current P&L
    let profitLoss = 0;
    if (positionType === 'long') {
      profitLoss = (currentPrice - avgPrice) * shares;
    } else {
      profitLoss = (avgPrice - currentPrice) * shares;
    }
    const profitLossPercent = ((currentPrice - avgPrice) / avgPrice) * 100 * (positionType === 'long' ? 1 : -1);

    // Calculate potential loss (if stop loss is set)
    let potentialLoss = 0;
    if (stopLoss) {
      if (positionType === 'long') {
        potentialLoss = (avgPrice - stopLoss) * shares;
      } else {
        potentialLoss = (stopLoss - avgPrice) * shares;
      }
    }

    // Calculate potential gain (if take profit is set)
    let potentialGain = 0;
    if (takeProfit) {
      if (positionType === 'long') {
        potentialGain = (takeProfit - avgPrice) * shares;
      } else {
        potentialGain = (avgPrice - takeProfit) * shares;
      }
    }

    // Calculate risk/reward ratio
    let riskRewardRatio = 0;
    if (potentialLoss > 0 && potentialGain > 0) {
      riskRewardRatio = potentialGain / potentialLoss;
    }

    return {
      ...position,
      profitLoss,
      profitLossPercent,
      potentialLoss,
      potentialGain,
      riskRewardRatio
    };
  };

  // Fetch current price for a symbol
  const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
    setFetchingPrice(true);
    setPriceError(null);
    
    try {
      // Try to get instrument from trading database
      const instrument = getInstrumentBySymbol(symbol);
      if (instrument && instrument.currentPrice) {
        setFetchingPrice(false);
        return instrument.currentPrice;
      }

      // If not in database, try to fetch from price service
      return new Promise((resolve) => {
        const unsubscribe = priceService.subscribe(symbol, (priceData: AssetPrice) => {
          unsubscribe();
          setFetchingPrice(false);
          resolve(priceData.price);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          setFetchingPrice(false);
          setPriceError('Price fetch timeout');
          resolve(null);
        }, 10000);
      });
    } catch (error) {
      console.error('Error fetching price:', error);
      setFetchingPrice(false);
      setPriceError('Failed to fetch price');
      return null;
    }
  };

  // Auto-calculate stop loss and take profit suggestions
  const calculateSuggestedLevels = (avgPrice: number, positionType: 'long' | 'short') => {
    // Default risk: 2% stop loss, 4% take profit (1:2 risk/reward)
    const stopLossPercent = 0.02;
    const takeProfitPercent = 0.04;

    if (positionType === 'long') {
      return {
        stopLoss: avgPrice * (1 - stopLossPercent),
        takeProfit: avgPrice * (1 + takeProfitPercent)
      };
    } else {
      return {
        stopLoss: avgPrice * (1 + stopLossPercent),
        takeProfit: avgPrice * (1 - takeProfitPercent)
      };
    }
  };
  const isInitialMount = useRef(true);

  // Load data on component mount
  useEffect(() => {
    const loadPositions = async () => {
      const savedPositions = await SupabaseDataService.getTradingAccounts([]);
      setPositions(savedPositions);
    };
    loadPositions();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadPositions();
    window.addEventListener('tradingDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('tradingDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all positions changes

  const totalValue = positions.reduce((sum, pos) => {
    const pnl = pos.positionType === 'long' 
      ? (pos.currentPrice - pos.avgPrice) * pos.shares
      : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares);
    return sum + (Math.abs(pos.shares) * pos.avgPrice) + pnl;
  }, 0);

  const totalPnL = positions.reduce((sum, pos) => {
    return sum + (pos.positionType === 'long' 
      ? (pos.currentPrice - pos.avgPrice) * pos.shares
      : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares));
  }, 0);

  const addPosition = async (positionData: Omit<TradingPosition, 'id'>) => {
    const newPosition: TradingPosition = {
      ...positionData,
      id: crypto.randomUUID()
    };
    // Save to database first
    await SupabaseDataService.saveTradingAccount(newPosition);
    setPositions([...positions, newPosition]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updatePosition = async (updatedPosition: TradingPosition) => {
    await SupabaseDataService.saveTradingAccount(updatedPosition);
    setPositions(positions.map(position => 
      position.id === updatedPosition.id ? updatedPosition : position
    ));
    setEditingPosition(null);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deletePosition = async (positionId: string) => {
    await SupabaseDataService.deleteTradingAccount(positionId);
    setPositions(positions.filter(position => position.id !== positionId));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const editPosition = (position: TradingPosition) => {
    setEditingPosition(position);
    setShowEditModal(true);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'positions', label: 'Positions', icon: Briefcase },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'signals', label: 'AI Signals', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            {/* Trading Account Balances - Three Separate Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Forex Account Balance */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 transition-all hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Forex Account
                  </label>
                </div>
                <input
                  type="number"
                  value={forexAccountBalance}
                  onChange={(e) => setForexAccountBalance(parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600 rounded-lg text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  For forex trading positions
                </p>
              </div>

              {/* Crypto Account Balance */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-5 rounded-xl border-2 border-purple-200 dark:border-purple-800 transition-all hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CoinsIcon className="w-5 h-5 text-purple-600" />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Crypto Account
                  </label>
                </div>
                <input
                  type="number"
                  value={cryptoAccountBalance}
                  onChange={(e) => setCryptoAccountBalance(parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-600 rounded-lg text-xl font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  For crypto futures trading
                </p>
              </div>

              {/* Options Account Balance */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-xl border-2 border-green-200 dark:border-green-800 transition-all hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUpIcon className="w-5 h-5 text-green-600" />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Options Account
                  </label>
                </div>
                <input
                  type="number"
                  value={optionsAccountBalance}
                  onChange={(e) => setOptionsAccountBalance(parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-600 rounded-lg text-xl font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  For options trading positions
                </p>
              </div>
            </div>

            {/* Trading Sub-tabs */}
            <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
              <button
                onClick={() => setTradingSubTab('overview')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold whitespace-nowrap ${
                  tradingSubTab === 'overview'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setTradingSubTab('forex')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold whitespace-nowrap ${
                  tradingSubTab === 'forex'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Forex Trading
              </button>
              <button
                onClick={() => setTradingSubTab('crypto-futures')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold whitespace-nowrap ${
                  tradingSubTab === 'crypto-futures'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <CoinsIcon className="w-4 h-4 inline mr-2" />
                Crypto Futures
              </button>
              <button
                onClick={() => setTradingSubTab('options')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold whitespace-nowrap ${
                  tradingSubTab === 'options'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <TrendingUpIcon className="w-4 h-4 inline mr-2" />
                Options
              </button>
            </div>

            {/* Overview Sub-tab (existing positions view) */}
            {tradingSubTab === 'overview' && (
              <>
                {/* Account Summary Cards - Enhanced 3D Design */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Forex Account Summary */}
                  <div 
                    onClick={() => setTradingSubTab('forex')}
                    className="group relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-blue-950/50 dark:via-blue-900/40 dark:to-indigo-900/40 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    {/* 3D Background Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 dark:from-blue-400/5 dark:to-indigo-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <DollarSign className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Forex Trading</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Currency Pairs</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded-full font-bold shadow-md">
                            ACTIVE
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                            {forexPositions.length} positions
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 bg-white/50 dark:bg-gray-900/30 p-4 rounded-xl backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Balance</span>
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${formatNumber(forexAccountBalance)}</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent" />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Positions</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{forexPositions.length}</div>
                          </div>
                          <div className="text-center border-x border-blue-200 dark:border-blue-800">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Used Margin</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              ${formatNumber(forexPositions.reduce((sum, p) => sum + (p.margin || 0), 0))}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total P&L</div>
                            <div className={`text-lg font-bold ${forexPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {forexPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0) >= 0 ? '+' : ''}
                              ${formatNumber(forexPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0))}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {forexPositions.filter(p => p.direction === 'long').length} Long • {forexPositions.filter(p => p.direction === 'short').length} Short
                          </span>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Crypto Account Summary */}
                  <div 
                    onClick={() => setTradingSubTab('crypto-futures')}
                    className="group relative bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 dark:from-purple-950/50 dark:via-purple-900/40 dark:to-pink-900/40 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    {/* 3D Background Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-600/10 dark:from-purple-400/5 dark:to-pink-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-purple-500 dark:bg-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <CoinsIcon className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Crypto Futures</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Digital Assets</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs px-3 py-1 bg-purple-600 dark:bg-purple-700 text-white rounded-full font-bold shadow-md">
                            ACTIVE
                          </span>
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                            {cryptoPositions.length} positions
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 bg-white/50 dark:bg-gray-900/30 p-4 rounded-xl backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Balance</span>
                          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">${formatNumber(cryptoAccountBalance)}</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-purple-300 dark:via-purple-700 to-transparent" />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Positions</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{cryptoPositions.length}</div>
                          </div>
                          <div className="text-center border-x border-purple-200 dark:border-purple-800">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Used Margin</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              ${formatNumber(cryptoPositions.reduce((sum, p) => sum + (p.margin || 0), 0))}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total P&L</div>
                            <div className={`text-lg font-bold ${cryptoPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {cryptoPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0) >= 0 ? '+' : ''}
                              ${formatNumber(cryptoPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0))}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-purple-200 dark:border-purple-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {cryptoPositions.filter(p => p.direction === 'long').length} Long • {cryptoPositions.filter(p => p.direction === 'short').length} Short
                          </span>
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options Account Summary */}
                  <div 
                    onClick={() => setTradingSubTab('options')}
                    className="group relative bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 dark:from-green-950/50 dark:via-green-900/40 dark:to-emerald-900/40 p-6 rounded-2xl border-2 border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 shadow-lg hover:shadow-2xl hover:shadow-green-500/50 dark:hover:shadow-green-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    {/* 3D Background Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-600/10 dark:from-green-400/5 dark:to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-green-500 dark:bg-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <TrendingUpIcon className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Options Trading</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Calls & Puts</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs px-3 py-1 bg-green-600 dark:bg-green-700 text-white rounded-full font-bold shadow-md">
                            ACTIVE
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                            {optionsPositions.length} positions
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 bg-white/50 dark:bg-gray-900/30 p-4 rounded-xl backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Balance</span>
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">${formatNumber(optionsAccountBalance)}</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-green-300 dark:via-green-700 to-transparent" />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Contracts</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{optionsPositions.length}</div>
                          </div>
                          <div className="text-center border-x border-green-200 dark:border-green-800">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Deployed</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              ${formatNumber(optionsPositions.reduce((sum, p) => sum + ((p.premium || 0) * (p.contracts || 0) * 100), 0))}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total P&L</div>
                            <div className={`text-lg font-bold ${optionsPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {optionsPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0) >= 0 ? '+' : ''}
                              ${formatNumber(optionsPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0))}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-green-200 dark:border-green-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {optionsPositions.filter(p => p.optionType === 'call').length} Calls • {optionsPositions.filter(p => p.optionType === 'put').length} Puts
                          </span>
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Portfolio Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ThemedStatBox
                    themeColor={CARD_THEME_COLORS.tradingAccount}
                    value={`$${formatNumber(totalValue)}`}
                    label="Portfolio Value"
                  />
                  <ConditionalThemedStatBox
                    themeColor={CARD_THEME_COLORS.tradingAccount}
                    value={`${totalPnL >= 0 ? '+' : ''}$${formatNumber(totalPnL)}`}
                    label="Total P&L"
                    valueType={totalPnL >= 0 ? 'positive' : 'negative'}
                  />
                  <ThemedStatBox
                    themeColor={CARD_THEME_COLORS.tradingAccount}
                    value={positions.length}
                    label="Active Positions"
                  />
                  <ThemedStatBox
                    themeColor={CARD_THEME_COLORS.tradingAccount}
                    value={`${positions.filter(p => p.positionType === 'long').length} / ${positions.filter(p => p.positionType === 'short').length}`}
                    label="Long / Short"
                  />
                </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {positions.sort((a, b) => (Math.abs(b.shares) * b.currentPrice) - (Math.abs(a.shares) * a.currentPrice)).map((position) => {
                const pnl = position.positionType === 'long' 
                  ? (position.currentPrice - position.avgPrice) * position.shares
                  : (position.avgPrice - position.currentPrice) * Math.abs(position.shares);
                const pnlPercent = ((pnl / (Math.abs(position.shares) * position.avgPrice)) * 100);
                const marketValue = Math.abs(position.shares) * position.currentPrice;
                const instrument = getInstrumentBySymbol(position.symbol);

                return (
                  <div key={position.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/30 dark:hover:shadow-cyan-400/40 cursor-pointer">
                    <div className="flex items-center gap-3 flex-1">
                      <TradingIcon symbol={position.symbol} className="w-10 h-10" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{position.symbol}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            position.positionType === 'long' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          }`}>
                            {position.positionType === 'long' ? 'LONG' : 'SHORT'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.abs(position.shares)} shares • Entry: ${(position.avgPrice || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">${marketValue.toFixed(2)}</div>
                        <div className={`text-sm ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            const assetType = instrument?.type === 'crypto' ? 'crypto' : 
                                            instrument?.type === 'forex' ? 'forex' :
                                            instrument?.type === 'commodity' ? 'commodity' :
                                            instrument?.type === 'index' ? 'index' : 'stock';
                            openTechnicalAnalysis({
                              symbol: position.symbol,
                              assetType: assetType as any,
                              assetName: instrument?.name
                            });
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Technical Analysis (RSI, MACD, etc.)"
                        >
                          <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400 dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        </button>
                        <button
                          onClick={() => editPosition(position)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </button>
                        <button
                          onClick={() => deletePosition(position.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {positions.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No positions yet. Click Add Position to get started.</p>
              </div>
            )}
              </>
            )}

            {/* Forex Trading Sub-tab */}
            {tradingSubTab === 'forex' && (
              <ForexTradingTab 
                accountBalance={forexAccountBalance}
                accountCurrency="USD"
                onAccountBalanceChange={setForexAccountBalance}
                onPositionsChange={setForexPositions}
              />
            )}

            {/* Crypto Futures Sub-tab */}
            {tradingSubTab === 'crypto-futures' && (
              <CryptoFuturesTradingTab 
                accountBalance={cryptoAccountBalance}
                onAccountBalanceChange={setCryptoAccountBalance}
                onPositionsChange={setCryptoPositions}
              />
            )}

            {/* Options Sub-tab */}
            {tradingSubTab === 'options' && (
              <OptionsTradingTab 
                accountBalance={optionsAccountBalance}
                onAccountBalanceChange={setOptionsAccountBalance}
                onPositionsChange={setOptionsPositions}
              />
            )}
          </div>
        )}

  {/* Analytics Tab */}
  {activeTab === 'analytics' && (
    <div className="space-y-4">
      {/* AI Rebalancing Suggestions */}
      <AIRebalancing 
        holdings={positions.map(p => ({
          symbol: p.symbol,
          name: p.symbol,
          value: Math.abs(p.shares) * p.currentPrice,
          shares: Math.abs(p.shares),
          currentPrice: p.currentPrice
        }))}
        totalValue={totalValue}
        assetType="trading"
      />

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Metrics</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 px-2 -mx-2 py-2 -my-2">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Portfolio Value</h3>
          </div>
          <div className="text-2xl font-bold text-cyan-600">${formatNumber(totalValue)}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Total market value
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Total P&L</h3>
          </div>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}${formatNumber(totalPnL)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {((totalPnL / (totalValue - totalPnL)) * 100).toFixed(2)}% return
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Positions</h3>
          </div>
          <div className="text-2xl font-bold text-cyan-600">{positions.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {positions.filter(p => p.positionType === 'long').length} long • {positions.filter(p => p.positionType === 'short').length} short
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Win Rate</h3>
          </div>
          <div className="text-2xl font-bold text-cyan-600">
            {positions.length > 0 ? ((positions.filter(p => {
              const pnl = p.positionType === 'long' 
                ? (p.currentPrice - p.avgPrice) * p.shares
                : (p.avgPrice - p.currentPrice) * Math.abs(p.shares);
              return pnl > 0;
            }).length / positions.length) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {positions.filter(p => {
              const pnl = p.positionType === 'long' 
                ? (p.currentPrice - p.avgPrice) * p.shares
                : (p.avgPrice - p.currentPrice) * Math.abs(p.shares);
              return pnl > 0;
            }).length} winning / {positions.length} total
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Top Performers</h3>
        <div className="space-y-2">
          {positions
            .map(p => ({
              ...p,
              pnl: p.positionType === 'long' 
                ? (p.currentPrice - p.avgPrice) * p.shares
                : (p.avgPrice - p.currentPrice) * Math.abs(p.shares),
              pnlPercent: ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100 * (p.positionType === 'long' ? 1 : -1)
            }))
            .sort((a, b) => b.pnl - a.pnl)
            .slice(0, 5)
            .map(position => (
              <div key={position.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-2">
                  <TradingIcon symbol={position.symbol} className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{position.symbol}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )}

  {/* AI Signals Tab */}
  {activeTab === 'signals' && (
    <div className="space-y-4">
      <AITradingSignals 
        positions={positions.map(p => ({
          symbol: p.symbol,
          name: p.symbol,
          currentPrice: p.currentPrice,
          avgPrice: p.avgPrice,
          shares: p.shares,
          positionType: p.positionType
        }))}
        availableCash={0} // Can be updated if you track available cash
      />
    </div>
  )}

  {/* Performance Tab */}
  {activeTab === 'performance' && (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Position Details</h3>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {positions.map((position) => {
            const pnl = position.positionType === 'long' 
              ? (position.currentPrice - position.avgPrice) * position.shares
              : (position.avgPrice - position.currentPrice) * Math.abs(position.shares);
            const pnlPercent = ((pnl / (Math.abs(position.shares) * position.avgPrice)) * 100);
            const marketValue = Math.abs(position.shares) * position.currentPrice;

            return (
              <div key={position.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TradingIcon symbol={position.symbol} className="w-5 h-5" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{position.symbol}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      position.positionType === 'long' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    }`}>
                      {position.positionType === 'long' ? 'LONG' : 'SHORT'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Position Size</div>
                    <div className="font-medium text-gray-900 dark:text-white">{Math.abs(position.shares)} shares</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Market Value</div>
                    <div className="font-medium text-gray-900 dark:text-white">${marketValue.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Avg Price</div>
                    <div className="font-medium text-gray-900 dark:text-white">${position.avgPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Current Price</div>
                    <div className="font-medium text-gray-900 dark:text-white">${position.currentPrice.toFixed(2)}</div>
                  </div>
                  {position.stopLoss && (
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Stop Loss</div>
                      <div className="font-medium text-red-600">${position.stopLoss.toFixed(2)}</div>
                    </div>
                  )}
                  {position.takeProfit && (
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Take Profit</div>
                      <div className="font-medium text-green-600">${position.takeProfit.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )}
</div>

<AddTradingPositionModal 
  isOpen={showAddModal} 
  onClose={() => setShowAddModal(false)} 
  onAdd={addPosition}
/>

<EditTradingPositionModal 
  isOpen={showEditModal} 
  onClose={() => setShowEditModal(false)} 
  position={editingPosition}
  onUpdate={updatePosition}
/>

<TechnicalAnalysisComponent />
</div>
  );
}

export function TradingAccountCard() {
  const [positions, setPositions] = useState<TradingPosition[]>([]);

  // Load data on component mount
  useEffect(() => {
    const loadPositions = async () => {
      const savedPositions = await SupabaseDataService.getTradingAccounts([]);
      setPositions(savedPositions);
    };
    loadPositions();
    
    // Listen for data changes and reload
    const handleDataChange = () => loadPositions();
    window.addEventListener('tradingDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('tradingDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Load balances from localStorage
  const [forexBalance, setForexBalance] = useState(0);
  const [cryptoBalance, setCryptoBalance] = useState(0);
  const [optionsBalance, setOptionsBalance] = useState(0);
  
  useEffect(() => {
    const loadBalances = () => {
      if (typeof window !== 'undefined') {
        const forex = localStorage.getItem('forexAccountBalance');
        const crypto = localStorage.getItem('cryptoAccountBalance');
        const options = localStorage.getItem('optionsAccountBalance');
        setForexBalance(forex ? parseFloat(forex) : 0);
        setCryptoBalance(crypto ? parseFloat(crypto) : 0);
        setOptionsBalance(options ? parseFloat(options) : 0);
      }
    };
    
    loadBalances();
    
    // Listen for balance changes
    const handleBalanceChange = () => loadBalances();
    window.addEventListener('storage', handleBalanceChange);
    window.addEventListener('tradingDataChanged', handleBalanceChange);
    
    return () => {
      window.removeEventListener('storage', handleBalanceChange);
      window.removeEventListener('tradingDataChanged', handleBalanceChange);
    };
  }, []);

  // Calculate positions value
  const positionsValue = positions.reduce((sum, pos) => {
    const pnl = pos.positionType === 'long' 
      ? (pos.currentPrice - pos.avgPrice) * pos.shares
      : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares);
    return sum + (Math.abs(pos.shares) * pos.avgPrice) + pnl;
  }, 0);
  
  // Total value = all three account balances + positions value
  const totalValue = forexBalance + cryptoBalance + optionsBalance + positionsValue;

  const totalPnL = positions.reduce((sum, pos) => {
    return sum + (pos.positionType === 'long' 
      ? (pos.currentPrice - pos.avgPrice) * pos.shares
      : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares));
  }, 0);

  const costBasis = totalValue - totalPnL;
  const totalReturn = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0;
  const longPositions = positions.filter(p => p.positionType === 'long').length;
  const shortPositions = positions.filter(p => p.positionType === 'short').length;

  const changePercent = positions.length === 0 ? "0.0%" : `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`;
  const changeType = totalReturn >= 0 ? "positive" as const : "negative" as const;

  // Create chart data from positions - sort by value and show top positions
  const chartData = positions
    .map(pos => {
      const pnl = pos.positionType === 'long' 
        ? (pos.currentPrice - pos.avgPrice) * pos.shares
        : (pos.avgPrice - pos.currentPrice) * Math.abs(pos.shares);
      const posValue = (Math.abs(pos.shares) * pos.avgPrice) + pnl;
      const returnPercent = ((pnl / (Math.abs(pos.shares) * pos.avgPrice)) * 100);
      return {
        value: posValue,
        change: `${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(1)}%`,
        sortValue: posValue
      };
    })
    .filter(item => item.value && !isNaN(item.value) && isFinite(item.value))
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, 12)
    .map(({ value, change }) => ({ value, change }));

  // Currency conversion - show in user's selected currency
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();
  const convertedValue = convertToMain(totalValue, 'USD');
  const displayAmount = formatMain(convertedValue);
  const originalAmount = mainCurrency.code !== 'USD' ? `$${formatNumber(totalValue)}` : undefined;

  return (
    <EnhancedFinancialCard
      title="Trading Account"
      description="Active trading positions and performance"
      amount={displayAmount}
      change={changePercent}
      changeType={changeType}
      mainColor="#06b6d4"
      secondaryColor="#22d3ee"
      gridColor="#06b6d415"
      stats={[
        { label: "Long Pos", value: longPositions.toString(), color: "#06b6d4" },
        { label: "Short Pos", value: shortPositions.toString(), color: "#22d3ee" }
      ]}
      icon={TbChartCandle}
      hoverContent={<TradingAccountHoverContent />}
      modalContent={<TradingAccountModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}

// Trading Tools Content Components
function TradingToolsHoverContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Advanced Charts</span>
        <span className="text-sm font-medium text-white">Interactive</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Market Data</span>
        <span className="text-sm font-medium text-white">Live Updates</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Global Markets</span>
        <span className="text-sm font-medium text-white">Multi-Asset</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Technical Analysis</span>
        <span className="text-sm font-medium text-white">Full Suite</span>
      </div>
    </div>
  );
}

function TradingToolsModalContent() {
  const [mainTab, setMainTab] = useState<'trading' | 'tools' | 'stocks' | 'crypto' | 'forex'>('trading');
  const [tradingSubTab, setTradingSubTab] = useState<'forex' | 'crypto-futures' | 'options'>('forex');
  const [stocksSubTab, setStocksSubTab] = useState<'market-overview' | 'top-gainers' | 'heatmap' | 'ticker-tape'>('market-overview');
  
  // Separate balances for each trading account type - default to 0 if not set
  const [forexBalance, setForexBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forexAccountBalance');
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });
  
  const [cryptoBalance, setCryptoBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cryptoAccountBalance');
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });
  
  const [optionsBalance, setOptionsBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('optionsAccountBalance');
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });

  // Save balances to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forexAccountBalance', forexBalance.toString());
      // Dispatch event to update other components
      window.dispatchEvent(new Event('tradingDataChanged'));
    }
  }, [forexBalance]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptoAccountBalance', cryptoBalance.toString());
      window.dispatchEvent(new Event('tradingDataChanged'));
    }
  }, [cryptoBalance]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('optionsAccountBalance', optionsBalance.toString());
      window.dispatchEvent(new Event('tradingDataChanged'));
    }
  }, [optionsBalance]);

  useEffect(() => {
    // Load TradingView widgets when component mounts
    const loadTradingViewWidgets = () => {
      if (typeof window !== 'undefined') {
        // Advanced Chart Widget (Tools tab)
        if (mainTab === 'tools') {
          const chartScript = document.createElement('script');
          chartScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
          chartScript.async = true;
          chartScript.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": "NASDAQ:AAPL",
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "allow_symbol_change": true,
            "calendar": false,
            "hide_top_toolbar": false,
            "hide_legend": false,
            "hide_side_toolbar": false,
            "details": true,
            "hotlist": true,
            "hide_volume": false,
            "save_image": true,
            "backgroundColor": "#0F0F0F",
            "gridColor": "rgba(242, 242, 242, 0.06)",
            "withdateranges": true,
            "range": "12M",
            "enable_publishing": false,
            "toolbar_bg": "#131722",
            "watchlist": [
              "OANDA:XAUUSD",
              "BINANCE:BTCUSD",
              "BINANCE:ETHUSD",
              "NASDAQ:NVDA",
              "NASDAQ:MSFT",
              "NASDAQ:TSLA",
              "IG:NASDAQ",
              "BLACKBULL:US30",
              "BLACKBULL:WTI",
              "BINANCE:BNBUSDT"
            ],
            "compareSymbols": [],
            "studies": [
              "STD;SMA"
            ]
          });

          const chartContainer = document.getElementById('tradingview-tools-widget');
          if (chartContainer) {
            chartContainer.innerHTML = '';
            chartContainer.appendChild(chartScript);
          }
        }

        // Stocks Tab Widgets
        if (mainTab === 'stocks') {
          if (stocksSubTab === 'market-overview') {
            const marketOverviewScript = document.createElement('script');
            marketOverviewScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
            marketOverviewScript.async = true;
            marketOverviewScript.innerHTML = JSON.stringify({
              "colorTheme": "dark",
              "dateRange": "12M",
              "showChart": true,
              "locale": "en",
              "width": "100%",
              "height": "100%",
              "largeChartUrl": "",
              "isTransparent": false,
              "showSymbolLogo": true,
              "showFloatingTooltip": false,
              "plotLineColorGrowing": "rgba(139, 92, 246, 1)",
              "plotLineColorFalling": "rgba(239, 68, 68, 1)",
              "gridLineColor": "rgba(240, 243, 250, 0.06)",
              "scaleFontColor": "#DBDBDB",
              "belowLineFillColorGrowing": "rgba(139, 92, 246, 0.12)",
              "belowLineFillColorFalling": "rgba(239, 68, 68, 0.12)",
              "belowLineFillColorGrowingBottom": "rgba(139, 92, 246, 0)",
              "belowLineFillColorFallingBottom": "rgba(239, 68, 68, 0)",
              "symbolActiveColor": "rgba(139, 92, 246, 0.12)",
              "backgroundColor": "#0f0f0f",
              "support_host": "https://www.tradingview.com",
              "tabs": [
                {
                  "title": "US Stocks",
                  "symbols": [
                    { "s": "NASDAQ:AAPL", "d": "Apple Inc." },
                    { "s": "NASDAQ:MSFT", "d": "Microsoft Corporation" },
                    { "s": "NASDAQ:GOOGL", "d": "Alphabet Inc." },
                    { "s": "NASDAQ:AMZN", "d": "Amazon.com Inc." },
                    { "s": "NASDAQ:NVDA", "d": "NVIDIA Corporation" },
                    { "s": "NASDAQ:TSLA", "d": "Tesla Inc." },
                    { "s": "NASDAQ:META", "d": "Meta Platforms Inc." }
                  ],
                  "originalTitle": "US Stocks"
                },
                {
                  "title": "Indices",
                  "symbols": [
                    { "s": "FOREXCOM:SPXUSD", "d": "S&P 500 Index" },
                    { "s": "FOREXCOM:NSXUSD", "d": "US 100 Cash CFD" },
                    { "s": "FOREXCOM:DJI", "d": "Dow Jones Industrial Average Index" }
                  ],
                  "originalTitle": "Indices"
                }
              ]
            });

            const marketOverviewContainer = document.getElementById('tradingview-stocks-widget');
            if (marketOverviewContainer) {
              marketOverviewContainer.innerHTML = '';
              marketOverviewContainer.appendChild(marketOverviewScript);
            }
          }

          if (stocksSubTab === 'top-gainers') {
            const topStoriesScript = document.createElement('script');
            topStoriesScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js';
            topStoriesScript.async = true;
            topStoriesScript.innerHTML = JSON.stringify({
              "colorTheme": "dark",
              "dateRange": "12M",
              "exchange": "US",
              "showChart": true,
              "locale": "en",
              "width": "100%",
              "height": "100%",
              "largeChartUrl": "",
              "isTransparent": false,
              "showSymbolLogo": true,
              "showFloatingTooltip": false,
              "plotLineColorGrowing": "rgba(139, 92, 246, 1)",
              "plotLineColorFalling": "rgba(239, 68, 68, 1)",
              "gridLineColor": "rgba(240, 243, 250, 0.06)",
              "scaleFontColor": "#DBDBDB",
              "belowLineFillColorGrowing": "rgba(139, 92, 246, 0.12)",
              "belowLineFillColorFalling": "rgba(239, 68, 68, 0.12)",
              "belowLineFillColorGrowingBottom": "rgba(139, 92, 246, 0)",
              "belowLineFillColorFallingBottom": "rgba(239, 68, 68, 0)",
              "symbolActiveColor": "rgba(139, 92, 246, 0.12)",
              "backgroundColor": "#0f0f0f"
            });

            const topStoriesContainer = document.getElementById('tradingview-stocks-widget');
            if (topStoriesContainer) {
              topStoriesContainer.innerHTML = '';
              topStoriesContainer.appendChild(topStoriesScript);
            }
          }

          if (stocksSubTab === 'heatmap') {
            const heatmapScript = document.createElement('script');
            heatmapScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
            heatmapScript.async = true;
            heatmapScript.innerHTML = JSON.stringify({
              "exchanges": [],
              "dataSource": "SPX500",
              "grouping": "sector",
              "blockSize": "market_cap_basic",
              "blockColor": "change",
              "locale": "en",
              "symbolUrl": "",
              "colorTheme": "dark",
              "hasTopBar": true,
              "isDataSetEnabled": true,
              "isZoomEnabled": true,
              "hasSymbolTooltip": true,
              "width": "100%",
              "height": "100%"
            });

            const heatmapContainer = document.getElementById('tradingview-stocks-widget');
            if (heatmapContainer) {
              heatmapContainer.innerHTML = '';
              heatmapContainer.appendChild(heatmapScript);
            }
          }

          if (stocksSubTab === 'ticker-tape') {
            const tickerScript = document.createElement('script');
            tickerScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
            tickerScript.async = true;
            tickerScript.innerHTML = JSON.stringify({
              "symbols": [
                { "proName": "FOREXCOM:SPXUSD", "title": "S&P 500 Index" },
                { "proName": "FOREXCOM:NSXUSD", "title": "US 100 Cash CFD" },
                { "proName": "FX_IDC:EURUSD", "title": "EUR to USD" },
                { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" },
                { "proName": "BITSTAMP:ETHUSD", "title": "Ethereum" },
                { "description": "Apple", "proName": "NASDAQ:AAPL" },
                { "description": "Microsoft", "proName": "NASDAQ:MSFT" },
                { "description": "Tesla", "proName": "NASDAQ:TSLA" },
                { "description": "Amazon", "proName": "NASDAQ:AMZN" },
                { "description": "NVIDIA", "proName": "NASDAQ:NVDA" }
              ],
              "showSymbolLogo": true,
              "isTransparent": false,
              "displayMode": "adaptive",
              "colorTheme": "dark",
              "locale": "en"
            });

            const tickerContainer = document.getElementById('tradingview-stocks-widget');
            if (tickerContainer) {
              tickerContainer.innerHTML = '';
              tickerContainer.appendChild(tickerScript);
            }
          }
        }

        // Crypto Tab Widget
        if (mainTab === 'crypto') {
          const cryptoScript = document.createElement('script');
          cryptoScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
          cryptoScript.async = true;
          cryptoScript.innerHTML = JSON.stringify({
            "width": "100%",
            "height": "100%",
            "defaultColumn": "overview",
            "defaultScreen": "general",
            "market": "crypto",
            "showToolbar": true,
            "colorTheme": "dark",
            "locale": "en",
            "isTransparent": false
          });

          const cryptoContainer = document.getElementById('tradingview-crypto-widget');
          if (cryptoContainer) {
            cryptoContainer.innerHTML = '';
            cryptoContainer.appendChild(cryptoScript);
          }
        }

        // Forex Tab Widget
        if (mainTab === 'forex') {
          const forexScript = document.createElement('script');
          forexScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js';
          forexScript.async = true;
          forexScript.innerHTML = JSON.stringify({
            "width": "100%",
            "height": "100%",
            "currencies": ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"],
            "isTransparent": false,
            "colorTheme": "dark",
            "locale": "en"
          });

          const forexContainer = document.getElementById('tradingview-forex-widget');
          if (forexContainer) {
            forexContainer.innerHTML = '';
            forexContainer.appendChild(forexScript);
          }
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadTradingViewWidgets, 100);
    return () => clearTimeout(timer);
  }, [mainTab, stocksSubTab]);

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Main Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMainTab('trading')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                mainTab === 'trading'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Target className="w-4 h-4" />
              Trading
            </button>
            <button
              onClick={() => setMainTab('stocks')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                mainTab === 'stocks'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Stocks
            </button>
            <button
              onClick={() => setMainTab('crypto')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                mainTab === 'crypto'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <CoinsIcon className="w-4 h-4" />
              Crypto
            </button>
            <button
              onClick={() => setMainTab('forex')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                mainTab === 'forex'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Forex
            </button>
            <button
              onClick={() => setMainTab('tools')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                mainTab === 'tools'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tools
            </button>
          </div>
          
          <button 
            title="Enter Fullscreen" 
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" x2="14" y1="3" y2="10"></line>
              <line x1="3" x2="10" y1="21" y2="14"></line>
            </svg>
            <span className="text-sm">Fullscreen</span>
          </button>
        </div>

        {/* Trading Tab Content - NEW */}
        {mainTab === 'trading' && (
          <div className="space-y-6">
            {/* Account Balance Input */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {tradingSubTab === 'forex' ? 'Forex' : tradingSubTab === 'crypto-futures' ? 'Crypto Futures' : 'Options'} Account Balance
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={tradingSubTab === 'forex' ? forexBalance : tradingSubTab === 'crypto-futures' ? cryptoBalance : optionsBalance}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value) || 0;
                    if (tradingSubTab === 'forex') setForexBalance(newValue);
                    else if (tradingSubTab === 'crypto-futures') setCryptoBalance(newValue);
                    else setOptionsBalance(newValue);
                  }}
                  step="100"
                  min="0"
                  className="flex-1 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-600 rounded-lg text-2xl font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Set your {tradingSubTab === 'forex' ? 'Forex' : tradingSubTab === 'crypto-futures' ? 'Crypto Futures' : 'Options'} account balance for accurate calculations
              </p>
              <div className="mt-3 flex gap-3 text-xs">
                <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded">
                  <span className="text-gray-600 dark:text-gray-400">Forex: </span>
                  <span className="font-bold text-blue-600">${forexBalance.toLocaleString()}</span>
                </div>
                <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded">
                  <span className="text-gray-600 dark:text-gray-400">Crypto: </span>
                  <span className="font-bold text-purple-600">${cryptoBalance.toLocaleString()}</span>
                </div>
                <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded">
                  <span className="text-gray-600 dark:text-gray-400">Options: </span>
                  <span className="font-bold text-orange-600">${optionsBalance.toLocaleString()}</span>
                </div>
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 px-3 py-1.5 rounded border border-green-300 dark:border-green-700">
                  <span className="text-gray-600 dark:text-gray-400">Total: </span>
                  <span className="font-black text-green-600 dark:text-green-400">${(forexBalance + cryptoBalance + optionsBalance).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Trading Sub-tabs */}
            <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700 pb-2">
              <button
                onClick={() => setTradingSubTab('forex')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold ${
                  tradingSubTab === 'forex'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Forex Trading
              </button>
              <button
                onClick={() => setTradingSubTab('crypto-futures')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold ${
                  tradingSubTab === 'crypto-futures'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <CoinsIcon className="w-4 h-4 inline mr-2" />
                Crypto Futures
              </button>
              <button
                onClick={() => setTradingSubTab('options')}
                className={`px-6 py-3 rounded-lg transition-all text-sm font-semibold ${
                  tradingSubTab === 'options'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <TrendingUpIcon className="w-4 h-4 inline mr-2" />
                Options
              </button>
            </div>

            {/* Forex Trading Sub-tab */}
            {tradingSubTab === 'forex' && (
              <ForexTradingTab 
                accountBalance={forexBalance}
                accountCurrency="USD"
                onAccountBalanceChange={setForexBalance}
              />
            )}

            {/* Crypto Futures Sub-tab */}
            {tradingSubTab === 'crypto-futures' && (
              <CryptoFuturesTradingTab 
                accountBalance={cryptoBalance}
                onAccountBalanceChange={setCryptoBalance}
              />
            )}

            {/* Options Sub-tab */}
            {tradingSubTab === 'options' && (
              <OptionsTradingTab 
                accountBalance={optionsBalance}
                onAccountBalanceChange={setOptionsBalance}
              />
            )}
          </div>
        )}

        {/* Stocks Tab Content */}
        {mainTab === 'stocks' && (
          <div className="space-y-4">
            {/* Stocks Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              <button
                onClick={() => setStocksSubTab('market-overview')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stocksSubTab === 'market-overview'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Market Overview
              </button>
              <button
                onClick={() => setStocksSubTab('top-gainers')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stocksSubTab === 'top-gainers'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Top Gainers & Losers
              </button>
              <button
                onClick={() => setStocksSubTab('heatmap')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stocksSubTab === 'heatmap'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Market Heatmap
              </button>
              <button
                onClick={() => setStocksSubTab('ticker-tape')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stocksSubTab === 'ticker-tape'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Ticker Tape
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Live"
                label="Real-time Data"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="50+"
                label="Indicators"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Global"
                label="Markets"
              />
            </div>

            {/* Stocks Widget Container */}
            <div 
              id="tradingview-stocks-container" 
              className="bg-[#0F0F0F] rounded-lg overflow-hidden flex items-center justify-center"
              style={{ minHeight: '600px' }}
            >
              <div className="tradingview-widget-container w-full h-full flex items-center justify-center" style={{ height: '650px', width: '100%' }}>
                <div id="tradingview-stocks-widget" className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TbChartCandle className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Technical Analysis</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Advanced charting tools and indicators</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Market Data</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time quotes and historical data</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TbChartLine className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Symbol Search</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Search and compare any stock</p>
              </div>
            </div>
          </div>
        )}

        {/* Crypto Tab Content */}
        {mainTab === 'crypto' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="24/7"
                label="Trading"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="1000+"
                label="Cryptocurrencies"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Real-time"
                label="Market Data"
              />
            </div>

            <div 
              className="bg-[#0F0F0F] rounded-lg overflow-hidden"
              style={{ minHeight: '600px' }}
            >
              <div className="tradingview-widget-container" style={{ height: '650px', width: '100%' }}>
                <div id="tradingview-crypto-widget" className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Forex Tab Content */}
        {mainTab === 'forex' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="180+"
                label="Currency Pairs"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Live"
                label="Exchange Rates"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Major"
                label="Currencies"
              />
            </div>

            <div 
              className="bg-[#0F0F0F] rounded-lg overflow-hidden"
              style={{ minHeight: '600px' }}
            >
              <div className="tradingview-widget-container" style={{ height: '650px', width: '100%' }}>
                <div id="tradingview-forex-widget" className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Tools Tab Content */}
        {mainTab === 'tools' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Advanced"
                label="Charting Tools"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="100+"
                label="Indicators"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.tradingTools}
                value="Multi"
                label="Timeframes"
              />
            </div>

            <div 
              className="bg-[#0F0F0F] rounded-lg overflow-hidden"
              style={{ minHeight: '600px' }}
            >
              <div className="tradingview-widget-container" style={{ height: '650px', width: '100%' }}>
                <div id="tradingview-tools-widget" className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TbChartCandle className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Drawing Tools</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Trend lines, Fibonacci, patterns & more</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Technical Indicators</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Moving averages, RSI, MACD & more</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Real-time Analysis</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Live data with instant updates</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TradingToolsCard() {
  const chartData = [
    { value: 100, change: "+5.2%" },
    { value: 105, change: "+3.8%" },
    { value: 98, change: "-2.1%" },
    { value: 110, change: "+4.5%" },
    { value: 115, change: "+6.2%" },
  ];

  return (
    <EnhancedFinancialCard
      title="Trading Tools"
      description="Professional trading charts & live market data"
      amount="3 Widgets"
      change="Active"
      changeType="positive"
      mainColor="#0284c7"
      secondaryColor="#0ea5e9"
      gridColor="#0284c715"
      stats={[
        { label: "Chart", value: "Advanced", color: "#0284c7" },
        { label: "Overview", value: "Multi-Symbol", color: "#0ea5e9" },
        { label: "Markets", value: "Global", color: "#38bdf8" }
      ]}
      icon={BarChart3}
      hoverContent={<TradingToolsHoverContent />}
      modalContent={<TradingToolsModalContent />}
      chartData={chartData}
      maxWidth="max-w-7xl"
    />
  );
}
