/**
 * Shared Types for External API Integrations
 * Consolidates types from Binance, Revolut, and Vantage APIs
 */

// ==================== BINANCE TYPES ====================

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface BinanceTicker {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  balances: BinanceBalance[];
}

// ==================== REVOLUT TYPES ====================

export interface RevolutCredentials {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  jwtToken?: string;
}

export interface RevolutAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: 'active' | 'inactive';
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RevolutTransaction {
  id: string;
  type: 'transfer' | 'exchange' | 'card_payment' | 'atm' | 'topup' | 'refund';
  state: 'pending' | 'completed' | 'declined' | 'failed' | 'reverted';
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  reference?: string;
  legs: Array<{
    legId: string;
    accountId: string;
    counterpartyId?: string;
    amount: number;
    currency: string;
    description?: string;
    balance?: number;
  }>;
}

// ==================== VANTAGE TYPES ====================

export interface VantageCredentials {
  apiKey?: string;
  accountId?: string;
  apiSecret?: string;
  accessToken?: string;
}

export interface VantageAccount {
  accountId: string;
  accountType: 'demo' | 'live';
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
  profit: number;
  credit: number;
}

export interface VantagePosition {
  positionId: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  commission: number;
  openTime: string;
  comment?: string;
}

// ==================== UNIFIED PORTFOLIO TYPES ====================

/**
 * Unified account representation across all platforms
 */
export interface UnifiedAccount {
  id: string;
  platform: 'binance' | 'revolut' | 'vantage';
  type: 'crypto' | 'fiat' | 'trading' | 'stock';
  name: string;
  balance: number;
  currency: string;
  balanceUSD: number;
  lastUpdated: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Unified position/holding representation
 */
export interface UnifiedPosition {
  id: string;
  platform: 'binance' | 'revolut' | 'vantage';
  symbol: string;
  name: string;
  type: 'crypto' | 'forex' | 'cfd' | 'stock' | 'commodity';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  value: number;
  valueUSD: number;
  profitLoss: number;
  profitLossPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  openDate: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Unified transaction representation
 */
export interface UnifiedTransaction {
  id: string;
  platform: 'binance' | 'revolut' | 'vantage';
  type: 'buy' | 'sell' | 'transfer' | 'deposit' | 'withdrawal' | 'exchange' | 'fee';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  symbol?: string;
  amount: number;
  currency: string;
  amountUSD: number;
  fee?: number;
  feeUSD?: number;
  price?: number;
  description?: string;
  timestamp: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Portfolio summary across all platforms
 */
export interface PortfolioSummary {
  totalValueUSD: number;
  byPlatform: {
    binance?: {
      totalUSD: number;
      assets: number;
      lastUpdated: string;
    };
    revolut?: {
      totalUSD: number;
      accounts: number;
      lastUpdated: string;
    };
    vantage?: {
      totalUSD: number;
      positions: number;
      lastUpdated: string;
    };
  };
  byType: {
    crypto: number;
    fiat: number;
    forex: number;
    stocks: number;
    commodities: number;
  };
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  lastUpdated: string;
}

/**
 * Market price data
 */
export interface MarketPrice {
  symbol: string;
  name?: string;
  price: number;
  currency: string;
  change24h: number;
  changePercent24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  marketCap?: number;
  lastUpdated: string;
  source: 'binance' | 'revolut' | 'vantage' | 'other';
}

// ==================== API REQUEST/RESPONSE TYPES ====================

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: string;
    };
  };
}

/**
 * API credentials storage (encrypted in production)
 */
export interface StoredCredentials {
  binance?: {
    apiKey: string;
    apiSecret: string;
    endpoint: 'spot' | 'futures';
  };
  revolut?: {
    accessToken: string;
    refreshToken?: string;
    environment: 'production' | 'sandbox';
  };
  vantage?: {
    apiKey: string;
    accountId: string;
    environment: 'live' | 'demo';
  };
}

/**
 * Trading order request
 */
export interface TradeOrderRequest {
  platform: 'binance' | 'vantage';
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

/**
 * Payment/transfer request
 */
export interface PaymentRequest {
  platform: 'revolut';
  fromAccountId: string;
  toAccountId?: string;
  toCounterpartyId?: string;
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
}

/**
 * Exchange/swap request
 */
export interface ExchangeRequest {
  platform: 'binance' | 'revolut';
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
}

// ==================== UTILITY TYPES ====================

/**
 * Supported currencies across platforms
 */
export type SupportedCurrency = 
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'CNY'
  | 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'BNB' | 'SOL' | 'XRP' | 'ADA';

/**
 * Trading symbol types
 */
export type SymbolType = 
  | 'crypto'      // Cryptocurrency
  | 'forex'       // Foreign exchange
  | 'stock'       // Stock/Equity
  | 'commodity'   // Commodities (gold, oil, etc.)
  | 'index'       // Market indices
  | 'cfd';        // Contract for Difference

/**
 * Time intervals for charts
 */
export type TimeInterval = 
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1M';

/**
 * Date range helper
 */
export interface DateRange {
  from: string; // ISO 8601 date
  to: string;   // ISO 8601 date
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ==================== ANALYTICS TYPES ====================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  profitFactor?: number;
  period: DateRange;
}

/**
 * Risk metrics
 */
export interface RiskMetrics {
  volatility: number;
  beta?: number;
  var?: number; // Value at Risk
  exposureByAsset: { [asset: string]: number };
  exposureByType: { [type: string]: number };
  concentrationRisk: number;
}

/**
 * Asset allocation
 */
export interface AssetAllocation {
  byType: {
    crypto: number;
    fiat: number;
    forex: number;
    stocks: number;
    commodities: number;
  };
  byRegion?: {
    [region: string]: number;
  };
  byCurrency: {
    [currency: string]: number;
  };
  topHoldings: Array<{
    symbol: string;
    name: string;
    value: number;
    percentage: number;
  }>;
}
