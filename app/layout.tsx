import type { Metadata } from "next";
import "./globals.css";
import { BetterAuthProvider } from "../contexts/better-auth-context";
import { ThemeProvider } from "../contexts/theme-context";
import { APIConnectionProvider } from "../contexts/api-connection-context";
import { PortfolioProvider } from "../contexts/portfolio-context";
import { FinancialDataProvider } from "../contexts/financial-data-context";
import { HiddenCardsProvider } from "../contexts/hidden-cards-context";
import { CardOrderProvider } from "../contexts/card-order-context";
import { CurrencyProvider } from "../contexts/currency-context";
import { ZoomHandler } from "../components/ui/zoom-handler";
import { ReduxWarningsSuppressor } from "../components/ui/redux-warnings-suppressor";
import { ExtensionErrorBoundary } from "../components/ui/extension-error-boundary";
import Script from "next/script";

// Force dynamic rendering for all pages (disable static generation)
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "OmniFolio - All-in-One Financial Management",
  description: "OmniFolio: Your comprehensive financial dashboard for tracking cash, savings, crypto, stocks, real estate, and expenses. Take control of your financial future.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover'
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
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
        {/* Runtime environment variables - loaded at runtime, not build time */}
        <Script
          src="/api/env"
          strategy="beforeInteractive"
        />
        {/* Ethereum safeguard - prevents wallet extension conflicts */}
        <Script
          src="/ethereum-safeguard.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        <ExtensionErrorBoundary>
          <ReduxWarningsSuppressor />
          <ZoomHandler />
          <ThemeProvider>
            <BetterAuthProvider>
              <CurrencyProvider>
                <APIConnectionProvider>
                  <PortfolioProvider>
                    <FinancialDataProvider>
                      <HiddenCardsProvider>
                        <CardOrderProvider>
                          {children}
                        </CardOrderProvider>
                      </HiddenCardsProvider>
                    </FinancialDataProvider>
                  </PortfolioProvider>
                </APIConnectionProvider>
              </CurrencyProvider>
            </BetterAuthProvider>
          </ThemeProvider>
        </ExtensionErrorBoundary>
      </body>
    </html>
  );
}
