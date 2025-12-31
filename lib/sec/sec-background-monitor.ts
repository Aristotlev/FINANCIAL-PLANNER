/**
 * SEC Background Monitor Service
 * Manages continuous RSS feed monitoring for SEC filings
 * 
 * This service:
 * - Starts/stops the SECFilingWatcher
 * - Manages watchlist subscriptions
 * - Handles webhook notifications
 * - Stores new filings in the database
 */

import { 
  SECFilingWatcher, 
  getSECFilingWatcher,
  resetSECFilingWatcher,
  type FilingEvent,
  type WatcherConfig,
  type WatchlistItem as WatcherWatchlistItem,
} from './sec-filing-watcher';
import { 
  storeFiling, 
  storeInsiderTransaction,
  createFilingAlert,
  getUserWatchlist,
  getCompanyByCIK,
} from './sec-data-service';
import { getSECConfig, validateSECConfig, logSECConfig } from './sec-config';
import type { FilingType } from '../api/sec-edgar-api';

// ==================== TYPES ====================

export interface MonitorStatus {
  isRunning: boolean;
  startedAt?: Date;
  lastPollAt?: Date;
  filingsProcessed: number;
  errors: number;
  watchlistSize: number;
  formTypes: string[];
}

export interface MonitoringSubscription {
  userId: string;
  tickers: string[];
  formTypes: FilingType[];
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// ==================== SINGLETON MONITOR ====================

class SECBackgroundMonitor {
  private watcher: SECFilingWatcher | null = null;
  private status: MonitorStatus = {
    isRunning: false,
    filingsProcessed: 0,
    errors: 0,
    watchlistSize: 0,
    formTypes: [],
  };
  private subscriptions: Map<string, MonitoringSubscription> = new Map();

  /**
   * Start the background monitoring service
   */
  async start(): Promise<void> {
    if (this.status.isRunning) {
      console.log('[SEC Monitor] Already running');
      return;
    }

    const config = getSECConfig();
    const validation = validateSECConfig(config);
    
    if (!validation.valid) {
      console.error('[SEC Monitor] Invalid configuration:', validation.errors);
      throw new Error(`Invalid SEC configuration: ${validation.errors.join(', ')}`);
    }

    logSECConfig(config);

    // Create watcher configuration
    const watcherConfig: Partial<WatcherConfig> = {
      pollInterval: config.pollInterval,
      maxFilingsPerPoll: config.maxFilingsPerPoll,
      formTypes: ['10-K', '10-Q', '8-K', '4', '13F-HR'],
      webhookEnabled: config.webhookEnabled,
      webhookUrl: config.webhookUrl,
      onNewFiling: this.handleNewFiling.bind(this),
      onError: this.handleError.bind(this),
    };

    // Get or create watcher
    this.watcher = getSECFilingWatcher(watcherConfig);
    
    // Start watching
    await this.watcher.start();
    
    this.status.isRunning = true;
    this.status.startedAt = new Date();
    this.status.formTypes = watcherConfig.formTypes || [];
    
    console.log('[SEC Monitor] Background monitoring started');
  }

  /**
   * Stop the background monitoring service
   */
  async stop(): Promise<void> {
    if (!this.status.isRunning || !this.watcher) {
      console.log('[SEC Monitor] Not running');
      return;
    }

    await this.watcher.stop();
    this.status.isRunning = false;
    
    console.log('[SEC Monitor] Background monitoring stopped');
  }

  /**
   * Get current monitor status
   */
  getStatus(): MonitorStatus {
    if (this.watcher) {
      const watcherStats = this.watcher.getStats();
      this.status.lastPollAt = watcherStats.lastPollTime || undefined;
      this.status.watchlistSize = watcherStats.watchlistSize;
    }
    return { ...this.status };
  }

  /**
   * Add a ticker to monitor for a user
   */
  async addToWatchlist(
    userId: string, 
    ticker: string, 
    _cik?: string,
    formTypes: FilingType[] = ['10-K', '10-Q', '8-K', '4']
  ): Promise<void> {
    if (!this.watcher) {
      throw new Error('Monitor not started');
    }

    // Use the watcher's addToWatchlist which takes a ticker string
    const result = await this.watcher.addToWatchlist(ticker, {
      formTypes,
      userId,
      priority: 'medium',
      notificationEnabled: true,
    });
    
    if (result) {
      console.log(`[SEC Monitor] Added ${ticker} to watchlist for user ${userId}`);
    } else {
      console.warn(`[SEC Monitor] Failed to add ${ticker} - company not found`);
    }
  }

  /**
   * Remove a ticker from monitoring for a user
   */
  removeFromWatchlist(userId: string, ticker: string): void {
    if (!this.watcher) {
      throw new Error('Monitor not started');
    }

    this.watcher.removeFromWatchlist(ticker.toUpperCase());
    console.log(`[SEC Monitor] Removed ${ticker} from watchlist`);
  }

  /**
   * Subscribe a user to notifications
   */
  subscribe(subscription: MonitoringSubscription): void {
    this.subscriptions.set(subscription.userId, subscription);
    
    // Add all tickers to watcher if running
    if (this.watcher && this.status.isRunning) {
      subscription.tickers.forEach(async (ticker) => {
        try {
          // We'd need to look up CIK here - for now just log
          console.log(`[SEC Monitor] User ${subscription.userId} subscribed to ${ticker}`);
        } catch (error) {
          console.error(`[SEC Monitor] Failed to add ${ticker} for user ${subscription.userId}:`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe a user from notifications
   */
  unsubscribe(userId: string): void {
    this.subscriptions.delete(userId);
    console.log(`[SEC Monitor] User ${userId} unsubscribed`);
  }

  /**
   * Handle new filing event
   */
  private async handleNewFiling(event: FilingEvent): Promise<void> {
    try {
      console.log(`[SEC Monitor] New filing: ${event.filing.form} from ${event.filing.companyName}`);
      
      // Store filing in database
      const storedFiling = await storeFiling(event.filing);
      
      if (storedFiling) {
        this.status.filingsProcessed++;
        
        // Check if any users should be notified
        if (event.watchlistMatch) {
          const userId = event.watchlistMatch.userId;
          
          if (userId && event.watchlistMatch.notificationEnabled) {
            // Create alert for the user
            await createFilingAlert(
              userId,
              storedFiling.id,
              storedFiling.company_id || '',
              'new_filing',
              `New ${event.filing.form} Filing`,
              `${event.filing.companyName} filed a ${event.filing.form} on ${event.filing.filingDate}`,
              event.watchlistMatch.priority
            );
            
            console.log(`[SEC Monitor] Alert created for user ${userId}`);
          }
        }
        
        // Send webhook if enabled
        await this.sendWebhook(event);
      }
    } catch (error) {
      console.error('[SEC Monitor] Error processing filing:', error);
      this.status.errors++;
    }
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    console.error('[SEC Monitor] Watcher error:', error);
    this.status.errors++;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(event: FilingEvent): Promise<void> {
    const config = getSECConfig();
    
    if (!config.webhookEnabled || !config.webhookUrl) {
      return;
    }

    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sec_filing',
          timestamp: new Date().toISOString(),
          filing: {
            accessionNumber: event.filing.accessionNumber,
            form: event.filing.form,
            companyName: event.filing.companyName,
            ticker: event.filing.ticker,
            filingDate: event.filing.filingDate,
            url: event.filing.primaryDocumentUrl,
          },
          watchlistMatch: event.watchlistMatch ? {
            ticker: event.watchlistMatch.ticker,
            priority: event.watchlistMatch.priority,
          } : null,
        }),
      });
      
      console.log('[SEC Monitor] Webhook sent successfully');
    } catch (error) {
      console.error('[SEC Monitor] Webhook failed:', error);
    }
  }

  /**
   * Force a poll of the RSS feed
   */
  async forcePoll(): Promise<void> {
    if (!this.watcher) {
      throw new Error('Monitor not started');
    }
    
    // This would trigger an immediate poll
    console.log('[SEC Monitor] Force poll triggered');
    // The watcher handles polling internally
  }

  /**
   * Reset the monitor (useful for testing)
   */
  reset(): void {
    this.stop();
    resetSECFilingWatcher();
    this.watcher = null;
    this.status = {
      isRunning: false,
      filingsProcessed: 0,
      errors: 0,
      watchlistSize: 0,
      formTypes: [],
    };
    this.subscriptions.clear();
    console.log('[SEC Monitor] Reset complete');
  }
}

// ==================== SINGLETON EXPORT ====================

let monitorInstance: SECBackgroundMonitor | null = null;

export function getSECBackgroundMonitor(): SECBackgroundMonitor {
  if (!monitorInstance) {
    monitorInstance = new SECBackgroundMonitor();
  }
  return monitorInstance;
}

export function resetSECBackgroundMonitor(): void {
  if (monitorInstance) {
    monitorInstance.reset();
    monitorInstance = null;
  }
}

// Default export
export default getSECBackgroundMonitor;
