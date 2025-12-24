import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  const allowedOrigins = [
    'https://omnifolio.app',
    'https://www.omnifolio.app',
    'https://financial-planner-629380503119.europe-west1.run.app',
    'http://localhost:3000',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  // More permissive CSP in development
  const isDev = process.env.NODE_ENV === 'development';
  
  const cspDirectives = [
    "default-src 'self'",
    // Note: 'unsafe-eval' and 'unsafe-inline' required for:
    // - TradingView widgets
    // - Google Maps API
    // - Next.js development mode
    // - Dynamic imports and blob workers
    isDev 
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://s3.tradingview.com https://s.tradingview.com https://www.tradingview.com https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://accounts.google.com https://*.googletagmanager.com https://*.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://s3.tradingview.com https://s.tradingview.com https://www.tradingview.com https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://accounts.google.com https://*.googletagmanager.com https://*.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net",
    "style-src 'self' 'unsafe-inline' https://s3.tradingview.com https://www.tradingview.com https://fonts.googleapis.com https://maps.googleapis.com https://accounts.google.com",
    "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://www.google.com https://icons.duckduckgo.com https://img.logo.dev https://*.google-analytics.com https://*.g.doubleclick.net https://www.googleadservices.com https://googleads.g.doubleclick.net",
    "font-src 'self' data: https://fonts.gstatic.com https://maps.gstatic.com",
    isDev
      ? "connect-src 'self' https: http: ws: wss:"
      : "connect-src 'self' https://omnifolio.app https://www.omnifolio.app https://api.exchangerate-api.com https://api.elevenlabs.io https://api.replicate.com https://*.supabase.co https://generativelanguage.googleapis.com https://maps.googleapis.com https://*.googleapis.com https://api.coingecko.com https://finnhub.io https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://*.tradingview.com wss://*.supabase.co https://accounts.google.com https://*.google-analytics.com https://www.google-analytics.com https://*.g.doubleclick.net https://stats.g.doubleclick.net https://analytics.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net",
    "media-src 'self' blob: data: https://api.elevenlabs.io https://replicate.delivery",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self' https://www.tradingview.com https://s.tradingview.com https://s3.tradingview.com https://www.tradingview-widget.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  // Only set frame-ancestors in production
  if (!isDev) {
    cspDirectives.push("frame-ancestors 'none'");
  }

  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  );

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

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'microphone=(self), camera=(), geolocation=(), interest-cohort=()'
  );

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
