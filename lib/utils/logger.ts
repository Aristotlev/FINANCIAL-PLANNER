/**
 * Environment-aware logging utility
 * Logs only appear in development mode, production logs are suppressed
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Development-only logs for general information
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Development-only warnings
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Errors are always logged (critical for debugging)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Debug logs (very verbose, only for deep debugging)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Info logs (important development information)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

export default logger;
