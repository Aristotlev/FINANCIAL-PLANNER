# Quick Start: Enhanced Time Tracking

## 🚀 Setup (5 minutes)

### Step 1: Create Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Portfolio snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  snapshot_date TIMESTAMP NOT NULL,
  total_net_worth NUMERIC NOT NULL,
  total_assets NUMERIC NOT NULL,
  total_liabilities NUMERIC NOT NULL,
  cash NUMERIC DEFAULT 0,
  savings NUMERIC DEFAULT 0,
  crypto_value NUMERIC DEFAULT 0,
  stocks_value NUMERIC DEFAULT 0,
  real_estate_value NUMERIC DEFAULT 0,
  valuable_items_value NUMERIC DEFAULT 0,
  trading_account_value NUMERIC DEFAULT 0,
  crypto_holdings JSONB DEFAULT '[]'::jsonb,
  stock_holdings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date 
  ON portfolio_snapshots(user_id, snapshot_date DESC);

-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock', 'forex', 'index')),
  price NUMERIC NOT NULL,
  volume NUMERIC,
  market_cap NUMERIC,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_time 
  ON price_snapshots(symbol, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_type_time
  ON price_snapshots(symbol, asset_type, timestamp DESC);
```

### Step 2: That's It! 🎉

The system is already integrated. It will:
- ✅ Start tracking automatically when you load the app
- ✅ Create hourly snapshots in the background
- ✅ Store data in Supabase (with localStorage fallback)
- ✅ Provide comprehensive analysis through AI assistant

## 📊 Usage

### Ask Your AI Assistant

Just say or type any of these:

- "Analyze my portfolio"
- "Show portfolio performance"
- "How is my portfolio doing?"
- "Portfolio breakdown"

### What You'll Get

Comprehensive analysis with **6 timeframes**:

```
⏱️ Performance Over Time:
• 1 Hour: +$125.30 (🟢 +0.61%)
• 4 Hours: +$450.80 (🟢 +2.21%)
• 24 Hours: -$230.50 (🔴 -1.10%)
• Weekly: +$1,250.00 (🟢 +6.39%)
• Monthly: +$2,340.00 (🟢 +12.68%)
• Yearly: -$5,120.00 (🔴 -19.75%)
```

Plus detailed per-asset breakdowns!

## ⏱️ Data Collection Timeline

| Timeframe | When Available | Example |
|-----------|----------------|---------|
| 1 Hour | After 1 hour | 11:00 AM → 12:00 PM |
| 4 Hours | After 4 hours | 8:00 AM → 12:00 PM |
| 24 Hours | After 1 day | Today vs Yesterday |
| Weekly | After 7 days | This week vs Last week |
| Monthly | After 30 days | This month vs Last month |
| Yearly | After 365 days | This year vs Last year |

**Note:** On first deployment, you'll see zeros until enough time passes.

## 🔧 Configuration (Optional)

### Adjust Snapshot Frequency

Edit `contexts/portfolio-context.tsx`:

```typescript
useEnhancedTimeTracking(portfolioSnapshot, {
  enabled: true,
  snapshotInterval: 30 * 60 * 1000, // 30 minutes instead of 1 hour
  trackAssetPrices: true
});
```

### Manual Snapshot Trigger

```typescript
import { useEnhancedTimeTracking } from '@/hooks/use-enhanced-time-tracking';

const { triggerSnapshot } = useEnhancedTimeTracking(portfolioData);

// Trigger whenever you want
await triggerSnapshot();
```

## 🐛 Troubleshooting

### Issue: All timeframes show $0.00

**Cause:** Not enough time has passed to collect data  
**Solution:** Wait for data collection (1h for hourly, 24h for daily, etc.)

### Issue: Snapshots not being created

**Checks:**
```bash
# 1. Open browser console
# 2. Look for these messages:
📊 [Enhanced Time Tracking] Starting automatic tracking...
📸 [Enhanced Time Tracking] Creating snapshot...
✅ [Enhanced Time Tracking] Snapshot created successfully
```

**If not seeing messages:**
- Verify user is logged in
- Check portfolio has holdings
- Verify Supabase tables exist
- Check browser console for errors

### Issue: Supabase errors

**Solution:** System automatically falls back to localStorage  
**Check:** Browser localStorage for `moneyHub_portfolioSnapshots` and `moneyHub_priceSnapshots`

## 📈 Monitoring

### Check Stored Data

```typescript
// Browser console
localStorage.getItem('moneyHub_portfolioSnapshots')
localStorage.getItem('moneyHub_priceSnapshots')
```

### Check Supabase

```sql
-- Recent portfolio snapshots
SELECT * FROM portfolio_snapshots 
WHERE user_id = 'your-user-id' 
ORDER BY snapshot_date DESC 
LIMIT 10;

-- Recent price snapshots
SELECT * FROM price_snapshots 
ORDER BY timestamp DESC 
LIMIT 20;
```

## 🎯 Best Practices

### 1. Let It Run
- Don't disable the tracking
- Let it collect data in the background
- More data = better insights

### 2. Regular Usage
- Check portfolio regularly
- Ask AI for analysis frequently
- System learns from your patterns

### 3. Monitor Performance
- Watch browser console for errors
- Check Supabase storage usage
- System auto-cleans old data

## 🚨 Important Notes

### Storage
- Hourly snapshots: Kept for 48 hours
- Daily snapshots: Kept indefinitely
- Auto-cleanup prevents database bloat

### Privacy
- All data is user-specific (user_id indexed)
- No cross-user data sharing
- LocalStorage fallback for offline use

### Performance
- Minimal impact on app performance
- Background processing
- Optimized database queries

## 📚 Additional Resources

- **Full Documentation:** `Docks/ENHANCED_TIME_TRACKING_SYSTEM.md`
- **Implementation Details:** `Docks/IMPLEMENTATION_SUMMARY_TIME_TRACKING.md`
- **Code Files:**
  - `lib/enhanced-time-tracking-service.ts`
  - `lib/enhanced-portfolio-analysis-service.ts`
  - `hooks/use-enhanced-time-tracking.ts`

## ✅ Verification Checklist

After setup, verify:

- [ ] Supabase tables created successfully
- [ ] App loads without errors
- [ ] Console shows tracking messages
- [ ] After 1 hour, snapshots appear in database
- [ ] AI assistant responds to "analyze portfolio"
- [ ] Timeframe data shows real numbers (after waiting appropriate time)

## 🎉 Success!

Once you see non-zero values in your AI responses, the system is working perfectly!

**Expected after 1 hour:**
```
• 1 Hour: +$12.50 (🟢 +0.61%)  ← Real data!
• 4 Hours: +$0.00 (🟢 +0.00%)  ← Need 4h
```

**Expected after 24 hours:**
```
• 1 Hour: +$12.50 (🟢 +0.61%)   ← Real data!
• 4 Hours: +$45.80 (🟢 +2.21%)  ← Real data!
• 24 Hours: -$23.40 (🔴 -1.10%) ← Real data!
• Weekly: +$0.00 (🟢 +0.00%)    ← Need 7d
```

---

**Questions?** Check the full documentation or console logs for detailed debugging.
