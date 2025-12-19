import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

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
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://s3.tradingview.com https://s.tradingview.com https://www.tradingview.com https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://accounts.google.com"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://s3.tradingview.com https://s.tradingview.com https://www.tradingview.com https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://s3.tradingview.com https://www.tradingview.com https://fonts.googleapis.com https://maps.googleapis.com https://accounts.google.com",
    "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://www.google.com https://icons.duckduckgo.com https://img.logo.dev",
    "font-src 'self' data: https://fonts.gstatic.com https://maps.gstatic.com",
    isDev
      ? "connect-src 'self' https: http: ws: wss:"
      : "connect-src 'self' https://api.elevenlabs.io https://api.replicate.com https://*.supabase.co https://generativelanguage.googleapis.com https://maps.googleapis.com https://*.googleapis.com https://api.coingecko.com https://finnhub.io https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://*.tradingview.com wss://*.supabase.co https://accounts.google.com",
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
