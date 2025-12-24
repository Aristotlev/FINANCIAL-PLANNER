/**
 * IP Allowlist for Admin Routes
 * 
 * Implements IP-based access control for sensitive admin endpoints.
 * 
 * Features:
 * - Configurable IP allowlist
 * - CIDR notation support
 * - Environment-based configuration
 * - Bypass for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from './audit-logger';

// Default admin IPs (override via environment variable)
const DEFAULT_ADMIN_IPS: string[] = [];

// Parse CIDR notation
function parseCIDR(cidr: string): { ip: string; mask: number } | null {
  const parts = cidr.split('/');
  if (parts.length === 1) {
    return { ip: parts[0], mask: 32 }; // Single IP, full mask
  }
  if (parts.length === 2) {
    const mask = parseInt(parts[1], 10);
    if (mask >= 0 && mask <= 32) {
      return { ip: parts[0], mask };
    }
  }
  return null;
}

// Convert IP to 32-bit integer
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return 0;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

// Check if IP matches CIDR
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr);
  if (!parsed) return false;

  const ipInt = ipToInt(ip);
  const cidrInt = ipToInt(parsed.ip);
  const mask = (0xFFFFFFFF << (32 - parsed.mask)) >>> 0;

  return (ipInt & mask) === (cidrInt & mask);
}

/**
 * Get the list of allowed admin IPs from environment
 */
export function getAdminAllowlist(): string[] {
  const envIPs = process.env.ADMIN_ALLOWED_IPS;
  
  if (envIPs) {
    return envIPs.split(',').map(ip => ip.trim()).filter(Boolean);
  }

  return DEFAULT_ADMIN_IPS;
}

/**
 * Extract client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback
  return 'unknown';
}

/**
 * Check if an IP is in the admin allowlist
 */
export function isIPAllowed(ip: string, allowlist?: string[]): boolean {
  const list = allowlist || getAdminAllowlist();

  // If no allowlist configured, deny all in production, allow all in dev
  if (list.length === 0) {
    return process.env.NODE_ENV === 'development';
  }

  // Check each entry (supports both exact match and CIDR)
  return list.some(entry => {
    // Exact match
    if (entry === ip) return true;
    
    // CIDR match
    if (entry.includes('/')) {
      return ipMatchesCIDR(ip, entry);
    }

    return false;
  });
}

/**
 * Middleware to enforce IP allowlist on admin routes
 */
export function withIPAllowlist(
  request: NextRequest,
  options?: {
    allowlist?: string[];
    logAttempts?: boolean;
  }
): { allowed: boolean; response?: NextResponse; ip: string } {
  const { allowlist, logAttempts = true } = options || {};

  // Skip in development mode
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, ip: 'localhost' };
  }

  const clientIP = getClientIP(request);
  const allowed = isIPAllowed(clientIP, allowlist);

  if (!allowed) {
    // Log the blocked attempt
    if (logAttempts) {
      logSecurityEvent('IP_BLOCKED', `Blocked access from ${clientIP} to ${request.url}`, {
        severity: 'WARN',
        ip: clientIP,
        metadata: {
          path: new URL(request.url).pathname,
          method: request.method,
          userAgent: request.headers.get('user-agent'),
        },
      });
    }

    return {
      allowed: false,
      ip: clientIP,
      response: NextResponse.json(
        { 
          error: 'Access denied',
          message: 'Your IP address is not authorized to access this resource.',
        },
        { status: 403 }
      ),
    };
  }

  // Log successful access (optional)
  if (logAttempts) {
    logSecurityEvent('IP_ALLOWED', `Allowed access from ${clientIP} to ${request.url}`, {
      severity: 'INFO',
      ip: clientIP,
    });
  }

  return { allowed: true, ip: clientIP };
}

/**
 * Admin-only route wrapper
 */
export function withAdminOnly<T extends { request: NextRequest }>(
  handler: (context: T) => Promise<Response>
): (context: T) => Promise<Response> {
  return async (context: T) => {
    const ipCheck = withIPAllowlist(context.request);
    
    if (!ipCheck.allowed && ipCheck.response) {
      return ipCheck.response;
    }

    return handler(context);
  };
}

/**
 * Check if current request is from an admin IP
 */
export function isAdminRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const clientIP = getClientIP(request);
  return isIPAllowed(clientIP);
}

/**
 * Temporarily allow an IP address (for emergency access)
 * Note: This only works for the current process, not across instances
 */
const temporaryAllowlist = new Set<string>();

export function temporarilyAllowIP(ip: string, durationMs: number = 3600000): void {
  temporaryAllowlist.add(ip);
  
  setTimeout(() => {
    temporaryAllowlist.delete(ip);
  }, durationMs);
}

export function isTemporarilyAllowed(ip: string): boolean {
  return temporaryAllowlist.has(ip);
}

/**
 * Extended IP check that includes temporary allowlist
 */
export function isIPAllowedExtended(ip: string, allowlist?: string[]): boolean {
  return isTemporarilyAllowed(ip) || isIPAllowed(ip, allowlist);
}
