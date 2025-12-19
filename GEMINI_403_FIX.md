# 🔧 Gemini API 403 Error - API Key Restrictions

## 🚨 Current Error

```
[403] Method doesn't allow unregistered callers (callers without established identity). 
Please use API Key or other form of API consumer identity to call this API.
```

## 🔍 Root Causes

There are **TWO** issues causing this error:

### Issue 1: Client-Side Usage ❌
The app is trying to use `GeminiService` **directly in the browser** (client-side), where the API key is NOT available.

**Problem:**
- `components/ui/ai-chat.tsx` imports and uses `GeminiService` on line 25 & 106
- Environment variable `GOOGLE_AI_API_KEY` is **server-side only** (no `NEXT_PUBLIC_` prefix)
- Browser code cannot access server-side environment variables
- This is a **security feature** to protect API keys

### Issue 2: API Key Not Enabled for Gemini API ⚠️
Your API key `AIzaSyCIDhQe4g9X6PJ4yATjvx1YUymXD2a1umI` might not have the Gemini API enabled in Google Cloud.

## ✅ Solutions

### Solution A: Enable Gemini API for Your Key (Recommended)

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   ```

2. **Select the correct project** (the one your API key belongs to)

3. **Click "ENABLE"** on the Generative Language API

4. **Wait 1-2 minutes** for propagation

5. **Test again** - the 403 error should be gone

### Solution B: Create a New API Key with Gemini Enabled

1. **Go to Google AI Studio:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Delete the old API key** (optional)

3. **Click "Create API Key"**

4. **Select or create a Google Cloud project**

5. **The new key will automatically have Gemini API enabled**

6. **Copy the new key** and update `.env.local`:
   ```bash
   GOOGLE_AI_API_KEY=AIzaSy... # Your new key
   ```

7. **Restart dev server:**
   ```bash
   npm run dev
   ```

### Solution C: Fix Client-Side Usage (Proper Architecture)

**This is the BEST long-term solution** but requires code changes.

**Current (Broken):**
```tsx
// ❌ Client-side - no API key available
import { GeminiService } from "@/lib/gemini-service";
const [geminiService] = useState(() => new GeminiService());
const response = await geminiService.processMessage(input);
```

**Fixed:**
```tsx
// ✅ Server-side via API route - API key available
const response = await fetch('/api/ai-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: input,
    userId: user.id 
  }),
});
const data = await response.json();
```

**Files that need changes:**
- `components/ui/ai-chat.tsx` - Remove GeminiService, use API route
- `app/api/ai-chat/route.ts` - Create new endpoint (or expand existing `/api/gemini`)

## 🎯 Quick Fix (Do This Now)

### Step 1: Enable Gemini API

Visit this URL (replace with YOUR project ID):
```
https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=YOUR_PROJECT_ID
```

Click **"ENABLE"**

### Step 2: Verify API Key Permissions

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your API key: `AIzaSyCIDhQe4g9X6PJ4yATjvx1YUymXD2a1umI`
3. Click "Edit" (pencil icon)
4. Under "API restrictions":
   - Select **"Restrict key"**
   - Check **"Generative Language API"**
5. Click **"Save"**

### Step 3: Test

Refresh your browser and try the AI chat again. The 403 error should be gone!

## 📊 Troubleshooting

### Still Getting 403?

1. **Wait 2-3 minutes** - API changes can take time to propagate

2. **Check API is enabled:**
   ```bash
   # Visit:
   https://console.cloud.google.com/apis/dashboard
   # Look for "Generative Language API" in enabled APIs
   ```

3. **Verify billing is enabled** (Gemini requires billing even on free tier):
   ```bash
   # Visit:
   https://console.cloud.google.com/billing
   # Ensure project has billing account linked
   ```

4. **Create a completely new API key:**
   - Sometimes old keys have permission issues
   - Delete old key, create fresh one
   - Update `.env.local` with new key

### API Key Quota Issues?

If you see:
```
Resource has been exhausted (e.g. check quota)
```

You've hit the free tier limit. Solutions:
- Wait for quota to reset (usually next day)
- Upgrade to paid tier
- Create new project with new API key

## 🔐 Security Notes

### ✅ Current Setup (Secure)
```bash
# Server-side only - NOT exposed to browser
GOOGLE_AI_API_KEY=AIzaSy...
```

### ❌ DON'T Do This
```bash
# This would expose your API key to everyone!
NEXT_PUBLIC_GOOGLE_AI_API_KEY=AIzaSy...
```

## 📝 Summary

**Immediate Action:**
1. Enable Generative Language API in Google Cloud Console
2. Add API restriction to your key (Generative Language API only)
3. Wait 2 minutes and test

**Long-term Fix:**
- Refactor `ai-chat.tsx` to use API routes instead of client-side GeminiService
- Follow the pattern in `GEMINI_CLIENT_SIDE_FIX.md`

---

**Status:** ⏳ Waiting for you to enable the API in Google Cloud Console  
**Est. Time:** 5 minutes  
**Difficulty:** Easy (just click "Enable" in Google Cloud)
