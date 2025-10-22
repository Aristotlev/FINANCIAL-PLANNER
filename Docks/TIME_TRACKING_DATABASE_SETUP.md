# 🔧 Fix Time Tracking Database Errors

## ❌ Current Error

You're seeing 404 errors because the database tables don't exist:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
ljatyfyeqiicskahmzmp.supabase.co/rest/v1/price_snapshots
```

## ✅ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

👉 **Go to:** https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp/sql/new

### Step 2: Run the SQL Schema

1. **Open** `supabase-time-tracking-schema.sql` in your project
2. **Select All** (Cmd+A or Ctrl+A)
3. **Copy** (Cmd+C or Ctrl+C)
4. **Paste** into Supabase SQL Editor
5. **Click** the "Run" button (or press Cmd+Enter)
6. **Wait** for the success message ✅

### Step 3: Verify Tables Exist

Go to the Table Editor and confirm these 2 new tables exist:
- ✅ `price_snapshots`
- ✅ `portfolio_snapshots`

### Step 4: Refresh Your App

Refresh your browser - the errors should be gone! 🎉

---

## 📊 What This Creates

### Table: `price_snapshots`
Stores historical price data for all your assets:
- Symbol (BTC, ETH, AAPL, etc.)
- Asset type (crypto, stock, forex, index)
- Price, volume, market cap
- Timestamp

**Enables timeframe analysis:** 1h, 4h, 24h, 7d, 30d, 365d

### Table: `portfolio_snapshots`
Tracks your entire portfolio over time:
- Total net worth
- Total assets & liabilities
- Individual category values (cash, savings, crypto, stocks, etc.)
- Detailed holdings in JSON format

**Auto-creates snapshots every hour** for intraday tracking!

---

## 🔒 Security Features

✅ **Row Level Security enabled**
- Price data is public (anyone can read)
- Portfolio snapshots are private (only you can see yours)
- Automatic user_id filtering

✅ **Automatic Cleanup**
- Keeps last 48 hours of hourly price snapshots
- Maintains daily portfolio snapshots forever
- Prevents database bloat

---

## 🚀 Performance Features

✅ **8 Optimized Indexes**
- Fast queries by symbol
- Fast queries by timestamp
- Fast queries by user
- Composite indexes for complex queries

✅ **Smart Views**
- `latest_prices` - Current price for each asset
- `portfolio_performance` - Your portfolio stats summary

---

## 📈 What Happens After Setup

1. **Automatic Tracking Starts**
   - Hourly snapshots of your portfolio
   - Price tracking for all your holdings
   - No manual intervention needed

2. **Timeframe Analysis Available**
   - See changes over 1h, 4h, 24h
   - Weekly, monthly, yearly performance
   - All calculated automatically

3. **Data Synced to Cloud**
   - Works across all your devices
   - Never lose historical data
   - Automatic backups by Supabase

---

## 🧪 Test Your Setup

After running the SQL, run this in your terminal:

```bash
# Test the connection
npx tsx -e "
import { supabase } from './lib/supabase/client';

async function test() {
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('count');
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ price_snapshots table exists!');
  }
  
  const { data: data2, error: error2 } = await supabase
    .from('portfolio_snapshots')
    .select('count');
  
  if (error2) {
    console.error('❌ Error:', error2.message);
  } else {
    console.log('✅ portfolio_snapshots table exists!');
  }
}

test();
"
```

---

## 🎯 Summary

**The Problem:** Tables don't exist → 404 errors

**The Solution:** Run the SQL schema (2 minutes)

**The Result:** 
- ✅ No more errors
- ✅ Automatic time tracking working
- ✅ Historical data saved to cloud
- ✅ Performance insights available

---

## 📚 Related Files

- `supabase-time-tracking-schema.sql` - The SQL to run
- `lib/enhanced-time-tracking-service.ts` - Service using these tables
- `hooks/use-enhanced-time-tracking.ts` - Hook for automatic tracking

---

**Ready? Let's fix this!** 🚀

1. Open SQL Editor
2. Copy & paste the schema
3. Click Run
4. Refresh your app

**Done!** ✨
