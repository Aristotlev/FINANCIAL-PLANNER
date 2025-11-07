# 🎨 Visual Guide: Supabase Environment Variables Issue

## 🔴 Current Broken Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Docker Build (Cloud Build)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FROM node:20-alpine                                         │
│  ARG NEXT_PUBLIC_SUPABASE_URL                               │
│  ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL    │
│                                                              │
│  ❌ Value: undefined (not passed from Cloud Build)          │
│                                                              │
│  RUN npm run build                                           │
│      ↓                                                       │
│  Next.js embeds: const supabaseUrl = undefined;             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Deploy to Cloud Run                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=https://...        │
│                                                              │
│  ⚠️  TOO LATE! JavaScript bundles already built             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Browser Loads App                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  var supabaseUrl = undefined;  ← From built JS bundle       │
│  createClient(undefined, undefined)                          │
│                                                              │
│  ❌ Error: "supabaseUrl is required"                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🟢 Fixed Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Cloud Build with Substitutions                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  gcloud builds submit --substitutions=\                      │
│    _NEXT_PUBLIC_SUPABASE_URL="https://lj...supabase.co"     │
│                                                              │
│  ✅ Variables passed to Docker build                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Docker Build Receives Variables                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ARG NEXT_PUBLIC_SUPABASE_URL="https://lj...supabase.co"   │
│  ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL    │
│                                                              │
│  ✅ Value available during build                            │
│                                                              │
│  RUN npm run build                                           │
│      ↓                                                       │
│  Next.js embeds:                                             │
│  const supabaseUrl = "https://ljatyfyeqiicskahmzmp.su...";  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Deploy to Cloud Run                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=https://...        │
│                                                              │
│  ✅ Also set for server-side consistency                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Browser Loads App                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  var supabaseUrl = "https://ljatyfyeqiicskahmzmp.su...";    │
│  createClient(supabaseUrl, supabaseKey)                      │
│                                                              │
│  ✅ Supabase client initializes successfully                │
│  ✅ Authentication works                                     │
│  ✅ Database queries work                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Environment Variable Types Comparison

```
┌─────────────────────────────┬──────────────┬──────────────┐
│ Variable Type               │ When Set     │ Where Used   │
├─────────────────────────────┼──────────────┼──────────────┤
│ NEXT_PUBLIC_*               │ BUILD TIME   │ Browser +    │
│ (Client-side accessible)    │ ⚠️ CRITICAL  │ Server       │
│                             │              │              │
│ Example:                    │ Embedded in  │ Always       │
│ NEXT_PUBLIC_SUPABASE_URL    │ JS bundles   │ available    │
├─────────────────────────────┼──────────────┼──────────────┤
│ Regular env vars            │ RUNTIME      │ Server only  │
│ (Server-side only)          │              │              │
│                             │              │              │
│ Example:                    │ Can be set   │ Not in       │
│ SUPABASE_SERVICE_ROLE_KEY   │ in Cloud Run │ browser      │
└─────────────────────────────┴──────────────┴──────────────┘
```

## 🔄 Next.js Build Process

```
                    BUILD TIME
                        │
                        ↓
        ┌───────────────────────────┐
        │ Read NEXT_PUBLIC_* vars   │
        │ from process.env          │
        └───────────────┬───────────┘
                        │
                        ↓
        ┌───────────────────────────┐
        │ Replace in source code:   │
        │                           │
        │ process.env.NEXT_PUBLIC_* │
        │         ↓                 │
        │   "actual_value"          │
        └───────────────┬───────────┘
                        │
                        ↓
        ┌───────────────────────────┐
        │ Bundle JavaScript files   │
        │ with hardcoded values     │
        └───────────────┬───────────┘
                        │
                        ↓
                    RUNTIME
                        │
                        ↓
        ┌───────────────────────────┐
        │ Browser loads bundles     │
        │ Values already embedded!  │
        └───────────────────────────┘
```

## 🎯 The Fix in Action

### Command Line View:

```bash
# ❌ WRONG: Variables only at runtime
gcloud run deploy app \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=https://...

# ✅ RIGHT: Variables during build
gcloud builds submit \
  --substitutions _NEXT_PUBLIC_SUPABASE_URL=https://...
```

### Console Output:

#### Before Fix ❌
```javascript
// Browser Console
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
// → undefined

// Actual code in bundle
var t = undefined;  // supabaseUrl
```

#### After Fix ✅
```javascript
// Browser Console  
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
// → "https://ljatyfyeqiicskahmzmp.supabase.co"

// Actual code in bundle
var t = "https://ljatyfyeqiicskahmzmp.supabase.co";
```

## 🚀 Quick Command

```bash
# Just run this:
./deploy-with-env-fix.sh

# What it does:
# 1. Reads .env.local
# 2. Passes variables to Cloud Build  
# 3. Docker build receives variables
# 4. Next.js embeds them in bundles
# 5. Deploys to Cloud Run
# ✅ Done!
```

## 📱 Testing the Fix

### Open Browser DevTools:

```javascript
// In Console, type:
window.supabase

// Before fix: ❌
// Proxy { ... } with error handlers

// After fix: ✅  
// SupabaseClient { ... } with real methods
```

## 🎓 Key Learning

> **Next.js NEXT_PUBLIC_* variables are not dynamic!**
>
> They are **replaced at build time** with their actual values.
> Think of them as **constants**, not variables.

```javascript
// Source code:
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// After build (if var was set):
const url = "https://ljatyfyeqiicskahmzmp.supabase.co";

// After build (if var was NOT set):  
const url = undefined;  // ← This is your problem!
```

## ✅ Success Indicators

After running `./deploy-with-env-fix.sh`:

1. ✅ No "Supabase credentials not found" warning
2. ✅ No "supabaseUrl is required" error
3. ✅ Sign in with Google works
4. ✅ Data loads from Supabase
5. ✅ Real-time subscriptions work

---

**Ready to fix it?** Run:
```bash
./deploy-with-env-fix.sh
```
