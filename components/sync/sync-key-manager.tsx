'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateSyncKey,
  hasSyncKeyStored,
  storeSyncKeyLocally,
  getStoredSyncKey,
  forgetSyncKey,
  validateSyncKey,
  normalizeSyncKey,
} from '@/lib/state/encryption';
import { syncEngine } from '@/lib/state/sync-engine';

// ============================================================================
// Types
// ============================================================================

type SyncKeyState = 
  | 'loading'           // Checking if key exists
  | 'no-key'            // No sync key configured
  | 'show-new-key'      // Just generated a new key, showing it once
  | 'enter-key'         // User is entering existing key
  | 'has-key'           // Key is stored and ready
  | 'error';            // Something went wrong

interface SyncKeyManagerProps {
  onSyncKeyReady?: (syncKey: string) => void;
  onSyncDisabled?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SyncKeyManager({ 
  onSyncKeyReady, 
  onSyncDisabled,
  className = '' 
}: SyncKeyManagerProps) {
  const [state, setState] = useState<SyncKeyState>('loading');
  const [newKey, setNewKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [rememberOnDevice, setRememberOnDevice] = useState(true);
  const [showKey, setShowKey] = useState(false);

  // Check for existing key on mount
  useEffect(() => {
    const checkStoredKey = async () => {
      try {
        if (hasSyncKeyStored()) {
          const storedKey = await getStoredSyncKey();
          if (storedKey) {
            setState('has-key');
            onSyncKeyReady?.(storedKey);
            return;
          }
        }
        setState('no-key');
      } catch (err) {
        console.error('Error checking stored key:', err);
        setState('no-key');
      }
    };
    checkStoredKey();
  }, [onSyncKeyReady]);

  // Generate a new sync key
  const handleEnableSync = useCallback(() => {
    const key = generateSyncKey();
    setNewKey(key);
    setState('show-new-key');
    setError('');
  }, []);

  // Copy key to clipboard
  const handleCopyKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [newKey]);

  // Confirm new key (user has saved it)
  const handleConfirmNewKey = useCallback(async () => {
    try {
      if (rememberOnDevice) {
        await storeSyncKeyLocally(newKey);
      }
      // Enable sync engine with this key
      await syncEngine.setSyncKey(newKey);
      setState('has-key');
      onSyncKeyReady?.(newKey);
    } catch (err) {
      console.error('Error storing key:', err);
      setError('Failed to store sync key');
    }
  }, [newKey, rememberOnDevice, onSyncKeyReady]);

  // Switch to enter existing key mode
  const handleEnterExistingKey = useCallback(() => {
    setState('enter-key');
    setInputKey('');
    setError('');
  }, []);

  // Validate and use entered key
  const handleSubmitKey = useCallback(async () => {
    const normalized = normalizeSyncKey(inputKey);
    
    if (!validateSyncKey(normalized)) {
      setError('Invalid sync key format. Should be 16 words separated by dashes.');
      return;
    }

    try {
      if (rememberOnDevice) {
        await storeSyncKeyLocally(normalized);
      }
      // Enable sync engine with this key
      await syncEngine.setSyncKey(normalized);
      setState('has-key');
      onSyncKeyReady?.(normalized);
    } catch (err) {
      console.error('Error storing key:', err);
      setError('Failed to store sync key');
    }
  }, [inputKey, rememberOnDevice, onSyncKeyReady]);

  // Forget the stored key
  const handleForgetKey = useCallback(() => {
    forgetSyncKey();
    syncEngine.clearSyncKey();
    setState('no-key');
    setNewKey('');
    setInputKey('');
    onSyncDisabled?.();
  }, [onSyncDisabled]);

  // Go back to no-key state
  const handleCancel = useCallback(() => {
    setState('no-key');
    setNewKey('');
    setInputKey('');
    setError('');
  }, []);

  // ============================================================================
  // Render States
  // ============================================================================

  if (state === 'loading') {
    return (
      <div className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Checking sync status...</span>
        </div>
      </div>
    );
  }

  if (state === 'no-key') {
    return (
      <div className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Encrypted Sync</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sync your portfolio across devices</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Enable encrypted sync to access your portfolio from any device. Your data is encrypted with a key only you know.
        </p>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={handleEnableSync}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Enable Sync
          </button>
          <button
            onClick={handleEnterExistingKey}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            I have a Sync Key
          </button>
        </div>
      </div>
    );
  }

  if (state === 'show-new-key') {
    return (
      <div className={`p-4 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Save Your Sync Key</h3>
        </div>
        
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
          <strong>Important:</strong> Save this key somewhere safe. You&apos;ll need it to access your data on other devices. 
          This key is shown only once!
        </p>
        
        <div className="relative mb-3">
          <div className="font-mono text-xs bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-600 rounded-lg p-3 break-all">
            {showKey ? newKey : '••••-••••-••••-••••-••••-••••-••••-••••-••••-••••-••••-••••-••••-••••-••••-••••'}
          </div>
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleCopyKey}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberOnDevice}
            onChange={(e) => setRememberOnDevice(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Remember on this device</span>
        </label>
        
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmNewKey}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            I&apos;ve Saved It
          </button>
        </div>
      </div>
    );
  }

  if (state === 'enter-key') {
    return (
      <div className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Enter Your Sync Key</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Enter the 16-word sync key from your other device.
        </p>
        
        <textarea
          value={inputKey}
          onChange={(e) => {
            setInputKey(e.target.value);
            setError('');
          }}
          placeholder="WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD-WORD"
          className="w-full h-24 px-3 py-2 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
        )}
        
        <label className="flex items-center gap-2 mt-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberOnDevice}
            onChange={(e) => setRememberOnDevice(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Remember on this device</span>
        </label>
        
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitKey}
            disabled={!inputKey.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  if (state === 'has-key') {
    return (
      <div className={`p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200">Sync Enabled</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Your data is encrypted and syncing</p>
            </div>
          </div>
          <button
            onClick={handleForgetKey}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
          >
            Forget Key
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className={`p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ${className}`}>
      <p className="text-red-600 dark:text-red-400">Something went wrong. Please refresh the page.</p>
    </div>
  );
}

export default SyncKeyManager;
