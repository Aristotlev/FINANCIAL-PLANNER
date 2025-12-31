/**
 * SEC Filing Watcher Service
 * Monitors SEC RSS feeds for new filings and triggers processing pipeline
 * 
 * Features:
 * - Real-time RSS feed monitoring
 * - Watchlist-based filtering
 * - Webhook notifications
 * - Filing queue management
 * - Deduplication
 */

import { 
  SECEdgarAPI, 
  SECFiling, 
  SECRSSItem, 
  FilingType,
  createSECEdgarClient 
} from '../api/sec-edgar-api';

// ==================== TYPES ====================

export interface WatchlistItem {
  ticker: string;
  cik: string;
  companyName: string;
  formTypes: FilingType[];
  userId?: string;
  priority: 'high' | 'medium' | 'low';
  notificationEnabled: boolean;
}

export interface FilingEvent {
  id: string;
  filing: SECFiling;
  watchlistMatch: WatchlistItem | null;
  detectedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface WatcherConfig {
  /** Polling interval in milliseconds (default: 60000 = 1 minute) */
  pollInterval: number;
  /** Maximum filings to process per poll */
  maxFilingsPerPoll: number;
  /** Form types to monitor */
  formTypes: FilingType[];
  /** Enable webhook notifications */
  webhookEnabled: boolean;
  /** Webhook URL */
  webhookUrl?: string;
  /** Callback when new filing detected */
  onNewFiling?: (event: FilingEvent) => Promise<void>;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface FilingQueueItem {
  event: FilingEvent;
  retryCount: number;
  nextRetryAt?: Date;
}

// ==================== FILING QUEUE ====================

class FilingQueue {
  private queue: FilingQueueItem[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 30000; // 30 seconds
  private processCallback?: (event: FilingEvent) => Promise<void>;

  constructor(onProcess?: (event: FilingEvent) => Promise<void>) {
    this.processCallback = onProcess;
  }

  /**
   * Add filing to queue
   */
  enqueue(event: FilingEvent): void {
    // Check for duplicates
    const exists = this.queue.some(
      item => item.event.filing.accessionNumber === event.filing.accessionNumber
    );
    
    if (!exists) {
      this.queue.push({
        event,
        retryCount: 0,
      });
      
      // Sort by priority
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = a.event.watchlistMatch?.priority || 'low';
        const bPriority = b.event.watchlistMatch?.priority || 'low';
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Process queue
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.processCallback) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      // Check if we need to wait for retry
      if (item.nextRetryAt && new Date() < item.nextRetryAt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      try {
        item.event.status = 'processing';
        await this.processCallback(item.event);
        item.event.status = 'completed';
        item.event.processedAt = new Date();
        this.queue.shift(); // Remove from queue
      } catch (error) {
        item.retryCount++;
        item.event.error = error instanceof Error ? error.message : 'Unknown error';
        
        if (item.retryCount >= this.maxRetries) {
          item.event.status = 'failed';
          this.queue.shift(); // Remove failed item
          console.error(`[SEC Watcher] Filing processing failed after ${this.maxRetries} retries:`, error);
        } else {
          item.nextRetryAt = new Date(Date.now() + this.retryDelayMs * item.retryCount);
          // Move to end of queue
          this.queue.push(this.queue.shift()!);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue stats
   */
  getStats(): { pending: number; processing: number; failed: number } {
    return {
      pending: this.queue.filter(i => i.event.status === 'pending').length,
      processing: this.queue.filter(i => i.event.status === 'processing').length,
      failed: this.queue.filter(i => i.event.status === 'failed').length,
    };
  }
}

// ==================== DEDUPLICATION CACHE ====================

class DeduplicationCache {
  private seenFilings: Map<string, Date> = new Map();
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if filing has been seen before
   */
  hasSeen(accessionNumber: string): boolean {
    this.cleanup();
    return this.seenFilings.has(accessionNumber);
  }

  /**
   * Mark filing as seen
   */
  markSeen(accessionNumber: string): void {
    this.seenFilings.set(accessionNumber, new Date());
  }

  /**
   * Remove old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, date] of this.seenFilings.entries()) {
      if (now - date.getTime() > this.maxAge) {
        this.seenFilings.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.seenFilings.size;
  }
}

// ==================== SEC FILING WATCHER ====================

export class SECFilingWatcher {
  private readonly secApi: SECEdgarAPI;
  private readonly config: WatcherConfig;
  private readonly watchlist: Map<string, WatchlistItem> = new Map();
  private readonly queue: FilingQueue;
  private readonly dedupCache: DeduplicationCache;
  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastPollTime: Date | null = null;

  constructor(config: Partial<WatcherConfig> = {}) {
    this.secApi = createSECEdgarClient();
    this.config = {
      pollInterval: config.pollInterval || 60000, // 1 minute default
      maxFilingsPerPoll: config.maxFilingsPerPoll || 50,
      formTypes: config.formTypes || ['10-K', '10-Q', '8-K', '4', '13F-HR'],
      webhookEnabled: config.webhookEnabled || false,
      webhookUrl: config.webhookUrl,
      onNewFiling: config.onNewFiling,
      onError: config.onError,
    };
    
    this.queue = new FilingQueue(this.processNewFiling.bind(this));
    this.dedupCache = new DeduplicationCache();
  }

  // ==================== WATCHLIST MANAGEMENT ====================

  /**
   * Add company to watchlist
   */
  async addToWatchlist(
    ticker: string,
    options: Partial<Omit<WatchlistItem, 'ticker' | 'cik' | 'companyName'>> = {}
  ): Promise<WatchlistItem | null> {
    const company = await this.secApi.getCIKByTicker(ticker);
    if (!company) {
      console.warn(`[SEC Watcher] Company not found: ${ticker}`);
      return null;
    }

    const item: WatchlistItem = {
      ticker: company.ticker,
      cik: company.cik,
      companyName: company.name,
      formTypes: options.formTypes || this.config.formTypes,
      userId: options.userId,
      priority: options.priority || 'medium',
      notificationEnabled: options.notificationEnabled ?? true,
    };

    this.watchlist.set(company.cik, item);
    console.log(`[SEC Watcher] Added ${ticker} to watchlist`);
    return item;
  }

  /**
   * Remove company from watchlist
   */
  removeFromWatchlist(tickerOrCik: string): boolean {
    // Try CIK first
    if (this.watchlist.has(tickerOrCik)) {
      this.watchlist.delete(tickerOrCik);
      return true;
    }
    
    // Try ticker
    for (const [cik, item] of this.watchlist.entries()) {
      if (item.ticker.toUpperCase() === tickerOrCik.toUpperCase()) {
        this.watchlist.delete(cik);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get watchlist
   */
  getWatchlist(): WatchlistItem[] {
    return Array.from(this.watchlist.values());
  }

  /**
   * Clear watchlist
   */
  clearWatchlist(): void {
    this.watchlist.clear();
  }

  /**
   * Import watchlist from array
   */
  async importWatchlist(tickers: string[]): Promise<number> {
    let imported = 0;
    
    for (const ticker of tickers) {
      const item = await this.addToWatchlist(ticker);
      if (item) imported++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    return imported;
  }

  // ==================== POLLING ====================

  /**
   * Start watching for new filings
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[SEC Watcher] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[SEC Watcher] Started monitoring SEC filings');
    
    // Initial poll
    this.poll();
    
    // Schedule recurring polls
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.config.pollInterval);
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    console.log('[SEC Watcher] Stopped monitoring');
  }

  /**
   * Check if watcher is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Poll for new filings
   */
  private async poll(): Promise<void> {
    try {
      console.log(`[SEC Watcher] Polling for new filings...`);
      
      // Get latest filings for each form type
      for (const formType of this.config.formTypes) {
        const rssItems = await this.secApi.getLatestFilings(formType);
        
        for (const item of rssItems.slice(0, this.config.maxFilingsPerPoll)) {
          await this.processRSSItem(item);
        }
        
        // Small delay between form types
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Also check watchlist companies directly
      if (this.watchlist.size > 0) {
        await this.pollWatchlistCompanies();
      }

      // Process queued items
      await this.queue.processQueue();
      
      this.lastPollTime = new Date();
      console.log(`[SEC Watcher] Poll complete. Queue size: ${this.queue.size()}`);
    } catch (error) {
      console.error('[SEC Watcher] Poll error:', error);
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Poll watchlist companies for new filings
   */
  private async pollWatchlistCompanies(): Promise<void> {
    for (const [cik, watchItem] of this.watchlist.entries()) {
      try {
        const filings = await this.secApi.getCompanyFilings(cik, watchItem.formTypes);
        
        // Only check recent filings (last 7 days)
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        
        const recentFilings = filings.filter(f => new Date(f.filingDate) >= cutoff);
        
        for (const filing of recentFilings.slice(0, 5)) {
          if (!this.dedupCache.hasSeen(filing.accessionNumber)) {
            this.createFilingEvent(filing, watchItem);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.warn(`[SEC Watcher] Error checking ${watchItem.ticker}:`, error);
      }
    }
  }

  /**
   * Process RSS feed item
   */
  private async processRSSItem(item: SECRSSItem): Promise<void> {
    // Extract accession number from link
    const accessionMatch = item.link.match(/\/(\d{10}-\d{2}-\d{6})/);
    if (!accessionMatch) return;
    
    const accessionNumber = accessionMatch[1];
    
    // Check dedup cache
    if (this.dedupCache.hasSeen(accessionNumber)) {
      return;
    }
    
    // Extract CIK from link
    const cikMatch = item.link.match(/\/data\/(\d+)\//);
    if (!cikMatch) return;
    
    const cik = cikMatch[1].padStart(10, '0');
    
    // Check if company is on watchlist
    const watchItem = this.watchlist.get(cik);
    
    // If we have a watchlist and this company isn't on it, skip
    if (this.watchlist.size > 0 && !watchItem) {
      return;
    }
    
    // Parse form type from title
    const formMatch = item.title.match(/^(\d+-[KQ]|8-K|4|13F-\w+)/i);
    const formType = formMatch ? formMatch[1] as FilingType : undefined;
    
    // Check if form type matches watchlist preferences
    if (watchItem && formType && !watchItem.formTypes.includes(formType)) {
      return;
    }
    
    // Get full filing details
    try {
      const company = await this.secApi.getTickerByCIK(cik);
      
      const filing: SECFiling = {
        accessionNumber,
        filingDate: new Date(item.pubDate).toISOString().split('T')[0],
        form: formType || 'Unknown',
        primaryDocument: '',
        primaryDocumentUrl: item.link,
        filingDetailUrl: item.link,
        size: 0,
        cik,
        ticker: company?.ticker,
        companyName: company?.name || item.title.split(' - ')[0] || 'Unknown',
      };
      
      this.createFilingEvent(filing, watchItem || null);
    } catch (error) {
      console.warn(`[SEC Watcher] Error processing RSS item:`, error);
    }
  }

  /**
   * Create and queue filing event
   */
  private createFilingEvent(filing: SECFiling, watchItem: WatchlistItem | null): void {
    if (this.dedupCache.hasSeen(filing.accessionNumber)) {
      return;
    }
    
    this.dedupCache.markSeen(filing.accessionNumber);
    
    const event: FilingEvent = {
      id: `${filing.cik}-${filing.accessionNumber}`,
      filing,
      watchlistMatch: watchItem,
      detectedAt: new Date(),
      status: 'pending',
    };
    
    console.log(`[SEC Watcher] New filing: ${filing.form} from ${filing.companyName} (${filing.ticker || filing.cik})`);
    
    this.queue.enqueue(event);
  }

  /**
   * Process new filing
   */
  private async processNewFiling(event: FilingEvent): Promise<void> {
    // Call user callback if provided
    if (this.config.onNewFiling) {
      await this.config.onNewFiling(event);
    }
    
    // Send webhook notification if enabled
    if (this.config.webhookEnabled && this.config.webhookUrl) {
      await this.sendWebhook(event);
    }
    
    console.log(`[SEC Watcher] Processed filing: ${event.filing.accessionNumber}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(event: FilingEvent): Promise<void> {
    if (!this.config.webhookUrl) return;
    
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sec_filing',
          timestamp: new Date().toISOString(),
          data: {
            accessionNumber: event.filing.accessionNumber,
            form: event.filing.form,
            company: event.filing.companyName,
            ticker: event.filing.ticker,
            cik: event.filing.cik,
            filingDate: event.filing.filingDate,
            url: event.filing.filingDetailUrl,
            priority: event.watchlistMatch?.priority || 'low',
          },
        }),
      });
      
      if (!response.ok) {
        console.warn(`[SEC Watcher] Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[SEC Watcher] Webhook error:', error);
    }
  }

  // ==================== STATS & DIAGNOSTICS ====================

  /**
   * Get watcher stats
   */
  getStats(): {
    isRunning: boolean;
    lastPollTime: Date | null;
    watchlistSize: number;
    queueStats: { pending: number; processing: number; failed: number };
    cacheSize: number;
  } {
    return {
      isRunning: this.isRunning,
      lastPollTime: this.lastPollTime,
      watchlistSize: this.watchlist.size,
      queueStats: this.queue.getStats(),
      cacheSize: this.dedupCache.size(),
    };
  }

  /**
   * Force a poll (for testing)
   */
  async forcePoll(): Promise<void> {
    await this.poll();
  }
}

// ==================== SINGLETON INSTANCE ====================

let watcherInstance: SECFilingWatcher | null = null;

/**
 * Get or create the SEC Filing Watcher singleton
 */
export function getSECFilingWatcher(config?: Partial<WatcherConfig>): SECFilingWatcher {
  if (!watcherInstance) {
    watcherInstance = new SECFilingWatcher(config);
  }
  return watcherInstance;
}

/**
 * Reset the watcher instance (for testing)
 */
export function resetSECFilingWatcher(): void {
  if (watcherInstance) {
    watcherInstance.stop();
    watcherInstance = null;
  }
}

export default SECFilingWatcher;
