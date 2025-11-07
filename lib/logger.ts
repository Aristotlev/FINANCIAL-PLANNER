/**
 * Secure Logger Utility
 * Prevents sensitive data leakage in console logs
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  /** Enable/disable logging based on environment */
  enabled: boolean;
  /** Mask sensitive data */
  maskSecrets: boolean;
  /** Log to external service (e.g., Sentry, LogRocket) */
  remoteLogging?: boolean;
}

const config: LoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  maskSecrets: true,
  remoteLogging: process.env.NODE_ENV === 'production',
};

/**
 * Patterns to detect sensitive data
 */
const SENSITIVE_PATTERNS = {
  apiKey: /AIza[0-9A-Za-z_-]{35}/gi,
  elevenLabsKey: /sk_[a-f0-9]{32}/gi,
  replicateToken: /r8_[a-zA-Z0-9]{40}/gi,
  jwt: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  password: /(password|passwd|pwd)[\s:=]+\S+/gi,
};

/**
 * Mask sensitive data in strings
 */
function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    let masked = data;
    
    // Mask API keys
    masked = masked.replace(SENSITIVE_PATTERNS.apiKey, (match) => 
      `${match.substring(0, 4)}...${match.substring(match.length - 4)}`
    );
    
    // Mask ElevenLabs keys
    masked = masked.replace(SENSITIVE_PATTERNS.elevenLabsKey, (match) => 
      `${match.substring(0, 4)}...${match.substring(match.length - 4)}`
    );
    
    // Mask Replicate tokens
    masked = masked.replace(SENSITIVE_PATTERNS.replicateToken, (match) => 
      `${match.substring(0, 4)}...${match.substring(match.length - 4)}`
    );
    
    // Mask JWTs
    masked = masked.replace(SENSITIVE_PATTERNS.jwt, '[JWT_TOKEN]');
    
    // Mask emails (partially)
    masked = masked.replace(SENSITIVE_PATTERNS.email, (match) => {
      const [local, domain] = match.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    });
    
    // Mask credit cards
    masked = masked.replace(SENSITIVE_PATTERNS.creditCard, '****-****-****-****');
    
    // Mask passwords
    masked = masked.replace(SENSITIVE_PATTERNS.password, '$1: [REDACTED]');
    
    return masked;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Mask values of sensitive keys
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('key') || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('password') ||
          lowerKey.includes('apikey')) {
        masked[key] = typeof value === 'string' && value.length > 8
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : '[REDACTED]';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  
  return data;
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data !== undefined) {
    const processedData = config.maskSecrets ? maskSensitiveData(data) : data;
    return `${prefix} ${message} ${JSON.stringify(processedData, null, 2)}`;
  }
  
  return `${prefix} ${message}`;
}

/**
 * Send logs to remote service (production only)
 */
function sendToRemoteLogging(level: LogLevel, message: string, data?: any) {
  if (!config.remoteLogging) return;
  
  // TODO: Implement remote logging service integration
  // Examples: Sentry, LogRocket, DataDog, CloudWatch
  
  // Example with fetch to custom logging endpoint:
  /*
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level,
      message,
      data: config.maskSecrets ? maskSensitiveData(data) : data,
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
    }),
  }).catch(() => {
    // Fail silently to avoid breaking the app
  });
  */
}

/**
 * Secure logger object
 */
export const logger = {
  /**
   * Log general information (development only)
   */
  log: (message: string, data?: any) => {
    if (!config.enabled) return;
    console.log(formatMessage('log', message, data));
  },

  /**
   * Log informational messages
   */
  info: (message: string, data?: any) => {
    if (!config.enabled) return;
    console.info(formatMessage('info', message, data));
  },

  /**
   * Log warnings (always logged)
   */
  warn: (message: string, data?: any) => {
    const formatted = formatMessage('warn', message, data);
    console.warn(formatted);
    sendToRemoteLogging('warn', message, data);
  },

  /**
   * Log errors (always logged)
   */
  error: (message: string, error?: Error | any) => {
    const formatted = formatMessage('error', message, error);
    console.error(formatted);
    
    // Send errors to remote logging in production
    if (error instanceof Error) {
      sendToRemoteLogging('error', message, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      sendToRemoteLogging('error', message, error);
    }
  },

  /**
   * Log debug information (development only)
   */
  debug: (message: string, data?: any) => {
    if (!config.enabled) return;
    console.debug(formatMessage('debug', message, data));
  },

  /**
   * Log API key status (safely)
   */
  apiKeyStatus: (keyName: string, key?: string) => {
    if (!config.enabled) return;
    
    if (key && key.length > 0) {
      console.log(`✅ ${keyName}: Found (${key.substring(0, 4)}...${key.substring(key.length - 4)})`);
    } else {
      console.log(`❌ ${keyName}: Missing or invalid`);
    }
  },

  /**
   * Log successful operations
   */
  success: (message: string, data?: any) => {
    if (!config.enabled) return;
    console.log(`✅ ${message}`, data ? maskSensitiveData(data) : '');
  },

  /**
   * Log failed operations
   */
  failure: (message: string, error?: Error | any) => {
    console.error(`❌ ${message}`, error);
    sendToRemoteLogging('error', message, error);
  },

  /**
   * Performance timing
   */
  time: (label: string) => {
    if (!config.enabled) return;
    console.time(label);
  },

  timeEnd: (label: string) => {
    if (!config.enabled) return;
    console.timeEnd(label);
  },

  /**
   * Group related logs
   */
  group: (label: string) => {
    if (!config.enabled) return;
    console.group(label);
  },

  groupEnd: () => {
    if (!config.enabled) return;
    console.groupEnd();
  },

  /**
   * Table output for structured data
   */
  table: (data: any) => {
    if (!config.enabled) return;
    console.table(maskSensitiveData(data));
  },
};

/**
 * Configure logger settings
 */
export function configureLogger(newConfig: Partial<LoggerConfig>) {
  Object.assign(config, newConfig);
}

/**
 * Utility to check if API key is valid (without logging it)
 */
export function validateApiKey(key: string, expectedPrefix?: string): boolean {
  if (!key || key.length === 0) {
    logger.warn('API key is empty or undefined');
    return false;
  }

  if (key === 'your_api_key_here' || key === 'undefined' || key === 'null') {
    logger.warn('API key has placeholder value');
    return false;
  }

  if (expectedPrefix && !key.startsWith(expectedPrefix)) {
    logger.warn(`API key does not start with expected prefix: ${expectedPrefix}`);
    return false;
  }

  return true;
}

/**
 * Safe error serialization for logging
 */
export function serializeError(error: unknown): object {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return maskSensitiveData(error);
  }

  return { error: String(error) };
}

export default logger;
