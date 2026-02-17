/**
 * API Usage Monitor
 * 
 * Tracks and limits API calls to prevent exceeding free tier quotas
 * Provides metrics and warnings when approaching limits
 */

interface APIUsageStats {
  endpoint: string;
  totalCalls: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  rateLimitErrors: number;
  lastReset: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

interface APILimits {
  coinGecko: {
    callsPerMinute: number;
    callsPerMonth: number;
  };
  yahooFinance: {
    callsPerHour: number;
  };
  rss: {
    noLimit: boolean;
  };
}

class APIUsageMonitor {
  private stats: Map<string, APIUsageStats> = new Map();
  private minuteWindows: Map<string, number[]> = new Map();
  private hourWindows: Map<string, number[]> = new Map();
  private dailyWindows: Map<string, number[]> = new Map();
  private monthlyWindows: Map<string, number[]> = new Map();
  
  // Free tier limits (conservative estimates to stay safe)
  private readonly limits: APILimits = {
    coinGecko: {
      callsPerMinute: 10, // CoinGecko free tier: 10-50/min
      callsPerMonth: 10000, // Conservative estimate
    },
    yahooFinance: {
      callsPerHour: 2000, // Unofficial - Yahoo is generally lenient
    },
    rss: {
      noLimit: true, // RSS feeds have no rate limits
    },
  };

  /**
   * Track an API call
   */
  trackCall(endpoint: string, success: boolean, cached: boolean, rateLimited: boolean = false) {
    const now = Date.now();
    
    // Initialize stats if not exists
    if (!this.stats.has(endpoint)) {
      this.stats.set(endpoint, {
        endpoint,
        totalCalls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        rateLimitErrors: 0,
        lastReset: now,
      });
    }
    
    const stat = this.stats.get(endpoint)!;
    
    // Update counters
    stat.totalCalls++;
    if (cached) {
      stat.cacheHits++;
    } else {
      stat.cacheMisses++;
    }
    
    if (!success) {
      stat.errors++;
    }
    
    if (rateLimited) {
      stat.rateLimitErrors++;
    }
    
    // Track time windows (only for non-cached calls)
    if (!cached) {
      this.trackTimeWindows(endpoint, now);
    }
    
    // Check if we're approaching limits
    this.checkLimits(endpoint);
  }

  /**
   * Track calls in time windows for rate limiting
   */
  private trackTimeWindows(endpoint: string, timestamp: number) {
    // Track minute window
    if (!this.minuteWindows.has(endpoint)) {
      this.minuteWindows.set(endpoint, []);
    }
    this.minuteWindows.get(endpoint)!.push(timestamp);
    
    // Track hour window
    if (!this.hourWindows.has(endpoint)) {
      this.hourWindows.set(endpoint, []);
    }
    this.hourWindows.get(endpoint)!.push(timestamp);
    
    // Track daily window
    if (!this.dailyWindows.has(endpoint)) {
      this.dailyWindows.set(endpoint, []);
    }
    this.dailyWindows.get(endpoint)!.push(timestamp);
    
    // Track monthly window
    if (!this.monthlyWindows.has(endpoint)) {
      this.monthlyWindows.set(endpoint, []);
    }
    this.monthlyWindows.get(endpoint)!.push(timestamp);
    
    // Clean up old entries
    this.cleanupTimeWindows();
  }

  /**
   * Clean up old time window entries
   */
  private cleanupTimeWindows() {
    const now = Date.now();
    
    // Clean minute windows (keep last 60 seconds)
    this.minuteWindows.forEach((timestamps, endpoint) => {
      this.minuteWindows.set(
        endpoint,
        timestamps.filter(t => now - t < 60000)
      );
    });
    
    // Clean hour windows (keep last 60 minutes)
    this.hourWindows.forEach((timestamps, endpoint) => {
      this.hourWindows.set(
        endpoint,
        timestamps.filter(t => now - t < 3600000)
      );
    });
    
    // Clean daily windows (keep last 24 hours)
    this.dailyWindows.forEach((timestamps, endpoint) => {
      this.dailyWindows.set(
        endpoint,
        timestamps.filter(t => now - t < 86400000)
      );
    });
    
    // Clean monthly windows (keep last 30 days)
    this.monthlyWindows.forEach((timestamps, endpoint) => {
      this.monthlyWindows.set(
        endpoint,
        timestamps.filter(t => now - t < 2592000000)
      );
    });
  }

  /**
   * Check if we're approaching rate limits
   */
  private checkLimits(endpoint: string) {
    const apiType = this.getAPIType(endpoint);
    if (!apiType) return;
    
    const limits = this.limits[apiType as keyof APILimits];
    if (!limits || (limits as any).noLimit) return;
    
    // Check minute rate
    if ('callsPerMinute' in limits) {
      const minuteCalls = this.minuteWindows.get(endpoint)?.length || 0;
      const minuteLimit = limits.callsPerMinute;
      
      if (minuteCalls >= minuteLimit * 0.8) {
        console.warn(`⚠️ API ${endpoint} approaching minute limit: ${minuteCalls}/${minuteLimit}`);
      }
      
      if (minuteCalls >= minuteLimit) {
        console.error(`🚫 API ${endpoint} minute limit exceeded: ${minuteCalls}/${minuteLimit}`);
      }
    }
    
    // Check hour rate
    if ('callsPerHour' in limits) {
      const hourCalls = this.hourWindows.get(endpoint)?.length || 0;
      const hourLimit = limits.callsPerHour;
      
      if (hourCalls >= hourLimit * 0.8) {
        console.warn(`⚠️ API ${endpoint} approaching hour limit: ${hourCalls}/${hourLimit}`);
      }
    }
  }

  /**
   * Get API type from endpoint
   */
  private getAPIType(endpoint: string): string | null {
    if (endpoint.includes('coingecko') || endpoint.includes('crypto')) {
      return 'coinGecko';
    }
    if (endpoint.includes('yahoo') || endpoint.includes('stock')) {
      return 'yahooFinance';
    }
    if (endpoint.includes('news') || endpoint.includes('rss')) {
      return 'rss';
    }
    return null;
  }

  /**
   * Check if an API call should be throttled
   */
  shouldThrottle(endpoint: string): boolean {
    const apiType = this.getAPIType(endpoint);
    if (!apiType) return false;
    
    const limits = this.limits[apiType as keyof APILimits];
    if (!limits || (limits as any).noLimit) return false;
    
    // Check minute rate
    if ('callsPerMinute' in limits) {
      const minuteCalls = this.minuteWindows.get(endpoint)?.length || 0;
      if (minuteCalls >= limits.callsPerMinute) {
        return true;
      }
    }
    
    // Check hour rate
    if ('callsPerHour' in limits) {
      const hourCalls = this.hourWindows.get(endpoint)?.length || 0;
      if (hourCalls >= limits.callsPerHour) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get usage statistics
   */
  getStats(endpoint?: string): APIUsageStats | APIUsageStats[] {
    if (endpoint) {
      return this.stats.get(endpoint) || {
        endpoint,
        totalCalls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        rateLimitErrors: 0,
        lastReset: Date.now(),
      };
    }
    
    return Array.from(this.stats.values());
  }

  /**
   * Get comprehensive usage report
   */
  getUsageReport(): {
    totalAPICalls: number;
    totalCacheHits: number;
    totalCacheMisses: number;
    cacheHitRate: number;
    apiSavings: number;
    byEndpoint: APIUsageStats[];
    rateLimits: {
      endpoint: string;
      minuteUsage: number;
      hourUsage: number;
      dailyUsage: number;
    }[];
  } {
    const allStats = Array.from(this.stats.values());
    const totalAPICalls = allStats.reduce((sum, s) => sum + s.totalCalls, 0);
    const totalCacheHits = allStats.reduce((sum, s) => sum + s.cacheHits, 0);
    const totalCacheMisses = allStats.reduce((sum, s) => sum + s.cacheMisses, 0);
    
    const cacheHitRate = totalAPICalls > 0 ? (totalCacheHits / totalAPICalls) * 100 : 0;
    const apiSavings = totalCacheHits;
    
    const rateLimits = Array.from(this.minuteWindows.keys()).map(endpoint => ({
      endpoint,
      minuteUsage: this.minuteWindows.get(endpoint)?.length || 0,
      hourUsage: this.hourWindows.get(endpoint)?.length || 0,
      dailyUsage: this.dailyWindows.get(endpoint)?.length || 0,
    }));
    
    return {
      totalAPICalls,
      totalCacheHits,
      totalCacheMisses,
      cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
      apiSavings,
      byEndpoint: allStats,
      rateLimits,
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.stats.clear();
    this.minuteWindows.clear();
    this.hourWindows.clear();
    this.dailyWindows.clear();
    this.monthlyWindows.clear();
    console.log('🔄 API usage statistics reset');
  }
}

// Export singleton instance
export const apiUsageMonitor = new APIUsageMonitor();

// Export types
export type { APIUsageStats, APILimits };
