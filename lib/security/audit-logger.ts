/**
 * Security Audit Logger
 * 
 * Provides comprehensive logging for security-related events.
 * In production, logs should be forwarded to Cloud Logging or similar.
 * 
 * Features:
 * - Request logging with sanitization
 * - Security event tracking
 * - Error logging with context
 * - Structured JSON output for analysis
 */

import { NextRequest } from 'next/server';

export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'AUTH_SESSION_CREATED'
  | 'AUTH_SESSION_DESTROYED'
  | 'API_REQUEST'
  | 'API_ERROR'
  | 'RATE_LIMITED'
  | 'CSRF_VIOLATION'
  | 'IP_BLOCKED'
  | 'IP_ALLOWED'
  | 'SECRET_ACCESS'
  | 'PERMISSION_DENIED'
  | 'DATA_ACCESS'
  | 'DATA_MODIFY'
  | 'DATA_DELETE'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_VERIFIED'
  | 'WEBHOOK_FAILED'
  | 'SECURITY_ALERT'
  | 'BOT_BLOCKED';

export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

// In-memory audit log buffer (for batching)
const auditBuffer: AuditLogEntry[] = [];
const BUFFER_SIZE = 100;
const FLUSH_INTERVAL_MS = 10000; // 10 seconds

// Request ID counter
let requestIdCounter = 0;

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (++requestIdCounter).toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${counter}-${random}`;
}

/**
 * Extract client info from request
 */
export function getRequestInfo(request: NextRequest): {
  ip: string;
  userAgent: string;
  path: string;
  method: string;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfIp || (forwarded ? forwarded.split(',')[0].trim() : realIp) || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = new URL(request.url).pathname;
  const method = request.method;

  return { ip, userAgent, path, method };
}

/**
 * Sanitize sensitive data from metadata
 */
function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
  if (!metadata) return undefined;

  const sensitiveKeys = [
    'password', 'secret', 'token', 'apiKey', 'api_key',
    'authorization', 'cookie', 'session', 'creditCard',
    'ssn', 'pin', 'cvv'
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: AuditLogEntry): string {
  return JSON.stringify({
    ...entry,
    metadata: sanitizeMetadata(entry.metadata),
  });
}

/**
 * Write log entry to appropriate destination
 */
function writeLog(entry: AuditLogEntry) {
  const formatted = formatLogEntry(entry);

  // In production, logs go to stdout for Cloud Logging to pick up
  switch (entry.severity) {
    case 'CRITICAL':
    case 'ERROR':
      console.error(`[AUDIT] ${formatted}`);
      break;
    case 'WARN':
      console.warn(`[AUDIT] ${formatted}`);
      break;
    default:
      console.log(`[AUDIT] ${formatted}`);
  }

  // Buffer for potential batch processing
  auditBuffer.push(entry);
  if (auditBuffer.length >= BUFFER_SIZE) {
    flushAuditBuffer();
  }
}

/**
 * Flush audit buffer (for batch processing)
 */
export function flushAuditBuffer(): AuditLogEntry[] {
  const entries = [...auditBuffer];
  auditBuffer.length = 0;
  return entries;
}

/**
 * Main audit logging function
 */
export function auditLog(
  eventType: AuditEventType,
  message: string,
  options: {
    severity?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    userId?: string;
    request?: NextRequest;
    statusCode?: number;
    metadata?: Record<string, any>;
    requestId?: string;
  } = {}
) {
  const { severity = 'INFO', userId, request, statusCode, metadata, requestId } = options;

  const requestInfo = request ? getRequestInfo(request) : undefined;

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId,
    ip: requestInfo?.ip,
    userAgent: requestInfo?.userAgent,
    path: requestInfo?.path,
    method: requestInfo?.method,
    statusCode,
    message,
    metadata,
    requestId: requestId || (request ? generateRequestId() : undefined),
  };

  writeLog(entry);
}

/**
 * Log an API request
 */
export function logApiRequest(
  request: NextRequest,
  userId?: string,
  metadata?: Record<string, any>
) {
  const requestId = generateRequestId();
  
  auditLog('API_REQUEST', `API request: ${request.method} ${new URL(request.url).pathname}`, {
    userId,
    request,
    metadata: { ...metadata, requestId },
    requestId,
  });

  return requestId;
}

/**
 * Log an API response
 */
export function logApiResponse(
  request: NextRequest,
  statusCode: number,
  requestId: string,
  userId?: string,
  metadata?: Record<string, any>
) {
  const path = new URL(request.url).pathname;
  const eventType = statusCode >= 400 ? 'API_ERROR' : 'API_REQUEST';
  const severity = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

  auditLog(eventType, `API response: ${request.method} ${path} -> ${statusCode}`, {
    severity,
    userId,
    request,
    statusCode,
    metadata: { ...metadata, requestId },
    requestId,
  });
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  eventType: AuditEventType,
  message: string,
  options: {
    severity?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    userId?: string;
    ip?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  const { severity = 'WARN', userId, ip, metadata } = options;

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId,
    ip,
    message,
    metadata,
  };

  writeLog(entry);
}

/**
 * Log authentication events
 */
export const authAudit = {
  login: (userId: string, ip: string, success: boolean, metadata?: Record<string, any>) => {
    auditLog(success ? 'AUTH_LOGIN' : 'AUTH_FAILED', 
      success ? `User ${userId} logged in` : `Login failed for ${userId}`, {
      severity: success ? 'INFO' : 'WARN',
      userId,
      metadata: { ip, ...metadata },
    });
  },

  logout: (userId: string, ip: string) => {
    auditLog('AUTH_LOGOUT', `User ${userId} logged out`, {
      userId,
      metadata: { ip },
    });
  },

  sessionCreated: (userId: string, ip: string, sessionId: string) => {
    auditLog('AUTH_SESSION_CREATED', `Session created for ${userId}`, {
      userId,
      metadata: { ip, sessionId: sessionId.substring(0, 8) + '...' },
    });
  },
};

/**
 * Log data access events
 */
export const dataAudit = {
  access: (userId: string, table: string, count: number, request?: NextRequest) => {
    auditLog('DATA_ACCESS', `User ${userId} accessed ${count} records from ${table}`, {
      userId,
      request,
      metadata: { table, recordCount: count },
    });
  },

  modify: (userId: string, table: string, recordId: string, request?: NextRequest) => {
    auditLog('DATA_MODIFY', `User ${userId} modified record ${recordId} in ${table}`, {
      userId,
      request,
      metadata: { table, recordId },
    });
  },

  delete: (userId: string, table: string, recordId: string, request?: NextRequest) => {
    auditLog('DATA_DELETE', `User ${userId} deleted record ${recordId} from ${table}`, {
      severity: 'WARN',
      userId,
      request,
      metadata: { table, recordId },
    });
  },
};

/**
 * Log webhook events
 */
export const webhookAudit = {
  received: (provider: string, eventType: string, request: NextRequest) => {
    auditLog('WEBHOOK_RECEIVED', `Webhook received from ${provider}: ${eventType}`, {
      request,
      metadata: { provider, eventType },
    });
  },

  verified: (provider: string, eventType: string) => {
    auditLog('WEBHOOK_VERIFIED', `Webhook verified: ${provider} ${eventType}`, {
      metadata: { provider, eventType },
    });
  },

  failed: (provider: string, reason: string, request: NextRequest) => {
    auditLog('WEBHOOK_FAILED', `Webhook verification failed: ${provider} - ${reason}`, {
      severity: 'ERROR',
      request,
      metadata: { provider, reason },
    });
  },
};

// Start flush interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (auditBuffer.length > 0) {
      flushAuditBuffer();
    }
  }, FLUSH_INTERVAL_MS);
}
