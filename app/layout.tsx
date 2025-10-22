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
import Script from "next/script";

// Force dynamic rendering for all pages (disable static generation)
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "Money Hub - Financial Management App",
  description: "Comprehensive financial dashboard for tracking cash, savings, investments, and expenses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Ethereum safeguard - prevents wallet extension conflicts */}
        <Script
          src="/ethereum-safeguard.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
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
      </body>
    </html>
  );
}
