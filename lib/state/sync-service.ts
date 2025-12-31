/**
 * Sync Status Types and Service
 * 
 * Manages synchronization state between local IndexedDB and remote Supabase.
 * All local writes are immediate (optimistic), network sync happens in background.
 */

// ============================================================================
// Sync Status Types
// ============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedRev: number | null;
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

export interface SyncEvent {
  type: 'status_change' | 'sync_complete' | 'sync_error' | 'online_change';
  status: SyncStatus;
  error?: string;
  syncedRev?: number;
}

// ============================================================================
// Sync Service Class
// ============================================================================

type SyncEventListener = (event: SyncEvent) => void;

class SyncService {
  private status: SyncStatus = 'idle';
  private lastSyncedRev: number | null = null;
  private lastSyncedAt: string | null = null;
  private pendingRev: number | null = null;
  private error: string | null = null;
  private isOnline: boolean = true;
  private listeners: Set<SyncEventListener> = new Set();
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSyncing: boolean = false;
  
  // Sync configuration
  private readonly SYNC_DEBOUNCE_MS = 2000;  // Wait 2s after last change before syncing
  private readonly SYNC_RETRY_MS = 30000;    // Retry failed sync after 30s
  private readonly MAX_RETRIES = 3;
  private retryCount = 0;
  
  // Sync function to be set externally
  private syncFn: ((rev: number) => Promise<void>) | null = null;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.emit({ type: 'online_change', status: this.status });
        // Trigger sync when coming online
        if (this.pendingRev !== null) {
          this.scheduleSyncNow();
        }
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.setStatus('offline');
        this.emit({ type: 'online_change', status: 'offline' });
      });
    }
  }

  /**
   * Set the sync function that will be called to sync to remote
   */
  setSyncFunction(fn: (rev: number) => Promise<void>): void {
    this.syncFn = fn;
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return {
      status: this.status,
      lastSyncedRev: this.lastSyncedRev,
      lastSyncedAt: this.lastSyncedAt,
      pendingChanges: this.pendingRev !== null && this.lastSyncedRev !== null
        ? this.pendingRev - this.lastSyncedRev
        : 0,
      error: this.error,
      isOnline: this.isOnline,
    };
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('Sync event listener error:', e);
      }
    });
  }

  /**
   * Set status and emit event
   */
  private setStatus(newStatus: SyncStatus, error?: string): void {
    const oldStatus = this.status;
    this.status = newStatus;
    this.error = error || null;
    
    if (oldStatus !== newStatus || error) {
      this.emit({ type: 'status_change', status: newStatus, error });
    }
  }

  /**
   * Notify the service that a local change happened
   * This schedules a debounced sync
   */
  notifyChange(rev: number): void {
    this.pendingRev = rev;
    
    // If offline, just update status
    if (!this.isOnline) {
      this.setStatus('offline');
      return;
    }
    
    // Debounce sync
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.performSync();
    }, this.SYNC_DEBOUNCE_MS);
  }

  /**
   * Force sync immediately (bypass debounce)
   */
  scheduleSyncNow(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.performSync();
  }

  /**
   * Perform the actual sync
   */
  private async performSync(): Promise<void> {
    // Skip if no sync function set
    if (!this.syncFn) {
      console.debug('Sync skipped: no sync function set');
      return;
    }
    
    // Skip if already syncing
    if (this.isSyncing) {
      return;
    }
    
    // Skip if offline
    if (!this.isOnline) {
      this.setStatus('offline');
      return;
    }
    
    // Skip if no pending changes
    if (this.pendingRev === null) {
      this.setStatus('idle');
      return;
    }
    
    // Skip if already synced this rev
    if (this.lastSyncedRev !== null && this.pendingRev <= this.lastSyncedRev) {
      this.setStatus('idle');
      return;
    }
    
    const revToSync = this.pendingRev;
    
    this.isSyncing = true;
    this.setStatus('syncing');
    
    try {
      await this.syncFn(revToSync);
      
      // Success
      this.lastSyncedRev = revToSync;
      this.lastSyncedAt = new Date().toISOString();
      this.retryCount = 0;
      this.setStatus('idle');
      
      this.emit({
        type: 'sync_complete',
        status: 'idle',
        syncedRev: revToSync,
      });
      
      // Check if more changes happened during sync
      if (this.pendingRev !== null && this.pendingRev > revToSync) {
        this.notifyChange(this.pendingRev);
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      this.retryCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      
      if (this.retryCount < this.MAX_RETRIES) {
        // Schedule retry
        this.setStatus('error', `${errorMessage} (retrying...)`);
        this.syncTimeout = setTimeout(() => {
          this.performSync();
        }, this.SYNC_RETRY_MS);
      } else {
        // Max retries reached
        this.setStatus('error', errorMessage);
        this.emit({
          type: 'sync_error',
          status: 'error',
          error: errorMessage,
        });
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Reset retry count and try syncing again
   */
  retry(): void {
    this.retryCount = 0;
    this.error = null;
    this.scheduleSyncNow();
  }

  /**
   * Mark sync as complete from external source (e.g., initial load)
   */
  markSynced(rev: number): void {
    this.lastSyncedRev = rev;
    this.lastSyncedAt = new Date().toISOString();
    this.pendingRev = rev;
    this.setStatus('idle');
  }

  /**
   * Reset sync state (e.g., on logout)
   */
  reset(): void {
    this.status = 'idle';
    this.lastSyncedRev = null;
    this.lastSyncedAt = null;
    this.pendingRev = null;
    this.error = null;
    this.retryCount = 0;
    
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }
}

// Singleton instance
export const syncService = new SyncService();

// ============================================================================
// React Hook for Sync Status
// ============================================================================

import { useState, useEffect } from 'react';

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(syncService.getState());

  useEffect(() => {
    // Get initial state
    setState(syncService.getState());
    
    // Subscribe to changes
    const unsubscribe = syncService.subscribe(() => {
      setState(syncService.getState());
    });
    
    return unsubscribe;
  }, []);

  return state;
}
