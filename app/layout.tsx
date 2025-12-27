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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Trusted Types Polyfill - Must be loaded first to prevent policy errors */}
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
        {/* Runtime environment variables - loaded at runtime, not build time */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ENV__ = {
                NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || '')},
                NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')},
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')},
                NEXT_PUBLIC_APP_URL: ${JSON.stringify(process.env.NEXT_PUBLIC_APP_URL || '')} || window.location.origin,
              };
            `,
          }}
        />
        {/* Ethereum safeguard - prevents wallet extension conflicts */}
        <Script
          src="/ethereum-safeguard.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
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
