"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary that catches and suppresses errors from browser extensions
 * while still showing real application errors
 */
export class ExtensionErrorBoundary extends Component<Props, State> {
  // Patterns that indicate an error is from a browser extension
  private static readonly EXTENSION_PATTERNS = [
    'EIP-6963',
    'ethereum',
    'web3',
    'metamask',
    'wallet',
    'gt-window-provider',
    'inpage.js',
    'contentscript',
    'chrome-extension',
    'moz-extension',
    'Cannot redefine property',
    'extension context invalidated',
    'message port closed',
    'Receiving end does not exist',
    'Extension context was invalidated',
    'ResizeObserver loop',
  ];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Check if an error originated from a browser extension
   */
  private static isExtensionError(error: Error): boolean {
    const errorString = `${error.message || ''} ${error.stack || ''}`.toLowerCase();
    
    return ExtensionErrorBoundary.EXTENSION_PATTERNS.some(pattern =>
      errorString.includes(pattern.toLowerCase())
    );
  }

  static getDerivedStateFromError(error: Error): State {
    // If it's an extension error, suppress it
    if (ExtensionErrorBoundary.isExtensionError(error)) {
      console.debug('[ExtensionErrorBoundary] Suppressed extension error:', error.message);
      return { hasError: false, error: null };
    }
    
    // Real application error - show error state
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log non-extension errors
    if (!ExtensionErrorBoundary.isExtensionError(error)) {
      console.error('Application Error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please try refreshing the page
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ExtensionErrorBoundary;
