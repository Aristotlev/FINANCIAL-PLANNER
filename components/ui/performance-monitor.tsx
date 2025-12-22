/**
 * Performance Monitor
 * 
 * Tracks and displays performance metrics for the hybrid data system.
 * Only visible in development or when explicitly enabled.
 */

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Zap, Clock, Database, RefreshCw, X } from 'lucide-react';
import { useHybridData } from '@/contexts/hybrid-data-context';
import enhancedCache from '@/lib/enhanced-cache-service';

interface PerformanceMetrics {
  ttfb: number;          // Time to First Byte
  fcp: number;           // First Contentful Paint
  lcp: number;           // Largest Contentful Paint
  cacheHitRate: number;  // Cache hit percentage
  dataFreshness: number; // How fresh is the data (ms since last update)
  activeRequests: number; // Currently pending requests
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    cacheHitRate: 0,
    dataFreshness: 0,
    activeRequests: 0,
  });
  
  const { isHydrated, lastServerFetch, portfolio, marketPrices } = useHybridData();
  
  // Only show in development
  const isDev = process.env.NODE_ENV === 'development';
  
  // Collect Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get navigation timing
    const updateTimingMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        setMetrics(prev => ({
          ...prev,
          ttfb: Math.round(navigation.responseStart - navigation.requestStart),
        }));
      }
    };
    
    // Get paint timing
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: Math.round(entry.startTime) }));
        }
        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => ({ ...prev, lcp: Math.round(entry.startTime) }));
        }
      }
    });
    
    try {
      observer.observe({ type: 'paint', buffered: true });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Observer not supported
    }
    
    updateTimingMetrics();
    
    return () => observer.disconnect();
  }, []);
  
  // Update cache stats
  useEffect(() => {
    const interval = setInterval(() => {
      const cacheStats = enhancedCache.getStats();
      const now = Date.now();
      
      // Calculate data freshness
      const latestUpdate = Math.max(
        portfolio.lastUpdated || 0,
        marketPrices.lastUpdated || 0
      );
      
      setMetrics(prev => ({
        ...prev,
        cacheHitRate: cacheStats.fresh > 0 
          ? Math.round((cacheStats.fresh / (cacheStats.total || 1)) * 100)
          : 0,
        dataFreshness: latestUpdate ? now - latestUpdate : 0,
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [portfolio.lastUpdated, marketPrices.lastUpdated]);
  
  // Toggle with keyboard shortcut (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Status color helpers
  const getStatusColor = (value: number, thresholds: { good: number; warn: number }) => {
    if (value < thresholds.good) return 'text-green-400';
    if (value < thresholds.warn) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getFreshnessLabel = (ms: number) => {
    if (ms < 5000) return 'Fresh';
    if (ms < 30000) return 'Recent';
    if (ms < 60000) return 'Stale';
    return 'Old';
  };
  
  if (!isDev || !isVisible) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl p-4 w-80 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-white">Performance Monitor</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      </div>
      
      {/* Hydration Status */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-gray-800/50 rounded">
        <div className={`w-2 h-2 rounded-full ${isHydrated ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
        <span className="text-gray-300">
          {isHydrated ? 'Hydrated' : 'Hydrating...'}
        </span>
        {lastServerFetch && (
          <span className="text-gray-500 ml-auto">
            SSR: {Date.now() - lastServerFetch}ms ago
          </span>
        )}
      </div>
      
      {/* Web Vitals */}
      <div className="space-y-2 mb-3">
        <div className="text-gray-400 text-[10px] uppercase tracking-wide">Web Vitals</div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <div className={`text-sm font-bold ${getStatusColor(metrics.ttfb, { good: 200, warn: 500 })}`}>
              {metrics.ttfb}ms
            </div>
            <div className="text-gray-500 text-[10px]">TTFB</div>
          </div>
          
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <div className={`text-sm font-bold ${getStatusColor(metrics.fcp, { good: 1000, warn: 2500 })}`}>
              {metrics.fcp}ms
            </div>
            <div className="text-gray-500 text-[10px]">FCP</div>
          </div>
          
          <div className="bg-gray-800/50 rounded p-2 text-center">
            <div className={`text-sm font-bold ${getStatusColor(metrics.lcp, { good: 2500, warn: 4000 })}`}>
              {metrics.lcp}ms
            </div>
            <div className="text-gray-500 text-[10px]">LCP</div>
          </div>
        </div>
      </div>
      
      {/* Data Status */}
      <div className="space-y-2 mb-3">
        <div className="text-gray-400 text-[10px] uppercase tracking-wide">Data Status</div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/50 rounded p-2">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-gray-300">Cache Hit</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {metrics.cacheHitRate}%
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded p-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span className="text-gray-300">Freshness</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${
              metrics.dataFreshness < 30000 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {getFreshnessLabel(metrics.dataFreshness)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Sources */}
      <div className="space-y-1 mb-3">
        <div className="text-gray-400 text-[10px] uppercase tracking-wide">Data Sources</div>
        
        <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
          <span className="text-gray-300">Portfolio</span>
          <span className={`px-2 py-0.5 rounded text-[10px] ${
            portfolio.freshness === 'fresh' ? 'bg-green-500/20 text-green-400' :
            portfolio.freshness === 'stale' ? 'bg-yellow-500/20 text-yellow-400' :
            portfolio.freshness === 'revalidating' ? 'bg-blue-500/20 text-blue-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {portfolio.freshness}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
          <span className="text-gray-300">Market Prices</span>
          <span className={`px-2 py-0.5 rounded text-[10px] ${
            marketPrices.freshness === 'fresh' ? 'bg-green-500/20 text-green-400' :
            marketPrices.freshness === 'stale' ? 'bg-yellow-500/20 text-yellow-400' :
            marketPrices.freshness === 'revalidating' ? 'bg-blue-500/20 text-blue-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {marketPrices.freshness}
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reload</span>
        </button>
        <button
          onClick={() => enhancedCache.clear()}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          <Database className="w-3 h-3" />
          <span>Clear Cache</span>
        </button>
      </div>
      
      {/* Keyboard hint */}
      <div className="mt-3 text-center text-gray-500 text-[10px]">
        Press <kbd className="px-1 bg-gray-700 rounded">⌘⇧P</kbd> to toggle
      </div>
    </div>
  );
}

export default PerformanceMonitor;
