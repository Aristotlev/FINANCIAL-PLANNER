import type { Metadata, Viewport } from "next";
import "./globals.css";
import '@xyflow/react/dist/style.css';
import { BetterAuthProvider } from "../contexts/better-auth-context";
import { ThemeProvider } from "../contexts/theme-context";
import { APIConnectionProvider } from "../contexts/api-connection-context";
import { PortfolioProvider } from "../contexts/portfolio-context";
import { FinancialDataProvider } from "../contexts/financial-data-context";
import { HiddenCardsProvider } from "../contexts/hidden-cards-context";
import { CardOrderProvider } from "../contexts/card-order-context";
import { CurrencyProvider } from "../contexts/currency-context";
import { HybridDataProvider } from "../contexts/hybrid-data-context";
import { ZoomHandler } from "../components/ui/zoom-handler";
import { ReduxWarningsSuppressor } from "../components/ui/redux-warnings-suppressor";
import { ExtensionErrorBoundary } from "../components/ui/extension-error-boundary";
import { ConsentBanner } from "../components/ui/consent-banner";
import { Preloader } from "../components/ui/preloader";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from "next/script";

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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Runtime environment variables - MUST be FIRST to ensure availability before any code runs */}
        {/* Uses synchronous XHR to block until env vars are loaded - critical for production */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Try to get build-time values first (works in dev, may be empty in prod)
                var buildTimeUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || '')};
                var buildTimeKey = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')};
                var buildTimeMapsKey = ${JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')};
                var buildTimeAppUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_APP_URL || '')};
                
                // Initialize with build-time values
                window.__ENV__ = {
                  NEXT_PUBLIC_SUPABASE_URL: buildTimeUrl,
                  NEXT_PUBLIC_SUPABASE_ANON_KEY: buildTimeKey,
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: buildTimeMapsKey,
                  NEXT_PUBLIC_APP_URL: buildTimeAppUrl,
                };
                
                // If Supabase URL is missing, fetch from API synchronously (production scenario)
                if (!buildTimeUrl) {
                  try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '/api/env', false); // false = synchronous
                    xhr.send(null);
                    if (xhr.status === 200) {
                      // Execute the returned script
                      eval(xhr.responseText);
                      console.log('[ENV] Loaded from API:', { 
                        hasUrl: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
                        hasKey: !!window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                      });
                    } else {
                      console.error('[ENV] Failed to fetch env vars:', xhr.status);
                    }
                  } catch (e) {
                    console.error('[ENV] Error fetching env vars:', e);
                  }
                }
                
                window.__ENV_LOADED__ = true;
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
              <CurrencyProvider>
                <HybridDataProvider>
                  <APIConnectionProvider>
                    <PortfolioProvider>
                      <FinancialDataProvider>
                        <HiddenCardsProvider>
                          <CardOrderProvider>
                            {children}
                            <ConsentBanner />
                          </CardOrderProvider>
                        </HiddenCardsProvider>
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
