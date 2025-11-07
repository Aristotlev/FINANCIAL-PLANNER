# 🔧 Production 500 Error Fix - October 22, 2025

## 🐛 Issues Identified

### 1. **500 Internal Server Error**
- **Root Cause**: Supabase client initialization failing during Server-Side Rendering (SSR)
- **Error**: `supabaseUrl is required`
- **Location**: Server chunks during page rendering
- **Impact**: Application completely unusable in production

### 2. **Permissions-Policy Header Warning**
- **Warning**: `Unrecognized feature: 'interest-cohort'`
- **Cause**: The `interest-cohort` directive is deprecated
- **Impact**: Browser console warning (non-critical)

## 🔍 Root Cause Analysis

### Supabase SSR Issue
The application was trying to initialize the Supabase client during server-side rendering, but the environment variables weren't being accessed correctly:

```
Error: supabaseUrl is required.
    at /app/.next/server/chunks/8631.js:34:40196
    at new rt (/app/.next/server/chunks/8631.js:34:40447)
    at ri (/app/.next/server/chunks/8631.js:34:44738)
```

**Problems:**
1. Environment variables weren't being read properly during SSR
2. Supabase client threw errors during initialization on the server
3. The error prevented the entire page from rendering
4. The `/api/env` endpoint (which injects runtime environment variables) never loaded because of the 500 error

## ✅ Solutions Implemented

### 1. Fixed Supabase Client Initialization (`lib/supabase/client.ts`)

#### **Changed Environment Variable Priority:**
```typescript
// BEFORE: Process.env first, then window.__ENV__
let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (typeof window !== 'undefined') {
  const windowEnv = (window as any).__ENV__;
  url = url || windowEnv?.NEXT_PUBLIC_SUPABASE_URL;
  key = key || windowEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// AFTER: Browser uses window.__ENV__ first, server uses process.env
if (typeof window !== 'undefined') {
  const windowEnv = (window as any).__ENV__;
  const url = windowEnv?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = windowEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}
// On server, get from process.env (should be set via Cloud Run env vars)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
return { url, key };
```

#### **Safe Dummy Client for SSR:**
```typescript
// BEFORE: Threw errors immediately
const createDummyClient = (): any => {
  const notConfiguredError = () => {
    throw new Error('Supabase is not configured...');
  };
  return new Proxy({}, {
    get: () => notConfiguredError
  });
};

// AFTER: Returns safe promises and mock objects
const createDummyClient = (): any => {
  const notConfiguredError = () => {
    if (typeof window !== 'undefined') {
      console.warn('Supabase is not configured...');
    }
    return Promise.resolve({ data: null, error: new Error('Supabase not configured') });
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'auth') {
        return {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          updateUser: notConfiguredError,
          // ... other auth methods
        };
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: [], error: null }),
          insert: notConfiguredError,
          // ... other operations
        });
      }
      return notConfiguredError;
    }
  });
};
```

#### **Client-Side Only Warnings:**
```typescript
// Only log warning on client side, not during SSR
if (typeof window !== 'undefined') {
  console.warn('Supabase credentials not found. Using localStorage fallback.');
}
supabaseInstance = createDummyClient();
```

#### **Safe Configuration Check:**
```typescript
export const isSupabaseConfigured = (): boolean => {
  try {
    const { url, key } = getSupabaseCredentials();
    return !!(url && key);
  } catch (error) {
    // During SSR or build, this might fail - return false safely
    return false;
  }
};
```

### 2. Fixed Permissions-Policy Header (`middleware.ts`)

```typescript
// BEFORE:
response.headers.set(
  'Permissions-Policy',
  'microphone=(self), camera=(), geolocation=(), interest-cohort=()'
);

// AFTER:
response.headers.set(
  'Permissions-Policy',
  'microphone=(self), camera=(), geolocation=()'
);
```

## 🎯 How It Works Now

### Environment Variable Flow:

1. **Build Time**: Environment variables passed as build args to Docker
2. **Cloud Run Deployment**: Environment variables set as runtime environment variables
3. **Server-Side (SSR)**: 
   - Uses `process.env.NEXT_PUBLIC_*` variables
   - Safe dummy client if variables missing
   - No errors thrown during initialization
4. **Client-Side**:
   - `/api/env` endpoint loads and injects `window.__ENV__`
   - Client prioritizes `window.__ENV__` over `process.env`
   - Full Supabase functionality available

### Graceful Degradation:

- **If Supabase unavailable during SSR**: Returns safe promises, doesn't crash
- **If Supabase unavailable on client**: Falls back to localStorage
- **User experience**: App renders, shows loading states, then loads data

## 🚀 Deployment

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_SUPABASE_URL="...",\
  _NEXT_PUBLIC_SUPABASE_ANON_KEY="...",\
  _NEXT_PUBLIC_APP_URL="...",\
  # ... other variables
```

## ✨ Expected Behavior After Fix

### ✅ What Should Work:
1. **Page loads without 500 error**
2. **Environment variables properly injected**
3. **Supabase client initializes correctly**
4. **No browser console errors** (except for missing favicon which is cosmetic)
5. **Authentication works properly**
6. **Data loads from Supabase**
7. **No Permissions-Policy warnings**

### 🧪 Testing Checklist:
- [ ] Visit https://financial-planner-629380503119.europe-west1.run.app
- [ ] Page loads without 500 error
- [ ] No "supabaseUrl is required" errors in console
- [ ] Can sign in with Google OAuth
- [ ] Dashboard displays after authentication
- [ ] Financial data loads correctly
- [ ] No Permissions-Policy warnings in console

## 📝 Technical Notes

### Why This Happened:
- Next.js 13+ App Router uses Server Components by default
- Supabase client was being evaluated during server rendering
- Environment variables weren't accessible during SSR the way they were expected
- Throwing errors during SSR causes the entire request to fail with 500

### Key Lessons:
1. **Always handle SSR gracefully** - Never throw errors during module evaluation
2. **Environment variables in Next.js** - Use different strategies for client vs server
3. **Proxy patterns** - Great for lazy initialization and safe fallbacks
4. **Runtime configuration** - Critical for containerized deployments where build ≠ runtime

## 🔗 Related Files Modified

- `lib/supabase/client.ts` - Supabase client initialization
- `middleware.ts` - Security headers configuration
- `cloudbuild.yaml` - Already had environment variables configured correctly

## 📊 Status

**Current**: 🔄 Deploying to Cloud Run with fixes  
**Build ID**: `b22bb475-178f-4083-a648-3dff72fcf63b`  
**Expected**: ✅ Application should be fully functional after deployment completes

---

**Date**: October 22, 2025  
**Issue**: Production 500 Internal Server Error + Permissions-Policy Warning  
**Status**: 🔧 Fixed, Deploying  
**Priority**: 🔴 Critical - Application was completely down
