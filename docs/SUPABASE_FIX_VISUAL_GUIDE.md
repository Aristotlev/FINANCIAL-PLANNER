# Supabase Production Fix - Visual Guide

## 🔴 The Problem: Environment Variables Not Available

```
┌─────────────────────────────────────────────────────────┐
│  CURRENT BROKEN FLOW                                    │
└─────────────────────────────────────────────────────────┘

Step 1: Docker Build
┌────────────────────────┐
│  Docker Build          │
│  ├── npm run build     │
│  │   ├── process.env.NEXT_PUBLIC_SUPABASE_URL = undefined ❌
│  │   └── process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined ❌
│  └── Bundle created    │
│      (no Supabase URL) │
└────────────────────────┘
         ↓
Step 2: Deploy to Cloud Run
┌────────────────────────┐
│  Cloud Run Deployment  │
│  Set ENV vars:         │
│  ├── NEXT_PUBLIC_SUPABASE_URL = "https://..." ✅
│  └── NEXT_PUBLIC_SUPABASE_ANON_KEY = "ey..." ✅
│                        │
│  But bundle already    │
│  built without them! ❌ │
└────────────────────────┘
         ↓
Step 3: Browser Loads App
┌────────────────────────┐
│  Browser               │
│  ├── Load bundle       │
│  ├── Supabase client   │
│  │   checks:           │
│  │   process.env = undefined ❌
│  └── Error: supabaseUrl│
│      is required       │
└────────────────────────┘
```

## 🟢 The Solution: Dual-Source Environment Loading

```
┌─────────────────────────────────────────────────────────┐
│  NEW WORKING FLOW                                       │
└─────────────────────────────────────────────────────────┘

Step 1: Docker Build (with build args)
┌────────────────────────┐
│  Docker Build          │
│  --build-arg           │
│  NEXT_PUBLIC_SUPABASE_ │
│  URL=https://...       │
│  ├── npm run build     │
│  │   ├── process.env.NEXT_PUBLIC_SUPABASE_URL = "https://..." ✅
│  │   └── process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "ey..." ✅
│  └── Bundle created    │
│      (with Supabase)   │
└────────────────────────┘
         ↓
Step 2: Deploy to Cloud Run (with runtime ENV)
┌────────────────────────┐
│  Cloud Run Deployment  │
│  Set ENV vars:         │
│  ├── NEXT_PUBLIC_SUPABASE_URL = "https://..." ✅
│  └── NEXT_PUBLIC_SUPABASE_ANON_KEY = "ey..." ✅
│                        │
│  These are available   │
│  at runtime via        │
│  /api/env endpoint ✅  │
└────────────────────────┘
         ↓
Step 3: Browser Loads App
┌────────────────────────────────────┐
│  Browser                           │
│  ├── Load /api/env                 │
│  │   → window.__ENV__ = {...} ✅   │
│  ├── Load Next.js bundle           │
│  ├── Supabase client checks:       │
│  │   ├── process.env (from build) ✅│
│  │   └── window.__ENV__ (runtime) ✅│
│  └── Success! Supabase connected ✅ │
└────────────────────────────────────┘
```

## 🎯 Key Changes Made

### 1. Supabase Client (`lib/supabase/client.ts`)

**Before:**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If undefined at build time, stays undefined forever ❌
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**After:**
```typescript
const getSupabaseCredentials = () => {
  // Check both build-time and runtime sources
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Also check runtime window object
  if (typeof window !== 'undefined') {
    url = url || window.__ENV__?.NEXT_PUBLIC_SUPABASE_URL;
    key = key || window.__ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  
  return { url, key };
};

// Lazy initialization ✅
export const supabase = new Proxy({}, {
  get: (target, prop) => {
    const instance = getSupabaseInstance();
    return instance[prop];
  }
});
```

### 2. Runtime ENV API (`app/api/env/route.ts`)

**New file that serves environment variables at runtime:**

```typescript
export async function GET() {
  const envScript = `
    window.__ENV__ = {
      NEXT_PUBLIC_SUPABASE_URL: '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}',
      // ... other vars
    };
  `;
  
  return new Response(envScript, {
    headers: { 'Content-Type': 'application/javascript' }
  });
}
```

### 3. App Layout (`app/layout.tsx`)

**Added script to load ENV before app:**

```tsx
<Script src="/api/env" strategy="beforeInteractive" />
```

This ensures `window.__ENV__` is available before Supabase client initializes.

## 📊 Environment Variable Flow

```
┌──────────────────┐
│  .env.local      │  ← Your local environment file
│  ├── NEXT_PUBLIC_│
│  │   SUPABASE_   │
│  │   URL=...     │
│  └── ...         │
└────────┬─────────┘
         │
         ↓
┌────────┴─────────┐
│ deploy-supabase- │  ← Deployment script
│ fix.sh           │
│ Reads .env.local │
│ and passes to    │
│ Cloud Build      │
└────────┬─────────┘
         │
         ├─────────────────────┐
         │                     │
         ↓                     ↓
┌────────┴─────────┐  ┌────────┴─────────┐
│ Build Args       │  │ Cloud Run ENV    │
│ (for Docker)     │  │ (for runtime)    │
│                  │  │                  │
│ Used during:     │  │ Used during:     │
│ • npm build      │  │ • Server runtime │
│ • Bundle creation│  │ • /api/env       │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ↓                     ↓
┌────────┴─────────┐  ┌────────┴─────────┐
│ process.env      │  │ window.__ENV__   │
│ (build-time)     │  │ (runtime)        │
│                  │  │                  │
│ Available in:    │  │ Available in:    │
│ • Server code    │  │ • Browser        │
│ • Build process  │  │ • Client code    │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    ↓
         ┌──────────┴──────────┐
         │ Supabase Client     │
         │ Checks BOTH sources │
         │ ✅ Always works     │
         └─────────────────────┘
```

## 🧪 Testing the Fix

### Test 1: Check /api/env Endpoint
```bash
curl https://your-app.run.app/api/env
```

**Expected Output:**
```javascript
(function() {
  window.__ENV__ = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://ljatyfyeqiicskahmzmp.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJh...',
    // ...
  };
})();
```

### Test 2: Check Browser Console
Open DevTools and look for:
```
[Runtime ENV] Environment variables loaded at runtime
[Runtime ENV] Supabase configured: true
[SUPABASE] Initialized with URL: https://ljatyfyeqiicskahmzmp.supabase.co
```

### Test 3: Check Network Tab
1. Open DevTools → Network tab
2. Filter for "env"
3. Should see request to `/api/env`
4. Response should contain Supabase credentials

## 🎨 Architecture Comparison

### Old Architecture (Broken)
```
┌─────────┐
│ Browser │
└────┬────┘
     │ Request page
     ↓
┌────┴──────────┐
│  Cloud Run    │
│  Next.js App  │
│               │
│  Bundle with  │
│  undefined    │
│  env vars ❌  │
└───────────────┘
```

### New Architecture (Working)
```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. Request /api/env
     ↓
┌────┴──────────┐
│  Cloud Run    │
│  /api/env     │
│  Returns:     │
│  window.__ENV│
│  = {...} ✅   │
└────┬──────────┘
     │ 2. Load env
     ↓
┌────┴────┐
│ Browser │
│ window. │
│ __ENV__ │
│ = {...} │
└────┬────┘
     │ 3. Request page
     ↓
┌────┴──────────┐
│  Cloud Run    │
│  Next.js App  │
│               │
│  Supabase     │
│  client       │
│  checks:      │
│  1. process.  │
│     env ✅    │
│  2. window.   │
│     __ENV__ ✅│
└───────────────┘
```

## ✅ Deployment Checklist

- [ ] Run `./deploy-supabase-fix.sh`
- [ ] Wait for deployment (~5-10 min)
- [ ] Run `./verify-supabase-fix.sh`
- [ ] Open app in browser
- [ ] Check console for success messages
- [ ] Test login functionality
- [ ] Test data operations (add/edit/delete)
- [ ] No "supabaseUrl is required" errors
- [ ] No localStorage fallback messages

## 🎉 Success Indicators

When everything works, you'll see:
- ✅ No red errors in console
- ✅ "[Runtime ENV] Supabase configured: true"
- ✅ Login works
- ✅ Data syncs to Supabase
- ✅ Real-time updates work
- ✅ No fallback to localStorage

## 🔧 Maintenance

### Updating Environment Variables

If you need to update environment variables in the future:

**Option 1: Quick Update (Runtime Only)**
```bash
gcloud run services update financial-planner \
  --region=europe-west1 \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=new-value"
```

**Option 2: Full Rebuild (Recommended)**
```bash
# Update .env.local first
./deploy-supabase-fix.sh
```

### Monitoring

Check logs for any issues:
```bash
gcloud logging read \
  "resource.type=cloud_run_revision" \
  --limit=50 \
  --project=money-hub-app-439313
```

---

**Questions?** Check `SUPABASE_PRODUCTION_FIX_COMPLETE.md` for detailed explanations.
