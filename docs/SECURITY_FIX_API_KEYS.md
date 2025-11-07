# 🔐 Security Fix: Moving API Keys Server-Side

## 🚨 Security Issue Identified

**Problem**: Sensitive API keys are exposed to client-side code using `NEXT_PUBLIC_` prefix:
- `NEXT_PUBLIC_GOOGLE_AI_API_KEY` → Exposed in browser
- `NEXT_PUBLIC_ELEVENLABS_API_KEY` → Exposed in browser

**Risk**: These keys can be extracted from the client-side JavaScript bundles and abused.

---

## ✅ Solution: Server-Side Only API Keys

### Step 1: Update Environment Variable Names

**Old (Insecure)**:
```bash
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_key_here
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_key_here
```

**New (Secure)**:
```bash
GOOGLE_AI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
```

### Step 2: Update `.env.local`

Remove `NEXT_PUBLIC_` prefix from these keys:

```bash
# ❌ OLD - INSECURE
# NEXT_PUBLIC_GOOGLE_AI_API_KEY=AIzaSyC...
# NEXT_PUBLIC_ELEVENLABS_API_KEY=sk_...

# ✅ NEW - SECURE (Server-side only)
GOOGLE_AI_API_KEY=AIzaSyC...
ELEVENLABS_API_KEY=sk_...

# Keep these as NEXT_PUBLIC_ (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 Files That Need Updating

### API Routes (Already server-side - just change env var name)

1. **`/app/api/gemini/route.ts`**
```typescript
// ❌ OLD
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

// ✅ NEW
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
```

2. **`/app/api/voice/route.ts`**
```typescript
// ❌ OLD
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

// ✅ NEW
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
```

3. **`/app/api/tts/route.ts`**
```typescript
// ❌ OLD
const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

// ✅ NEW
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
```

4. **`/app/api/stt-llm/route.ts`** (if exists)

### Client-Side Libraries (Need to be removed or proxied)

5. **`/lib/gemini-service.ts`** ⚠️ **CRITICAL**
```typescript
// ❌ OLD - Exposed to client!
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '';

// ✅ OPTION A: Remove client-side usage completely (recommended)
// Move all Gemini calls to API routes

// ✅ OPTION B: Use proxy endpoint (if you must use client-side)
// Don't use API key directly, call /api/gemini instead
```

6. **`/lib/tts-preprocessor.ts`**
```typescript
// ❌ OLD
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '';

// ✅ NEW
// Remove direct API calls, use /api/gemini proxy instead
```

### TypeScript Definitions

7. **`/global.d.ts`**
```typescript
// ❌ OLD
interface ProcessEnv {
  NEXT_PUBLIC_GOOGLE_AI_API_KEY?: string;
  NEXT_PUBLIC_ELEVENLABS_API_KEY?: string;
  NEXT_PUBLIC_ELEVENLABS_VOICE_ID?: string;
}

// ✅ NEW
interface ProcessEnv {
  GOOGLE_AI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}
```

8. **`/lib/supabase/client.ts`**
```typescript
// Remove NEXT_PUBLIC_ references from type definitions
```

### Deployment Files

9. **`cloudbuild.yaml`**
```yaml
# ❌ OLD
- 'NEXT_PUBLIC_GOOGLE_AI_API_KEY=${_NEXT_PUBLIC_GOOGLE_AI_API_KEY}'
- 'NEXT_PUBLIC_ELEVENLABS_API_KEY=${_NEXT_PUBLIC_ELEVENLABS_API_KEY}'

# ✅ NEW
- 'GOOGLE_AI_API_KEY=${_GOOGLE_AI_API_KEY}'
- 'ELEVENLABS_API_KEY=${_ELEVENLABS_API_KEY}'
```

10. **All deployment scripts** (`.sh` files)
- `create-proper-trigger.sh`
- `deploy-supabase-fix.sh`
- `deploy-with-env-vars.sh`
- etc.

11. **`Dockerfile`**
```dockerfile
# ❌ OLD
ARG NEXT_PUBLIC_GOOGLE_AI_API_KEY
ENV NEXT_PUBLIC_GOOGLE_AI_API_KEY=$NEXT_PUBLIC_GOOGLE_AI_API_KEY

# ✅ NEW
ARG GOOGLE_AI_API_KEY
ENV GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY
```

12. **`public/runtime-env.js`**
```javascript
// Remove these entries completely (server-side only)
// NEXT_PUBLIC_GOOGLE_AI_API_KEY: '__NEXT_PUBLIC_GOOGLE_AI_API_KEY__',
// NEXT_PUBLIC_ELEVENLABS_API_KEY: '__NEXT_PUBLIC_ELEVENLABS_API_KEY__',
```

---

## 🎯 Recommended Approach

### Option 1: Full API Proxy (Most Secure) ⭐ RECOMMENDED

**All AI calls go through your API routes**:
```
Client → /api/gemini → Google AI API
Client → /api/tts → ElevenLabs/Replicate API
```

**Pros**:
- ✅ API keys never exposed to client
- ✅ Rate limiting control
- ✅ Request logging/monitoring
- ✅ Can add authentication
- ✅ Can cache responses

**Cons**:
- Adds one API hop (minimal latency)

### Option 2: Hybrid (Keep Some Client-Side)

**Server-side**: Google AI, ElevenLabs (sensitive)
**Client-side**: Google Maps, Supabase (public/safe)

---

## 🔧 Implementation Steps

### Phase 1: Update API Routes ✅ (Safe - No Breaking Changes)

1. Update `/app/api/gemini/route.ts`
2. Update `/app/api/voice/route.ts`
3. Update `/app/api/tts/route.ts`
4. Test locally with new env vars

### Phase 2: Update Client Libraries ⚠️ (Breaking Changes)

1. **Option A**: Remove `lib/gemini-service.ts` client-side usage
   - Update all components to use `/api/gemini` instead
   
2. **Option B**: Keep but proxy through API
   ```typescript
   // lib/gemini-service.ts
   async chat(message: string) {
     const response = await fetch('/api/gemini', {
       method: 'POST',
       body: JSON.stringify({ text: message })
     });
     return response.json();
   }
   ```

### Phase 3: Update Deployment Files

1. Update `cloudbuild.yaml`
2. Update all `.sh` deployment scripts
3. Update `Dockerfile`
4. Update Google Cloud Build substitutions

### Phase 4: Update Cloud Environment Variables

```bash
# In Google Cloud Build Triggers
# Replace:
_NEXT_PUBLIC_GOOGLE_AI_API_KEY → _GOOGLE_AI_API_KEY
_NEXT_PUBLIC_ELEVENLABS_API_KEY → _ELEVENLABS_API_KEY

# In Cloud Run service
gcloud run services update financial-planner \
  --region=europe-west1 \
  --update-env-vars=GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY,ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY \
  --remove-env-vars=NEXT_PUBLIC_GOOGLE_AI_API_KEY,NEXT_PUBLIC_ELEVENLABS_API_KEY
```

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Update `.env.local` with new var names
- [ ] Restart dev server
- [ ] Test `/api/gemini` endpoint
- [ ] Test `/api/tts` endpoint
- [ ] Test `/api/voice` endpoint
- [ ] Verify client-side code doesn't break

### Production Testing
- [ ] Update Cloud Build trigger substitutions
- [ ] Deploy to staging/test environment
- [ ] Verify API keys not in client bundle
- [ ] Test all AI features
- [ ] Monitor error logs

---

## 🔍 Verify Security Fix

### Check Client Bundle
```bash
# Build the app
npm run build

# Search for API keys in the built files
grep -r "AIzaSy" .next/static/
grep -r "sk_" .next/static/

# Should return NO results! ✅
```

### Check Browser DevTools
1. Open your app in browser
2. Open DevTools → Sources tab
3. Search all files for "GOOGLE_AI_API_KEY"
4. Should NOT find the actual key value ✅

### Check Network Requests
1. Open DevTools → Network tab
2. Use AI features
3. Verify API keys are NOT in request headers from client
4. Verify requests go to `/api/*` routes ✅

---

## 📊 Impact Analysis

### Files Affected: ~35 files
- API routes: 4 files
- Client libraries: 3 files  
- Type definitions: 2 files
- Deployment scripts: 15+ files
- Documentation: 10+ files

### Estimated Time: 2-3 hours
- Code changes: 1 hour
- Testing: 1 hour
- Deployment: 30 min

### Risk Level: **MEDIUM**
- ⚠️ Breaking change in production if not careful
- ✅ Can be done gradually with fallbacks

---

## 🚀 Quick Start Command

I can execute this fix for you. Would you like me to:

1. ✅ **Update all API routes** (safe, no breaking changes)
2. ✅ **Update type definitions**
3. ✅ **Update deployment files** (cloudbuild.yaml, Dockerfile)
4. ⚠️ **Refactor client-side libraries** (needs testing)
5. 📝 **Create migration script**

**Recommended Order**:
1. Update API routes first (backwards compatible)
2. Update `.env.local` with both old and new keys (transition period)
3. Test thoroughly
4. Update deployment
5. Remove old keys after verification

---

## 🎓 Security Best Practices

### ✅ DO:
- Keep API keys server-side only
- Use environment variables
- Add rate limiting to API routes
- Log API usage for monitoring
- Rotate keys periodically
- Use different keys for dev/staging/prod

### ❌ DON'T:
- Expose sensitive keys with `NEXT_PUBLIC_`
- Commit API keys to Git
- Share API keys between services
- Use production keys in development
- Store keys in client-side code

---

## 📞 Next Steps

Ready to implement? I can:

1. **Make all the changes automatically** (recommended)
2. **Generate a migration script** you can review first
3. **Do it step-by-step** with your approval at each phase

Which approach would you prefer?
