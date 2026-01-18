import type { Metadata, Viewport } from "next";
import "./globals.css";
import '@xyflow/react/dist/style.css';
import { BetterAuthProvider } from "../contexts/better-auth-context";
import { ThemeProvider } from "../contexts/theme-context";
import { APIConnectionProvider } from "../contexts/api-connection-context";
import { PortfolioProvider } from "../contexts/portfolio-context";
import { FinancialDataProvider } from "../contexts/financial-data-context";
import { CurrencyProvider } from "../contexts/currency-context";
import { HybridDataProvider } from "../contexts/hybrid-data-context";
import { ZoomHandler } from "../components/ui/zoom-handler";
import { ReduxWarningsSuppressor } from "../components/ui/redux-warnings-suppressor";
import { ExtensionErrorBoundary } from "../components/ui/extension-error-boundary";
import { ConsentBanner } from "../components/ui/consent-banner";
import { Preloader } from "../components/ui/preloader";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from "next/script";
import { Inter, Playfair_Display, Dancing_Script } from 'next/font/google';
import { SecurityKeyModal } from "../components/auth/SecurityKeyModal";

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dancing = Dancing_Script({ 
  subsets: ['latin'],
  variable: '--font-dancing',
  display: 'swap',
});

// Force dynamic rendering for all pages (disable static generation)
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.omnifolio.app'),
  title: "OmniFolio - All-in-One Financial Management",
  description: "OmniFolio: Your comprehensive financial dashboard for tracking cash, savings, crypto, stocks, real estate, and expenses. Take control of your financial future.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OmniFolio'
  },
  applicationName: 'OmniFolio',
  keywords: ['finance', 'portfolio', 'investments', 'crypto', 'stocks', 'real estate', 'expense tracking', 'net worth', 'financial planning'],
  authors: [{ name: 'OmniFolio' }],
  creator: 'OmniFolio',
  publisher: 'OmniFolio',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'OmniFolio',
    title: 'OmniFolio - All-in-One Financial Management',
    description: 'Your comprehensive financial dashboard for tracking cash, savings, crypto, stocks, real estate, and expenses. Take control of your financial future with OmniFolio.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'OmniFolio - Financial Management Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniFolio - All-in-One Financial Management',
    description: 'Your comprehensive financial dashboard for tracking investments, crypto, stocks, and expenses.',
    images: ['/api/og'],
    creator: '@omnifolio',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Debug env vars
  if (process.env.NODE_ENV === 'development') {
    console.log('Layout Server Side Env Check:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Found' : 'Missing');
  }

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} ${playfair.variable} ${dancing.variable}`}>
      <head>
        {/* Runtime environment variables - MUST be FIRST to ensure availability before any code runs */}
        {/* Server-side rendered env vars - no XHR needed, values are inlined at render time */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Server-rendered values (available at runtime in production via SSR)
                var serverUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || '')};
                var serverKey = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')};
                var serverMapsKey = ${JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')};
                var serverAppUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_APP_URL || 'https://www.omnifolio.app')};
                
                // Initialize window.__ENV__ with server-rendered values
                window.__ENV__ = {
                  NEXT_PUBLIC_SUPABASE_URL: serverUrl,
                  NEXT_PUBLIC_SUPABASE_ANON_KEY: serverKey,
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: serverMapsKey,
                  NEXT_PUBLIC_APP_URL: serverAppUrl,
                };
                
                window.__ENV_LOADED__ = true;
                
                // Log status for debugging (will be visible in production)
                console.log('[ENV] Initialized:', { 
                  hasUrl: !!serverUrl,
                  hasKey: !!serverKey,
                  hasMapsKey: !!serverMapsKey,
                  appUrl: serverAppUrl
                });
                
                // If values are still missing after SSR, schedule async fetch as fallback
                if (!serverUrl || !serverKey) {
                  console.warn('[ENV] Missing Supabase credentials - scheduling async fetch');
                  window.__ENV_PENDING__ = true;
                  
                  // Use async fetch (non-blocking) as fallback
                  fetch('/api/env')
                    .then(function(res) { return res.text(); })
                    .then(function(script) {
                      try {
                        // Execute the script to update window.__ENV__
                        new Function(script)();
                        window.__ENV_PENDING__ = false;
                        console.log('[ENV] Async fallback loaded:', { 
                          hasUrl: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
                          hasKey: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                        });
                        // Dispatch event so listeners can reinitialize
                        window.dispatchEvent(new CustomEvent('env-loaded'));
                      } catch (e) {
                        console.error('[ENV] Failed to execute env script:', e);
                      }
                    })
                    .catch(function(e) {
                      console.error('[ENV] Async fetch failed:', e);
                    });
                }
              })();
            `,
          }}
        />
        {/* Trusted Types Polyfill - Must be loaded early to prevent policy errors */}
        <script src="/trusted-types.js" />
        {/* Suppress harmless TradingView 403 errors and telemetry blocks */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalConsoleError = console.error;
                const originalConsoleLog = console.log;
                const originalConsoleWarn = console.warn;
                
                const shouldSuppress = (args) => {
                  const msg = String(args[0] || '');
                  return (
                    msg.includes('support-portal-problems') || 
                    msg.includes('tradingview-widget.com') ||
                    msg.includes('tradingview.com') ||
                    msg.includes('telemetry.tradingview') ||
                    msg.includes('Status 403') ||
                    msg.includes('ERR_BLOCKED_BY_CLIENT') ||
                    msg.includes('Failed to fetch') && msg.includes('telemetry')
                  );
                };

                console.error = function(...args) {
                  if (shouldSuppress(args)) return;
                  originalConsoleError.apply(console, args);
                };

                console.log = function(...args) {
                  if (shouldSuppress(args)) return;
                  originalConsoleLog.apply(console, args);
                };

                console.warn = function(...args) {
                  if (shouldSuppress(args)) return;
                  originalConsoleWarn.apply(console, args);
                };
              })();
            `,
          }}
        />
        {/* Google Ads */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17821905669"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17821905669');
          `}
        </Script>
        {/* Ethereum safeguard - prevents wallet extension conflicts */}
        <Script
          src="/ethereum-safeguard.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        <Preloader />
        {/* Google Analytics - Default Consent */}
        <Script id="ga-consent" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied'
            });
          `}
        </Script>
        <GoogleAnalytics gaId="G-6CJBH3X6XC" />
        <ExtensionErrorBoundary>
          <ReduxWarningsSuppressor />
          <ZoomHandler />
          <ThemeProvider>
            <BetterAuthProvider>
              <SecurityKeyModal />
                <CurrencyProvider>
                  <HybridDataProvider>
                    <APIConnectionProvider>
                      <PortfolioProvider>
                        <FinancialDataProvider>
                          {children}
                          <ConsentBanner />
                        </FinancialDataProvider>
                      </PortfolioProvider>
                    </APIConnectionProvider>
                  </HybridDataProvider>
                </CurrencyProvider>
            </BetterAuthProvider>
          </ThemeProvider>
        </ExtensionErrorBoundary>
      </body>
    </html>
  );
}
