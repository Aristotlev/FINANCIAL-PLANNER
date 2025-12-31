/**
 * Canonical AppState - Single Source of Truth
 * 
 * This module defines the complete application state structure.
 * All state-changing operations must go through the AppState system
 * to ensure consistency, versioning, and sync capability.
 */

// ============================================================================
// Core Types - Holdings & Assets
// ============================================================================

export interface CryptoHolding {
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
  iconUrl?: string;
}

export interface StockHolding {
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

export interface CashAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'cash' | 'other';
  bankName?: string;
  color?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  balance?: number;
  current?: number;
  deadline?: string;
  color?: string;
  category?: string;
}

export interface RealEstateProperty {
  id: string;
  name: string;
  address?: string;
  purchasePrice: number;
  currentValue: number;
  mortgageBalance?: number;
  monthlyPayment?: number;
  rentalIncome?: number;
  propertyType?: string;
  color?: string;
}

export interface ValuableItem {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate?: string;
  condition?: string;
  notes?: string;
  color?: string;
}

export interface TradingPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  entryPrice: number;
  currentPrice: number;
  type: 'forex' | 'crypto-futures' | 'options' | 'stock';
  direction: 'long' | 'short';
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  openDate?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  budget?: number;
  color: string;
  icon?: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  type: 'salary' | 'freelance' | 'investment' | 'rental' | 'other';
  color?: string;
}

// ============================================================================
// Dashboard & Layout Types
// ============================================================================

export type CardType = 
  | 'cash'
  | 'savings'
  | 'crypto'
  | 'stocks'
  | 'networth'
  | 'tools'
  | 'news'
  | 'realestate'
  | 'trading'
  | 'valuableitems'
  | 'expenses'
  | 'taxes';

export interface DashboardLayout {
  cardOrder: CardType[];
  hiddenCards: CardType[];
  zoomLevel: number;
}

// ============================================================================
// Settings & Preferences Types
// ============================================================================

export interface UserSettings {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  locale: string;
  dateFormat: string;
  numberFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    priceAlerts: boolean;
    portfolioUpdates: boolean;
  };
}

// ============================================================================
// Watchlist & Notes Types
// ============================================================================

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'forex';
  alertPrice?: number;
  alertDirection?: 'above' | 'below';
  notes?: string;
  addedAt: string;
}

export interface AssetNote {
  id: string;
  assetId: string;
  assetType: 'crypto' | 'stock' | 'realestate' | 'valuable' | 'trading';
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// ============================================================================
// Trading Account Balances (previously in localStorage)
// ============================================================================

export interface TradingAccountBalances {
  forex: number;
  cryptoFutures: number;
  options: number;
}

// ============================================================================
// Portfolio (unified container)
// ============================================================================

export interface Portfolio {
  crypto: CryptoHolding[];
  stocks: StockHolding[];
  cash: CashAccount[];
  savings: SavingsGoal[];
  realEstate: RealEstateProperty[];
  valuableItems: ValuableItem[];
  tradingPositions: TradingPosition[];
  tradingBalances: TradingAccountBalances;
  expenses: ExpenseCategory[];
  income: IncomeSource[];
}

// ============================================================================
// Main AppState Interface
// ============================================================================

export interface AppState {
  // Version control for migrations and sync
  schemaVersion: number;
  rev: number;  // Monotonically increasing revision number
  updatedAt: string;  // ISO 8601 timestamp
  
  // User identity (for multi-user support)
  userId: string | null;
  
  // Core data
  portfolio: Portfolio;
  
  // UI state
  dashboard: DashboardLayout;
  
  // User preferences
  settings: UserSettings;
  
  // Watchlist
  watchlist: WatchlistItem[];
  
  // Notes & tags
  notes: AssetNote[];
}

// ============================================================================
// Schema Version History
// ============================================================================

/**
 * SCHEMA_VERSION changelog:
 * 1 - Initial schema with all portfolio, dashboard, settings
 */
export const CURRENT_SCHEMA_VERSION = 1;

// ============================================================================
// Default State Factory
// ============================================================================

export const DEFAULT_CARD_ORDER: CardType[] = [
  'cash',
  'savings',
  'crypto',
  'stocks',
  'networth',
  'tools',
  'news',
  'realestate',
  'trading',
  'valuableitems',
  'expenses',
  'taxes',
];

export function createDefaultAppState(userId: string | null = null): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rev: 0,
    updatedAt: new Date().toISOString(),
    userId,
    
    portfolio: {
      crypto: [],
      stocks: [],
      cash: [],
      savings: [],
      realEstate: [],
      valuableItems: [],
      tradingPositions: [],
      tradingBalances: {
        forex: 0,
        cryptoFutures: 0,
        options: 0,
      },
      expenses: [],
      income: [],
    },
    
    dashboard: {
      cardOrder: [...DEFAULT_CARD_ORDER],
      hiddenCards: [],
      zoomLevel: 1.0,
    },
    
    settings: {
      currency: 'USD',
      theme: 'system',
      locale: 'en-US',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      notifications: {
        email: true,
        push: true,
        priceAlerts: true,
        portfolioUpdates: true,
      },
    },
    
    watchlist: [],
    notes: [],
  };
}

// ============================================================================
// State Mutation Helper
// ============================================================================

/**
 * Creates a new state with incremented rev and updated timestamp.
 * Use this for ALL state mutations to ensure proper versioning.
 */
export function mutateState<K extends keyof AppState>(
  currentState: AppState,
  key: K,
  value: AppState[K]
): AppState {
  return {
    ...currentState,
    [key]: value,
    rev: currentState.rev + 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deep mutation helper for nested portfolio updates
 */
export function mutatePortfolio<K extends keyof Portfolio>(
  currentState: AppState,
  key: K,
  value: Portfolio[K]
): AppState {
  return {
    ...currentState,
    portfolio: {
      ...currentState.portfolio,
      [key]: value,
    },
    rev: currentState.rev + 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deep mutation helper for dashboard updates
 */
export function mutateDashboard<K extends keyof DashboardLayout>(
  currentState: AppState,
  key: K,
  value: DashboardLayout[K]
): AppState {
  return {
    ...currentState,
    dashboard: {
      ...currentState.dashboard,
      [key]: value,
    },
    rev: currentState.rev + 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deep mutation helper for settings updates
 */
export function mutateSettings<K extends keyof UserSettings>(
  currentState: AppState,
  key: K,
  value: UserSettings[K]
): AppState {
  return {
    ...currentState,
    settings: {
      ...currentState.settings,
      [key]: value,
    },
    rev: currentState.rev + 1,
    updatedAt: new Date().toISOString(),
  };
}
