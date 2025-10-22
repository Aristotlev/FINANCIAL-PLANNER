# News System Quick Reference Guide

## ⚡ Quick Stats

| Category | Sources | Min Articles | Cache Time | Timeout |
|----------|---------|--------------|------------|---------|
| My News  | Custom  | 8+          | 2 min      | 4s      |
| Crypto   | 8       | 8+          | 2 min      | 4s      |
| Stocks   | 9       | 8+          | 2 min      | 4s      |
| Forex    | 7       | 8+          | 2 min      | 4s      |
| Indices  | 12      | 8+          | 2 min      | 4s      |

## 🎯 Performance Targets

- **Initial Load**: < 4 seconds
- **Tab Switch**: < 100ms (cached)
- **Refresh**: < 4 seconds
- **Cache Validity**: 2 minutes (frontend), 3 minutes (backend)

## 📊 News Sources by Category

### Crypto (8 sources)
1. CoinDesk (Priority 1)
2. CoinTelegraph (Priority 1)
3. The Block (Priority 1)
4. Bitcoin Magazine (Priority 2)
5. Crypto Briefing (Priority 2)
6. Decrypt (Priority 2)
7. CryptoSlate (Priority 3)
8. NewsBTC (Priority 3)

### Stocks (9 sources)
1. MarketWatch (Priority 1)
2. Yahoo Finance (Priority 1)
3. Investing.com (Priority 1)
4. Seeking Alpha (Priority 1)
5. Benzinga (Priority 2)
6. CNBC (Priority 2)
7. Reuters Business (Priority 2)
8. Barron's (Priority 2)
9. The Motley Fool (Priority 3)

### Forex (7 sources)
1. FXStreet (Priority 1)
2. DailyFX (Priority 1)
3. ForexLive (Priority 1)
4. Investing.com FX (Priority 2)
5. FXEmpire (Priority 2)
6. Finance Magnates (Priority 2)
7. Action Forex (Priority 3)

### Indices (12 sources) ⭐ NEW
1. MarketWatch (Priority 1)
2. Investing.com (Priority 1)
3. Reuters Markets (Priority 1)
4. CNBC Markets (Priority 1)
5. Yahoo Finance Markets (Priority 1)
6. Bloomberg (Priority 2)
7. Financial Times (Priority 2)
8. WSJ Markets (Priority 2)
9. Barron's Markets (Priority 2)
10. CNBC World Markets (Priority 3)
11. The Motley Fool (Priority 3)
12. Seeking Alpha Markets (Priority 3)

## 🔧 Configuration Values

### API Layer (`/app/api/news/route.ts`)
```typescript
CACHE_DURATION = 3 * 60 * 1000     // 3 minutes
FETCH_TIMEOUT = 3000               // 3 seconds
ITEMS_PER_FEED = 20                // 20 items
MAX_ARTICLES_RETURNED = 100        // Top 100
```

### Frontend Layer (`/components/financial/news-card.tsx`)
```typescript
CACHE_VALIDITY = 2 * 60 * 1000     // 2 minutes
API_TIMEOUT = 4000                 // 4 seconds
REFRESH_DELAY = 150                // 150ms
MIN_ARTICLES_PER_TAB = 8           // 8 articles
```

## 🚀 Loading Strategy

### Priority System
- **Priority 1** (Major): Fetch immediately, high importance
- **Priority 2** (Secondary): Fetch after 1.5s with 800ms delay between
- **Priority 3** (Background): Fetch after 5s with 1.2s delay between

### Caching Strategy
1. Check cache first
2. If cache exists and valid (< 2 min), show immediately
3. If cache stale, show cached + refresh in background
4. If no cache, show loading + fetch fresh data

### Force Refresh
1. Clear all cache for current category
2. Fetch all sources in parallel
3. Show loading overlay
4. Replace with fresh data

## 📱 User Experience Flow

### Tab Click Flow
```
User clicks tab
  ↓
Check cache
  ↓
Cache exists? → YES → Show cached articles instantly
  |                    ↓
  |                  Cache valid? → NO → Refresh in background
  ↓
  NO → Show loading → Fetch fresh → Show articles
```

### Refresh Button Flow
```
User clicks refresh
  ↓
Clear cache
  ↓
Show loading overlay (150ms delay for visual feedback)
  ↓
Fetch all sources in parallel (4s timeout)
  ↓
Show fresh articles
```

## 🎨 UI States

### Loading States
- **Initial Load**: Full-screen spinner with source count
- **Tab Switch (cached)**: No spinner, instant articles
- **Tab Switch (no cache)**: Small spinner, brief wait
- **Refreshing**: Overlay spinner on existing articles

### Article Display
- **Minimum**: 8 articles per tab
- **Maximum**: 100 articles per tab
- **Sorting**: Engagement score (priority + recency + quality)

## 💡 Tips for Developers

### Adding New Sources
1. Add to `RSS_FEEDS` object in `/app/api/news/route.ts`
2. Set appropriate priority (1, 2, or 3)
3. Add to `NEWS_SOURCES` in `/components/financial/news-card.tsx`
4. Update color scheme for consistency

### Adjusting Performance
- **Faster loading**: Reduce timeouts (careful with reliability)
- **More articles**: Increase `ITEMS_PER_FEED` (careful with bandwidth)
- **Fresher content**: Reduce cache durations (more API calls)
- **Better reliability**: Increase timeouts (slower response)

### Debugging
- Check browser console for timeout errors
- Look for "Timeout fetching RSS feed from X" messages
- Monitor network tab for API response times
- Check cache hit/miss rates in console

## 🐛 Common Issues & Solutions

### Slow Loading
- **Check**: API timeout settings
- **Fix**: Reduce timeout or increase priority of slow sources
- **Impact**: Faster load but might skip some sources

### Missing Articles
- **Check**: Feed parsing in `parseRSSFeed` function
- **Fix**: Add support for different RSS/Atom formats
- **Impact**: Better article coverage

### Cache Not Working
- **Check**: Cache duration and validity checks
- **Fix**: Verify timestamp comparisons in code
- **Impact**: Better performance when fixed

### Duplicate Articles
- **Check**: Deduplication logic in API route
- **Fix**: Adjust similarity threshold (currently 70%)
- **Impact**: Cleaner article list

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Average load time per category
- Cache hit rate
- API timeout rate
- Article count per source
- User engagement (clicks per article)

### Performance Benchmarks
- **Excellent**: < 2s initial load, > 90% cache hit
- **Good**: 2-4s initial load, > 70% cache hit
- **Needs Improvement**: > 4s initial load, < 70% cache hit

---

**Last Updated**: October 22, 2025  
**Version**: 2.0  
**Status**: ✅ Optimized & Production Ready
