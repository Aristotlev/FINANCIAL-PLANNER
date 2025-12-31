/**
 * Security Module Index
 * Centralizes all security-related utilities for the application.
 * 
 * Includes:
 * - Rate limiting (with Redis support for multi-instance)
 * - Audit logging  
 * - CSRF protection (with Redis support for multi-instance)
 * - IP allowlisting
 * - Secret management
 * - Redis client for distributed security
 * - HTML sanitization for XSS prevention
 * - Input validation for portfolio data
 * - Safe logging (prevents sensitive data leaks)
 */

export * from './rate-limiter';
export * from './audit-logger';
export * from './csrf';
export * from './ip-allowlist';
export * from './secrets';
export * from './redis';
export * from './sanitize';
export * from './encryption';
export * from './auth-protection';

// New Phase 3 security modules (imported with prefixes to avoid conflicts)
export {
  // Input validation (excluding sanitize functions that conflict with ./sanitize)
  normalizeWhitespace,
  validateSymbol,
  validateQuantity,
  validatePrice,
  validatePortfolioName,
  validateNotes,
  validateTag,
  validateTags,
  validateEthAddress,
  validateBtcAddress,
  validateSolAddress,
  validateUUID,
  validateUrl,
  validateDate,
  validatePortfolioEntry,
  type ValidationResult,
  type PortfolioEntryInput,
  type ValidatedPortfolioEntry,
} from './input-validation';

export {
  // Rate limiting (serverless-compatible, prefix with 'serverless')
  createRateLimiter as createServerlessRateLimiter,
  syncLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  expensiveLimiter,
  addRateLimitHeaders,
  rateLimitResponse,
  incrementCounter,
  getTelemetry,
  resetTelemetry,
  type RateLimitResult,
} from './rate-limit';

export {
  // Safe logging
  createSafeLogger,
  safeLog,
  syncLog,
  safeStringify,
  createSafeErrorReport,
} from './safe-logger';
