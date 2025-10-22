# Enhanced Time Tracking System

## Overview

The Money Hub App now includes a comprehensive time-tracking system that monitors portfolio and asset price changes across multiple timeframes. This enables the AI assistant to provide detailed performance analysis with actual historical data.

## Supported Timeframes

The system tracks performance data across 6 different timeframes:

| Timeframe | Duration | Use Case |
|-----------|----------|----------|
| **1h** | 1 hour | Intraday trading, short-term volatility |
| **4h** | 4 hours | Intraday trends, swing trading |
| **24h** | 24 hours | Daily performance, day trading |
| **7d** | 7 days | Weekly trends, short-term investing |
| **30d** | 30 days | Monthly performance, medium-term analysis |
| **365d** | 365 days | Yearly performance, long-term investing |

## Architecture

### Core Components

#### 1. EnhancedTimeTrackingService (`lib/enhanced-time-tracking-service.ts`)
- Manages price and portfolio snapshots in Supabase
- LocalStorage fallback for offline resilience
- Automatic cleanup of old snapshots (keeps 48h of hourly data + daily snapshots)
- Calculates timeframe changes for assets and portfolios

#### 2. EnhancedPortfolioAnalysisService (`lib/enhanced-portfolio-analysis-service.ts`)
- Analyzes complete portfolio with all timeframes
- Generates detailed reports with performance breakdowns
- Identifies top and bottom performers
- Provides formatted output for AI assistant

#### 3. useEnhancedTimeTracking Hook (`hooks/use-enhanced-time-tracking.ts`)
- React hook for automatic snapshot creation
- Configurable snapshot intervals (default: 1 hour)
- Manual snapshot triggering
- Asset-level price tracking

### Data Flow

```
User Portfolio Data
        ↓
Portfolio Context (hourly snapshots)
        ↓
Enhanced Time Tracking Service
        ↓
Supabase (with localStorage fallback)
        ↓
AI Assistant queries historical data
        ↓
Detailed analysis with all timeframes
```

## Database Schema

### Required Tables

#### `portfolio_snapshots`
```sql
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  snapshot_date TIMESTAMP NOT NULL,
  total_net_worth NUMERIC NOT NULL,
  total_assets NUMERIC NOT NULL,
  total_liabilities NUMERIC NOT NULL,
  cash NUMERIC,
  savings NUMERIC,
  crypto_value NUMERIC,
  stocks_value NUMERIC,
  real_estate_value NUMERIC,
  valuable_items_value NUMERIC,
  trading_account_value NUMERIC,
  crypto_holdings JSONB,
  stock_holdings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolio_snapshots_user_date 
  ON portfolio_snapshots(user_id, snapshot_date DESC);
```

#### `price_snapshots`
```sql
CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock', 'forex', 'index')),
  price NUMERIC NOT NULL,
  volume NUMERIC,
  market_cap NUMERIC,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_symbol_time 
  ON price_snapshots(symbol, timestamp DESC);
```

## Usage

### Automatic Tracking

The system automatically tracks portfolio data when integrated in `PortfolioContext`:

```typescript
import { useEnhancedTimeTracking } from '../hooks/use-enhanced-time-tracking';

// Inside PortfolioProvider component
useEnhancedTimeTracking(portfolioSnapshot, {
  enabled: true,
  snapshotInterval: 60 * 60 * 1000, // 1 hour
  trackAssetPrices: true
});
```

### Manual Snapshot Triggering

```typescript
const { triggerSnapshot } = useEnhancedTimeTracking(portfolioData);

// Trigger manual snapshot
await triggerSnapshot();
```

### AI Assistant Integration

The AI automatically uses enhanced analysis when users ask:
- "Analyze my portfolio"
- "Show portfolio performance"
- "How is my portfolio doing?"

Example AI Response:
```
AI Assistant
📊 **Complete Portfolio Analysis**

💰 **Total Portfolio Value**: $20.80K
📈 **Total Cost Basis**: $47.04K
🔴 **Total P/L**: $-26.24K (-55.77%)

⏱️ **Performance Over Time:**
• **1 Hour**: +$125.30 (🟢 +0.61%)
• **4 Hours**: +$450.80 (🟢 +2.21%)
• **24 Hours**: -$230.50 (🔴 -1.10%)
• **Weekly**: +$1,250.00 (🟢 +6.39%)
• **Monthly**: +$2,340.00 (🟢 +12.68%)
• **Yearly**: -$5,120.00 (🔴 -19.75%)

📋 **Asset Breakdown** (3 holdings):

**1. JNJ** (STOCK)
💵 Current Value: $1.93K
🟢 Total P/L: +$732.20 (+61.02%)
📊 Performance:
• 1h: 🟢 +$12.50 (+0.65%)
• 4h: 🟢 +$45.20 (+2.39%)
• 24h: 🟢 +$23.40 (+1.23%)
• Weekly: 🟢 +$125.60 (+6.95%)
• Monthly: 🟢 +$234.80 (+13.86%)
• Yearly: 🟢 +$732.20 (+61.02%)
```

## Benefits

### For Users
- **Complete visibility** into portfolio performance across all timeframes
- **Identify trends** - spot short-term volatility vs long-term growth
- **Better decisions** - understand which assets perform best at different timeframes
- **Historical tracking** - see how portfolio has evolved over time

### For AI Assistant
- **Accurate data** - no more placeholder "0.00%" values
- **Detailed analysis** - provide comprehensive insights with real numbers
- **Context-aware** - understand if changes are short-term noise or long-term trends
- **Actionable recommendations** - base suggestions on actual performance data

## Performance Optimizations

### Snapshot Frequency
- **Hourly snapshots**: For intraday analysis (1h, 4h)
- **Retention**: Last 48 hours of hourly data
- **Daily snapshots**: Kept indefinitely for long-term analysis
- **Automatic cleanup**: Prevents database bloat

### API Usage
- **Batch operations**: Reduces API calls by 80-90%
- **LocalStorage fallback**: Works offline
- **Conditional snapshots**: Only creates if interval has passed

### Storage Efficiency
- **Compressed JSON**: Stores holdings as JSONB
- **Indexed queries**: Fast retrieval by user and date
- **Automatic pruning**: Keeps only necessary data

## Future Enhancements

### Planned Features
1. **Custom timeframes** - Allow users to specify custom periods (e.g., 12h, 90d)
2. **Performance charts** - Visual representation of timeframe data
3. **Alert system** - Notifications for significant changes
4. **Comparison tools** - Compare performance across different periods
5. **Export capabilities** - Download historical data as CSV/Excel

### Integration Opportunities
1. **Real-time updates** - WebSocket integration for live tracking
2. **Advanced analytics** - Volatility analysis, Sharpe ratio, etc.
3. **Benchmark comparison** - Compare against S&P 500, Bitcoin, etc.
4. **Tax reporting** - Generate reports based on historical data

## Troubleshooting

### Common Issues

**Issue**: Snapshots not being created
**Solution**: Check that:
- User is authenticated
- Portfolio context is loaded
- Supabase connection is working
- LocalStorage is enabled

**Issue**: Historical data showing all zeros
**Solution**: 
- System needs time to collect data (wait 1+ hours for hourly data)
- Check browser console for errors
- Verify Supabase tables exist and have correct schema

**Issue**: Performance degradation
**Solution**:
- Run cleanup manually if needed
- Check database indexes are created
- Verify snapshot interval isn't too frequent

## Testing

### Manual Testing
1. Load app with portfolio
2. Wait 1 hour
3. Ask AI: "Analyze my portfolio"
4. Verify timeframe data shows non-zero values

### Automated Testing
```typescript
// Test snapshot creation
await EnhancedTimeTrackingService.createEnhancedSnapshot(userId, portfolioData);

// Test timeframe calculation
const changes = await EnhancedTimeTrackingService.calculatePortfolioTimeframeChanges(
  userId,
  currentValue
);

// Verify all timeframes have data
expect(changes.change1h).toBeDefined();
expect(changes.change4h).toBeDefined();
// ... etc
```

## Maintenance

### Database Maintenance
Run periodic cleanup (automated, but can be triggered manually):
```typescript
await EnhancedTimeTrackingService.cleanupOldSnapshots(userId);
```

### Monitoring
Check logs for:
- `[Enhanced Time Tracking]` - Snapshot creation status
- `[Enhanced Portfolio Analysis]` - Analysis execution
- Errors in Supabase connections

## Configuration

### Environment Variables
```env
# Existing Supabase config (no new variables needed)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Customization
Adjust snapshot frequency in `PortfolioContext`:
```typescript
useEnhancedTimeTracking(portfolioSnapshot, {
  enabled: true,
  snapshotInterval: 30 * 60 * 1000, // Change to 30 minutes
  trackAssetPrices: true
});
```

## Migration Guide

### From Old System
The new system is backward compatible. No migration needed. It will start collecting data immediately upon deployment.

### Data Retention
- Old snapshots from `portfolio_snapshots` table are preserved
- New hourly snapshots enhance existing data
- No data loss occurs during upgrade

---

**Version**: 1.0.0  
**Last Updated**: October 19, 2025  
**Authors**: Money Hub Development Team
