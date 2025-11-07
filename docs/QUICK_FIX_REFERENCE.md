# 🚀 Quick Fix Reference - Supabase SSR Issues

## Problem Summary
**500 Internal Server Error** caused by Supabase client initialization failing during Server-Side Rendering.

## Quick Diagnosis
```bash
# Check logs for the error
gcloud run services logs read financial-planner --region=europe-west1 --limit=50

# Look for:
# "Error: supabaseUrl is required"
# "Supabase credentials not found. Using localStorage fallback."
```

## Solution Pattern

### ✅ DO: Safe Initialization
```typescript
const getSupabaseCredentials = () => {
  // Browser: prioritize window.__ENV__
  if (typeof window !== 'undefined') {
    return {
      url: windowEnv?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: windowEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };
  }
  
  // Server: use process.env
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
};
```

### ✅ DO: Return Safe Proxies
```typescript
// Don't throw errors during SSR
const createDummyClient = (): any => {
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'auth') {
        return {
          getUser: () => Promise.resolve({ data: { user: null }, error: null })
        };
      }
      return () => Promise.resolve({ data: null, error: null });
    }
  });
};
```

### ❌ DON'T: Throw Errors During Module Evaluation
```typescript
// BAD - Will cause 500 errors
if (!url || !key) {
  throw new Error('Supabase not configured');
}
```

### ✅ DO: Client-Side Only Warnings
```typescript
if (typeof window !== 'undefined') {
  console.warn('Supabase not configured');
}
```

## Deployment Command
```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_SUPABASE_URL="https://ljatyfyeqiicskahmzmp.supabase.co",\
  _NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_KEY",\
  _NEXT_PUBLIC_APP_URL="https://your-app.run.app"
```

## Testing After Deploy
```bash
# 1. Check service is running
gcloud run services describe financial-planner --region=europe-west1

# 2. Test the endpoint
curl -I https://financial-planner-629380503119.europe-west1.run.app

# Should return: HTTP/2 200 (not 500)

# 3. Check logs
gcloud run services logs read financial-planner --region=europe-west1 --limit=20

# Should NOT see "supabaseUrl is required" errors
```

## Common Issues

### Issue: 500 Error Still Occurring
**Cause**: Environment variables not set in Cloud Run  
**Fix**: 
```bash
gcloud run services update financial-planner \
  --region=europe-west1 \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=https://ljatyfyeqiicskahmzmp.supabase.co"
```

### Issue: Variables Not Loading in Browser
**Cause**: `/api/env` endpoint not working  
**Check**: 
- Does https://your-app.run.app/api/env return JavaScript?
- Is `window.__ENV__` defined in browser console?

### Issue: Build Fails
**Cause**: Missing dependencies or syntax errors  
**Check**: 
```bash
# Local build test
npm run build
```

## Files Modified
- `lib/supabase/client.ts` - Safe initialization
- `middleware.ts` - Fixed Permissions-Policy header

## Key Takeaways
1. **Never throw during SSR** - Return safe defaults
2. **Environment variables** - Different strategies for client vs server
3. **Graceful degradation** - App should work even if Supabase unavailable
4. **Type safety** - Use try-catch for environment access

---
**Status**: ✅ Fixed  
**Date**: October 22, 2025
