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
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Coins, Plus, Search, X, Edit3, Trash2, TrendingUp, DollarSign, RefreshCw, Percent, ArrowDownLeft } from "lucide-react";
import {
  SiBitcoin,
  SiEthereum,
  SiCardano,
  SiPolkadot,
  SiSolana,
  SiChainlink,
  SiPolygon,
  SiLitecoin,
  SiMonero,
  SiTether,
  SiBinance
} from "react-icons/si";
import { TbCoin, TbMountain, TbAtom, TbWorld, TbCurrencyDollar, TbDiamond, TbRocket, TbBrandFunimation, TbNetwork, TbCloud, TbCircle } from "react-icons/tb";
import {
  BTCIconTV,
  ETHIconTV,
  BNBIconTV,
  SOLIconTV,
  USDTIcon,
  USDCIcon,
  XRPIcon,
  DOGEIcon,
  TRXIcon,
  ADAIcon,
  AVAXIcon,
  SHIBIcon,
  LINKIcon,
  DOTIcon,
  MATICIcon,
  LTCIcon,
  UNIIcon,
  ATOMIcon,
  XLMIcon,
  XMRIcon,
  HBARIcon,
  NEARIcon,
  APTIcon,
  ARBIcon,
  OPIcon,
  FILIcon,
  ALGOIcon,
  VETIcon,
  AAVEIcon,
  ICPIcon,
  INJIcon,
  SUIIcon,
  GRTIcon,
  RUNEIcon,
  FTMIcon,
  SANDIcon,
  MANAIcon,
  PEPEIcon,
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
import { CRYPTO_WALLETS, getDeFiWallets, getCeFiWallets, getWalletById } from "../../lib/crypto-wallets-database";
import { PortfolioWalletPieChartV2 } from "../ui/portfolio-wallet-pie-chart-v2";
import { CryptoAPYCalculator } from "../ui/crypto-apy-calculator";
import { Wallet } from "lucide-react";

// Crypto Icon Component - Binance style
function CryptoIcon({ symbol, className = "w-5 h-5" }: { symbol: string; className?: string }) {
  if (!symbol) return <TbCoin className={className} />;

  switch (symbol.toUpperCase()) {
    case 'BTC':
    case 'BTCUSD':
      return <BTCIconTV className={className} />;
    case 'ETH':
    case 'ETHUSD':
      return <ETHIconTV className={className} />;
    case 'BNB':
      return <BNBIconTV className={className} />;
    case 'SOL':
      return <SOLIconTV className={className} />;
    case 'USDT':
      return <USDTIcon className={className} />;
    case 'USDC':
      return <USDCIcon className={className} />;
    case 'XRP':
      return <XRPIcon className={className} />;
    case 'DOGE':
      return <DOGEIcon className={className} />;
    case 'TRX':
      return <TRXIcon className={className} />;
    case 'ADA':
    case 'ADAUSD':
      return <ADAIcon className={className} />;
    case 'AVAX':
      return <AVAXIcon className={className} />;
    case 'SHIB':
      return <SHIBIcon className={className} />;
    case 'LINK':
      return <LINKIcon className={className} />;
    case 'DOT':
      return <DOTIcon className={className} />;
    case 'MATIC':
    case 'POL':
      return <MATICIcon className={className} />;
    case 'LTC':
      return <LTCIcon className={className} />;
    case 'UNI':
      return <UNIIcon className={className} />;
    case 'ATOM':
      return <ATOMIcon className={className} />;
    case 'XLM':
      return <XLMIcon className={className} />;
    case 'XMR':
      return <XMRIcon className={className} />;
    case 'HBAR':
      return <HBARIcon className={className} />;
    case 'NEAR':
      return <NEARIcon className={className} />;
    case 'APT':
      return <APTIcon className={className} />;
    case 'ARB':
      return <ARBIcon className={className} />;
    case 'OP':
      return <OPIcon className={className} />;
    case 'FIL':
      return <FILIcon className={className} />;
    case 'ALGO':
      return <ALGOIcon className={className} />;
    case 'VET':
      return <VETIcon className={className} />;
    case 'AAVE':
      return <AAVEIcon className={className} />;
    case 'ICP':
      return <ICPIcon className={className} />;
    case 'INJ':
      return <INJIcon className={className} />;
    case 'SUI':
      return <SUIIcon className={className} />;
    case 'GRT':
      return <GRTIcon className={className} />;
    case 'RUNE':
      return <RUNEIcon className={className} />;
    case 'FTM':
      return <FTMIcon className={className} />;
    case 'SAND':
      return <SANDIcon className={className} />;
    case 'MANA':
      return <MANAIcon className={className} />;
    case 'PEPE':
      return <PEPEIcon className={className} />;
    default:
      return <ChartIcon className={className} color="#F59E0B" />;
  }
}

interface CryptoHolding {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  value: number;
  color: string;
  change: string;
  entryPoint: number;
  walletType?: string;
  walletName?: string;
  walletAddress?: string;
}

interface SearchResult {
  name: string;
  symbol: string;
  currentPrice: number;
}

const initialCryptoHoldings: CryptoHolding[] = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC',
    amount: 0.75,
    value: 18500,
    color: '#f59e0b',
    change: '+5.2%',
    entryPoint: 24000
  },
  {
    id: '2',
    name: 'Ethereum',
    symbol: 'ETH',
    amount: 6.2,
    value: 10250,
    color: '#3316c5',
    change: '+7.1%',
    entryPoint: 1650
  },
  {
    id: '3',
    name: 'Cardano',
    symbol: 'ADA',
    amount: 1250,
    value: 312.50,
    color: '#f59e0b',
    change: '-2.3%',
    entryPoint: 0.30
  },
  {
    id: '4',
    name: 'Polkadot',
    symbol: 'DOT',
    amount: 125,
    value: 687.50,
    color: '#fbbf24',
    change: '+12.7%',
    entryPoint: 5.20
  },
  {
    id: '5',
    name: 'Chainlink',
    symbol: 'LINK',
    amount: 85,
    value: 1020,
    color: '#f59e0b',
    change: '+8.9%',
    entryPoint: 12.00
  },
  {
    id: '6',
    name: 'Solana',
    symbol: 'SOL',
    amount: 15.5,
    value: 465,
    color: '#fbbf24',
    change: '+15.3%',
    entryPoint: 30.00
  },
  {
    id: '7',
    name: 'USD Coin',
    symbol: 'USDC',
    amount: 5000,
    value: 5000,
    color: '#10b981',
    change: '0.0%',
    entryPoint: 1.00
  },
  {
    id: '8',
    name: 'Tether',
    symbol: 'USDT',
    amount: 3500,
    value: 3500,
    color: '#06b6d4',
    change: '0.0%',
    entryPoint: 1.00
  }
];

// Popular cryptocurrencies for search - Top 50 by market cap (CoinGecko/CMC data)
const popularCryptos: SearchResult[] = [
  { name: 'Bitcoin', symbol: 'BTC', currentPrice: 63500 },
  { name: 'Ethereum', symbol: 'ETH', currentPrice: 3150 },
  { name: 'Tether', symbol: 'USDT', currentPrice: 1.00 },
  { name: 'BNB', symbol: 'BNB', currentPrice: 580 },
  { name: 'Solana', symbol: 'SOL', currentPrice: 145 },
  { name: 'USD Coin', symbol: 'USDC', currentPrice: 1.00 },
  { name: 'XRP', symbol: 'XRP', currentPrice: 0.52 },
  { name: 'Dogecoin', symbol: 'DOGE', currentPrice: 0.15 },
  { name: 'TRON', symbol: 'TRX', currentPrice: 0.16 },
  { name: 'Cardano', symbol: 'ADA', currentPrice: 0.51 },
  { name: 'Avalanche', symbol: 'AVAX', currentPrice: 34.50 },
  { name: 'Shiba Inu', symbol: 'SHIB', currentPrice: 0.000018 },
  { name: 'Chainlink', symbol: 'LINK', currentPrice: 14.50 },
  { name: 'Polkadot', symbol: 'DOT', currentPrice: 6.80 },
  { name: 'Polygon', symbol: 'MATIC', currentPrice: 0.85 },
  { name: 'Litecoin', symbol: 'LTC', currentPrice: 88.00 },
  { name: 'Uniswap', symbol: 'UNI', currentPrice: 8.60 },
  { name: 'Cosmos', symbol: 'ATOM', currentPrice: 10.20 },
  { name: 'Stellar', symbol: 'XLM', currentPrice: 0.11 },
  { name: 'Monero', symbol: 'XMR', currentPrice: 165 },
  { name: 'Hedera', symbol: 'HBAR', currentPrice: 0.06 },
  { name: 'NEAR Protocol', symbol: 'NEAR', currentPrice: 4.20 },
  { name: 'Aptos', symbol: 'APT', currentPrice: 8.50 },
  { name: 'Arbitrum', symbol: 'ARB', currentPrice: 0.75 },
  { name: 'Optimism', symbol: 'OP', currentPrice: 2.10 },
  { name: 'Filecoin', symbol: 'FIL', currentPrice: 5.20 },
  { name: 'Algorand', symbol: 'ALGO', currentPrice: 0.22 },
  { name: 'VeChain', symbol: 'VET', currentPrice: 0.025 },
  { name: 'Aave', symbol: 'AAVE', currentPrice: 160 },
  { name: 'Internet Computer', symbol: 'ICP', currentPrice: 4.50 },
  { name: 'Injective', symbol: 'INJ', currentPrice: 28.00 },
  { name: 'Sui', symbol: 'SUI', currentPrice: 0.65 },
  { name: 'The Graph', symbol: 'GRT', currentPrice: 0.16 },
  { name: 'THORChain', symbol: 'RUNE', currentPrice: 4.80 },
  { name: 'Fantom', symbol: 'FTM', currentPrice: 0.50 },
  { name: 'The Sandbox', symbol: 'SAND', currentPrice: 0.52 },
  { name: 'Decentraland', symbol: 'MANA', currentPrice: 0.54 },
  { name: 'Pepe', symbol: 'PEPE', currentPrice: 0.0000098 }
];

const cryptoHistory = [
  { month: 'Jan', value: 24000 },
  { month: 'Feb', value: 26500 },
  { month: 'Mar', value: 25800 },
  { month: 'Apr', value: 27200 },
  { month: 'May', value: 28100 },
  { month: 'Jun', value: 28750 }
];

// Color palette for new holdings
const DEFAULT_COLORS = ['#f59e0b', '#fbbf24', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

// Add Position Modal Component
function AddPositionModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: Omit<CryptoHolding, 'id' | 'value' | 'change'>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [walletType, setWalletType] = useState('other');
  const [walletName, setWalletName] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const filteredCryptos = popularCryptos.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedCrypto && amount && entryPoint) {
      onAdd({
        name: selectedCrypto.name,
        symbol: selectedCrypto.symbol,
        amount: parseFloat(amount),
        entryPoint: parseFloat(entryPoint),
        color: color,
        walletType: walletType,
        walletName: walletName || undefined
      });
      onClose();
      setSearchTerm('');
      setSelectedCrypto(null);
      setAmount('');
      setEntryPoint('');
      setColor('#f59e0b');
      setWalletType('other');
      setWalletName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Crypto Position</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4 dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Search Cryptocurrency</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              placeholder="Search crypto..."
            />
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && (
          <div className="mb-4 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {filteredCryptos.map((crypto) => (
              <button
                key={crypto.symbol}
                onClick={() => {
                  setSelectedCrypto(crypto);
                  setSearchTerm('');
                  setEntryPoint(crypto.currentPrice.toString());
                }}
                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
              >
                <CryptoIcon symbol={crypto.symbol} />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{crypto.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {crypto.symbol}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Crypto */}
        {selectedCrypto && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <CryptoIcon symbol={selectedCrypto.symbol} />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{selectedCrypto.name} ({selectedCrypto.symbol})</div>
              </div>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Amount</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            placeholder="Enter amount..."
          />
        </div>

        {/* Entry Point Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Entry Point ($)</label>
          <input
            type="number"
            step="any"
            value={entryPoint}
            onChange={(e) => setEntryPoint(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800"
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

        {/* Wallet Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Wallet
            </label>
            <button
              type="button"
              onClick={() => setShowWalletOptions(!showWalletOptions)}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              {showWalletOptions ? 'Hide' : 'Show'} Options
            </button>
          </div>

          {!showWalletOptions ? (
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="other">Other Wallet</option>
              <optgroup label="🔷 DeFi Wallets">
                {getDeFiWallets().slice(0, -1).map(wallet => (
                  <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                ))}
              </optgroup>
              <optgroup label="🏦 CeFi Exchanges">
                {getCeFiWallets().map(wallet => (
                  <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                ))}
              </optgroup>
            </select>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                {CRYPTO_WALLETS.filter(w => w.id !== 'other').map(wallet => {
                  const isSelected = walletType === wallet.id;
                  return (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => setWalletType(wallet.id)}
                      className={`p-2 rounded-lg text-left transition-all ${isSelected
                        ? 'bg-orange-100 dark:bg-orange-900 border-2 border-orange-500'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: wallet.color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {wallet.name}
                        </span>
                      </div>
                      <div className={`text-xs mt-1 px-1.5 py-0.5 rounded inline-block ${wallet.type === 'defi'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                        {wallet.type === 'defi' ? 'DeFi' : 'CeFi'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Wallet Info */}
          {walletType && walletType !== 'other' && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
              {getWalletById(walletType)?.description}
            </div>
          )}

          {/* Optional Custom Wallet Name */}
          <div className="mt-3">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Custom Name (Optional)
            </label>
            <input
              type="text"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="e.g., Main Wallet, Trading Wallet"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
          </div>
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
            onClick={handleAdd}
            disabled={!selectedCrypto || !amount || !entryPoint}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
  holding: CryptoHolding | null;
  onUpdate: (id: string, updates: Partial<CryptoHolding>) => void;
}) {
  const [amount, setAmount] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [walletType, setWalletType] = useState('other');
  const [walletName, setWalletName] = useState('');

  useEffect(() => {
    if (holding) {
      setAmount(holding.amount !== undefined ? holding.amount.toString() : '');
      setEntryPoint(holding.entryPoint !== undefined ? holding.entryPoint.toString() : '');
      setColor(holding.color || '#f59e0b');
      setWalletType(holding.walletType || 'other');
      setWalletName(holding.walletName || '');
    }
  }, [holding]);

  const handleUpdate = async () => {
    if (holding && amount && entryPoint) {
      await onUpdate(holding.id, {
        amount: parseFloat(amount),
        entryPoint: parseFloat(entryPoint),
        color: color,
        walletType: walletType,
        walletName: walletName || undefined
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
            <X className="w-4 h-4 dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Crypto Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <CryptoIcon symbol={holding.symbol} />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{holding.name} ({holding.symbol})</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current Value: ${formatNumber(holding.value)}
              </div>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Amount</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800"
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

        {/* Wallet Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Wallet
          </label>
          <select
            value={walletType}
            onChange={(e) => setWalletType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white mb-2"
          >
            <option value="other">Other Wallet</option>
            <optgroup label="🔷 DeFi Wallets">
              {getDeFiWallets().slice(0, -1).map(wallet => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </optgroup>
            <optgroup label="🏦 CeFi Exchanges">
              {getCeFiWallets().map(wallet => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </optgroup>
          </select>
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="Custom name (optional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
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
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
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

  // Don't show labels for very small slices (less than 1%) or placeholder slices
  if (percent < 0.01 || !name) return null;

  // Display 100% instead of 99.99% for single-item scenarios
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

interface CryptoTransaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  amount: number;
  pricePerUnit: number;
  totalValue: number;
  date: string;
}

function CryptoModalContent() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions' | 'analysis' | 'apy'>('portfolio');
  const { cryptoHoldings, setCryptoHoldings } = usePortfolioContext();
  const { formatMain } = useCurrencyConversion();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<CryptoHolding | null>(null);
  const [colorPickerHolding, setColorPickerHolding] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellingHolding, setSellingHolding] = useState<CryptoHolding | null>(null);

  // Helper to verify data consistency before dispatching events
  const verifyDataConsistency = async (checkFn: (holdings: CryptoHolding[]) => boolean) => {
    let retries = 0;
    const maxRetries = 5;
    const delay = 500;

    const check = async () => {
      const freshHoldings = await SupabaseDataService.getCryptoHoldings([]);
      if (checkFn(freshHoldings)) {
        setCryptoHoldings(freshHoldings);
        window.dispatchEvent(new Event('cryptoDataChanged'));
        window.dispatchEvent(new Event('financialDataChanged'));
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(check, delay);
      } else {
        // Fallback: dispatch anyway
        window.dispatchEvent(new Event('cryptoDataChanged'));
        window.dispatchEvent(new Event('financialDataChanged'));
      }
    };
    
    setTimeout(check, 200);
  };

  // Load data on component mount only - NOT on data change events
  // Data changes are handled optimistically via setCryptoHoldings
  useEffect(() => {
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getCryptoHoldings([]);
      setCryptoHoldings(savedHoldings);
    };
    
    // Only load on initial mount
    loadHoldings();
    
    // We intentionally do NOT listen to cryptoDataChanged here
    // because this component is the one dispatching those events
    // and it already updates state optimistically
  }, [setCryptoHoldings]);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all holdings changes

  // Get all unique symbols from holdings
  const symbols = cryptoHoldings.map(holding => holding.symbol);
  const { prices, loading } = useAssetPrices(symbols);

  const addHolding = async (newHolding: Omit<CryptoHolding, 'id' | 'value' | 'change'>) => {
    // Generate a proper UUID for Supabase compatibility
    const id = crypto.randomUUID();
    const currentPriceData = prices[newHolding.symbol];
    const currentPrice = currentPriceData?.price || newHolding.entryPoint;
    const value = newHolding.amount * currentPrice;
    const changePercent = ((currentPrice - newHolding.entryPoint) / newHolding.entryPoint * 100);
    const change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;

    const holding: CryptoHolding = {
      ...newHolding,
      id,
      value,
      change
    };

    // Update state optimistically first for instant UI feedback
    setCryptoHoldings([...cryptoHoldings, holding]);

    // Save to database
    await SupabaseDataService.saveCryptoHolding(holding);

    // Verify data consistency before dispatching events
    verifyDataConsistency((holdings) => !!holdings.find(h => h.id === id));

    // Record transaction
    const transaction: CryptoTransaction = {
      id: crypto.randomUUID(),
      type: 'buy',
      symbol: newHolding.symbol,
      name: newHolding.name,
      amount: newHolding.amount,
      pricePerUnit: newHolding.entryPoint,
      totalValue: newHolding.amount * newHolding.entryPoint,
      date: new Date().toISOString()
    };

    const updatedTransactions = [transaction, ...transactions];
    setTransactions(updatedTransactions);
  };

  const updateHolding = async (id: string, updates: Partial<CryptoHolding>) => {
    const updatedHoldings = cryptoHoldings.map((holding: CryptoHolding) => {
      if (holding.id === id) {
        const updatedHolding = { ...holding, ...updates };
        // Always recalculate value and change percentage when updating
        const currentPriceData = prices[holding.symbol];
        const currentPrice = currentPriceData?.price || updatedHolding.entryPoint;
        updatedHolding.value = updatedHolding.amount * currentPrice;
        const changePercent = ((currentPrice - updatedHolding.entryPoint) / updatedHolding.entryPoint * 100);
        updatedHolding.change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
        return updatedHolding;
      }
      return holding;
    });

    // Update state optimistically first
    setCryptoHoldings(updatedHoldings);

    // Save to database
    const updatedHolding = updatedHoldings.find(h => h.id === id);
    if (updatedHolding) {
      await SupabaseDataService.saveCryptoHolding(updatedHolding);
      
      // Verify data consistency
      verifyDataConsistency((holdings) => {
        const h = holdings.find(item => item.id === id);
        // Check if amount matches (approximate for floats)
        return !!(h && Math.abs(h.amount - updatedHolding.amount) < 0.000001);
      });
    }
  };

  const deleteHolding = async (id: string) => {
    const holding = cryptoHoldings.find((h: CryptoHolding) => h.id === id);

    if (holding) {
      // Record sell transaction
      const currentPriceData = prices[holding.symbol];
      const currentPrice = currentPriceData?.price || holding.entryPoint;
      const transaction: CryptoTransaction = {
        id: crypto.randomUUID(),
        type: 'sell',
        symbol: holding.symbol,
        name: holding.name,
        amount: holding.amount,
        pricePerUnit: currentPrice,
        totalValue: holding.amount * currentPrice,
        date: new Date().toISOString()
      };

      const updatedTransactions = [transaction, ...transactions];
      setTransactions(updatedTransactions);
    }

    // Update state optimistically first
    const updatedHoldings = cryptoHoldings.filter((holding: CryptoHolding) => holding.id !== id);
    setCryptoHoldings(updatedHoldings);

    // Delete from database
    await SupabaseDataService.deleteCryptoHolding(id);

    // Verify data consistency
    verifyDataConsistency((holdings) => !holdings.find(h => h.id === id));
  };

  const sellHolding = async (holdingId: string, sellAmount: number, destination: any) => {
    const holding = cryptoHoldings.find((h: CryptoHolding) => h.id === holdingId);
    if (!holding) return;

    const currentPrice = prices[holding.symbol]?.price || holding.entryPoint;
    const proceeds = sellAmount * currentPrice;

    // Update or delete the holding
    if (sellAmount >= holding.amount) {
      // Selling entire position
      await SupabaseDataService.deleteCryptoHolding(holdingId);
      
      // Verify deletion
      verifyDataConsistency((holdings) => !holdings.find(h => h.id === holdingId));
    } else {
      // Selling partial position
      const updatedHolding = {
        ...holding,
        amount: holding.amount - sellAmount
      };
      await SupabaseDataService.saveCryptoHolding(updatedHolding);
      
      // Verify update
      verifyDataConsistency((holdings) => {
        const h = holdings.find(item => item.id === holdingId);
        return !!(h && Math.abs(h.amount - updatedHolding.amount) < 0.000001);
      });
    }

    // Handle destination
    if (destination.type === 'stablecoin') {
      // Find or create stablecoin holding
      const stablecoinHolding = cryptoHoldings.find((h: CryptoHolding) =>
        h.symbol === destination.symbol
      );

      if (stablecoinHolding) {
        // Add to existing stablecoin
        const updatedStablecoin = {
          ...stablecoinHolding,
          amount: stablecoinHolding.amount + proceeds
        };
        await SupabaseDataService.saveCryptoHolding(updatedStablecoin);
      } else {
        // Create new stablecoin holding
        const newStablecoin: CryptoHolding = {
          id: crypto.randomUUID(),
          symbol: destination.symbol,
          name: destination.symbol === 'USDT' ? 'Tether' :
            destination.symbol === 'USDC' ? 'USD Coin' :
              destination.symbol === 'DAI' ? 'Dai' : 'Binance USD',
          amount: proceeds,
          entryPoint: 1.0,
          value: proceeds,
          change: '+0.00%',
          color: '#10b981'
        };
        await SupabaseDataService.saveCryptoHolding(newStablecoin);
      }
    } else if (destination.type === 'bank') {
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
    const transaction: CryptoTransaction = {
      id: crypto.randomUUID(),
      type: 'sell',
      symbol: holding.symbol,
      name: holding.name,
      amount: sellAmount,
      pricePerUnit: currentPrice,
      totalValue: proceeds,
      date: new Date().toISOString()
    };

    const updatedTransactions = [transaction, ...transactions];
    setTransactions(updatedTransactions);
  };

  // Update holdings with real-time prices - MEMOIZED to prevent glitchy re-renders
  const updatedHoldings = useMemo(() => {
    return cryptoHoldings.map(holding => {
      const currentPriceData = prices[holding.symbol];
      if (currentPriceData) {
        const currentPrice = currentPriceData.price;
        const value = holding.amount * currentPrice;
        const changePercent = ((currentPrice - holding.entryPoint) / holding.entryPoint * 100);
        const change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;

        return {
          ...holding,
          value,
          change
        };
      }
      return holding;
    });
  }, [cryptoHoldings, prices]);

  // Memoize calculations to prevent unnecessary re-renders
  const totalValue = useMemo(() =>
    updatedHoldings.reduce((sum, holding) => sum + holding.value, 0)
    , [updatedHoldings]);

  const totalGainLoss = useMemo(() =>
    updatedHoldings.reduce((sum, holding) => {
      const currentPrice = prices[holding.symbol]?.price || holding.entryPoint;
      const costBasis = holding.amount * holding.entryPoint;
      return sum + (holding.value - costBasis);
    }, 0)
    , [updatedHoldings, prices]);

  const totalReturn = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

  // Calculate exact percentages for pie chart - memoized to prevent glitchy re-renders
  const pieChartData = useMemo(() => {
    if (updatedHoldings.length === 0 || totalValue === 0) {
      return [];
    }

    const allocation = updatedHoldings
      .filter(holding => holding.value > 0)
      .map(h => ({
        id: h.id,
        name: h.name,
        symbol: h.symbol,
        value: (h.value / totalValue) * 100,
        actualValue: h.value,
        color: h.color || '#f59e0b'
      }));

    return allocation;
  }, [updatedHoldings, totalValue]);

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'portfolio', label: 'Portfolio', icon: Coins },
              { id: 'transactions', label: 'Transactions', icon: TrendingUp },
              { id: 'analysis', label: 'Analysis', icon: DollarSign },
              { id: 'apy', label: 'APY Calculator', icon: Percent }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'portfolio' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              Add Position
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6" style={{ overflow: 'visible' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ overflow: 'visible' }}>
              {/* Portfolio Breakdown */}
              <div className="relative" style={{ zIndex: 1, overflow: 'visible' }}>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Breakdown</h3>
                {loading ? (
                  <div className="flex items-center justify-center text-gray-500 dark:text-gray-400" style={{ height: '300px' }}>
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading prices...</p>
                    </div>
                  </div>
                ) : pieChartData.length > 0 ? (
                  <div className="relative [&_.recharts-pie-sector]:!opacity-100 [&_.recharts-pie]:!opacity-100 [&_.recharts-sector]:!opacity-100" style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%" debounce={200}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={70}
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
                          {pieChartData.map((entry) => (
                            <Cell
                              key={`cell-${entry.id}`}
                              fill={entry.color}
                              stroke={pieChartData.length > 1 ? "#fff" : "none"}
                              strokeWidth={pieChartData.length > 1 ? 2 : 0}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          isAnimationActive={false}
                          animationDuration={0}
                          trigger="hover"
                          wrapperStyle={{ zIndex: 50, pointerEvents: 'none', visibility: 'visible' }}
                          allowEscapeViewBox={{ x: true, y: true }}
                          content={(props) => {
                            const { active, payload } = props;
                            if (!active || !payload || !payload.length) return null;
                            const data = payload[0];
                            const displayPercent = pieChartData.length === 1 ? 100 : Number(data.value);
                            return (
                              <div
                                className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-2xl border-2 border-orange-200 dark:border-orange-700"
                                style={{ boxShadow: '0 10px 40px rgba(249, 115, 22, 0.3), 0 4px 20px rgba(0,0,0,0.15)', pointerEvents: 'none' }}
                              >
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {data.name}
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                  {data.payload.symbol}
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
                  </div>
                ) : cryptoHoldings.length > 0 ? (
                  <div className="flex items-center justify-center text-gray-500 dark:text-gray-400" style={{ height: '300px' }}>
                    <div className="text-center">
                      <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Calculating allocation...</p>
                      <p className="text-sm mt-1">Please wait</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-gray-500 dark:text-gray-400" style={{ height: '300px' }}>
                    <div className="text-center">
                      <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No crypto holdings yet</p>
                      <p className="text-sm mt-1">Add a position to see your allocation</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Holdings List */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Holdings Details</h3>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {loading && <div className="text-center text-gray-500 dark:text-gray-400">Loading prices...</div>}
                  {[...updatedHoldings].sort((a, b) => b.value - a.value).map((holding, index) => (
                    <div key={holding.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CryptoIcon symbol={holding.symbol} />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{holding.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {holding.amount} {holding.symbol} • Entry: ${formatNumber(holding.entryPoint)}
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
                          <div className={`text-sm ${holding.change?.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.change}
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

            {/* Wallet Distribution Chart */}
            {cryptoHoldings.length > 0 && (
              <div
                className="mt-6 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700"
                style={{
                  overflow: 'visible',
                  position: 'relative',
                  zIndex: 1,
                  isolation: 'auto'
                }}
              >
                <PortfolioWalletPieChartV2
                  holdings={updatedHoldings}
                  prices={prices}
                />
              </div>
            )}

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mx-2 py-2 -my-2">
              <ConditionalThemedStatBox
                themeColor={CARD_THEME_COLORS.crypto}
                value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`}
                label="Total Return"
                valueType={totalReturn >= 0 ? 'positive' : 'negative'}
              />
              <ConditionalThemedStatBox
                themeColor={CARD_THEME_COLORS.crypto}
                value={`${totalGainLoss >= 0 ? '+' : ''}$${Math.abs(totalGainLoss).toLocaleString()}`}
                label={`Unrealized ${totalGainLoss >= 0 ? 'Gains' : 'Losses'}`}
                valueType={totalGainLoss >= 0 ? 'positive' : 'negative'}
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.crypto}
                value={`$${(totalValue - totalGainLoss).toLocaleString()}`}
                label="Cost Basis"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.crypto}
                value={updatedHoldings.length}
                label="Assets"
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
                <p className="text-sm">Add crypto holdings to see your transaction history</p>
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

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-300 dark:hover:border-orange-600 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${tx.type === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          }`}>
                          {tx.type.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {tx.amount.toFixed(8)} {tx.symbol}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {tx.name} • {formattedDate}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            @ ${tx.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${tx.type === 'buy' ? 'text-gray-900 dark:text-white' : 'text-green-600 dark:text-green-400'
                          }`}>
                          ${tx.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                shares: h.amount,
                currentPrice: h.value / h.amount
              }))}
              totalValue={totalValue}
              assetType="crypto"
            />

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">6-Month Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cryptoHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${formatNumber(Number(value))}`, 'Portfolio Value']} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Risk Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Volatility</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">High</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Diversification</span>
                    <span className={`font-semibold ${updatedHoldings.length >= 5 ? 'text-green-600 dark:text-green-400' :
                      updatedHoldings.length >= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                      {updatedHoldings.length >= 5 ? 'Good' : updatedHoldings.length >= 3 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Total Holdings</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{updatedHoldings.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Portfolio Insights</h4>
                <div className="text-sm space-y-2">
                  {updatedHoldings.length < 3 && (
                    <p className="text-gray-700 dark:text-gray-300">• Consider diversifying into more cryptocurrencies</p>
                  )}
                  {!updatedHoldings.some(h => h.symbol === 'USDT' || h.symbol === 'USDC') && (
                    <p className="text-gray-700 dark:text-gray-300">• Consider holding stablecoins for stability</p>
                  )}
                  <p className="text-gray-700 dark:text-gray-300">• Set stop-loss orders for risk management</p>
                  <p className="text-gray-700 dark:text-gray-300">• Dollar-cost average into positions</p>
                  {updatedHoldings.some(h => {
                    const changeNum = parseFloat(h.change.replace('%', ''));
                    return changeNum > 20;
                  }) && (
                      <p className="text-gray-700 dark:text-gray-300">• Consider taking profits on strong performers</p>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apy' && (
          <CryptoAPYCalculator
            holdings={updatedHoldings}
          />
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
        onUpdate={async (id, updates) => {
          await updateHolding(id, updates);
        }}
      />

      <SellPositionModal
        isOpen={showSellModal}
        onClose={() => {
          setShowSellModal(false);
          setSellingHolding(null);
        }}
        assetType="crypto"
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

function CryptoHoverContent() {
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const symbols = cryptoHoldings.map(holding => holding.symbol);
  const { prices } = useAssetPrices(symbols);

  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: NodeJS.Timeout | null = null;
    
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getCryptoHoldings([]);
      if (isMounted) {
        setCryptoHoldings(savedHoldings);
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
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);

    return () => {
      isMounted = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Calculate portfolio values with real-time prices
  const portfolioData = cryptoHoldings.map(holding => {
    const currentPriceData = prices[holding.symbol];
    // Fallback to entry price or calculated price from stored value if real-time price is missing
    const currentPrice = currentPriceData?.price || (holding.value && holding.amount ? holding.value / holding.amount : holding.entryPoint) || 0;
    const currentValue = holding.amount * currentPrice;
    const entryPoint = holding.entryPoint || 0; // Safeguard against undefined
    const costBasis = holding.amount * entryPoint;
    const gainLoss = currentValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
    return { ...holding, currentValue, gainLoss, gainLossPercent, currentPrice, costBasis, entryPoint };
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

  // Smart formatting for crypto amounts
  const formatCryptoAmount = (amount: number) => {
    if (!amount || typeof amount !== 'number') return '0';
    if (amount >= 1) return amount.toFixed(2); // 2 decimals for amounts >= 1
    if (amount >= 0.01) return amount.toFixed(4); // 4 decimals for amounts >= 0.01
    return amount.toFixed(8); // 8 decimals for very small amounts
  };

  return (
    <div className="space-y-1">
      {topHoldings.map((holding) => (
        <div key={holding.id} className="flex justify-between text-xs">
          <span className="flex items-center gap-1">
            <CryptoIcon symbol={holding.symbol} className="w-3 h-3" /> {holding.name} ({formatCryptoAmount(holding.amount)} {holding.symbol})
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

function CryptoCardWithPrices() {
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();

  // Load data on component mount and when currency changes
  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: NodeJS.Timeout | null = null;
    
    const loadHoldings = async () => {
      const savedHoldings = await SupabaseDataService.getCryptoHoldings([]);
      if (isMounted) {
        setCryptoHoldings(savedHoldings);
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
      }, 500); // 500ms delay
    };
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange); // Re-render on currency change

    return () => {
      isMounted = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, []); // Currency changes handled by event listener

  const symbols = cryptoHoldings.map(holding => holding.symbol);
  const { prices, loading } = useAssetPrices(symbols);

  // Calculate portfolio values with real-time prices
  const portfolioData = cryptoHoldings.map(holding => {
    const currentPriceData = prices[holding.symbol];
    if (currentPriceData) {
      const currentPrice = currentPriceData.price;
      const value = holding.amount * currentPrice;
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
  const totalCostBasis = portfolioData.reduce((sum, holding) => sum + (holding.amount * holding.entryPoint), 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalReturn = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Format change display
  const changeDisplay = cryptoHoldings.length === 0 ? "0.0%" : `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
  const changeTypeCalc = totalReturn >= 0 ? "positive" as const : "negative" as const;

  // Get BTC and ETH values for stats
  const btcHolding = portfolioData.find(h => h.symbol === 'BTC');
  const ethHolding = portfolioData.find(h => h.symbol === 'ETH');

  // Create chart data from holdings - sort by value and show top holdings
  // Filter out invalid values to prevent NaN in charts
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
      title="Crypto Portfolio"
      description="Digital assets and cryptocurrency holdings"
      amount={displayAmount}
      change={loading ? "..." : changeDisplay}
      changeType={changeTypeCalc}
      mainColor="#f59e0b"
      secondaryColor="#fbbf24"
      gridColor="#f59e0b15"
      stats={[
        {
          label: "BTC",
          value: loading || !btcHolding ? "Loading..." : formatMain(convertToMain(btcHolding.value, 'USD')),
          color: "#f59e0b"
        },
        {
          label: "ETH",
          value: loading || !ethHolding ? "Loading..." : formatMain(convertToMain(ethHolding.value, 'USD')),
          color: "#fbbf24"
        }
      ]}
      icon={Coins}
      hoverContent={<CryptoHoverContent />}
      modalContent={<CryptoModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}

export function CryptoCard() {
  return <CryptoCardWithPrices />;
}
