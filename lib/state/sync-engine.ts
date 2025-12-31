/**
 * Sync Engine - Full E2E Encrypted Sync Implementation
 * 
 * Handles:
 * - PUSH: Debounced encrypted snapshot uploads to Supabase
 * - PULL: Fetch and decrypt remote state on startup/login
 * - Conflict handling: Higher rev wins, show toast on conflict
 * - Multi-tab safety: Leader election to prevent corruption
 * - Offline queue: Retry pending pushes on reconnect
 */

'use client';

import { AppState, CURRENT_SCHEMA_VERSION } from './app-state';
import { encryptState, decryptState, EncryptedPayload, getStoredSyncKey, hasSyncKeyStored } from './encryption';
import { syncService } from './sync-service';

// ============================================================================
// Types
// ============================================================================

export interface SyncEngineConfig {
  pushDebounceMs: number;
  retryIntervalMs: number;
  maxRetries: number;
}

export interface RemoteSnapshot {
  rev: number;
  schemaVersion: number;
  ciphertext: string;
  iv: string;
  salt: string;
  wrappedDek: string;
  dekIv: string;
  updatedAt: string;
}

export interface PullResult {
  status: 'no-remote' | 'local-wins' | 'remote-wins' | 'conflict-remote-wins' | 'error';
  remoteState?: AppState;
  localRev: number;
  remoteRev?: number;
  message?: string;
}

export type ConflictHandler = (message: string, localRev: number, remoteRev: number) => void;
export type StateUpdater = (newState: AppState) => void;

// ============================================================================
// Multi-Tab Leader Election (BroadcastChannel)
// ============================================================================

const LEADER_CHANNEL = 'omnifolio-sync-leader';
const LEADER_HEARTBEAT_MS = 2000;
const LEADER_TIMEOUT_MS = 5000;
const TAB_ID = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36);

interface LeaderMessage {
  type: 'heartbeat' | 'claim' | 'release' | 'state-changed';
  tabId: string;
  timestamp: number;
  rev?: number;
}

class TabCoordinator {
  private channel: BroadcastChannel | null = null;
  private isLeader = false;
  private currentLeader: string | null = null;
  private lastLeaderHeartbeat = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private leaderCheckInterval: ReturnType<typeof setInterval> | null = null;
  private onBecomeLeader: (() => void) | null = null;
  private onLoseLeadership: (() => void) | null = null;
  private onStateChanged: ((rev: number) => void) | null = null;

  constructor() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      // SSR or no BroadcastChannel support - always be leader
      this.isLeader = true;
      return;
    }

    this.channel = new BroadcastChannel(LEADER_CHANNEL);
    this.channel.onmessage = this.handleMessage.bind(this);

    // Try to claim leadership on startup
    this.claimLeadership();

    // Start leader check interval
    this.leaderCheckInterval = setInterval(() => {
      this.checkLeaderStatus();
    }, LEADER_HEARTBEAT_MS);

    // Handle tab close
    window.addEventListener('beforeunload', () => {
      if (this.isLeader) {
        this.releaseLeadership();
      }
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.currentLeader) {
        this.claimLeadership();
      }
    });
  }

  private handleMessage(event: MessageEvent<LeaderMessage>) {
    const msg = event.data;

    switch (msg.type) {
      case 'heartbeat':
        if (msg.tabId !== TAB_ID) {
          this.currentLeader = msg.tabId;
          this.lastLeaderHeartbeat = msg.timestamp;
          if (this.isLeader && msg.timestamp > this.lastLeaderHeartbeat) {
            // Another tab claimed leadership with a newer timestamp
            this.loseLeadership();
          }
        }
        break;

      case 'claim':
        if (msg.tabId !== TAB_ID) {
          // Another tab is claiming leadership
          if (this.isLeader) {
            // We're the current leader, send heartbeat to assert dominance
            this.sendHeartbeat();
          } else {
            this.currentLeader = msg.tabId;
            this.lastLeaderHeartbeat = msg.timestamp;
          }
        }
        break;

      case 'release':
        if (msg.tabId === this.currentLeader) {
          this.currentLeader = null;
          // Try to claim leadership
          setTimeout(() => this.claimLeadership(), Math.random() * 100);
        }
        break;

      case 'state-changed':
        if (msg.tabId !== TAB_ID && msg.rev !== undefined) {
          this.onStateChanged?.(msg.rev);
        }
        break;
    }
  }

  private checkLeaderStatus() {
    const now = Date.now();
    
    if (this.currentLeader && this.currentLeader !== TAB_ID) {
      // Check if leader timed out
      if (now - this.lastLeaderHeartbeat > LEADER_TIMEOUT_MS) {
        this.currentLeader = null;
        this.claimLeadership();
      }
    }

    if (this.isLeader) {
      this.sendHeartbeat();
    }
  }

  private sendHeartbeat() {
    this.channel?.postMessage({
      type: 'heartbeat',
      tabId: TAB_ID,
      timestamp: Date.now(),
    } as LeaderMessage);
  }

  private claimLeadership() {
    if (this.isLeader) return;

    this.channel?.postMessage({
      type: 'claim',
      tabId: TAB_ID,
      timestamp: Date.now(),
    } as LeaderMessage);

    // If no one objects within 100ms, we're the leader
    setTimeout(() => {
      if (!this.currentLeader || this.currentLeader === TAB_ID) {
        this.becomeLeader();
      }
    }, 100);
  }

  private becomeLeader() {
    if (this.isLeader) return;
    
    this.isLeader = true;
    this.currentLeader = TAB_ID;
    this.lastLeaderHeartbeat = Date.now();

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, LEADER_HEARTBEAT_MS);

    this.onBecomeLeader?.();
    console.debug('[SyncEngine] This tab is now the sync leader');
  }

  private loseLeadership() {
    if (!this.isLeader) return;
    
    this.isLeader = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.onLoseLeadership?.();
    console.debug('[SyncEngine] This tab lost sync leadership');
  }

  private releaseLeadership() {
    if (!this.isLeader) return;

    this.channel?.postMessage({
      type: 'release',
      tabId: TAB_ID,
      timestamp: Date.now(),
    } as LeaderMessage);

    this.loseLeadership();
  }

  // Notify other tabs that state changed
  notifyStateChange(rev: number) {
    this.channel?.postMessage({
      type: 'state-changed',
      tabId: TAB_ID,
      timestamp: Date.now(),
      rev,
    } as LeaderMessage);
  }

  // Public API
  getIsLeader(): boolean {
    return this.isLeader;
  }

  setOnBecomeLeader(callback: () => void) {
    this.onBecomeLeader = callback;
    // If already leader, call immediately
    if (this.isLeader) callback();
  }

  setOnLoseLeadership(callback: () => void) {
    this.onLoseLeadership = callback;
  }

  setOnStateChanged(callback: (rev: number) => void) {
    this.onStateChanged = callback;
  }

  destroy() {
    if (this.isLeader) {
      this.releaseLeadership();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
    }
    this.channel?.close();
  }
}

// ============================================================================
// Sync Engine Class
// ============================================================================

class SyncEngine {
  private config: SyncEngineConfig = {
    pushDebounceMs: 800,
    retryIntervalMs: 30000,
    maxRetries: 3,
  };

  private tabCoordinator: TabCoordinator;
  private pendingPush: AppState | null = null;
  private pushTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private isSyncing = false;
  private syncKey: string | null = null;
  private conflictHandler: ConflictHandler | null = null;
  private stateUpdater: StateUpdater | null = null;
  private lastPushedRev = 0;
  private isPulling = false;

  constructor() {
    this.tabCoordinator = new TabCoordinator();
    
    // When becoming leader, process any pending sync
    this.tabCoordinator.setOnBecomeLeader(() => {
      if (this.pendingPush) {
        this.schedulePush(this.pendingPush);
      }
    });

    // When another tab changes state, we might need to reload
    this.tabCoordinator.setOnStateChanged((rev) => {
      console.debug('[SyncEngine] Another tab changed state to rev:', rev);
      // Could trigger a local reload from IndexedDB here if needed
    });

    // Wire up syncService's sync function to use our push
    syncService.setSyncFunction(async (rev: number) => {
      // This is called by syncService after debounce
      // We already handle debounce ourselves, so just push
      if (this.pendingPush && this.pendingPush.rev === rev) {
        await this.performPush(this.pendingPush);
      }
    });
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  configure(config: Partial<SyncEngineConfig>) {
    this.config = { ...this.config, ...config };
  }

  setConflictHandler(handler: ConflictHandler) {
    this.conflictHandler = handler;
  }

  setStateUpdater(updater: StateUpdater) {
    this.stateUpdater = updater;
  }

  async setSyncKey(key: string) {
    this.syncKey = key;
  }

  async loadSyncKeyFromStorage(): Promise<boolean> {
    if (!hasSyncKeyStored()) {
      return false;
    }
    
    try {
      const key = await getStoredSyncKey();
      if (key) {
        this.syncKey = key;
        return true;
      }
    } catch (error) {
      console.error('[SyncEngine] Failed to load sync key:', error);
    }
    return false;
  }

  clearSyncKey() {
    this.syncKey = null;
    this.pendingPush = null;
    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
      this.pushTimeout = null;
    }
  }

  isSyncEnabled(): boolean {
    return this.syncKey !== null;
  }

  // ============================================================================
  // PUSH: Encrypted snapshot upload
  // ============================================================================

  /**
   * Schedule a push of the current state (debounced)
   * Only the leader tab will actually perform the push
   */
  schedulePush(state: AppState) {
    // Skip if sync not enabled
    if (!this.syncKey) {
      return;
    }

    // Skip if we already pushed this rev
    if (state.rev <= this.lastPushedRev) {
      return;
    }

    // Store pending state
    this.pendingPush = state;

    // Clear existing timeout
    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
    }

    // Only leader should push
    if (!this.tabCoordinator.getIsLeader()) {
      console.debug('[SyncEngine] Not leader, skipping push scheduling');
      return;
    }

    // Schedule debounced push
    this.pushTimeout = setTimeout(() => {
      if (this.pendingPush) {
        this.performPush(this.pendingPush);
      }
    }, this.config.pushDebounceMs);
  }

  /**
   * Perform the actual push to Supabase
   */
  private async performPush(state: AppState): Promise<boolean> {
    if (!this.syncKey) {
      console.debug('[SyncEngine] No sync key, skipping push');
      return false;
    }

    if (this.isSyncing) {
      console.debug('[SyncEngine] Already syncing, skipping');
      return false;
    }

    if (!navigator.onLine) {
      console.debug('[SyncEngine] Offline, queuing push');
      syncService.notifyChange(state.rev);
      return false;
    }

    this.isSyncing = true;
    syncService.notifyChange(state.rev); // Update status to syncing

    try {
      // Encrypt the state
      const encrypted = await encryptState(state, this.syncKey);

      // Push to API
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rev: state.rev,
          schemaVersion: state.schemaVersion,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt,
          wrappedDek: encrypted.wrappedDek,
          dekIv: encrypted.dekIv,
        }),
      });

      if (response.status === 409) {
        // Conflict: remote has newer or same rev
        const data = await response.json();
        console.warn('[SyncEngine] Conflict detected:', data);
        
        // Pull the remote state to resolve
        const pullResult = await this.pull(state);
        if (pullResult.status === 'conflict-remote-wins' && pullResult.remoteState) {
          this.conflictHandler?.(
            'Changes from another device were loaded',
            pullResult.localRev,
            pullResult.remoteRev!
          );
          this.stateUpdater?.(pullResult.remoteState);
        }
        
        return false;
      }

      if (!response.ok) {
        throw new Error(`Push failed: ${response.status}`);
      }

      // Success
      this.lastPushedRev = state.rev;
      this.pendingPush = null;
      this.retryCount = 0;
      syncService.markSynced(state.rev);

      // Notify other tabs
      this.tabCoordinator.notifyStateChange(state.rev);

      console.debug('[SyncEngine] Push successful, rev:', state.rev);
      return true;

    } catch (error) {
      console.error('[SyncEngine] Push error:', error);
      
      this.retryCount++;
      if (this.retryCount < this.config.maxRetries) {
        // Schedule retry
        setTimeout(() => {
          if (this.pendingPush) {
            this.performPush(this.pendingPush);
          }
        }, this.config.retryIntervalMs);
      }
      
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Force push immediately (bypass debounce)
   */
  async pushNow(state: AppState): Promise<boolean> {
    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
      this.pushTimeout = null;
    }
    return this.performPush(state);
  }

  // ============================================================================
  // PULL: Fetch and decrypt remote state
  // ============================================================================

  /**
   * Pull the remote state and compare with local
   * Returns the result of the comparison
   */
  async pull(localState: AppState): Promise<PullResult> {
    if (!this.syncKey) {
      return {
        status: 'error',
        localRev: localState.rev,
        message: 'Sync key not configured',
      };
    }

    if (this.isPulling) {
      return {
        status: 'error',
        localRev: localState.rev,
        message: 'Pull already in progress',
      };
    }

    this.isPulling = true;

    try {
      const response = await fetch('/api/sync', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.exists || !result.data) {
        // No remote state exists
        return {
          status: 'no-remote',
          localRev: localState.rev,
        };
      }

      const remote: RemoteSnapshot = result.data;

      // Decrypt remote state
      const remoteState = await decryptState({
        ciphertext: remote.ciphertext,
        iv: remote.iv,
        salt: remote.salt,
        wrappedDek: remote.wrappedDek,
        dekIv: remote.dekIv,
      }, this.syncKey);

      // Compare revs
      if (localState.rev > remote.rev) {
        // Local is newer
        return {
          status: 'local-wins',
          localRev: localState.rev,
          remoteRev: remote.rev,
        };
      } else if (localState.rev < remote.rev) {
        // Remote is newer - check if this is a conflict
        const isConflict = localState.rev !== this.lastPushedRev;
        
        return {
          status: isConflict ? 'conflict-remote-wins' : 'remote-wins',
          remoteState,
          localRev: localState.rev,
          remoteRev: remote.rev,
        };
      } else {
        // Same rev, no action needed
        return {
          status: 'local-wins',
          localRev: localState.rev,
          remoteRev: remote.rev,
        };
      }

    } catch (error) {
      console.error('[SyncEngine] Pull error:', error);
      return {
        status: 'error',
        localRev: localState.rev,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Initial sync on startup/login
   * Pulls remote, compares, and updates local if remote is newer
   */
  async initialSync(localState: AppState): Promise<PullResult> {
    if (!this.syncKey) {
      // Try to load from storage
      const loaded = await this.loadSyncKeyFromStorage();
      if (!loaded) {
        return {
          status: 'error',
          localRev: localState.rev,
          message: 'No sync key available',
        };
      }
    }

    const result = await this.pull(localState);

    switch (result.status) {
      case 'remote-wins':
      case 'conflict-remote-wins':
        if (result.remoteState) {
          // Update local state with remote
          this.stateUpdater?.(result.remoteState);
          this.lastPushedRev = result.remoteRev!;
          syncService.markSynced(result.remoteRev!);
          
          if (result.status === 'conflict-remote-wins') {
            this.conflictHandler?.(
              'Changes from another device were loaded',
              result.localRev,
              result.remoteRev!
            );
          }
        }
        break;

      case 'local-wins':
        // Push local state to remote
        await this.pushNow(localState);
        break;

      case 'no-remote':
        // First sync, push local state
        await this.pushNow(localState);
        break;
    }

    return result;
  }

  // ============================================================================
  // Multi-tab API
  // ============================================================================

  isLeader(): boolean {
    return this.tabCoordinator.getIsLeader();
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy() {
    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
    }
    this.tabCoordinator.destroy();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const syncEngine = new SyncEngine();

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

interface UseSyncEngineOptions {
  onConflict?: ConflictHandler;
}

export function useSyncEngine(options: UseSyncEngineOptions = {}) {
  const [isLeader, setIsLeader] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsLeader(syncEngine.isLeader());
    setIsSyncEnabled(syncEngine.isSyncEnabled());

    // Set up conflict handler
    if (options.onConflict) {
      syncEngine.setConflictHandler(options.onConflict);
    }

    // Poll for leader status changes
    const interval = setInterval(() => {
      setIsLeader(syncEngine.isLeader());
      setIsSyncEnabled(syncEngine.isSyncEnabled());
    }, 1000);

    return () => clearInterval(interval);
  }, [options.onConflict]);

  const enableSync = useCallback(async (syncKey: string) => {
    await syncEngine.setSyncKey(syncKey);
    setIsSyncEnabled(true);
  }, []);

  const disableSync = useCallback(() => {
    syncEngine.clearSyncKey();
    setIsSyncEnabled(false);
  }, []);

  return {
    isLeader,
    isSyncEnabled,
    enableSync,
    disableSync,
    syncEngine,
  };
}
