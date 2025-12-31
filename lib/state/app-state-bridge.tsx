/**
 * AppState Sync Bridge
 * 
 * This component bridges the new canonical AppState with existing contexts.
 * It syncs data between the AppState (IndexedDB-backed) and legacy contexts
 * (Supabase-backed) until a full migration is complete.
 * 
 * Flow:
 * 1. On mount, loads data from AppState (IndexedDB)
 * 2. Listens for changes from legacy contexts and syncs to AppState
 * 3. Emits changes from AppState to legacy contexts
 */

"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useAppState } from './app-state-context';
import type { 
  CryptoHolding, 
  StockHolding, 
  CardType,
  TradingAccountBalances
} from './app-state';

// ============================================================================
// Types for Legacy Data
// ============================================================================

interface LegacyCryptoHolding {
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

interface LegacyStockHolding {
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

// ============================================================================
// Bridge Hook
// ============================================================================

interface BridgeConfig {
  /** Enable syncing crypto holdings */
  syncCrypto?: boolean;
  /** Enable syncing stock holdings */
  syncStocks?: boolean;
  /** Enable syncing dashboard layout */
  syncDashboard?: boolean;
  /** Enable syncing trading balances */
  syncTradingBalances?: boolean;
}

const DEFAULT_CONFIG: BridgeConfig = {
  syncCrypto: true,
  syncStocks: true,
  syncDashboard: true,
  syncTradingBalances: true,
};

/**
 * Hook to sync AppState with legacy data sources
 */
export function useAppStateBridge(config: BridgeConfig = DEFAULT_CONFIG) {
  const { state, actions, isInitialized } = useAppState();
  const lastSyncedRevRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);
  
  // ============================================================================
  // Sync FROM Legacy Sources
  // ============================================================================
  
  /**
   * Sync crypto holdings from legacy portfolio context or events
   */
  const syncCryptoFromLegacy = useCallback((legacyHoldings: LegacyCryptoHolding[]) => {
    if (!config.syncCrypto) return;
    
    // Convert to AppState format (they're already compatible)
    const holdings: CryptoHolding[] = legacyHoldings.map(h => ({
      id: h.id,
      name: h.name,
      symbol: h.symbol,
      amount: h.amount,
      value: h.value,
      color: h.color,
      change: h.change,
      entryPoint: h.entryPoint,
      walletType: h.walletType,
      walletName: h.walletName,
      walletAddress: h.walletAddress,
      iconUrl: h.iconUrl,
    }));
    
    // Only update if different
    const currentIds = state.portfolio.crypto.map(h => h.id).sort().join(',');
    const newIds = holdings.map(h => h.id).sort().join(',');
    
    if (currentIds !== newIds || holdings.length !== state.portfolio.crypto.length) {
      actions.setCryptoHoldings(holdings);
    }
  }, [config.syncCrypto, state.portfolio.crypto, actions]);

  /**
   * Sync stock holdings from legacy portfolio context or events
   */
  const syncStocksFromLegacy = useCallback((legacyHoldings: LegacyStockHolding[]) => {
    if (!config.syncStocks) return;
    
    const holdings: StockHolding[] = legacyHoldings.map(h => ({
      id: h.id,
      name: h.name,
      symbol: h.symbol,
      shares: h.shares,
      value: h.value,
      color: h.color,
      change: h.change,
      sector: h.sector,
      entryPoint: h.entryPoint,
    }));
    
    const currentIds = state.portfolio.stocks.map(h => h.id).sort().join(',');
    const newIds = holdings.map(h => h.id).sort().join(',');
    
    if (currentIds !== newIds || holdings.length !== state.portfolio.stocks.length) {
      actions.setStockHoldings(holdings);
    }
  }, [config.syncStocks, state.portfolio.stocks, actions]);

  /**
   * Sync card order from legacy context
   */
  const syncCardOrderFromLegacy = useCallback((cardOrder: CardType[]) => {
    if (!config.syncDashboard) return;
    
    const currentOrder = state.dashboard.cardOrder.join(',');
    const newOrder = cardOrder.join(',');
    
    if (currentOrder !== newOrder) {
      actions.setCardOrder(cardOrder);
    }
  }, [config.syncDashboard, state.dashboard.cardOrder, actions]);

  /**
   * Sync hidden cards from legacy context
   */
  const syncHiddenCardsFromLegacy = useCallback((hiddenCards: CardType[]) => {
    if (!config.syncDashboard) return;
    
    const currentHidden = state.dashboard.hiddenCards.sort().join(',');
    const newHidden = hiddenCards.sort().join(',');
    
    if (currentHidden !== newHidden) {
      actions.setHiddenCards(hiddenCards);
    }
  }, [config.syncDashboard, state.dashboard.hiddenCards, actions]);

  /**
   * Sync trading balances from localStorage
   */
  const syncTradingBalancesFromLocalStorage = useCallback(() => {
    if (!config.syncTradingBalances) return;
    if (typeof window === 'undefined') return;
    
    const forex = parseFloat(localStorage.getItem('forexAccountBalance_v2') || '0');
    const cryptoFutures = parseFloat(localStorage.getItem('cryptoAccountBalance_v2') || '0');
    const options = parseFloat(localStorage.getItem('optionsAccountBalance_v2') || '0');
    
    const current = state.portfolio.tradingBalances;
    
    if (current.forex !== forex || current.cryptoFutures !== cryptoFutures || current.options !== options) {
      actions.setTradingBalances({ forex, cryptoFutures, options });
    }
  }, [config.syncTradingBalances, state.portfolio.tradingBalances, actions]);

  // ============================================================================
  // Event Listeners
  // ============================================================================
  
  useEffect(() => {
    if (!isInitialized) return;

    // Listen for legacy data change events
    const handleCryptoChange = () => {
      // Will be picked up by portfolio context re-render
    };
    
    const handleStockChange = () => {
      // Will be picked up by portfolio context re-render
    };
    
    const handleTradingChange = () => {
      syncTradingBalancesFromLocalStorage();
    };

    const handleFinancialDataChange = () => {
      syncTradingBalancesFromLocalStorage();
    };

    window.addEventListener('cryptoDataChanged', handleCryptoChange);
    window.addEventListener('stockDataChanged', handleStockChange);
    window.addEventListener('tradingDataChanged', handleTradingChange);
    window.addEventListener('financialDataChanged', handleFinancialDataChange);

    // Initial sync of trading balances
    syncTradingBalancesFromLocalStorage();

    return () => {
      window.removeEventListener('cryptoDataChanged', handleCryptoChange);
      window.removeEventListener('stockDataChanged', handleStockChange);
      window.removeEventListener('tradingDataChanged', handleTradingChange);
      window.removeEventListener('financialDataChanged', handleFinancialDataChange);
    };
  }, [isInitialized, syncTradingBalancesFromLocalStorage]);

  // ============================================================================
  // Sync TO Legacy Sources (when AppState changes)
  // ============================================================================
  
  useEffect(() => {
    if (!isInitialized) return;
    if (state.rev === lastSyncedRevRef.current) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      lastSyncedRevRef.current = state.rev;
      return;
    }

    lastSyncedRevRef.current = state.rev;

    // Emit events for legacy components to pick up
    if (typeof window !== 'undefined') {
      // Debounced dispatch to avoid loops
      const timeoutId = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('appStateUpdated', { 
          detail: { rev: state.rev } 
        }));
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [state.rev, isInitialized]);

  return {
    syncCryptoFromLegacy,
    syncStocksFromLegacy,
    syncCardOrderFromLegacy,
    syncHiddenCardsFromLegacy,
    syncTradingBalancesFromLocalStorage,
    isInitialized,
    currentRev: state.rev,
  };
}

// ============================================================================
// Bridge Component
// ============================================================================

interface AppStateBridgeProps {
  config?: BridgeConfig;
}

/**
 * Component that sets up bidirectional sync between AppState and legacy contexts.
 * Place this inside all the context providers.
 */
export function AppStateBridge({ config }: AppStateBridgeProps) {
  useAppStateBridge(config);
  return null;
}

export default AppStateBridge;
