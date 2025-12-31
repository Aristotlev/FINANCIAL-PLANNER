/**
 * Safe Logger
 * 
 * A logging utility that sanitizes sensitive data before logging.
 * Use this instead of console.log/warn/error when there's any chance
 * of sensitive data being in the log output.
 * 
 * Sensitive data patterns:
 * - Sync keys (base32-encoded, 4-character groups)
 * - API keys (common patterns)
 * - Tokens (JWT, bearer tokens)
 * - Passwords
 * - Private keys / wallet seeds
 */

// ============================================================================
// SENSITIVE DATA PATTERNS
// ============================================================================

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Sync key format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (base32)
  {
    pattern: /([A-Z2-7]{4}-){7}[A-Z2-7]{4}/gi,
    replacement: '[SYNC_KEY_REDACTED]',
  },
  // JWT tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    replacement: '[JWT_REDACTED]',
  },
  // Bearer tokens
  {
    pattern: /Bearer\s+[A-Za-z0-9_.-]+/gi,
    replacement: 'Bearer [TOKEN_REDACTED]',
  },
  // API keys (common patterns like sk_live_, pk_test_, etc.)
  {
    pattern: /(sk_live_|sk_test_|pk_live_|pk_test_|api_key_|apikey_)[A-Za-z0-9]+/gi,
    replacement: '$1[KEY_REDACTED]',
  },
  // Supabase anon/service keys (long base64 strings after key= or similar)
  {
    pattern: /(service_role_key|anon_key|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY)\s*[=:]\s*["']?[A-Za-z0-9_.-]{100,}/gi,
    replacement: '$1=[KEY_REDACTED]',
  },
  // Private keys (crypto)
  {
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    replacement: '[PRIVATE_KEY_REDACTED]',
  },
  // Ethereum private keys (64 hex chars, often with 0x prefix)
  {
    pattern: /0x[a-fA-F0-9]{64}\b/g,
    replacement: '[ETH_PRIVATE_KEY_REDACTED]',
  },
  // Mnemonic seed phrases (12 or 24 common words)
  {
    pattern: /\b(abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis)\b.*\b(abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis)\b/gi,
    replacement: '[SEED_PHRASE_REDACTED]',
  },
  // Passwords in URLs
  {
    pattern: /(password|passwd|pwd|secret)\s*[=:]\s*["']?[^\s&"']+/gi,
    replacement: '$1=[PASSWORD_REDACTED]',
  },
  // Email addresses (for privacy)
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
];

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Sanitize a value by redacting sensitive patterns.
 */
function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let sanitized = value;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }

    // Handle Error objects specially
    if (value instanceof Error) {
      const sanitizedError = new Error(sanitize(value.message) as string);
      sanitizedError.name = value.name;
      if (value.stack) {
        sanitizedError.stack = sanitize(value.stack) as string;
      }
      return sanitizedError;
    }

    // Regular objects
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Completely redact known sensitive keys
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('synckey') ||
        lowerKey.includes('sync_key') ||
        lowerKey.includes('privatekey') ||
        lowerKey.includes('private_key') ||
        lowerKey.includes('mnemonic') ||
        lowerKey.includes('seed') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('token') ||
        lowerKey.includes('bearer')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(val);
      }
    }
    return sanitized;
  }

  return value;
}

// ============================================================================
// LOGGER INTERFACE
// ============================================================================

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

interface SafeLoggerOptions {
  /** Prefix for all log messages */
  prefix?: string;
  /** Enable/disable logging (useful for production) */
  enabled?: boolean;
  /** Minimum log level to output */
  minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  log: 1,
  info: 2,
  warn: 3,
  error: 4,
};

/**
 * Create a safe logger instance.
 */
export function createSafeLogger(options: SafeLoggerOptions = {}) {
  const {
    prefix = '',
    enabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGS === 'true',
    minLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  } = options;

  const shouldLog = (level: LogLevel): boolean => {
    return enabled && LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
  };

  const formatArgs = (args: unknown[]): unknown[] => {
    const sanitized = args.map(sanitize);
    if (prefix) {
      return [prefix, ...sanitized];
    }
    return sanitized;
  };

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.debug(...formatArgs(args));
      }
    },
    log: (...args: unknown[]) => {
      if (shouldLog('log')) {
        console.log(...formatArgs(args));
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(...formatArgs(args));
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(...formatArgs(args));
      }
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(...formatArgs(args));
      }
    },
  };
}

// ============================================================================
// DEFAULT LOGGER INSTANCE
// ============================================================================

export const safeLog = createSafeLogger();

// ============================================================================
// SYNC-SPECIFIC LOGGER
// ============================================================================

export const syncLog = createSafeLogger({ prefix: '[Sync]' });

// ============================================================================
// UTILITY: SAFE STRINGIFY FOR ERROR REPORTING
// ============================================================================

/**
 * Safely stringify an object for error reporting.
 * Ensures no sensitive data is included.
 */
export function safeStringify(obj: unknown, indent?: number): string {
  const sanitized = sanitize(obj);
  try {
    return JSON.stringify(sanitized, null, indent);
  } catch {
    return '[Unable to stringify]';
  }
}

/**
 * Create a safe error report for external services (Sentry, etc.)
 */
export function createSafeErrorReport(error: unknown): {
  message: string;
  name: string;
  stack?: string;
  extra?: Record<string, unknown>;
} {
  if (error instanceof Error) {
    const sanitizedError = sanitize(error) as Error;
    return {
      message: sanitizedError.message,
      name: sanitizedError.name,
      stack: sanitizedError.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const sanitized = sanitize(error) as Record<string, unknown>;
    return {
      message: String(sanitized['message'] || 'Unknown error'),
      name: String(sanitized['name'] || 'Error'),
      extra: sanitized,
    };
  }

  return {
    message: sanitize(String(error)) as string,
    name: 'Error',
  };
}
