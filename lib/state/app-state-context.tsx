/**
 * AppState Context - React Provider for Canonical State
 * 
 * This context provides:
 * - Single source of truth for all app data
 * - Automatic persistence to IndexedDB (immediate, non-blocking)
 * - Background sync to remote (via sync service)
 * - Type-safe state mutations with automatic rev incrementing
 * - Integration with existing context consumers
 */

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  AppState,
  Portfolio,
  DashboardLayout,
  UserSettings,
  CryptoHolding,
  StockHolding,
  CashAccount,
  SavingsGoal,
  RealEstateProperty,
  ValuableItem,
  TradingPosition,
  ExpenseCategory,
  IncomeSource,
  WatchlistItem,
  AssetNote,
  CardType,
  TradingAccountBalances,
  createDefaultAppState,
  mutatePortfolio,
  mutateDashboard,
  mutateSettings,
} from './app-state';
import {
  loadLocalState,
  saveLocalState,
  isIndexedDBAvailable,
} from './local-persistence';
import { syncService, SyncState, useSyncStatus } from './sync-service';
import { syncEngine } from './sync-engine';

// ============================================================================
// Action Types
// ============================================================================

type AppStateAction =
  // Full state operations
  | { type: 'INIT_STATE'; payload: AppState }
  | { type: 'RESET_STATE'; payload?: { userId: string | null } }
  
  // Portfolio operations
  | { type: 'SET_CRYPTO_HOLDINGS'; payload: CryptoHolding[] }
  | { type: 'ADD_CRYPTO_HOLDING'; payload: CryptoHolding }
  | { type: 'UPDATE_CRYPTO_HOLDING'; payload: { id: string; updates: Partial<CryptoHolding> } }
  | { type: 'DELETE_CRYPTO_HOLDING'; payload: string }
  
  | { type: 'SET_STOCK_HOLDINGS'; payload: StockHolding[] }
  | { type: 'ADD_STOCK_HOLDING'; payload: StockHolding }
  | { type: 'UPDATE_STOCK_HOLDING'; payload: { id: string; updates: Partial<StockHolding> } }
  | { type: 'DELETE_STOCK_HOLDING'; payload: string }
  
  | { type: 'SET_CASH_ACCOUNTS'; payload: CashAccount[] }
  | { type: 'ADD_CASH_ACCOUNT'; payload: CashAccount }
  | { type: 'UPDATE_CASH_ACCOUNT'; payload: { id: string; updates: Partial<CashAccount> } }
  | { type: 'DELETE_CASH_ACCOUNT'; payload: string }
  
  | { type: 'SET_SAVINGS_GOALS'; payload: SavingsGoal[] }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_SAVINGS_GOAL'; payload: { id: string; updates: Partial<SavingsGoal> } }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
  
  | { type: 'SET_REAL_ESTATE'; payload: RealEstateProperty[] }
  | { type: 'ADD_REAL_ESTATE'; payload: RealEstateProperty }
  | { type: 'UPDATE_REAL_ESTATE'; payload: { id: string; updates: Partial<RealEstateProperty> } }
  | { type: 'DELETE_REAL_ESTATE'; payload: string }
  
  | { type: 'SET_VALUABLE_ITEMS'; payload: ValuableItem[] }
  | { type: 'ADD_VALUABLE_ITEM'; payload: ValuableItem }
  | { type: 'UPDATE_VALUABLE_ITEM'; payload: { id: string; updates: Partial<ValuableItem> } }
  | { type: 'DELETE_VALUABLE_ITEM'; payload: string }
  
  | { type: 'SET_TRADING_POSITIONS'; payload: TradingPosition[] }
  | { type: 'ADD_TRADING_POSITION'; payload: TradingPosition }
  | { type: 'UPDATE_TRADING_POSITION'; payload: { id: string; updates: Partial<TradingPosition> } }
  | { type: 'DELETE_TRADING_POSITION'; payload: string }
  
  | { type: 'SET_TRADING_BALANCES'; payload: TradingAccountBalances }
  | { type: 'UPDATE_TRADING_BALANCE'; payload: { key: keyof TradingAccountBalances; value: number } }
  
  | { type: 'SET_EXPENSES'; payload: ExpenseCategory[] }
  | { type: 'ADD_EXPENSE'; payload: ExpenseCategory }
  | { type: 'UPDATE_EXPENSE'; payload: { id: string; updates: Partial<ExpenseCategory> } }
  | { type: 'DELETE_EXPENSE'; payload: string }
  
  | { type: 'SET_INCOME'; payload: IncomeSource[] }
  | { type: 'ADD_INCOME'; payload: IncomeSource }
  | { type: 'UPDATE_INCOME'; payload: { id: string; updates: Partial<IncomeSource> } }
  | { type: 'DELETE_INCOME'; payload: string }
  
  // Dashboard operations
  | { type: 'SET_CARD_ORDER'; payload: CardType[] }
  | { type: 'MOVE_CARD'; payload: { from: CardType; to: CardType } }
  | { type: 'SET_HIDDEN_CARDS'; payload: CardType[] }
  | { type: 'HIDE_CARD'; payload: CardType }
  | { type: 'SHOW_CARD'; payload: CardType }
  | { type: 'SET_ZOOM_LEVEL'; payload: number }
  | { type: 'RESET_DASHBOARD' }
  
  // Settings operations
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_LOCALE'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  
  // Watchlist operations
  | { type: 'SET_WATCHLIST'; payload: WatchlistItem[] }
  | { type: 'ADD_WATCHLIST_ITEM'; payload: WatchlistItem }
  | { type: 'UPDATE_WATCHLIST_ITEM'; payload: { id: string; updates: Partial<WatchlistItem> } }
  | { type: 'DELETE_WATCHLIST_ITEM'; payload: string }
  
  // Notes operations
  | { type: 'SET_NOTES'; payload: AssetNote[] }
  | { type: 'ADD_NOTE'; payload: AssetNote }
  | { type: 'UPDATE_NOTE'; payload: { id: string; updates: Partial<AssetNote> } }
  | { type: 'DELETE_NOTE'; payload: string };

// ============================================================================
// Reducer
// ============================================================================

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  const now = new Date().toISOString();
  const incrementRev = (s: AppState): AppState => ({
    ...s,
    rev: s.rev + 1,
    updatedAt: now,
  });

  switch (action.type) {
    // Full state operations
    case 'INIT_STATE':
      return action.payload;
      
    case 'RESET_STATE':
      return createDefaultAppState(action.payload?.userId ?? null);

    // Crypto holdings
    case 'SET_CRYPTO_HOLDINGS':
      return mutatePortfolio(state, 'crypto', action.payload);
      
    case 'ADD_CRYPTO_HOLDING':
      return mutatePortfolio(state, 'crypto', [...state.portfolio.crypto, action.payload]);
      
    case 'UPDATE_CRYPTO_HOLDING':
      return mutatePortfolio(
        state,
        'crypto',
        state.portfolio.crypto.map(h =>
          h.id === action.payload.id ? { ...h, ...action.payload.updates } : h
        )
      );
      
    case 'DELETE_CRYPTO_HOLDING':
      return mutatePortfolio(
        state,
        'crypto',
        state.portfolio.crypto.filter(h => h.id !== action.payload)
      );

    // Stock holdings
    case 'SET_STOCK_HOLDINGS':
      return mutatePortfolio(state, 'stocks', action.payload);
      
    case 'ADD_STOCK_HOLDING':
      return mutatePortfolio(state, 'stocks', [...state.portfolio.stocks, action.payload]);
      
    case 'UPDATE_STOCK_HOLDING':
      return mutatePortfolio(
        state,
        'stocks',
        state.portfolio.stocks.map(h =>
          h.id === action.payload.id ? { ...h, ...action.payload.updates } : h
        )
      );
      
    case 'DELETE_STOCK_HOLDING':
      return mutatePortfolio(
        state,
        'stocks',
        state.portfolio.stocks.filter(h => h.id !== action.payload)
      );

    // Cash accounts
    case 'SET_CASH_ACCOUNTS':
      return mutatePortfolio(state, 'cash', action.payload);
      
    case 'ADD_CASH_ACCOUNT':
      return mutatePortfolio(state, 'cash', [...state.portfolio.cash, action.payload]);
      
    case 'UPDATE_CASH_ACCOUNT':
      return mutatePortfolio(
        state,
        'cash',
        state.portfolio.cash.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        )
      );
      
    case 'DELETE_CASH_ACCOUNT':
      return mutatePortfolio(
        state,
        'cash',
        state.portfolio.cash.filter(a => a.id !== action.payload)
      );

    // Savings goals
    case 'SET_SAVINGS_GOALS':
      return mutatePortfolio(state, 'savings', action.payload);
      
    case 'ADD_SAVINGS_GOAL':
      return mutatePortfolio(state, 'savings', [...state.portfolio.savings, action.payload]);
      
    case 'UPDATE_SAVINGS_GOAL':
      return mutatePortfolio(
        state,
        'savings',
        state.portfolio.savings.map(g =>
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        )
      );
      
    case 'DELETE_SAVINGS_GOAL':
      return mutatePortfolio(
        state,
        'savings',
        state.portfolio.savings.filter(g => g.id !== action.payload)
      );

    // Real estate
    case 'SET_REAL_ESTATE':
      return mutatePortfolio(state, 'realEstate', action.payload);
      
    case 'ADD_REAL_ESTATE':
      return mutatePortfolio(state, 'realEstate', [...state.portfolio.realEstate, action.payload]);
      
    case 'UPDATE_REAL_ESTATE':
      return mutatePortfolio(
        state,
        'realEstate',
        state.portfolio.realEstate.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        )
      );
      
    case 'DELETE_REAL_ESTATE':
      return mutatePortfolio(
        state,
        'realEstate',
        state.portfolio.realEstate.filter(p => p.id !== action.payload)
      );

    // Valuable items
    case 'SET_VALUABLE_ITEMS':
      return mutatePortfolio(state, 'valuableItems', action.payload);
      
    case 'ADD_VALUABLE_ITEM':
      return mutatePortfolio(state, 'valuableItems', [...state.portfolio.valuableItems, action.payload]);
      
    case 'UPDATE_VALUABLE_ITEM':
      return mutatePortfolio(
        state,
        'valuableItems',
        state.portfolio.valuableItems.map(i =>
          i.id === action.payload.id ? { ...i, ...action.payload.updates } : i
        )
      );
      
    case 'DELETE_VALUABLE_ITEM':
      return mutatePortfolio(
        state,
        'valuableItems',
        state.portfolio.valuableItems.filter(i => i.id !== action.payload)
      );

    // Trading positions
    case 'SET_TRADING_POSITIONS':
      return mutatePortfolio(state, 'tradingPositions', action.payload);
      
    case 'ADD_TRADING_POSITION':
      return mutatePortfolio(state, 'tradingPositions', [...state.portfolio.tradingPositions, action.payload]);
      
    case 'UPDATE_TRADING_POSITION':
      return mutatePortfolio(
        state,
        'tradingPositions',
        state.portfolio.tradingPositions.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        )
      );
      
    case 'DELETE_TRADING_POSITION':
      return mutatePortfolio(
        state,
        'tradingPositions',
        state.portfolio.tradingPositions.filter(p => p.id !== action.payload)
      );

    // Trading balances
    case 'SET_TRADING_BALANCES':
      return mutatePortfolio(state, 'tradingBalances', action.payload);
      
    case 'UPDATE_TRADING_BALANCE':
      return mutatePortfolio(state, 'tradingBalances', {
        ...state.portfolio.tradingBalances,
        [action.payload.key]: action.payload.value,
      });

    // Expenses
    case 'SET_EXPENSES':
      return mutatePortfolio(state, 'expenses', action.payload);
      
    case 'ADD_EXPENSE':
      return mutatePortfolio(state, 'expenses', [...state.portfolio.expenses, action.payload]);
      
    case 'UPDATE_EXPENSE':
      return mutatePortfolio(
        state,
        'expenses',
        state.portfolio.expenses.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.updates } : e
        )
      );
      
    case 'DELETE_EXPENSE':
      return mutatePortfolio(
        state,
        'expenses',
        state.portfolio.expenses.filter(e => e.id !== action.payload)
      );

    // Income
    case 'SET_INCOME':
      return mutatePortfolio(state, 'income', action.payload);
      
    case 'ADD_INCOME':
      return mutatePortfolio(state, 'income', [...state.portfolio.income, action.payload]);
      
    case 'UPDATE_INCOME':
      return mutatePortfolio(
        state,
        'income',
        state.portfolio.income.map(i =>
          i.id === action.payload.id ? { ...i, ...action.payload.updates } : i
        )
      );
      
    case 'DELETE_INCOME':
      return mutatePortfolio(
        state,
        'income',
        state.portfolio.income.filter(i => i.id !== action.payload)
      );

    // Dashboard - card order
    case 'SET_CARD_ORDER':
      return mutateDashboard(state, 'cardOrder', action.payload);
      
    case 'MOVE_CARD': {
      const newOrder = [...state.dashboard.cardOrder];
      const fromIndex = newOrder.indexOf(action.payload.from);
      const toIndex = newOrder.indexOf(action.payload.to);
      if (fromIndex !== -1 && toIndex !== -1) {
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, action.payload.from);
      }
      return mutateDashboard(state, 'cardOrder', newOrder);
    }

    // Dashboard - hidden cards
    case 'SET_HIDDEN_CARDS':
      return mutateDashboard(state, 'hiddenCards', action.payload);
      
    case 'HIDE_CARD':
      return mutateDashboard(
        state,
        'hiddenCards',
        state.dashboard.hiddenCards.includes(action.payload)
          ? state.dashboard.hiddenCards
          : [...state.dashboard.hiddenCards, action.payload]
      );
      
    case 'SHOW_CARD':
      return mutateDashboard(
        state,
        'hiddenCards',
        state.dashboard.hiddenCards.filter(c => c !== action.payload)
      );

    // Dashboard - zoom
    case 'SET_ZOOM_LEVEL':
      return mutateDashboard(state, 'zoomLevel', action.payload);

    // Dashboard - reset
    case 'RESET_DASHBOARD':
      return incrementRev({
        ...state,
        dashboard: createDefaultAppState().dashboard,
      });

    // Settings
    case 'SET_CURRENCY':
      return mutateSettings(state, 'currency', action.payload);
      
    case 'SET_THEME':
      return mutateSettings(state, 'theme', action.payload);
      
    case 'SET_LOCALE':
      return mutateSettings(state, 'locale', action.payload);
      
    case 'UPDATE_SETTINGS':
      return incrementRev({
        ...state,
        settings: { ...state.settings, ...action.payload },
      });

    // Watchlist
    case 'SET_WATCHLIST':
      return incrementRev({ ...state, watchlist: action.payload });
      
    case 'ADD_WATCHLIST_ITEM':
      return incrementRev({ ...state, watchlist: [...state.watchlist, action.payload] });
      
    case 'UPDATE_WATCHLIST_ITEM':
      return incrementRev({
        ...state,
        watchlist: state.watchlist.map(w =>
          w.id === action.payload.id ? { ...w, ...action.payload.updates } : w
        ),
      });
      
    case 'DELETE_WATCHLIST_ITEM':
      return incrementRev({
        ...state,
        watchlist: state.watchlist.filter(w => w.id !== action.payload),
      });

    // Notes
    case 'SET_NOTES':
      return incrementRev({ ...state, notes: action.payload });
      
    case 'ADD_NOTE':
      return incrementRev({ ...state, notes: [...state.notes, action.payload] });
      
    case 'UPDATE_NOTE':
      return incrementRev({
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
        ),
      });
      
    case 'DELETE_NOTE':
      return incrementRev({
        ...state,
        notes: state.notes.filter(n => n.id !== action.payload),
      });

    default:
      return state;
  }
}

// ============================================================================
// Context Types
// ============================================================================

interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppStateAction>;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Convenience methods for common operations
  actions: {
    // Portfolio
    setCryptoHoldings: (holdings: CryptoHolding[]) => void;
    addCryptoHolding: (holding: CryptoHolding) => void;
    updateCryptoHolding: (id: string, updates: Partial<CryptoHolding>) => void;
    deleteCryptoHolding: (id: string) => void;
    
    setStockHoldings: (holdings: StockHolding[]) => void;
    addStockHolding: (holding: StockHolding) => void;
    updateStockHolding: (id: string, updates: Partial<StockHolding>) => void;
    deleteStockHolding: (id: string) => void;
    
    setCashAccounts: (accounts: CashAccount[]) => void;
    addCashAccount: (account: CashAccount) => void;
    updateCashAccount: (id: string, updates: Partial<CashAccount>) => void;
    deleteCashAccount: (id: string) => void;
    
    setSavingsGoals: (goals: SavingsGoal[]) => void;
    addSavingsGoal: (goal: SavingsGoal) => void;
    updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
    deleteSavingsGoal: (id: string) => void;
    
    setRealEstate: (properties: RealEstateProperty[]) => void;
    addRealEstate: (property: RealEstateProperty) => void;
    updateRealEstate: (id: string, updates: Partial<RealEstateProperty>) => void;
    deleteRealEstate: (id: string) => void;
    
    setValuableItems: (items: ValuableItem[]) => void;
    addValuableItem: (item: ValuableItem) => void;
    updateValuableItem: (id: string, updates: Partial<ValuableItem>) => void;
    deleteValuableItem: (id: string) => void;
    
    setTradingPositions: (positions: TradingPosition[]) => void;
    addTradingPosition: (position: TradingPosition) => void;
    updateTradingPosition: (id: string, updates: Partial<TradingPosition>) => void;
    deleteTradingPosition: (id: string) => void;
    
    setTradingBalances: (balances: TradingAccountBalances) => void;
    updateTradingBalance: (key: keyof TradingAccountBalances, value: number) => void;
    
    setExpenses: (expenses: ExpenseCategory[]) => void;
    addExpense: (expense: ExpenseCategory) => void;
    updateExpense: (id: string, updates: Partial<ExpenseCategory>) => void;
    deleteExpense: (id: string) => void;
    
    setIncome: (income: IncomeSource[]) => void;
    addIncome: (source: IncomeSource) => void;
    updateIncome: (id: string, updates: Partial<IncomeSource>) => void;
    deleteIncome: (id: string) => void;
    
    // Dashboard
    setCardOrder: (order: CardType[]) => void;
    moveCard: (from: CardType, to: CardType) => void;
    setHiddenCards: (cards: CardType[]) => void;
    hideCard: (card: CardType) => void;
    showCard: (card: CardType) => void;
    setZoomLevel: (level: number) => void;
    resetDashboard: () => void;
    
    // Settings
    setCurrency: (currency: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setLocale: (locale: string) => void;
    updateSettings: (settings: Partial<UserSettings>) => void;
    
    // Watchlist
    setWatchlist: (items: WatchlistItem[]) => void;
    addWatchlistItem: (item: WatchlistItem) => void;
    updateWatchlistItem: (id: string, updates: Partial<WatchlistItem>) => void;
    deleteWatchlistItem: (id: string) => void;
    
    // Notes
    setNotes: (notes: AssetNote[]) => void;
    addNote: (note: AssetNote) => void;
    updateNote: (id: string, updates: Partial<AssetNote>) => void;
    deleteNote: (id: string) => void;
    
    // Reset
    resetState: (userId?: string | null) => void;
  };
}

// ============================================================================
// Context
// ============================================================================

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AppStateProviderProps {
  children: ReactNode;
  userId?: string | null;
}

export function AppStateProvider({ children, userId = null }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appStateReducer, createDefaultAppState(userId));
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  const previousRevRef = useRef<number>(state.rev);
  const initializingRef = useRef(false);
  const skipNextSyncRef = useRef(false); // Prevent sync loops

  // Set up sync engine state updater (for when remote state wins)
  useEffect(() => {
    syncEngine.setStateUpdater((newState: AppState) => {
      // Skip the next sync trigger since we're applying remote state
      skipNextSyncRef.current = true;
      previousRevRef.current = newState.rev;
      dispatch({ type: 'INIT_STATE', payload: newState });
    });
  }, []);

  // Load state from IndexedDB on mount, then try initial sync
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    async function initializeState() {
      setIsLoading(true);
      try {
        // First load from IndexedDB
        const loadedState = await loadLocalState(userId);
        dispatch({ type: 'INIT_STATE', payload: loadedState });
        previousRevRef.current = loadedState.rev;
        
        // Then try initial sync with remote (if sync key is available)
        // This runs in background and will update state if remote is newer
        syncEngine.loadSyncKeyFromStorage().then(hasKey => {
          if (hasKey) {
            syncEngine.initialSync(loadedState).catch(err => {
              console.error('Initial sync failed:', err);
            });
          }
        });
      } catch (error) {
        console.error('Failed to load state from IndexedDB:', error);
        // Keep default state
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    }

    initializeState();
  }, [userId]);

  // Save state to IndexedDB whenever it changes (immediate, non-blocking)
  // Then schedule encrypted push to remote via sync engine
  useEffect(() => {
    if (!isInitialized) return;
    if (state.rev === previousRevRef.current) return;

    // Check if we should skip sync (e.g., we just applied remote state)
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      previousRevRef.current = state.rev;
      return;
    }

    previousRevRef.current = state.rev;
    
    // Write to IndexedDB immediately (this is debounced internally but non-blocking)
    saveLocalState(state);
    
    // Schedule encrypted push via sync engine (debounced, leader-only)
    syncEngine.schedulePush(state);
    
    // Also notify legacy sync service for status updates
    syncService.notifyChange(state.rev);

    // Dispatch custom events for backward compatibility with existing components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appStateChanged', { detail: { rev: state.rev } }));
    }
  }, [state, isInitialized]);

  // Create convenience action methods
  const actions = React.useMemo(() => ({
    // Portfolio - Crypto
    setCryptoHoldings: (holdings: CryptoHolding[]) => dispatch({ type: 'SET_CRYPTO_HOLDINGS', payload: holdings }),
    addCryptoHolding: (holding: CryptoHolding) => dispatch({ type: 'ADD_CRYPTO_HOLDING', payload: holding }),
    updateCryptoHolding: (id: string, updates: Partial<CryptoHolding>) => dispatch({ type: 'UPDATE_CRYPTO_HOLDING', payload: { id, updates } }),
    deleteCryptoHolding: (id: string) => dispatch({ type: 'DELETE_CRYPTO_HOLDING', payload: id }),
    
    // Portfolio - Stocks
    setStockHoldings: (holdings: StockHolding[]) => dispatch({ type: 'SET_STOCK_HOLDINGS', payload: holdings }),
    addStockHolding: (holding: StockHolding) => dispatch({ type: 'ADD_STOCK_HOLDING', payload: holding }),
    updateStockHolding: (id: string, updates: Partial<StockHolding>) => dispatch({ type: 'UPDATE_STOCK_HOLDING', payload: { id, updates } }),
    deleteStockHolding: (id: string) => dispatch({ type: 'DELETE_STOCK_HOLDING', payload: id }),
    
    // Portfolio - Cash
    setCashAccounts: (accounts: CashAccount[]) => dispatch({ type: 'SET_CASH_ACCOUNTS', payload: accounts }),
    addCashAccount: (account: CashAccount) => dispatch({ type: 'ADD_CASH_ACCOUNT', payload: account }),
    updateCashAccount: (id: string, updates: Partial<CashAccount>) => dispatch({ type: 'UPDATE_CASH_ACCOUNT', payload: { id, updates } }),
    deleteCashAccount: (id: string) => dispatch({ type: 'DELETE_CASH_ACCOUNT', payload: id }),
    
    // Portfolio - Savings
    setSavingsGoals: (goals: SavingsGoal[]) => dispatch({ type: 'SET_SAVINGS_GOALS', payload: goals }),
    addSavingsGoal: (goal: SavingsGoal) => dispatch({ type: 'ADD_SAVINGS_GOAL', payload: goal }),
    updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: { id, updates } }),
    deleteSavingsGoal: (id: string) => dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id }),
    
    // Portfolio - Real Estate
    setRealEstate: (properties: RealEstateProperty[]) => dispatch({ type: 'SET_REAL_ESTATE', payload: properties }),
    addRealEstate: (property: RealEstateProperty) => dispatch({ type: 'ADD_REAL_ESTATE', payload: property }),
    updateRealEstate: (id: string, updates: Partial<RealEstateProperty>) => dispatch({ type: 'UPDATE_REAL_ESTATE', payload: { id, updates } }),
    deleteRealEstate: (id: string) => dispatch({ type: 'DELETE_REAL_ESTATE', payload: id }),
    
    // Portfolio - Valuable Items
    setValuableItems: (items: ValuableItem[]) => dispatch({ type: 'SET_VALUABLE_ITEMS', payload: items }),
    addValuableItem: (item: ValuableItem) => dispatch({ type: 'ADD_VALUABLE_ITEM', payload: item }),
    updateValuableItem: (id: string, updates: Partial<ValuableItem>) => dispatch({ type: 'UPDATE_VALUABLE_ITEM', payload: { id, updates } }),
    deleteValuableItem: (id: string) => dispatch({ type: 'DELETE_VALUABLE_ITEM', payload: id }),
    
    // Portfolio - Trading Positions
    setTradingPositions: (positions: TradingPosition[]) => dispatch({ type: 'SET_TRADING_POSITIONS', payload: positions }),
    addTradingPosition: (position: TradingPosition) => dispatch({ type: 'ADD_TRADING_POSITION', payload: position }),
    updateTradingPosition: (id: string, updates: Partial<TradingPosition>) => dispatch({ type: 'UPDATE_TRADING_POSITION', payload: { id, updates } }),
    deleteTradingPosition: (id: string) => dispatch({ type: 'DELETE_TRADING_POSITION', payload: id }),
    
    // Portfolio - Trading Balances
    setTradingBalances: (balances: TradingAccountBalances) => dispatch({ type: 'SET_TRADING_BALANCES', payload: balances }),
    updateTradingBalance: (key: keyof TradingAccountBalances, value: number) => dispatch({ type: 'UPDATE_TRADING_BALANCE', payload: { key, value } }),
    
    // Portfolio - Expenses
    setExpenses: (expenses: ExpenseCategory[]) => dispatch({ type: 'SET_EXPENSES', payload: expenses }),
    addExpense: (expense: ExpenseCategory) => dispatch({ type: 'ADD_EXPENSE', payload: expense }),
    updateExpense: (id: string, updates: Partial<ExpenseCategory>) => dispatch({ type: 'UPDATE_EXPENSE', payload: { id, updates } }),
    deleteExpense: (id: string) => dispatch({ type: 'DELETE_EXPENSE', payload: id }),
    
    // Portfolio - Income
    setIncome: (income: IncomeSource[]) => dispatch({ type: 'SET_INCOME', payload: income }),
    addIncome: (source: IncomeSource) => dispatch({ type: 'ADD_INCOME', payload: source }),
    updateIncome: (id: string, updates: Partial<IncomeSource>) => dispatch({ type: 'UPDATE_INCOME', payload: { id, updates } }),
    deleteIncome: (id: string) => dispatch({ type: 'DELETE_INCOME', payload: id }),
    
    // Dashboard
    setCardOrder: (order: CardType[]) => dispatch({ type: 'SET_CARD_ORDER', payload: order }),
    moveCard: (from: CardType, to: CardType) => dispatch({ type: 'MOVE_CARD', payload: { from, to } }),
    setHiddenCards: (cards: CardType[]) => dispatch({ type: 'SET_HIDDEN_CARDS', payload: cards }),
    hideCard: (card: CardType) => dispatch({ type: 'HIDE_CARD', payload: card }),
    showCard: (card: CardType) => dispatch({ type: 'SHOW_CARD', payload: card }),
    setZoomLevel: (level: number) => dispatch({ type: 'SET_ZOOM_LEVEL', payload: level }),
    resetDashboard: () => dispatch({ type: 'RESET_DASHBOARD' }),
    
    // Settings
    setCurrency: (currency: string) => dispatch({ type: 'SET_CURRENCY', payload: currency }),
    setTheme: (theme: 'light' | 'dark' | 'system') => dispatch({ type: 'SET_THEME', payload: theme }),
    setLocale: (locale: string) => dispatch({ type: 'SET_LOCALE', payload: locale }),
    updateSettings: (settings: Partial<UserSettings>) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
    
    // Watchlist
    setWatchlist: (items: WatchlistItem[]) => dispatch({ type: 'SET_WATCHLIST', payload: items }),
    addWatchlistItem: (item: WatchlistItem) => dispatch({ type: 'ADD_WATCHLIST_ITEM', payload: item }),
    updateWatchlistItem: (id: string, updates: Partial<WatchlistItem>) => dispatch({ type: 'UPDATE_WATCHLIST_ITEM', payload: { id, updates } }),
    deleteWatchlistItem: (id: string) => dispatch({ type: 'DELETE_WATCHLIST_ITEM', payload: id }),
    
    // Notes
    setNotes: (notes: AssetNote[]) => dispatch({ type: 'SET_NOTES', payload: notes }),
    addNote: (note: AssetNote) => dispatch({ type: 'ADD_NOTE', payload: note }),
    updateNote: (id: string, updates: Partial<AssetNote>) => dispatch({ type: 'UPDATE_NOTE', payload: { id, updates } }),
    deleteNote: (id: string) => dispatch({ type: 'DELETE_NOTE', payload: id }),
    
    // Reset
    resetState: (userId?: string | null) => dispatch({ type: 'RESET_STATE', payload: { userId: userId ?? null } }),
  }), [dispatch]);

  const value = React.useMemo(() => ({
    state,
    dispatch,
    isLoading,
    isInitialized,
    actions,
  }), [state, dispatch, isLoading, isInitialized, actions]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Main hook to access the full AppState context
 */
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

/**
 * Hook to access only the portfolio data
 */
export function usePortfolio() {
  const { state, actions, isLoading } = useAppState();
  return {
    portfolio: state.portfolio,
    isLoading,
    ...actions,
  };
}

/**
 * Hook to access only dashboard layout
 */
export function useDashboard() {
  const { state, actions, isLoading } = useAppState();
  return {
    dashboard: state.dashboard,
    isLoading,
    setCardOrder: actions.setCardOrder,
    moveCard: actions.moveCard,
    setHiddenCards: actions.setHiddenCards,
    hideCard: actions.hideCard,
    showCard: actions.showCard,
    setZoomLevel: actions.setZoomLevel,
    resetDashboard: actions.resetDashboard,
  };
}

/**
 * Hook to access only settings
 */
export function useSettings() {
  const { state, actions, isLoading } = useAppState();
  return {
    settings: state.settings,
    isLoading,
    setCurrency: actions.setCurrency,
    setTheme: actions.setTheme,
    setLocale: actions.setLocale,
    updateSettings: actions.updateSettings,
  };
}

/**
 * Hook to access watchlist
 */
export function useWatchlist() {
  const { state, actions, isLoading } = useAppState();
  return {
    watchlist: state.watchlist,
    isLoading,
    setWatchlist: actions.setWatchlist,
    addWatchlistItem: actions.addWatchlistItem,
    updateWatchlistItem: actions.updateWatchlistItem,
    deleteWatchlistItem: actions.deleteWatchlistItem,
  };
}

/**
 * Hook to access notes
 */
export function useNotes() {
  const { state, actions, isLoading } = useAppState();
  return {
    notes: state.notes,
    isLoading,
    setNotes: actions.setNotes,
    addNote: actions.addNote,
    updateNote: actions.updateNote,
    deleteNote: actions.deleteNote,
  };
}
