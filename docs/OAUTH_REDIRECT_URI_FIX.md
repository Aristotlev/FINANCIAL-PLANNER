# 🔧 OAuth Redirect URI Mismatch - Complete Fix Guide

## ❌ The Problem

**Error:** `redirect_uri_mismatch`

**Full Error Message (from Google):**
```
You cannot connect to this application because it does not match 
Google's OAuth 2.0 redirect_uri policy. If you are the application 
developer, register the redirect URI in the Google Cloud Console.
```

**What's happening:**
- Your app is trying to use: `https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google`
- But this URL is **NOT registered** in your Google Cloud OAuth credentials

---

## ✅ The Solution

You need to add the redirect URI to your Google Cloud Console OAuth credentials.

### **Step 1: Go to Google Cloud Console**

1. Open: https://console.cloud.google.com/apis/credentials
2. Make sure you're in the correct project: **financial-planner** (Project ID: `financial-planner-629380503119`)

### **Step 2: Find Your OAuth 2.0 Client**

1. In the **Credentials** page, look for **OAuth 2.0 Client IDs**
2. Find the client with ID: `629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l.apps.googleusercontent.com`
3. Click on it to edit

### **Step 3: Add Authorized Redirect URIs**

In the **Authorized redirect URIs** section, add these two URLs:

```
https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

**Important Notes:**
- ✅ Include the **full path**: `/api/auth/callback/google`
- ✅ Use **https** for production
- ✅ Add **localhost** for development
- ✅ **No trailing slash** at the end

### **Step 4: Save Changes**

Click **Save** at the bottom of the page.

---

## 📋 Current Configuration Check

### Your App Configuration:
```typescript
// lib/auth.ts
redirectURI: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
```

### Environment Variables:
- **Cloud Run:** `NEXT_PUBLIC_APP_URL=https://financial-planner-629380503119.europe-west1.run.app`
- **Local Dev:** `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### Expected Redirect URIs:
1. **Production:** `https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google`
2. **Development:** `http://localhost:3000/api/auth/callback/google`

---

## 🎯 After Adding the Redirect URI

### Test Immediately (No Deployment Needed!)

1. **Open your production app:**
   ```
   https://financial-planner-629380503119.europe-west1.run.app
   ```

2. **Click "Sign in with Google"**

3. **Expected Result:**
   - ✅ Google OAuth consent screen appears
   - ✅ You can select your Google account
   - ✅ After authorization, you're redirected back to your app
   - ✅ You're logged in successfully

4. **Should NOT See:**
   - ❌ `redirect_uri_mismatch` error
   - ❌ Greek error message about OAuth 2.0 policy
   - ❌ Redirect to Google error page

---

## 🔍 Common Issues & Solutions

### Issue 1: Still Getting `redirect_uri_mismatch`

**Possible causes:**
1. ❌ You didn't save the changes in Google Cloud Console
2. ❌ You added the wrong URL (check for typos)
3. ❌ You forgot to include `/api/auth/callback/google` path
4. ❌ You added a trailing slash (should NOT have one)

**Solution:**
- Double-check the URL in Google Cloud Console
- Make sure it's **exactly**: `https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google`

### Issue 2: 500 Error After OAuth

This is a **different issue** (missing environment variables). If you see this:
1. First fix the redirect URI issue (this document)
2. Then fix the 500 error by deploying with environment variables:
   ```bash
   ./deploy-with-env.sh
   ```

### Issue 3: Works Locally but Not in Production

**Check:**
1. ✅ Added production URL in Google Cloud Console?
2. ✅ `NEXT_PUBLIC_APP_URL` set in Cloud Run?
3. ✅ Using `https://` (not `http://`) for production URL?

---

## 📸 Visual Guide

### Where to Add Redirect URIs:

```
Google Cloud Console
  └─ APIs & Services
      └─ Credentials
          └─ OAuth 2.0 Client IDs
              └─ Your Client (629380503119-...)
                  └─ Authorized redirect URIs
                      ├─ https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google
                      └─ http://localhost:3000/api/auth/callback/google
```

---

## ⚠️ Important Notes

### Google OAuth Propagation Time
- Changes are **usually instant**
- Sometimes takes **up to 5 minutes** to propagate
- If it doesn't work immediately, wait a few minutes and try again

### Multiple Environments
If you plan to deploy to multiple domains, add all of them:
- Production: `https://your-domain.com/api/auth/callback/google`
- Staging: `https://staging-domain.com/api/auth/callback/google`
- Development: `http://localhost:3000/api/auth/callback/google`

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] Logged into correct Google Cloud project (financial-planner-629380503119)
- [ ] Found OAuth 2.0 client with ID: `629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l`
- [ ] Added production redirect URI: `https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google`
- [ ] Added development redirect URI: `http://localhost:3000/api/auth/callback/google`
- [ ] Saved changes in Google Cloud Console
- [ ] Waited 1-2 minutes for changes to propagate

---

## 🚀 Next Steps After This Fix

Once the redirect URI is fixed:

1. **Test Google OAuth** - Should work now!
2. **If you get a 500 error** on the callback:
   - This means OAuth redirect worked ✅
   - But backend authentication failed ❌
   - Fix by deploying with environment variables:
     ```bash
     ./deploy-with-env.sh
     ```

---

## 📞 Quick Reference

**Google Cloud Console Credentials Page:**
https://console.cloud.google.com/apis/credentials?project=financial-planner-629380503119

**Your OAuth Client ID:**
```
629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l.apps.googleusercontent.com
```

**Required Redirect URIs:**
```
https://financial-planner-629380503119.europe-west1.run.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

---

**Status:** 🔴 Action Required  
**Priority:** 🔥 Critical  
**Time to Fix:** ⏱️ 2 minutes  
**No Deployment Needed:** ✅ Changes take effect immediately
