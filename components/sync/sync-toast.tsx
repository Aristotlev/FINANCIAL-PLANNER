/**
 * Sync Toast - Non-annoying notification for sync events
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { syncEngine } from '@/lib/state/sync-engine';

interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  duration?: number;
}

// Global toast state (simple pub/sub pattern)
let toastListeners: ((toast: ToastMessage | null) => void)[] = [];
let currentToast: ToastMessage | null = null;

export function showSyncToast(message: string, type: ToastMessage['type'] = 'info', duration = 4000) {
  const toast: ToastMessage = {
    id: Math.random().toString(36).slice(2),
    message,
    type,
    duration,
  };
  currentToast = toast;
  toastListeners.forEach(listener => listener(toast));

  if (duration > 0) {
    setTimeout(() => {
      if (currentToast?.id === toast.id) {
        currentToast = null;
        toastListeners.forEach(listener => listener(null));
      }
    }, duration);
  }
}

export function SyncToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    // Subscribe to toast events
    const listener = (newToast: ToastMessage | null) => {
      setToast(newToast);
    };
    toastListeners.push(listener);

    // Set up sync engine conflict handler
    syncEngine.setConflictHandler((message, localRev, remoteRev) => {
      showSyncToast(message, 'warning', 5000);
    });

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const dismiss = useCallback(() => {
    setToast(null);
    currentToast = null;
  }, []);

  return (
    <>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
              ${toast.type === 'info' ? 'bg-blue-600 text-white' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-500 text-black' : ''}
              ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            `}
          >
            {/* Icon */}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            )}
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            )}

            {/* Message */}
            <span className="font-medium">{toast.message}</span>

            {/* Dismiss button */}
            <button
              onClick={dismiss}
              className="ml-2 p-1 rounded hover:bg-white/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Add animation styles
const style = typeof document !== 'undefined' ? document.createElement('style') : null;
if (style) {
  style.textContent = `
    @keyframes slide-up {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}
