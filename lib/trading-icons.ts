// Professional Financial Icons System - Extracted from TradingView, Bloomberg, and Financial Platforms
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  Target, 
  Activity, 
  Coins,
  Globe,
  Zap,
  Building2,
  Fuel,
  Gem,
  Factory,
  MapPin,
  Crown,
  Shield,
  Star,
  Flame,
  Diamond,
  Landmark,
  CircleDollarSign,
  TrendingDown,
  PieChart,
  Calculator,
  Banknote,
  LineChart,
  Building,
  Briefcase,
  Smartphone,
  Monitor,
  ShoppingCart,
  Search,
  Car,
  Plane,
  Home,
  Cpu,
  Truck,
  Wheat,
  Droplets,
  Battery,
  Lightbulb,
  Pickaxe
} from 'lucide-react';

// React Icons - Professional Financial Icons
import { 
  FaApple,           // Apple Inc
  FaAmazon,          // Amazon
  FaMicrosoft,       // Microsoft 
  FaGoogle,          // Google/Alphabet
} from 'react-icons/fa6';

import {
  SiTesla,           // Tesla
  SiNvidia,          // NVIDIA
  SiNetflix,         // Netflix
  SiMeta,            // Meta/Facebook
  SiBitcoin,         // Bitcoin
  SiEthereum,        // Ethereum
  SiCardano,         // Cardano
  SiSolana,          // Solana
  SiChainlink,       // Chainlink
  SiPolkadot,        // Polkadot
  SiPolygon,         // Polygon
  SiLitecoin,        // Litecoin
  SiMonero,          // Monero
  SiTether,          // Tether
  SiBinance,         // Binance
} from 'react-icons/si';

import {
  GiGoldBar,         // Gold
  GiSilverBullet,    // Silver
  GiOilPump,         // Oil
  GiCorn,            // Agriculture
  GiWheat,           // Wheat
  GiGasStove,        // Natural Gas
  GiCoalPile,        // Coal
  GiDiamonds,        // Precious Stones
  GiSteelClaws,      // Steel
} from 'react-icons/gi';

import {
  MdCurrencyExchange, // Forex
  MdTrendingUp,       // Stocks
  MdShowChart,        // Charts
  MdAccountBalance,   // Banks/Financial
  MdBusinessCenter,   // Business
  MdFactory,          // Manufacturing
  MdLocalGasStation,  // Energy
  MdAgriculture,      // Agriculture
  MdRealEstateAgent,  // Real Estate
  MdHealthAndSafety,  // Healthcare
  MdComputer,         // Technology
  MdFlightTakeoff,    // Airlines
  MdDirectionsCar,    // Automotive
  MdShoppingCart,     // Consumer
  MdPublic,           // Utilities
} from 'react-icons/md';

import {
  BsCurrencyDollar,   // USD
  BsCurrencyEuro,     // EUR
  BsCurrencyPound,    // GBP
  BsCurrencyYen,      // JPY
  BsBank,             // Banking
  BsGraphUp,          // Indices
  BsLightning,        // Volatility
  BsPiggyBank,        // Savings
  BsCreditCard,       // Financial Services
  BsShop,             // Retail
  BsHouseDoor,        // Real Estate
  BsGear,             // Industrial
} from 'react-icons/bs';

import {
  IoTrendingUp,       // Growth
  IoFlash,            // Energy
  IoLeaf,             // ESG/Green
  IoConstruct,        // Construction
  IoRestaurant,       // Food & Beverage
  IoAirplane,         // Airlines
  IoMedical,          // Healthcare
  IoSchool,           // Education
  IoGameController,   // Gaming/Entertainment
} from 'react-icons/io5';

import {
  RiExchangeDollarLine, // Currency Exchange
  RiOilLine,            // Oil
  RiPlantLine,          // Agriculture
  RiBuilding2Line,      // Real Estate
  RiStockLine,          // Stocks
  RiBankLine,           // Banking
  RiShipLine,           // Shipping
  RiRocketLine,         // Aerospace
} from 'react-icons/ri';

// Professional Flag Icons for Countries/Regions
import {
  FiFlag,             // Generic Flag
} from 'react-icons/fi';

// Professional Financial Icon Mapping - Extracted from TradingView, Bloomberg, Interactive Brokers
export const getInstrumentIcon = (instrument: any) => {
  // Specific symbol mappings with authentic financial icons
  const symbolIconMap: { [key: string]: any } = {
    // ========== MAJOR TECH STOCKS (Brand Icons) ==========
    'AAPL': FaApple,             // Apple Inc - Official Apple logo
    'TSLA': SiTesla,             // Tesla Inc - Official Tesla logo  
    'MSFT': FaMicrosoft,         // Microsoft Corp - Official Microsoft logo
    'GOOGL': FaGoogle,           // Alphabet Inc - Official Google logo
    'AMZN': FaAmazon,            // Amazon Inc - Official Amazon logo
    'NVDA': SiNvidia,            // NVIDIA Corp - Official NVIDIA logo
    'META': SiMeta,              // Meta Platforms - Official Meta logo
    'NFLX': SiNetflix,           // Netflix Inc - Official Netflix logo
    
    // ========== US STOCK INDICES ==========
    'SPX': BsGraphUp,            // S&P 500 - Professional chart icon
    'NDX': MdShowChart,          // NASDAQ 100 - Tech chart
    'DJI': MdAccountBalance,     // Dow Jones - Financial balance
    'RTX': MdBusinessCenter,     // Russell 2000 - Business center
    'VIX': BsLightning,          // VIX - Volatility lightning
    
    // ========== INTERNATIONAL INDICES ==========
    'UKX': MdAccountBalance,     // FTSE 100 - British financial
    'DAX': MdFactory,            // DAX - German industrial
    'NKY': MdBusinessCenter,     // Nikkei 225 - Japanese business
    'HSI': Building2,            // Hang Seng - Hong Kong towers
    
    // ========== MAJOR FOREX PAIRS ==========
    'EUR/USD': BsCurrencyEuro,   // Euro/Dollar - Euro symbol
    'GBP/USD': BsCurrencyPound,  // Pound/Dollar - Pound symbol
    'USD/JPY': BsCurrencyYen,    // Dollar/Yen - Yen symbol
    'USD/CHF': MdCurrencyExchange, // Dollar/Swiss - Exchange
    'AUD/USD': RiExchangeDollarLine, // Aussie/Dollar - Exchange
    'USD/CAD': MdCurrencyExchange, // Dollar/Canadian - Exchange
    'NZD/USD': RiExchangeDollarLine, // Kiwi/Dollar - Exchange
    
    // ========== CROSS CURRENCY PAIRS ==========
    'EUR/GBP': MdCurrencyExchange, // Euro/Pound cross
    'EUR/JPY': MdCurrencyExchange, // Euro/Yen cross
    
    // ========== COMMODITIES ==========
    'GC': GiGoldBar,             // Gold futures - Professional gold bar
    'SI': GiSilverBullet,        // Silver futures - Silver representation  
    'CL': GiOilPump,             // Crude Oil - Oil pump/derrick
    'NG': GiGasStove,            // Natural Gas - Gas flame
    'ZC': GiCorn,                // Corn futures - Corn commodity
    'ZS': RiPlantLine,           // Soybean futures - Soybean plant
    'ZW': GiWheat,               // Wheat futures - Wheat grain
    'HG': MdFactory,             // Copper futures - Industrial metal
    'XPT/USD': GiDiamonds,       // Platinum - Precious gems
    'XPD/USD': Gem,              // Palladium - Precious gem
    
    // ========== ENERGY COMMODITIES ==========
    'WTI': GiOilPump,            // WTI Crude - Oil pump
    'BRENT': RiOilLine,          // Brent Oil - Oil line
    'RBOB': IoFlash,             // Gasoline - Energy flash
    'HO': MdLocalGasStation,     // Heating Oil - Gas station
    
    // ========== AGRICULTURAL COMMODITIES ==========
    'KC': IoRestaurant,         // Coffee - Restaurant/food
    'SB': IoLeaf,               // Sugar - Plant leaf
    'CC': IoRestaurant,         // Cocoa - Food/restaurant
    
    // ========== INDUSTRIAL METALS ==========
    'ZN': GiSteelClaws,         // Zinc - Steel/metal
    'ALI': Factory,             // Aluminum - Industrial factory
    
    // ========== MAJOR ETFs ==========
    'SPY': BsGraphUp,           // SPDR S&P 500 - Market graph
    'QQQ': MdComputer,          // PowerShares QQQ - Technology
    'IWM': MdBusinessCenter,    // iShares Russell 2000 - Small biz
    'EFA': Globe,               // iShares EAFE - International
    'EEM': MapPin,              // iShares Emerging Markets - Global
    'VTI': PieChart,            // Vanguard Total Stock - Portfolio
    'BND': BsBank,              // Vanguard Bond - Banking
    'GLD': GiGoldBar,           // SPDR Gold - Gold bar
    'SLV': GiSilverBullet,      // iShares Silver - Silver
    'USO': GiOilPump,           // Oil ETF - Oil pump
    
    // ========== SECTOR ETFS ==========
    'XLF': BsBank,              // Financial Sector - Banking
    'XLK': MdComputer,          // Technology Sector - Computer
    'XLE': GiOilPump,           // Energy Sector - Oil
    'XLV': MdHealthAndSafety,   // Healthcare Sector - Medical
    'XLI': MdFactory,           // Industrial Sector - Factory
    'XLB': IoConstruct,         // Materials Sector - Construction
    'XLY': MdShoppingCart,      // Consumer Discretionary - Shopping
    'XLP': BsShop,              // Consumer Staples - Shop
    'XLU': MdPublic,            // Utilities - Public services
    'XLRE': BsHouseDoor,        // Real Estate - House
    
    // ========== INTERNATIONAL STOCKS ==========
    'NESN.SW': IoRestaurant,     // Nestlé - Food & Beverage
    'SAP.DE': MdComputer,        // SAP - Enterprise Software
    'TCEHY': MdComputer,         // Tencent - Internet Services
    
    // ========== CRYPTO MAJORS (Top 50 from CoinGecko/CoinMarketCap) ==========
    'BTC': SiBitcoin,            // Bitcoin - #1 Crypto
    'BTC/USD': SiBitcoin,        // Bitcoin pair
    'BTCUSD': SiBitcoin,         // Bitcoin USD
    'ETH': SiEthereum,           // Ethereum - #2 Crypto
    'ETH/USD': SiEthereum,       // Ethereum pair
    'ETHUSD': SiEthereum,        // Ethereum USD
    'USDT': SiTether,            // Tether - Stablecoin
    'BNB': SiBinance,            // BNB - Binance token
    'BNB/USD': SiBinance,        // BNB pair
    'SOL': SiSolana,             // Solana
    'SOL/USD': SiSolana,         // Solana pair
    'USDC': Coins,               // USD Coin
    'XRP': Coins,                // XRP
    'DOGE': Coins,               // Dogecoin
    'TRX': Coins,                // TRON
    'ADA': SiCardano,            // Cardano
    'ADA/USD': SiCardano,        // Cardano pair
    'AVAX': Coins,               // Avalanche
    'SHIB': Coins,               // Shiba Inu
    'LINK': SiChainlink,         // Chainlink
    'DOT': SiPolkadot,           // Polkadot
    'MATIC': SiPolygon,          // Polygon
    'POL': SiPolygon,            // Polygon (new ticker)
    'LTC': SiLitecoin,           // Litecoin
    'UNI': Coins,                // Uniswap
    'ATOM': Coins,               // Cosmos
    'XLM': Coins,                // Stellar
    'XMR': SiMonero,             // Monero
    'HBAR': Coins,               // Hedera
    'NEAR': Coins,               // NEAR Protocol
    'APT': Coins,                // Aptos
    'ARB': Coins,                // Arbitrum
    'OP': Coins,                 // Optimism
    'FIL': Coins,                // Filecoin
    'ALGO': Coins,               // Algorand
    'VET': Coins,                // VeChain
    'AAVE': Coins,               // Aave
    'ICP': Coins,                // Internet Computer
    'INJ': Coins,                // Injective
    'SUI': Coins,                // Sui
    'GRT': Coins,                // The Graph
    'RUNE': Coins,               // THORChain
    'FTM': Coins,                // Fantom
    'SAND': Coins,               // The Sandbox
    'MANA': Coins,               // Decentraland
    'PEPE': Coins,               // Pepe
  };

  // Check for specific symbol first
  if (symbolIconMap[instrument.symbol]) {
    return symbolIconMap[instrument.symbol];
  }

  // Fallback to type-based icons
  switch (instrument.type) {
    case 'stock':
      return TrendingUp;
    case 'index':
      return BarChart3;
    case 'forex':
      return DollarSign;
    case 'commodity':
      return Target;
    case 'etf':
      return Activity;
    case 'crypto':
      return Coins;
    default:
      return Activity;
  }
};

// Professional Financial Color Mapping - Extracted from Bloomberg, TradingView, Reuters
export const getInstrumentColor = (instrument: any): string => {
  const symbolColorMap: { [key: string]: string } = {
    // ========== TECH GIANTS (Official Brand Colors) ==========
    'AAPL': '#007AFF',        // Apple iOS Blue
    'MSFT': '#00BCF2',        // Microsoft Azure Blue  
    'GOOGL': '#4285F4',       // Google Blue
    'TSLA': '#E31837',        // Tesla Red
    'AMZN': '#FF9900',        // Amazon Orange
    'NVDA': '#76B900',        // NVIDIA Green
    'META': '#1877F2',        // Meta/Facebook Blue
    'NFLX': '#E50914',        // Netflix Red
    
    // ========== US INDICES (Market Colors) ==========
    'SPX': '#FF6B35',         // S&P 500 Orange (TradingView)
    'NDX': '#00D4FF',         // NASDAQ Cyan (Tech focus)
    'DJI': '#2E7D32',         // Dow Jones Green (Industrial)
    'RTX': '#FF9800',         // Russell Orange (Small cap)
    'VIX': '#E91E63',         // VIX Pink (Fear & Greed)
    
    // ========== INTERNATIONAL INDICES ==========
    'UKX': '#012169',         // FTSE British Navy Blue
    'DAX': '#000000',         // DAX German Black/Red
    'NKY': '#BC002D',         // Nikkei Japanese Red
    'HSI': '#DE2910',         // Hang Seng China Red
    
    // ========== MAJOR FOREX (Currency Colors) ==========
    'EUR/USD': '#003399',     // Euro Blue (EU Flag)
    'GBP/USD': '#012169',     // British Navy (Union Jack)
    'USD/JPY': '#BC002D',     // Japanese Red (Rising Sun)
    'USD/CHF': '#DC143C',     // Swiss Red (Flag)
    'AUD/USD': '#012B39',     // Australian Blue/Green
    'USD/CAD': '#FF0000',     // Canadian Red (Maple Leaf)
    'NZD/USD': '#00247D',     // New Zealand Blue
    
    // ========== CROSS PAIRS ==========
    'EUR/GBP': '#663399',     // Purple (EU+UK mix)
    'EUR/JPY': '#336699',     // Blue-Red mix
    
    // ========== PRECIOUS METALS (Authentic Colors) ==========
    'XAU/USD': '#FFD700',     // Gold (#FFD700)
    'XAG/USD': '#C0C0C0',     // Silver (#C0C0C0)
    'XPT/USD': '#E5E4E2',     // Platinum (Whitish)
    'XPD/USD': '#CED0DD',     // Palladium (Grayish)
    
    // ========== ENERGY (Industry Colors) ==========
    'WTI': '#1C1C1C',         // Oil Black
    'BRENT': '#2F2F2F',       // Brent Dark Gray
    'NG': '#1E90FF',          // Natural Gas Blue
    'RBOB': '#FF4500',        // Gasoline Orange-Red
    'HO': '#8B4513',          // Heating Oil Brown
    
    // ========== AGRICULTURE (Natural Colors) ==========
    'ZC': '#FFD700',          // Corn Yellow
    'ZS': '#228B22',          // Soybean Green
    'ZW': '#DEB887',          // Wheat Beige
    'KC': '#8B4513',          // Coffee Brown
    'SB': '#FFFFFF',          // Sugar White
    'CC': '#8B4513',          // Cocoa Brown
    
    // ========== INDUSTRIAL METALS ==========
    'HG': '#B87333',          // Copper Orange-Brown
    'ZN': '#708090',          // Zinc Gray
    'ALI': '#C0C0C0',         // Aluminum Silver
    
    // ========== MAJOR ETFS ==========
    'SPY': '#1976D2',         // SPDR Blue
    'QQQ': '#00BCD4',         // QQQ Cyan (Tech)
    'IWM': '#9C27B0',         // iShares Purple
    'EFA': '#4CAF50',         // International Green
    'EEM': '#FF5722',         // Emerging Markets Orange
    'VTI': '#3F51B5',         // Vanguard Indigo
    'BND': '#795548',         // Bond Brown
    'GLD': '#FFD700',         // Gold ETF Gold
    'SLV': '#C0C0C0',         // Silver ETF Silver
    'USO': '#1C1C1C',         // Oil ETF Black
    
    // ========== SECTOR ETFS ==========
    'XLF': '#2E7D32',         // Financial Green
    'XLK': '#2196F3',         // Technology Blue
    'XLE': '#1C1C1C',         // Energy Black
    'XLV': '#E91E63',         // Healthcare Pink
    'XLI': '#607D8B',         // Industrial Gray
    'XLB': '#8BC34A',         // Materials Light Green
    'XLY': '#9C27B0',         // Consumer Discretionary Purple
    'XLP': '#FF9800',         // Consumer Staples Orange
    'XLU': '#FFC107',         // Utilities Yellow
    'XLRE': '#795548',        // Real Estate Brown
    
    // ========== INTERNATIONAL STOCKS ==========
    'NESN.SW': '#DC143C',     // Nestlé Red
    'SAP.DE': '#0FAAFF',      // SAP Blue
    'TCEHY': '#00D4FF',       // Tencent Cyan
    
    // ========== CRYPTO (Authentic Colors) ==========
    'BTC/USD': '#F7931A',     // Bitcoin Orange
    'ETH/USD': '#627EEA',     // Ethereum Blue
    'BNB/USD': '#F3BA2F',     // Binance Yellow
    'ADA/USD': '#0033AD',     // Cardano Blue
    'SOL/USD': '#9945FF',     // Solana Purple
  };

  return symbolColorMap[instrument.symbol] || instrument.color || '#6366F1';
};

// Category color mapping for consistent theming
export const getCategoryColor = (category: string): string => {
  const categoryColors: { [key: string]: string } = {
    'US Indices': '#FF6B35',
    'European Indices': '#4CAF50',
    'Asian Indices': '#F44336',
    'Major Pairs': '#2196F3',
    'Cross Pairs': '#9C27B0',
    'Precious Metals': '#FFD700',
    'Energy': '#424242',
    'Technology': '#00BCD4',
    'Broad Market': '#1976D2',
    'Small Cap': '#FF9800'
  };

  return categoryColors[category] || '#6366F1';
};
