# 🔑 API Keys Audit & Optimization Guide

**Last Updated**: November 6, 2025

## 📊 Current API Keys Overview

### ✅ Active & Used

| API Key | Purpose | Usage Location | Cost | Status |
|---------|---------|----------------|------|--------|
| **Google AI (Gemini)** | AI chat, financial analysis, voice transcription | `/app/api/gemini/route.ts`, `/app/api/voice/route.ts`, `/app/api/stt-llm/route.ts` | Free tier (60 RPM) | ✅ **KEEP - HIGH PRIORITY** |
| **Google Maps** | Location picker for real estate | `/components/financial/real-estate-card.tsx`, `/components/ui/map-location-picker.tsx` | $200/month free credit | ✅ **KEEP - MEDIUM PRIORITY** |
| **Supabase** | Authentication & database | Throughout app | Free tier | ✅ **KEEP - CRITICAL** |
| **Replicate** | Alternative TTS (Kokoro-82m) | `/app/api/tts-replicate/route.ts`, `/app/api/tts/route.ts` (fallback) | Pay per use | ✅ **KEEP - BACKUP** |

### ❌ Unused / To Remove

| API Key | Status | Files to Clean |
|---------|--------|----------------|
| **ElevenLabs** | ❌ **NOT USED ANYMORE** | Remove from all deployment scripts, env files, and route handlers |
| **CoinMarketCap (CMC)** | ⚠️ **NOT CURRENTLY USED** | Remove or implement |
| **Finnhub** | ⚠️ **UNCLEAR** | Verify usage in `/app/api/finnhub/route.ts` |

---

## 🎯 API Key Usage Details

### 1. **Google AI (Gemini) API** - HIGH VALUE ⭐⭐⭐
**Environment Variable**: `NEXT_PUBLIC_GOOGLE_AI_API_KEY`

#### Current Usage:
- **AI Chat** (`/app/api/gemini/route.ts`): Text generation for financial advice
- **Voice Pipeline** (`/app/api/voice/route.ts`): Transcription + response generation
- **STT-LLM** (`/app/api/stt-llm/route.ts`): Speech-to-text + LLM processing

#### Features:
- Model: `gemini-1.5-flash-latest`
- Temperature: 0.7
- Max tokens: 512-1024
- Retry logic: 3 attempts with exponential backoff
- Safety settings: Block harassment & hate speech

#### Cost: **FREE**
- 60 requests per minute (RPM)
- 1,500 requests per day
- 1 million requests per month

#### Optimization Recommendations:
✅ **Already optimized** - Has retry logic, proper error handling
✅ Consider caching responses for common questions
✅ Monitor rate limits in production

---

### 2. **Google Maps API** - MEDIUM VALUE ⭐⭐
**Environment Variable**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

#### Current Usage:
- **Real Estate Card** (`/components/financial/real-estate-card.tsx`): Property location picker
- **Map Location Picker** (`/components/ui/map-location-picker.tsx`): Interactive map component
- **Test Page** (`/app/test-map/page.tsx`): Testing & demo

#### APIs Required:
- Maps JavaScript API ✅
- Places API (optional for autocomplete) ⚠️
- Geocoding API (optional for reverse geocoding) ⚠️

#### Cost:
- **Free tier**: $200/month credit
- Maps JavaScript API: $7 per 1,000 loads
- Places API: $17 per 1,000 requests
- Geocoding API: $5 per 1,000 requests

#### Current Configuration:
✅ Performance optimized (see `GOOGLE_MAPS_PERFORMANCE_OPTIMIZATION.md`)
✅ Memoization implemented
✅ Debouncing (150ms) on marker updates
✅ Minimal console logging
✅ Proper cleanup on unmount

#### Optimization Recommendations:
✅ **Already well-optimized**
⚠️ Consider removing Places/Geocoding APIs if not using autocomplete (save money)
📝 Add HTTP referer restrictions in production for security

---

### 3. **Supabase** - CRITICAL ⭐⭐⭐
**Environment Variables**: 
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Current Usage:
- User authentication (Google OAuth, email/password)
- Database for all financial data (cash, crypto, stocks, etc.)
- Profile management
- Avatar uploads

#### Cost: **FREE**
- Free tier: 500MB database, 1GB file storage, 50,000 monthly active users

#### Optimization Recommendations:
✅ **Critical - keep as-is**
✅ Already properly configured
📝 Consider upgrading if hitting limits

---

### 4. **Replicate API** - BACKUP ⭐
**Environment Variable**: `REPLICATE_API_TOKEN`

#### Current Usage:
- **TTS (Kokoro-82m model)**: Alternative text-to-speech provider
- Used in `/app/api/tts-replicate/route.ts`
- Fallback option in `/app/api/tts/route.ts` with `?provider=replicate`

#### Cost:
- Pay per use
- Kokoro-82m: ~$0.0001 per second of audio

#### Optimization Recommendations:
✅ **Keep as backup/alternative**
💡 Consider using as primary TTS (since removing ElevenLabs)
📝 Test quality vs cost vs Browser TTS

---

### 5. **CoinGecko API** - NO KEY NEEDED ✅
**Environment Variable**: None (public API)

#### Current Usage:
- **Crypto Prices** (`/app/api/crypto-prices/route.ts`): Fetches crypto prices & 24h changes

#### Features:
- Built-in caching (5 min fresh, 1 hour stale)
- Rate limit handling with fallback to stale data
- Graceful degradation on failures
- Supports batch requests

#### Cost: **FREE**
- No API key required
- Rate limited (50 calls/minute)

#### Optimization Recommendations:
✅ **Already well-optimized** - excellent caching strategy
✅ Handles rate limiting gracefully
✅ Returns stale data instead of errors

---

### 6. **RSS Feeds (News)** - NO KEY NEEDED ✅
**Environment Variable**: None (public RSS)

#### Current Usage:
- **News Feed** (`/app/api/news/route.ts`): Aggregates crypto, stocks, forex, indices news

#### Features:
- Multiple sources per category (8 crypto, 9 stocks, 7 forex, 12 indices)
- Priority-based fetching
- Intelligent deduplication (70% similarity threshold)
- Engagement scoring for ranking
- CORS proxy rotation for reliability
- 3-minute cache

#### Cost: **FREE**

#### Optimization Recommendations:
✅ **Excellent implementation**
✅ Smart caching and priority loading
💡 Consider reducing number of sources to speed up initial load

---

## ❌ Keys to Remove: ElevenLabs

### **ElevenLabs TTS** - DEPRECATED ❌
**Environment Variables**: 
- `NEXT_PUBLIC_ELEVENLABS_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_VOICE_ID`

#### Why Remove:
- You stated: "we are not using elevenlabs voice anymore"
- Still referenced in many files but can be removed
- Cost: $22/month (can be saved)

#### Files That Reference ElevenLabs:
1. `/app/api/tts/route.ts` - Still uses ElevenLabs as default
2. `/app/api/voice/route.ts` - Uses ElevenLabs for synthesis
3. `/lib/smart-voice-service.ts` - Smart throttling service (references only)
4. `.env.local.example` - Has placeholder
5. All deployment scripts (`.sh` files)
6. `global.d.ts` - Type definitions
7. `lib/supabase/client.ts` - Type definitions
8. `public/runtime-env.js` - Runtime env placeholder

---

## 🗑️ Cleanup Plan for ElevenLabs

### Phase 1: Switch to Alternative TTS ✅

**Option A: Use Browser TTS (Recommended)**
- Free
- Built into browser
- Good quality for most use cases
- Already implemented in `smart-voice-service.ts`

**Option B: Use Replicate Kokoro-82m**
- Better quality than browser TTS
- Pay per use (~$0.0001/sec)
- Already implemented in `/app/api/tts-replicate/route.ts`

**Option C: Keep ElevenLabs for Premium Cases**
- Only use for 5% of responses (as designed in `smart-voice-service.ts`)
- Current subscription: $22/month

### Phase 2: Remove ElevenLabs References

I can help you:
1. Update `/app/api/tts/route.ts` to use Replicate or Browser TTS as default
2. Update `/app/api/voice/route.ts` to use alternative
3. Remove from all deployment scripts
4. Remove from env examples
5. Remove type definitions
6. Remove from runtime env
7. Clean up documentation

---

## 💰 Current Monthly Costs

| Service | Cost | Status |
|---------|------|--------|
| Google AI (Gemini) | $0 | Free tier |
| Google Maps | $0 | Within free $200 credit |
| Supabase | $0 | Free tier |
| Replicate | ~$0-5 | Pay per use (minimal) |
| CoinGecko | $0 | Public API |
| RSS Feeds | $0 | Public feeds |
| ~~ElevenLabs~~ | ~~$22~~ | **Can be removed** |
| **Total** | **$0-5/month** | **vs $22-27 currently** |

---

## ⚠️ Unknown/Unused APIs

### CoinMarketCap (CMC)
**Environment Variable**: `CMC_API_KEY`
- Referenced in deployment scripts
- Not found in any actual API routes
- **Recommendation**: Remove from env vars unless you plan to use it

### Finnhub
**File**: `/app/api/finnhub/route.ts`
- Has an API route but couldn't verify if actually used
- **Recommendation**: Check if used in frontend, otherwise remove

---

## 🎯 Optimization Recommendations

### Immediate Actions (This Week)
1. ✅ **Remove ElevenLabs** - Save $22/month
2. ✅ **Switch to Replicate or Browser TTS**
3. ✅ **Remove CMC_API_KEY** if not using CoinMarketCap
4. ✅ **Audit Finnhub usage** - remove if not needed

### Short-term (This Month)
1. 📊 **Monitor Gemini usage** - ensure staying within free tier
2. 🗺️ **Add Google Maps restrictions** - HTTP referers for production
3. 💾 **Implement response caching** for Gemini (common questions)

### Long-term (Next Quarter)
1. 📈 **Monitor costs** as app scales
2. 🔄 **Consider Gemini caching** for frequently asked financial questions
3. 🌐 **Evaluate CDN** for static assets to reduce origin requests

---

## 🔐 Security Recommendations

### Current Security Issues:
⚠️ Some env vars have `NEXT_PUBLIC_` prefix exposing them to client
- `NEXT_PUBLIC_GOOGLE_AI_API_KEY` - **Should be server-side only**
- `NEXT_PUBLIC_ELEVENLABS_API_KEY` - **Should be server-side only**

### Fixes Needed:
1. Move sensitive API keys to server-side only (remove `NEXT_PUBLIC_`)
2. Create proxy routes for API calls
3. Use environment-specific keys (dev vs production)
4. Add rate limiting to API routes
5. Implement request signing for sensitive operations

---

## 📝 Next Steps

Would you like me to:
1. **Remove all ElevenLabs references** and switch to Replicate/Browser TTS?
2. **Clean up unused API keys** (CMC, potentially Finnhub)?
3. **Implement security improvements** (move client-exposed keys to server-side)?
4. **Add response caching** for Gemini to reduce API calls?
5. **Create a monitoring dashboard** for API usage tracking?

Let me know which tasks you'd like me to prioritize!
