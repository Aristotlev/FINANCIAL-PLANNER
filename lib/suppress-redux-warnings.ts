/**
 * Suppress Redux Toolkit ImmutableStateInvariantMiddleware warnings
 * 
 * These warnings appear when using Recharts (which uses Redux internally)
 * with large datasets. They're development-only and don't affect production.
 * 
 * The middleware is automatically disabled in production builds.
 */

export function suppressReduxWarnings() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalWarn = console.warn;
    
    console.warn = (...args: any[]) => {
      // Suppress ImmutableStateInvariantMiddleware warnings from Recharts
      if (
        typeof args[0] === 'string' &&
        args[0].includes('ImmutableStateInvariantMiddleware took') &&
        args[0].includes('which is more than the warning threshold')
      ) {
        return; // Suppress this specific warning
      }
      
      // Allow all other warnings
      originalWarn.apply(console, args);
    };
  }
}
