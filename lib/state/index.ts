/**
 * State Management Module
 * 
 * Provides a local-first, canonical state management system with:
 * - Single source of truth (AppState)
 * - IndexedDB persistence
 * - Automatic versioning and rev tracking
 * - Ready for encrypted sync to Supabase
 */

// Core types and state structure
export {
  // Types
  type AppState,
  type Portfolio,
  type DashboardLayout,
  type UserSettings,
  type CryptoHolding,
  type StockHolding,
  type CashAccount,
  type SavingsGoal,
  type RealEstateProperty,
  type ValuableItem,
  type TradingPosition,
  type ExpenseCategory,
  type IncomeSource,
  type WatchlistItem,
  type AssetNote,
  type CardType,
  type TradingAccountBalances,
  
  // Constants
  CURRENT_SCHEMA_VERSION,
  DEFAULT_CARD_ORDER,
  
  // Factories
  createDefaultAppState,
  
  // Mutation helpers
  mutateState,
  mutatePortfolio,
  mutateDashboard,
  mutateSettings,
} from './app-state';

// Persistence layer
export {
  loadLocalState,
  saveLocalState,
  flushPendingSaves,
  clearLocalState,
  getLocalStateMetadata,
  exportState,
  importState,
  isIndexedDBAvailable,
} from './local-persistence';

// React context and hooks
export {
  AppStateProvider,
  useAppState,
  usePortfolio,
  useDashboard,
  useSettings,
  useWatchlist,
  useNotes,
} from './app-state-context';

// Bridge for legacy context integration
export {
  useAppStateBridge,
  AppStateBridge,
} from './app-state-bridge';

// Sync service
export {
  type SyncStatus,
  type SyncState,
  type SyncEvent,
  syncService,
  useSyncStatus,
} from './sync-service';

// Encryption
export {
  type EncryptedPayload,
  generateSyncKey,
  validateSyncKey,
  normalizeSyncKey,
  encryptState,
  decryptState,
  hasSyncKeyStored,
  storeSyncKeyLocally,
  getStoredSyncKey,
  forgetSyncKey,
} from './encryption';

// Sync Engine (E2E encrypted sync with multi-tab safety)
export {
  syncEngine,
  useSyncEngine,
  type SyncEngineConfig,
  type RemoteSnapshot,
  type PullResult,
  type ConflictHandler,
  type StateUpdater,
} from './sync-engine';
