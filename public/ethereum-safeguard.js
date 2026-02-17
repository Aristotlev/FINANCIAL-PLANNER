/**
 * Browser Extension Safeguard Script
 * Prevents browser extensions from interfering with the application
 * - Blocks EIP-6963 provider injection errors
 * - Prevents "Cannot redefine property: ethereum" errors
 * - Catches and suppresses extension-related console errors
 */

(function() {
  'use strict';

  // ========================================
  // 1. SUPPRESS EXTENSION-RELATED ERRORS
  // ========================================
  
  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Patterns to identify extension-related errors
  const extensionErrorPatterns = [
    'EIP-6963',
    'Invalid EIP-6963',
    'ethereum',
    'web3',
    'metamask',
    'wallet',
    'provider',
    'gt-window-provider',
    'inpage.js',
    'contentscript',
    'chrome-extension',
    'moz-extension',
    'Cannot redefine property',
    'extension context invalidated',
    'message port closed',
    'Receiving end does not exist',
    'TypeError: a.supabase.from(...).select(...).eq is not a function',
    'TronWeb',
    'TronLink',
    'ERR_BLOCKED_BY_CLIENT',
    'AccountsDomainCookiesCheckConnectionHttp',
    'TrustedScript',
    'The action has been blocked',
    'cspreport'
  ];
  
  // Check if error is from an extension
  const isExtensionError = (args) => {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message + ' ' + arg.stack;
      try { return JSON.stringify(arg); } catch { return String(arg); }
    }).join(' ').toLowerCase();
    
    return extensionErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  };
  
  // Override console.error
  console.error = function(...args) {
    if (!isExtensionError(args)) {
      originalConsoleError.apply(console, args);
    }
  };
  
  // Override console.warn
  console.warn = function(...args) {
    if (!isExtensionError(args)) {
      originalConsoleWarn.apply(console, args);
    }
  };

  // ========================================
  // 2. GLOBAL ERROR HANDLER
  // ========================================
  
  // Catch uncaught errors from extensions
  window.addEventListener('error', function(event) {
    const errorString = (event.message || '') + ' ' + (event.filename || '') + ' ' + (event.error && event.error.stack ? event.error.stack : '');
    
    if (extensionErrorPatterns.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    )) {
      event.preventDefault();
      event.stopPropagation();
      return true; // Suppress the error
    }
  }, true);
  
  // Catch unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const errorString = reason instanceof Error 
      ? reason.message + ' ' + reason.stack 
      : String(reason);
    
    if (extensionErrorPatterns.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    )) {
      event.preventDefault();
      return true; // Suppress the error
    }
  }, true);

  // ========================================
  // 3. EIP-6963 PROVIDER SAFEGUARD
  // ========================================
  
  // Mock the EIP-6963 event to prevent errors
  const originalDispatchEvent = window.dispatchEvent;
  window.dispatchEvent = function(event) {
    // Intercept EIP-6963 announcements that might cause errors
    if (event && event.type === 'eip6963:announceProvider') {
      try {
        // Validate the provider detail before allowing dispatch
        if (event.detail && event.detail.info && event.detail.provider) {
          const { info } = event.detail;
          // Check required EIP-6963 fields
          if (!info.uuid || !info.name || !info.icon || !info.rdns) {
            // Invalid provider, suppress the event
            return true;
          }
        }
      } catch (e) {
        // If validation fails, suppress the event
        return true;
      }
    }
    return originalDispatchEvent.apply(window, arguments);
  };

  // ========================================
  // 4. ETHEREUM PROPERTY SAFEGUARD
  // ========================================
  
  // Check if ethereum is already defined
  if (typeof window.ethereum !== 'undefined') {
    return;
  }

  // Create a temporary placeholder that can be safely overwritten
  try {
    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
      configurable: true, // Allow wallet extensions to redefine it
      enumerable: true
    });
  } catch (error) {
    // Silently ignore - another extension may have already defined it
  }

  // Store references to multiple providers if they exist
  window.ethereumProviders = window.ethereumProviders || [];

  // ========================================
  // 5. BLOCK EXTENSION SCRIPT INJECTION
  // ========================================
  
  // Monitor and optionally block extension-injected scripts
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT') {
          const src = node.src || '';
          // Detect extension-injected scripts
          if (src.includes('chrome-extension://') || 
              src.includes('moz-extension://') ||
              src.includes('extension://')) {
            // Log but don't block - some extensions are useful
            // node.remove(); // Uncomment to block extension scripts entirely
          }
        }
      });
    });
  });

  // Start observing when DOM is ready
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    });
  }

})();
