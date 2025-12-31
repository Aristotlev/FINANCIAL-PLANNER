/**
 * Sync Status Indicator Component
 * 
 * Displays the current sync status with visual feedback.
 * Status: Idle (synced) / Syncing / Offline / Error
 */

"use client";

import React from 'react';
import { useSyncStatus } from '../../lib/state/sync-service';
import type { SyncStatus } from '../../lib/state/sync-service';

interface SyncStatusIndicatorProps {
  /** Show full text or just icon */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show last synced time */
  showLastSync?: boolean;
}

const statusConfig: Record<SyncStatus, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  animate?: boolean;
}> = {
  idle: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: 'Synced',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  syncing: {
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    label: 'Syncing',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animate: true,
  },
  offline: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
      </svg>
    ),
    label: 'Offline',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  error: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Error',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

function formatLastSync(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  
  return date.toLocaleDateString();
}

export function SyncStatusIndicator({ 
  compact = false, 
  className = '',
  showLastSync = false,
}: SyncStatusIndicatorProps) {
  const syncState = useSyncStatus();
  const config = statusConfig[syncState.status];
  
  // Don't show anything if not initialized
  if (syncState.lastSyncedRev === null && syncState.status === 'idle') {
    return null;
  }

  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        ${config.bgColor} ${config.color}
        transition-all duration-300 ease-in-out
        ${className}
      `}
      title={syncState.error || config.label}
    >
      <span className={config.animate ? 'animate-pulse' : ''}>
        {config.icon}
      </span>
      
      {!compact && (
        <span>{config.label}</span>
      )}
      
      {showLastSync && syncState.lastSyncedAt && syncState.status === 'idle' && (
        <span className="opacity-70">
          • {formatLastSync(syncState.lastSyncedAt)}
        </span>
      )}
      
      {syncState.pendingChanges > 0 && syncState.status !== 'syncing' && (
        <span className="opacity-70">
          ({syncState.pendingChanges} pending)
        </span>
      )}
    </div>
  );
}

/**
 * Minimal sync indicator - just a colored dot
 */
export function SyncStatusDot({ className = '' }: { className?: string }) {
  const syncState = useSyncStatus();
  
  const dotColors: Record<SyncStatus, string> = {
    idle: 'bg-green-500',
    syncing: 'bg-blue-500 animate-pulse',
    offline: 'bg-yellow-500',
    error: 'bg-red-500',
  };
  
  return (
    <span 
      className={`
        inline-block w-2 h-2 rounded-full
        ${dotColors[syncState.status]}
        ${className}
      `}
      title={statusConfig[syncState.status].label}
    />
  );
}

export default SyncStatusIndicator;
