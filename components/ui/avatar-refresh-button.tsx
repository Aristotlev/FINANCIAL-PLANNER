"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Avatar Refresh Button
 * Add this component anywhere in your dashboard to allow users to manually
 * refresh their Google profile picture with one click.
 * 
 * Usage:
 * import { AvatarRefreshButton } from "@/components/ui/avatar-refresh-button";
 * 
 * <AvatarRefreshButton />
 */
export function AvatarRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/refresh-avatar');
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Profile picture updated!' });
        // Reload the page after 1 second to show new avatar
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Failed to refresh. Please sign out and sign in again.' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`
          inline-flex items-center gap-2 px-4 py-2 
          text-sm font-medium rounded-lg
          transition-all duration-200
          ${isRefreshing 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-lime-500 hover:bg-lime-600 active:scale-95'
          }
          text-white shadow-lg
        `}
        title="Refresh your Google profile picture"
      >
        <RefreshCw 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
        {isRefreshing ? 'Refreshing...' : 'Refresh Avatar'}
      </button>

      {message && (
        <div 
          className={`
            px-3 py-1 rounded text-xs font-medium
            ${message.type === 'success' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }
          `}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Avatar Refresh Icon Button
 * Minimal version that can be placed next to the avatar image
 */
export function AvatarRefreshIconButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/auth/refresh-avatar');
      const data = await response.json();

      if (data.success) {
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert(data.error || 'Failed to refresh avatar. Please sign out and sign in again.');
      }
    } catch (error) {
      alert('Failed to refresh avatar. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        p-1.5 rounded-full
        transition-all duration-200
        ${isRefreshing 
          ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' 
          : 'bg-lime-500/10 hover:bg-lime-500/20 active:scale-90'
        }
      `}
      title="Refresh profile picture"
    >
      <RefreshCw 
        className={`
          w-3.5 h-3.5 text-lime-600 dark:text-lime-400
          ${isRefreshing ? 'animate-spin' : ''}
        `} 
      />
    </button>
  );
}
