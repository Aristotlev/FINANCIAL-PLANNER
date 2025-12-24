# API Rate Limiting & Caching Guide

## Overview
This app uses CoinGecko's free API for crypto prices, which has rate limits. We handle this gracefully using a multi-layer caching strategy.

## Rate Limiting Strategy

### CoinGecko API Limits
- **Free Tier**: 10-50 calls/minute
- **Response**: 429 status code when exceeded
- **Recovery**: Automatic after cooldown period

## Multi-Layer Caching System

### Layer 1: Fresh Cache (5 minutes)
```typescript
const CACHE_DURATION = 300000; // 5 minutes
```
- **When**: Normal operation
- **Behavior**: Returns fresh data from cache
- **Headers**: `X-Cache: HIT`

### Layer 2: Stale Cache (1 hour)
```typescript
const STALE_CACHE_DURATION = 3600000; // 1 hour
```
- **When**: Rate limited (429) or API error
- **Behavior**: Returns older cached data
- **Headers**: `X-Cache: STALE`

### Layer 3: Fallback Data
- **When**: No cache available and rate limited
- **Behavior**: Returns zero values with error flag
- **Status**: 200 (not 503) for graceful degradation

## Error Handling Flow

```
┌─────────────────┐
│  Frontend Call  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Cache    │◄── Fresh data available?
└────────┬────────┘        └─Yes─► Return cached data
         │
         No
         ▼
┌─────────────────┐
│  Call CoinGecko │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   200       429/503
    │         │
    ▼         ▼
  Cache    Check Stale Cache
  & Return      │
            ┌───┴───┐
            │       │
          Found   Not Found
            │       │
            ▼       ▼
        Return   Return
         Stale   Fallback
          Data     Data
```

## Response Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success or graceful fallback | Use data normally |
| 429 | Rate limited | Use stale cache or fallback |
| 503 | Service unavailable | Use stale cache or fallback |

**Important**: We always return 200 to the frontend, even when using fallback data, to prevent error logging.

## Console Logging

### Production Mode
- ✅ Silent operation
- ✅ No cache hit/miss logs
- ✅ No rate limit warnings
- ✅ Only critical errors shown

### Development Mode
```typescript
if (process.env.NODE_ENV === 'development') {
  console.debug('Using stale cache due to rate limit');
}
```
- Detailed cache behavior
- Rate limit notifications
- API response debugging

## Cache Headers

```typescript
{
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
  'X-Cache': 'HIT|MISS|STALE',
  'X-Rate-Limited': 'true', // When rate limited
  'Retry-After': '300' // Seconds to wait
}
```

## Best Practices

### 1. Batch Requests
```typescript
// Good - Single batch request
fetchCryptoPrices(['BTC', 'ETH', 'ADA'])

// Bad - Multiple individual requests
fetchCryptoPrices(['BTC'])
fetchCryptoPrices(['ETH'])
fetchCryptoPrices(['ADA'])
```

### 2. Respect Cache Duration
- Don't force refresh more than once per 5 minutes
- Use stale data during rate limits
- Show loading states appropriately

### 3. Handle Errors Gracefully
```typescript
// Frontend code
try {
  const prices = await fetchCryptoPrices(symbols);
  // prices may contain fallback data with success: false
  prices.forEach(price => {
    if (!price.success) {
      // Use last known price or show "--"
    }
  });
} catch (error) {
  // This rarely happens due to fallback handling
  console.error('Price fetch failed:', error);
}
```

### 4. User Experience
- Show cached data timestamp
- Display "Last updated" time
- Use loading indicators during fetch
- Don't show errors for rate limiting
- Gracefully degrade to "--" or last known values

## Monitoring Rate Limits

### Check Response Headers
```typescript
const response = await fetch('/api/crypto-prices', ...);
const rateLimited = response.headers.get('X-Rate-Limited');
const retryAfter = response.headers.get('Retry-After');

if (rateLimited) {
  // Wait before next request
  setTimeout(() => retry(), retryAfter * 1000);
}
```

### Implement Backoff
```typescript
// API already implements this
const maxRetries = 1;
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    response = await fetch(...);
    if (response.ok) break;
    if (response.status === 429) break; // Don't retry on 429
  } catch (error) {
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Testing Rate Limits

### Simulate Rate Limiting
1. Make rapid requests to trigger 429
2. Verify stale cache is used
3. Check console for development logs
4. Verify no errors in production mode

### Verify Fallback Behavior
```typescript
// Test with invalid symbols
fetchCryptoPrices(['INVALID_SYMBOL'])
// Should return success: false with fallback data
```

## Configuration

### Adjust Cache Duration
```typescript
// In app/api/crypto-prices/route.ts
const CACHE_DURATION = 300000; // 5 minutes (default)
const STALE_CACHE_DURATION = 3600000; // 1 hour (default)

// For development (more frequent updates)
const CACHE_DURATION = 60000; // 1 minute
```

### Adjust Timeouts
```typescript
// In lib/price-service.ts
setTimeout(() => controller.abort(), 8000); // 8 second timeout
```

## Troubleshooting

### Problem: Prices not updating
- Check if within 5-minute cache window
- Force refresh after cache expiry
- Verify API is not rate limited

### Problem: Seeing stale data
- Check `X-Cache: STALE` header
- API is likely rate limited
- Data will refresh when rate limit lifts

### Problem: Zero prices shown
- No cache available and rate limited
- Check network connectivity
- Wait for rate limit cooldown (5 minutes)

### Problem: Console spam
- Verify `NODE_ENV=production` is set
- Check that dev logs are wrapped in environment checks
- Clear browser cache if needed

## Future Improvements

1. **Upgrade API Tier**: Consider CoinGecko Pro for higher limits
2. **WebSocket Updates**: Use WebSocket for real-time prices
3. **Database Caching**: Store prices in Supabase for longer retention
4. **Price Snapshots**: Use time tracking system for historical data
5. **Multiple Sources**: Fallback to alternative APIs (CoinMarketCap, etc.)

---

**Last Updated**: October 19, 2025  
**Status**: ✅ Fully implemented and tested
