/**
 * IndexedDB Persistence Layer using Dexie
 * 
 * Provides local-first storage for the AppState.
 * Stores a single record with id="root" containing the full state.
 * 
 * Features:
 * - Automatic initialization
 * - Debounced saves to prevent excessive writes
 * - Schema migration support
 * - Error recovery
 */

import Dexie, { Table } from 'dexie';
import { 
  AppState, 
  createDefaultAppState, 
  CURRENT_SCHEMA_VERSION 
} from './app-state';

// ============================================================================
// Database Schema
// ============================================================================

interface AppStateRecord {
  id: string;  // Always "root" for the main state
  state: AppState;
  savedAt: string;
}

class MoneyHubDatabase extends Dexie {
  appState!: Table<AppStateRecord, string>;

  constructor() {
    super('MoneyHubDB');
    
    // Version 1: Initial schema
    this.version(1).stores({
      appState: 'id',  // Primary key only, state is a blob
    });
  }
}

// Singleton database instance
let db: MoneyHubDatabase | null = null;

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Get or create the database instance
 */
function getDatabase(): MoneyHubDatabase {
  if (!db) {
    db = new MoneyHubDatabase();
  }
  return db;
}

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof indexedDB === 'undefined') return false;
  return true;
}

// ============================================================================
// State Loading
// ============================================================================

/**
 * Load the AppState from IndexedDB.
 * Returns the stored state or a new default state if none exists.
 * 
 * @param userId - Optional user ID to include in default state
 * @returns The loaded or default AppState
 */
export async function loadLocalState(userId: string | null = null): Promise<AppState> {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available, returning default state');
    return createDefaultAppState(userId);
  }

  try {
    const database = getDatabase();
    await database.open();
    
    const record = await database.appState.get('root');
    
    if (!record) {
      console.log('No stored state found, creating default');
      const defaultState = createDefaultAppState(userId);
      await saveLocalState(defaultState);
      return defaultState;
    }

    // Check if migration is needed
    const storedState = record.state;
    if (storedState.schemaVersion < CURRENT_SCHEMA_VERSION) {
      console.log(`Migrating state from v${storedState.schemaVersion} to v${CURRENT_SCHEMA_VERSION}`);
      const migratedState = migrateState(storedState);
      await saveLocalState(migratedState);
      return migratedState;
    }

    // Update userId if it changed (e.g., user logged in)
    if (userId && storedState.userId !== userId) {
      const updatedState = {
        ...storedState,
        userId,
        rev: storedState.rev + 1,
        updatedAt: new Date().toISOString(),
      };
      await saveLocalState(updatedState);
      return updatedState;
    }

    return storedState;
  } catch (error) {
    console.error('Error loading state from IndexedDB:', error);
    return createDefaultAppState(userId);
  }
}

// ============================================================================
// State Saving
// ============================================================================

// Debounce configuration
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSave: AppState | null = null;
const SAVE_DEBOUNCE_MS = 500;

/**
 * Save the AppState to IndexedDB.
 * Uses debouncing to prevent excessive writes during rapid updates.
 * 
 * @param state - The AppState to save
 * @param immediate - If true, save immediately without debouncing
 */
export async function saveLocalState(state: AppState, immediate = false): Promise<void> {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available, cannot save state');
    return;
  }

  // Store the pending save
  pendingSave = state;

  // If immediate, save now
  if (immediate) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    await performSave(state);
    pendingSave = null;
    return;
  }

  // Debounced save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    if (pendingSave) {
      await performSave(pendingSave);
      pendingSave = null;
    }
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Internal function to perform the actual save
 */
async function performSave(state: AppState): Promise<void> {
  try {
    const database = getDatabase();
    await database.open();
    
    const record: AppStateRecord = {
      id: 'root',
      state,
      savedAt: new Date().toISOString(),
    };

    await database.appState.put(record);
    console.debug(`State saved: rev=${state.rev}, updatedAt=${state.updatedAt}`);
  } catch (error) {
    console.error('Error saving state to IndexedDB:', error);
    throw error;
  }
}

/**
 * Force flush any pending saves immediately
 */
export async function flushPendingSaves(): Promise<void> {
  if (pendingSave) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    await performSave(pendingSave);
    pendingSave = null;
  }
}

// ============================================================================
// State Migration
// ============================================================================

/**
 * Migrate state from older schema versions to current.
 * Add migration logic here as the schema evolves.
 */
function migrateState(oldState: AppState): AppState {
  let state = { ...oldState };

  // Example migration pattern (add as needed):
  // if (state.schemaVersion < 2) {
  //   // Migrate from v1 to v2
  //   state = migrateV1toV2(state);
  // }
  // if (state.schemaVersion < 3) {
  //   // Migrate from v2 to v3
  //   state = migrateV2toV3(state);
  // }

  // Update to current version
  state.schemaVersion = CURRENT_SCHEMA_VERSION;
  state.rev = state.rev + 1;
  state.updatedAt = new Date().toISOString();

  return state;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all stored state (useful for testing or logout)
 */
export async function clearLocalState(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  try {
    const database = getDatabase();
    await database.open();
    await database.appState.delete('root');
    console.log('Local state cleared');
  } catch (error) {
    console.error('Error clearing local state:', error);
    throw error;
  }
}

/**
 * Get metadata about the stored state without loading the full state
 */
export async function getLocalStateMetadata(): Promise<{
  exists: boolean;
  rev?: number;
  schemaVersion?: number;
  updatedAt?: string;
  savedAt?: string;
} | null> {
  if (!isIndexedDBAvailable()) return null;

  try {
    const database = getDatabase();
    await database.open();
    
    const record = await database.appState.get('root');
    
    if (!record) {
      return { exists: false };
    }

    return {
      exists: true,
      rev: record.state.rev,
      schemaVersion: record.state.schemaVersion,
      updatedAt: record.state.updatedAt,
      savedAt: record.savedAt,
    };
  } catch (error) {
    console.error('Error getting state metadata:', error);
    return null;
  }
}

/**
 * Export state as JSON (for backup/debugging)
 */
export async function exportState(): Promise<string | null> {
  const state = await loadLocalState();
  return JSON.stringify(state, null, 2);
}

/**
 * Import state from JSON (for restore/debugging)
 */
export async function importState(jsonString: string): Promise<void> {
  try {
    const state = JSON.parse(jsonString) as AppState;
    
    // Validate basic structure
    if (typeof state.schemaVersion !== 'number' || typeof state.rev !== 'number') {
      throw new Error('Invalid state structure');
    }

    // Increment rev to mark this as a new change
    state.rev = state.rev + 1;
    state.updatedAt = new Date().toISOString();
    
    await saveLocalState(state, true);
  } catch (error) {
    console.error('Error importing state:', error);
    throw error;
  }
}

// ============================================================================
// Cleanup on Page Unload
// ============================================================================

if (typeof window !== 'undefined') {
  // Flush pending saves before page unload
  window.addEventListener('beforeunload', () => {
    if (pendingSave && saveTimeout) {
      // Can't await here, but try to save synchronously
      // IndexedDB transactions should complete even on unload
      flushPendingSaves();
    }
  });

  // Also flush on visibility change (user switching tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSaves();
    }
  });
}
