/**
 * Example: How to integrate API Usage Monitor
 * 
 * This file shows how to add monitoring to your API routes
 */

import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { apiUsageMonitor } from '@/lib/api-usage-monitor';

// Example 1: Monitor a simple GET endpoint
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const endpoint = 'coingecko';
  
  // Example cache - replace with your actual cache implementation
  const exampleCache = new Map<string, any>();
  
  try {
    // Check if we should throttle
    if (apiUsageMonitor.shouldThrottle(endpoint)) {
      console.warn('⚠️ Rate limit approaching - using cached data');
      // Return cached data or error
      apiUsageMonitor.trackCall(endpoint, false, true, true);
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }
    
    // Check cache first
    const cached = exampleCache.get(symbol!);
    if (cached) {
      apiUsageMonitor.trackCall(endpoint, true, true);
      return NextResponse.json(cached);
    }
    
    // Make API call
    const response = await fetch(`https://api.coingecko.com/...`);
    
    if (!response.ok) {
      const rateLimited = response.status === 429;
      apiUsageMonitor.trackCall(endpoint, false, false, rateLimited);
      throw new Error('API error');
    }
    
    const data = await response.json();
    
    // Track successful call
    apiUsageMonitor.trackCall(endpoint, true, false);
    
    return NextResponse.json(data);
    
  } catch (error) {
    apiUsageMonitor.trackCall(endpoint, false, false);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Example 2: Get usage statistics endpoint
export async function getAPIStats() {
  const report = apiUsageMonitor.getUsageReport();
  
  return {
    summary: {
      totalCalls: report.totalAPICalls,
      cacheHitRate: `${report.cacheHitRate}%`,
      callsSaved: report.apiSavings,
    },
    byEndpoint: report.byEndpoint,
    rateLimits: report.rateLimits,
  };
}

// Example 3: Console logging for development
export function logAPIUsage() {
  const report = apiUsageMonitor.getUsageReport();
  
  console.log('\n📊 API Usage Report:');
  console.log(`   Total API Calls: ${report.totalAPICalls}`);
  console.log(`   Cache Hit Rate: ${report.cacheHitRate}%`);
  console.log(`   API Calls Saved: ${report.apiSavings}`);
  console.log('\n📈 By Endpoint:');
  
  report.byEndpoint.forEach(stat => {
    console.log(`   ${stat.endpoint}:`);
    console.log(`      Total: ${stat.totalCalls}, Cached: ${stat.cacheHits}, Errors: ${stat.errors}`);
  });
  
  console.log('\n⚡ Rate Limits:');
  report.rateLimits.forEach(limit => {
    console.log(`   ${limit.endpoint}:`);
    console.log(`      Minute: ${limit.minuteUsage}, Hour: ${limit.hourUsage}, Day: ${limit.dailyUsage}`);
  });
}

// Example 4: React component to display stats
export function APIStatsComponent() {
  const [stats, setStats] = React.useState<ReturnType<typeof apiUsageMonitor.getUsageReport> | null>(null);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      const report = apiUsageMonitor.getUsageReport();
      setStats(report);
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (!stats) return <div>Loading stats...</div>;
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">API Usage Statistics</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-500">Total Calls</div>
          <div className="text-2xl font-bold">{stats.totalAPICalls}</div>
        </div>
        
        <div>
          <div className="text-sm text-gray-500">Cache Hit Rate</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.cacheHitRate}%
          </div>
        </div>
        
        <div>
          <div className="text-sm text-gray-500">Calls Saved</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.apiSavings}
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">By Endpoint</h4>
        {stats.byEndpoint.map((stat: any) => (
          <div key={stat.endpoint} className="flex justify-between text-sm mb-1">
            <span>{stat.endpoint}</span>
            <span>
              {stat.totalCalls} calls ({((stat.cacheHits / stat.totalCalls) * 100).toFixed(1)}% cached)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Add to your middleware for automatic tracking
export function middleware(request: NextRequest) {
  const endpoint = request.nextUrl.pathname;
  
  // Log API usage every 100 requests
  const report = apiUsageMonitor.getUsageReport();
  if (report.totalAPICalls % 100 === 0) {
    logAPIUsage();
  }
  
  return NextResponse.next();
}
