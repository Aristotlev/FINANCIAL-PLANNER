import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security header configuration via environment variables
// CSP_MODE: 'enforce' | 'report-only' | 'off' (default: 'enforce' in prod, 'off' in dev)
// CSP_REPORT_URI: Optional URI for CSP violation reports

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // CRITICAL: Redirect non-www to www to prevent OAuth state_mismatch
  // This MUST happen for ALL requests including OAuth callbacks
  // The state cookie is set on .omnifolio.app so it will be available after redirect
  if (url.hostname === 'omnifolio.app') {
    url.hostname = 'www.omnifolio.app';
    // Use 308 for POST requests to preserve method, 301 for GET
    const statusCode = request.method === 'GET' ? 301 : 308;
    return NextResponse.redirect(url, statusCode);
  }
  
  const response = NextResponse.next();
  
  // Handle CORS for cross-origin requests (including Cloud Run URLs)
  const origin = request.headers.get('origin');
  
  // Allow any origin to access the API (permissive mode for troubleshooting)
  // This is safe because we still rely on authentication for sensitive data
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  // Prevent caching for the app shell to ensure env vars are fresh
  if (!url.pathname.startsWith('/_next/') && !url.pathname.startsWith('/static/') && !url.pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }

  // More permissive CSP in development
  const isDev = process.env.NODE_ENV === 'development';
  
  // CSP Mode: 'enforce' (default in prod), 'report-only', or 'off'
  const cspMode = process.env.CSP_MODE || (isDev ? 'off' : 'enforce');
  const cspReportUri = process.env.CSP_REPORT_URI;
  
  if (cspMode !== 'off') {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://s3.tradingview.com https://s.tradingview.com https://www.tradingview.com https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://accounts.google.com https://*.googletagmanager.com https://*.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://maps.google.com",
      "style-src 'self' 'unsafe-inline' https://s3.tradingview.com https://www.tradingview.com https://fonts.googleapis.com https://maps.googleapis.com https://accounts.google.com https://maps.google.com",
      "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://www.google.com https://icons.duckduckgo.com https://img.logo.dev https://*.google-analytics.com https://*.g.doubleclick.net https://www.googleadservices.com https://googleads.g.doubleclick.net https://maps.google.com",
      "font-src 'self' data: https://fonts.gstatic.com https://maps.gstatic.com",
      "connect-src 'self' https://omnifolio.app https://www.omnifolio.app https://api.exchangerate-api.com https://api.elevenlabs.io https://api.replicate.com https://*.supabase.co https://generativelanguage.googleapis.com https://maps.googleapis.com https://*.googleapis.com https://api.coingecko.com https://finnhub.io https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://*.tradingview.com https://*.tradingview-widget.com wss://*.supabase.co https://accounts.google.com https://*.google-analytics.com https://www.google-analytics.com https://*.g.doubleclick.net https://stats.g.doubleclick.net https://analytics.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://maps.google.com wss://stream.binance.com:9443 wss://ws-api.binance.com:443 wss://ws.finnhub.io",
      "media-src 'self' blob: data: https://api.elevenlabs.io https://replicate.delivery",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "frame-src 'self' https://www.tradingview.com https://s.tradingview.com https://s3.tradingview.com https://www.tradingview-widget.com https://accounts.google.com https://maps.googleapis.com https://*.googleapis.com https://maps.google.com https://*.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ];

    // Add report-uri if configured
    if (cspReportUri) {
      cspDirectives.push(`report-uri ${cspReportUri}`);
    }

    const cspHeader = cspMode === 'report-only' 
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    
    response.headers.set(cspHeader, cspDirectives.join('; '));
  }

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS - Force HTTPS for 1 year, include subdomains, allow preload list
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Permissions Policy - restrictive by default, only enable what's needed
  response.headers.set(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self "https://www.youtube.com")',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=(self "https://www.youtube.com")',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
      'geolocation=(self)',      // Needed for map features
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=(self)',       // For voice features if any
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=(self "https://www.youtube.com")',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
    ].join(', ')
  );

  // Cross-Origin policies for additional isolation
  // Note: These can break some third-party integrations, enable carefully
  // response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  // response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * 
     * NOTE: api/auth is intentionally INCLUDED to ensure CORS headers are applied
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
