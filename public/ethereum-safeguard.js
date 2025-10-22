/**
 * Ethereum Safeguard Script
 * Prevents "Cannot redefine property: ethereum" errors
 * caused by multiple wallet extensions trying to inject window.ethereum
 */

(function() {
  'use strict';
  
  // Check if ethereum is already defined
  if (typeof window.ethereum !== 'undefined') {
    console.log('[Ethereum Safeguard] window.ethereum already exists');
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
    console.log('[Ethereum Safeguard] Created configurable ethereum property');
  } catch (error) {
    console.warn('[Ethereum Safeguard] Could not create ethereum property:', error);
  }

  // Store references to multiple providers if they exist
  window.ethereumProviders = window.ethereumProviders || [];

  // Listen for provider injections
  window.addEventListener('ethereum#initialized', () => {
    console.log('[Ethereum Safeguard] Ethereum provider initialized');
    if (window.ethereum && !window.ethereumProviders.includes(window.ethereum)) {
      window.ethereumProviders.push(window.ethereum);
    }
  });
})();
