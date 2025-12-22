/**
 * Hybrid Dashboard Wrapper
 * 
 * Server Component that prefetches data and streams it to client components.
 * This provides the fastest possible initial load while maintaining real-time updates.
 */

import { Suspense } from 'react';
import { headers, cookies } from 'next/headers';
import { HybridDataProvider } from '@/contexts/hybrid-data-context';
import { CardGridSkeleton } from '@/components/ui/streaming-loader';

// Server-side data prefetching
async function getInitialData(userId: string | null) {
  // Dynamic import to ensure this only runs on server
  const { prefetchDashboardData } = await import('@/lib/server/data-prefetch');
  return prefetchDashboardData(userId);
}

// Get user ID from session (server-side)
async function getUserId(): Promise<string | null> {
  try {
    const { auth } = await import('@/lib/auth');
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

interface HybridDashboardWrapperProps {
  children: React.ReactNode;
}

export async function HybridDashboardWrapper({ children }: HybridDashboardWrapperProps) {
  const userId = await getUserId();
  const initialData = await getInitialData(userId);
  
  return (
    <HybridDataProvider initialData={initialData || undefined}>
      {children}
    </HybridDataProvider>
  );
}

/**
 * Streaming Dashboard Skeleton
 * Shows immediately while data loads
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header skeleton */}
      <div className="fixed top-2 sm:top-6 right-2 sm:right-6 left-2 sm:left-auto z-50 flex items-center justify-end space-x-2 sm:space-x-4">
        <div className="animate-pulse flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="w-8 h-8 rounded-full bg-gray-800" />
          <div className="w-20 h-8 rounded-lg bg-gray-800" />
        </div>
      </div>
      
      {/* Cards skeleton */}
      <div className="pt-20 sm:pt-32 pb-8 px-2 sm:px-4">
        <div className="container mx-auto">
          <CardGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}

/**
 * Async component for streaming portfolio data
 */
async function PortfolioDataStream({ userId }: { userId: string }) {
  const { prefetchUserPortfolio } = await import('@/lib/server/data-prefetch');
  const portfolio = await prefetchUserPortfolio(userId);
  
  // This data will be streamed to the client
  return (
    <script
      id="portfolio-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(portfolio),
      }}
    />
  );
}

/**
 * Async component for streaming market prices
 */
async function PriceDataStream({ symbols }: { symbols: string[] }) {
  const { prefetchMarketPrices } = await import('@/lib/server/data-prefetch');
  const prices = await prefetchMarketPrices(symbols);
  
  return (
    <script
      id="price-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(prices),
      }}
    />
  );
}

/**
 * Combined streaming wrapper
 */
interface StreamingDataWrapperProps {
  children: React.ReactNode;
  userId?: string | null;
  symbols?: string[];
}

export function StreamingDataWrapper({ 
  children, 
  userId, 
  symbols = [] 
}: StreamingDataWrapperProps) {
  return (
    <>
      {/* Stream data in parallel */}
      {userId && (
        <Suspense fallback={null}>
          <PortfolioDataStream userId={userId} />
        </Suspense>
      )}
      
      {symbols.length > 0 && (
        <Suspense fallback={null}>
          <PriceDataStream symbols={symbols} />
        </Suspense>
      )}
      
      {/* Main content with skeleton fallback */}
      <Suspense fallback={<DashboardSkeleton />}>
        {children}
      </Suspense>
    </>
  );
}

export default HybridDashboardWrapper;
