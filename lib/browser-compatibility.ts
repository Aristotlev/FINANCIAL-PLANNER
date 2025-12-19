/**
 * Browser Compatibility & Feature Detection Utilities
 * 
 * Provides feature detection and browser-specific utilities
 * to ensure compatibility across all major browsers.
 */

// ============================================================================
// BROWSER DETECTION
// ============================================================================

export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return null;
  
  const ua = navigator.userAgent;
  
  return {
    isChrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
    isFirefox: /Firefox/.test(ua),
    isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
    isEdge: /Edg/.test(ua),
    isOpera: /OPR/.test(ua) || /Opera/.test(ua),
    isBrave: (navigator as any).brave !== undefined,
    isMobile: /Mobile|Android|iPhone|iPad|iPod/.test(ua),
    isIOS: /iPhone|iPad|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isSamsungBrowser: /SamsungBrowser/.test(ua),
    isUCBrowser: /UCBrowser/.test(ua),
  };
};

// ============================================================================
// FEATURE DETECTION
// ============================================================================

export const features = {
  /**
   * Check if browser supports Web Speech API
   */
  hasSpeechRecognition: () => {
    if (typeof window === 'undefined') return false;
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  /**
   * Check if browser supports Speech Synthesis (text-to-speech)
   */
  hasSpeechSynthesis: () => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  },

  /**
   * Check if browser supports Clipboard API
   */
  hasClipboardAPI: () => {
    if (typeof window === 'undefined') return false;
    return !!(navigator.clipboard && navigator.clipboard.writeText);
  },

  /**
   * Check if browser supports Local Storage
   */
  hasLocalStorage: () => {
    if (typeof window === 'undefined') return false;
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if browser supports Session Storage
   */
  hasSessionStorage: () => {
    if (typeof window === 'undefined') return false;
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if browser supports IndexedDB
   */
  hasIndexedDB: () => {
    if (typeof window === 'undefined') return false;
    return !!window.indexedDB;
  },

  /**
   * Check if browser supports IntersectionObserver
   */
  hasIntersectionObserver: () => {
    if (typeof window === 'undefined') return false;
    return 'IntersectionObserver' in window;
  },

  /**
   * Check if browser supports CSS Grid
   */
  hasCSSGrid: () => {
    if (typeof window === 'undefined') return false;
    return CSS.supports('display', 'grid');
  },

  /**
   * Check if browser supports CSS Flexbox
   */
  hasFlexbox: () => {
    if (typeof window === 'undefined') return false;
    return CSS.supports('display', 'flex');
  },

  /**
   * Check if browser supports backdrop-filter
   */
  hasBackdropFilter: () => {
    if (typeof window === 'undefined') return false;
    return CSS.supports('backdrop-filter', 'blur(10px)') || 
           CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
  },

  /**
   * Check if browser supports CSS 3D transforms
   */
  has3DTransforms: () => {
    if (typeof window === 'undefined') return false;
    return CSS.supports('transform', 'translateZ(0px)');
  },

  /**
   * Check if browser supports CSS custom properties (variables)
   */
  hasCSSVariables: () => {
    if (typeof window === 'undefined') return false;
    return CSS.supports('--test', '0');
  },

  /**
   * Check if browser supports WebGL
   */
  hasWebGL: () => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if browser supports touch events
   */
  hasTouchEvents: () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Check if browser supports pointer events
   */
  hasPointerEvents: () => {
    if (typeof window === 'undefined') return false;
    return 'PointerEvent' in window;
  },

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Check if user prefers dark mode
   */
  prefersDarkMode: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
};

// ============================================================================
// VENDOR PREFIX HELPERS
// ============================================================================

export const vendorPrefix = {
  /**
   * Get the appropriate transform property name
   */
  transform: () => {
    if (typeof window === 'undefined') return 'transform';
    const prefixes = ['transform', 'webkitTransform', 'mozTransform', 'msTransform'];
    const div = document.createElement('div');
    for (const prefix of prefixes) {
      if (prefix in div.style) return prefix;
    }
    return 'transform';
  },

  /**
   * Get the appropriate transition property name
   */
  transition: () => {
    if (typeof window === 'undefined') return 'transition';
    const prefixes = ['transition', 'webkitTransition', 'mozTransition', 'msTransition'];
    const div = document.createElement('div');
    for (const prefix of prefixes) {
      if (prefix in div.style) return prefix;
    }
    return 'transition';
  },

  /**
   * Get the appropriate animation property name
   */
  animation: () => {
    if (typeof window === 'undefined') return 'animation';
    const prefixes = ['animation', 'webkitAnimation', 'mozAnimation', 'msAnimation'];
    const div = document.createElement('div');
    for (const prefix of prefixes) {
      if (prefix in div.style) return prefix;
    }
    return 'animation';
  },
};

// ============================================================================
// POLYFILL HELPERS
// ============================================================================

export const polyfills = {
  /**
   * Polyfill for requestAnimationFrame
   */
  requestAnimationFrame: () => {
    if (typeof window === 'undefined') return;
    
    let lastTime = 0;
    const vendors = ['webkit', 'moz'];
    
    for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = (window as any)[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame =
        (window as any)[vendors[x] + 'CancelAnimationFrame'] ||
        (window as any)[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback: FrameRequestCallback) => {
        const currTime = new Date().getTime();
        const timeToCall = Math.max(0, 16 - (currTime - lastTime));
        const id = window.setTimeout(() => {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = (id: number) => {
        clearTimeout(id);
      };
    }
  },

  /**
   * Polyfill for smooth scroll behavior
   */
  smoothScroll: () => {
    if (typeof window === 'undefined') return;
    
    if (!('scrollBehavior' in document.documentElement.style)) {
      // Add smooth scroll polyfill if needed
      // Can use smoothscroll-polyfill package
      console.log('Smooth scroll not supported, consider adding polyfill');
    }
  },
};

// ============================================================================
// PERFORMANCE HELPERS
// ============================================================================

export const performance = {
  /**
   * Check if browser supports passive event listeners
   */
  hasPassiveEvents: () => {
    if (typeof window === 'undefined') return false;
    
    let supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: function () {
          supportsPassive = true;
          return true;
        },
      });
      window.addEventListener('testPassive', null as any, opts);
      window.removeEventListener('testPassive', null as any, opts);
    } catch (e) {}
    
    return supportsPassive;
  },

  /**
   * Add event listener with passive option if supported
   */
  addPassiveEventListener: (
    element: HTMLElement | Window,
    event: string,
    handler: EventListener
  ) => {
    const options = performance.hasPassiveEvents() ? { passive: true } : false;
    element.addEventListener(event, handler, options);
  },

  /**
   * Check if browser is in low power mode
   */
  isLowPowerMode: () => {
    if (typeof window === 'undefined') return false;
    // This is approximate - no direct API for this
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};

// ============================================================================
// CLIPBOARD HELPERS
// ============================================================================

export const clipboard = {
  /**
   * Copy text to clipboard with fallback
   */
  copyText: async (text: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    // Try modern Clipboard API first
    if (features.hasClipboardAPI()) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback:', err);
      }
    }
    
    // Fallback to execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('All clipboard methods failed:', err);
      return false;
    }
  },

  /**
   * Read text from clipboard with fallback
   */
  readText: async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    if (features.hasClipboardAPI()) {
      try {
        return await navigator.clipboard.readText();
      } catch (err) {
        console.warn('Clipboard read failed:', err);
        return null;
      }
    }
    
    return null;
  },
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

export const storage = {
  /**
   * Safe localStorage wrapper with fallback
   */
  local: {
    getItem: (key: string): string | null => {
      if (!features.hasLocalStorage()) return null;
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage.getItem failed:', e);
        return null;
      }
    },

    setItem: (key: string, value: string): boolean => {
      if (!features.hasLocalStorage()) return false;
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('localStorage.setItem failed:', e);
        return false;
      }
    },

    removeItem: (key: string): boolean => {
      if (!features.hasLocalStorage()) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.warn('localStorage.removeItem failed:', e);
        return false;
      }
    },

    clear: (): boolean => {
      if (!features.hasLocalStorage()) return false;
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.warn('localStorage.clear failed:', e);
        return false;
      }
    },
  },

  /**
   * Safe sessionStorage wrapper with fallback
   */
  session: {
    getItem: (key: string): string | null => {
      if (!features.hasSessionStorage()) return null;
      try {
        return sessionStorage.getItem(key);
      } catch (e) {
        console.warn('sessionStorage.getItem failed:', e);
        return null;
      }
    },

    setItem: (key: string, value: string): boolean => {
      if (!features.hasSessionStorage()) return false;
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('sessionStorage.setItem failed:', e);
        return false;
      }
    },

    removeItem: (key: string): boolean => {
      if (!features.hasSessionStorage()) return false;
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch (e) {
        console.warn('sessionStorage.removeItem failed:', e);
        return false;
      }
    },

    clear: (): boolean => {
      if (!features.hasSessionStorage()) return false;
      try {
        sessionStorage.clear();
        return true;
      } catch (e) {
        console.warn('sessionStorage.clear failed:', e);
        return false;
      }
    },
  },
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export const initBrowserCompatibility = () => {
  if (typeof window === 'undefined') return;
  
  // Initialize polyfills
  polyfills.requestAnimationFrame();
  polyfills.smoothScroll();
  
  // Log browser info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 Browser Compatibility Info:', {
      browser: getBrowserInfo(),
      features: {
        speechRecognition: features.hasSpeechRecognition(),
        speechSynthesis: features.hasSpeechSynthesis(),
        clipboardAPI: features.hasClipboardAPI(),
        localStorage: features.hasLocalStorage(),
        intersectionObserver: features.hasIntersectionObserver(),
        cssGrid: features.hasCSSGrid(),
        backdropFilter: features.hasBackdropFilter(),
        transforms3D: features.has3DTransforms(),
        webGL: features.hasWebGL(),
        touchEvents: features.hasTouchEvents(),
      },
    });
  }
};

// Auto-initialize on client-side
if (typeof window !== 'undefined') {
  initBrowserCompatibility();
}

export default {
  getBrowserInfo,
  features,
  vendorPrefix,
  polyfills,
  performance,
  clipboard,
  storage,
  initBrowserCompatibility,
};
