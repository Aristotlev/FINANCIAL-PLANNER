/**
 * Streaming Data Loader Components
 * 
 * Uses React Suspense and streaming SSR to progressively load and display data.
 * This provides instant feedback while heavy data loads in the background.
 */

import React, { Suspense } from 'react';

// Loading skeleton component for cards
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 ${className}`}
      style={{ minHeight: '280px', minWidth: '320px' }}
    >
      <div className="p-6 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-700/50" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-700/50 rounded" />
              <div className="h-3 w-16 bg-gray-700/50 rounded" />
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gray-700/50" />
        </div>
        
        {/* Value skeleton */}
        <div className="space-y-2 pt-4">
          <div className="h-8 w-32 bg-gray-700/50 rounded" />
          <div className="h-4 w-20 bg-gray-700/50 rounded" />
        </div>
        
        {/* Chart/list skeleton */}
        <div className="flex gap-2 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-16 bg-gray-700/50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Multiple card skeletons for grid layout
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-6 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// News skeleton
export function NewsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-800/30">
          <div className="w-16 h-16 rounded-lg bg-gray-700/50 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-gray-700/50 rounded" />
            <div className="h-3 w-1/2 bg-gray-700/50 rounded" />
            <div className="h-3 w-1/4 bg-gray-700/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div 
      className="animate-pulse bg-gray-800/30 rounded-xl flex items-end justify-around p-4 gap-2"
      style={{ height }}
    >
      {[60, 80, 45, 90, 70, 55, 85, 75].map((h, i) => (
        <div 
          key={i} 
          className="w-full bg-gray-700/50 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// Price ticker skeleton
export function PriceTickerSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-700/50" />
          <div className="space-y-1">
            <div className="h-3 w-12 bg-gray-700/50 rounded" />
            <div className="h-2 w-8 bg-gray-700/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Wrapper component for streaming with fallback
interface StreamingLoaderProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export function StreamingLoader({ children, fallback }: StreamingLoaderProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// Progressive loading wrapper - shows content as it becomes available
interface ProgressiveLoaderProps {
  children: React.ReactNode;
  isLoaded: boolean;
  skeleton: React.ReactNode;
  minimumDelay?: number; // Prevent flash of skeleton for fast loads
}

export function ProgressiveLoader({ 
  children, 
  isLoaded, 
  skeleton,
  minimumDelay = 100 
}: ProgressiveLoaderProps) {
  const [showSkeleton, setShowSkeleton] = React.useState(!isLoaded);
  const [hasDelayed, setHasDelayed] = React.useState(false);

  React.useEffect(() => {
    if (!isLoaded && !hasDelayed) {
      const timer = setTimeout(() => {
        setHasDelayed(true);
        setShowSkeleton(true);
      }, minimumDelay);
      return () => clearTimeout(timer);
    }
    
    if (isLoaded) {
      setShowSkeleton(false);
    }
  }, [isLoaded, hasDelayed, minimumDelay]);

  if (!isLoaded && showSkeleton) {
    return <>{skeleton}</>;
  }

  return (
    <div className={isLoaded ? 'animate-fadeIn' : 'opacity-0'}>
      {children}
    </div>
  );
}

// Staggered reveal animation for cards
interface StaggeredRevealProps {
  children: React.ReactNode[];
  delayBetween?: number; // ms between each child reveal
  initialDelay?: number; // ms before first child
}

export function StaggeredReveal({ 
  children, 
  delayBetween = 50,
  initialDelay = 0 
}: StaggeredRevealProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="animate-slideInUp"
          style={{
            animationDelay: `${initialDelay + index * delayBetween}ms`,
            animationFillMode: 'both',
          }}
        >
          {child}
        </div>
      ))}
    </>
  );
}

// Add these keyframe animations to your globals.css:
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
// @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
// .animate-slideInUp { animation: slideInUp 0.4s ease-out; }
