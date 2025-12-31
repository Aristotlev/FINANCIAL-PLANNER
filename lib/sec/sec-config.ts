/**
 * SEC EDGAR Configuration
 * Environment-based configuration for SEC API integration
 */

export interface SECConfig {
  /** User-Agent header required by SEC (format: "AppName admin@email.com") */
  userAgent: string;
  
  /** Polling interval for RSS feed monitoring in milliseconds */
  pollInterval: number;
  
  /** Maximum filings to process per poll cycle */
  maxFilingsPerPoll: number;
  
  /** Enable webhook notifications */
  webhookEnabled: boolean;
  
  /** Webhook URL for filing notifications */
  webhookUrl?: string;
  
  /** SEC API rate limit (requests per second) */
  rateLimit: number;
}

/**
 * Get SEC configuration from environment variables
 */
export function getSECConfig(): SECConfig {
  return {
    // User-Agent is REQUIRED by SEC - must include app name and contact email
    userAgent: process.env.SEC_USER_AGENT || 'OmniFolio admin@omnifolio.app',
    
    // Polling interval (default: 1 minute)
    pollInterval: parseInt(process.env.SEC_POLL_INTERVAL || '60000', 10),
    
    // Max filings per poll (default: 50)
    maxFilingsPerPoll: parseInt(process.env.SEC_MAX_FILINGS_PER_POLL || '50', 10),
    
    // Webhook settings
    webhookEnabled: process.env.SEC_WEBHOOK_ENABLED === 'true',
    webhookUrl: process.env.SEC_WEBHOOK_URL,
    
    // Rate limit (SEC allows ~10/sec, we use 8 for safety)
    rateLimit: 8,
  };
}

/**
 * Validate SEC configuration
 */
export function validateSECConfig(config: SECConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // User-Agent must have email format
  if (!config.userAgent.includes('@')) {
    errors.push('SEC_USER_AGENT must include a contact email (format: "AppName admin@email.com")');
  }
  
  // Poll interval must be reasonable (minimum 30 seconds)
  if (config.pollInterval < 30000) {
    errors.push('SEC_POLL_INTERVAL must be at least 30000ms (30 seconds)');
  }
  
  // Max filings must be positive
  if (config.maxFilingsPerPoll < 1) {
    errors.push('SEC_MAX_FILINGS_PER_POLL must be at least 1');
  }
  
  // Webhook URL required if enabled
  if (config.webhookEnabled && !config.webhookUrl) {
    errors.push('SEC_WEBHOOK_URL is required when SEC_WEBHOOK_ENABLED is true');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log SEC configuration (for debugging, hides sensitive data)
 */
export function logSECConfig(config: SECConfig): void {
  console.log('[SEC Config] Configuration loaded:');
  console.log(`  - User-Agent: ${config.userAgent}`);
  console.log(`  - Poll Interval: ${config.pollInterval}ms`);
  console.log(`  - Max Filings/Poll: ${config.maxFilingsPerPoll}`);
  console.log(`  - Rate Limit: ${config.rateLimit} req/sec`);
  console.log(`  - Webhook Enabled: ${config.webhookEnabled}`);
  if (config.webhookEnabled && config.webhookUrl) {
    const maskedUrl = config.webhookUrl.substring(0, 30) + '...';
    console.log(`  - Webhook URL: ${maskedUrl}`);
  }
}

export default getSECConfig;
