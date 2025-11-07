# 🔐 Supabase Configuration for Money Hub App

## Current Deployment URL

Your app is deployed at:
```
https://financial-planner-ffw6crpqvq-ew.a.run.app
```

## ⚡ Quick Configuration

### 1. Open Supabase Dashboard

Go to your project's URL configuration:
```
https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp/auth/url-configuration
```

### 2. Set Site URL

In the **"Site URL"** field, enter:
```
https://financial-planner-ffw6crpqvq-ew.a.run.app
```

### 3. Add Redirect URLs

In the **"Redirect URLs"** section, add BOTH of these URLs (one per line):

```
http://localhost:3000/auth/callback
https://financial-planner-ffw6crpqvq-ew.a.run.app/auth/callback
```

**Important:** Add both URLs! The localhost one is for development, the Cloud Run one is for production.

### 4. Click "Save"

Don't forget to click the **Save** button at the bottom of the page!

## 📸 Visual Guide

### What It Should Look Like:

```
┌─────────────────────────────────────────────────────────┐
│ Authentication Settings                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Site URL                                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ https://financial-planner-ffw6crpqvq-ew.a.run.app  ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ Redirect URLs                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ http://localhost:3000/auth/callback                 ││
│ │ https://financial-planner-ffw6crpqvq-ew.a.run.app/…││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│                                    [ Save ]              │
└─────────────────────────────────────────────────────────┘
```

## ✅ Verification Steps

After saving, verify your configuration:

1. **Open your app:** https://financial-planner-ffw6crpqvq-ew.a.run.app
2. **Click "Sign in with Google"**
3. **Complete Google authentication**
4. **You should be redirected back to your app**

If you see any errors, check:
- ✅ URLs match exactly (no typos)
- ✅ `/auth/callback` is included at the end
- ✅ You clicked "Save" in Supabase
- ✅ Browser cookies are enabled

## 🔄 For Future Domain Changes

When you add a new domain (e.g., custom domain), just add another redirect URL:

```
https://your-custom-domain.com/auth/callback
```

The app will automatically detect and use the correct domain!

## 🛠️ Interactive Configuration Script

For a guided setup, run:
```bash
./scripts/configure-supabase.sh
```

This script will:
- Auto-detect your deployment URL
- Generate the correct URLs
- Walk you through the Supabase configuration
- Verify your setup

## 🎯 Why This Works

Your app now uses the **environment detection system** which:

1. **Detects the current domain** automatically
2. **Generates the correct callback URL** on the fly
3. **Works on any domain** without code changes
4. **Handles OAuth redirects** properly

This means:
- ✅ No hardcoded URLs in your code
- ✅ Works on localhost, Cloud Run, custom domains
- ✅ Easy to migrate between domains
- ✅ No configuration changes needed per domain

## 📋 Configuration Summary

| Setting | Value |
|---------|-------|
| **Site URL** | `https://financial-planner-ffw6crpqvq-ew.a.run.app` |
| **Redirect URL (Dev)** | `http://localhost:3000/auth/callback` |
| **Redirect URL (Prod)** | `https://financial-planner-ffw6crpqvq-ew.a.run.app/auth/callback` |

## 🔐 OAuth Provider Settings

Make sure your Google OAuth is configured:

1. **Go to:** https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp/auth/providers
2. **Ensure Google is enabled**
3. **Client ID:** Should match your `.env.local`
4. **Client Secret:** Should match your `.env.local`

Your current Google OAuth credentials:
- **Client ID:** `629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l.apps.googleusercontent.com`

## 🆘 Troubleshooting

### Error: "Redirect URL mismatch"

**Cause:** The redirect URL in Supabase doesn't match the one your app is using.

**Solution:**
1. Check the URL in your browser's address bar when the error occurs
2. Copy that exact URL
3. Add it to Supabase Redirect URLs
4. Click Save

### Error: "Invalid OAuth state"

**Cause:** Old session or cookies.

**Solution:**
1. Clear your browser cookies for your domain
2. Try signing in again in an incognito/private window

### Error: "Email not authorized"

**Cause:** Email restrictions in Google OAuth or Supabase.

**Solution:**
1. Check Google Cloud Console OAuth consent screen
2. Add your email to test users if in testing mode
3. Or publish the OAuth consent screen

## 📞 Need Help?

- **View logs:** `gcloud logs read --service=financial-planner --region=europe-west1`
- **Check auth logs:** Look for `[AUTH CALLBACK]` entries
- **Supabase docs:** https://supabase.com/docs/guides/auth/social-login/auth-google

## 🎉 Ready to Test!

Once you've configured Supabase:

1. ✅ Open https://financial-planner-ffw6crpqvq-ew.a.run.app
2. ✅ Click "Sign in with Google"
3. ✅ Complete authentication
4. ✅ Start using your app!

Your beta launch is just one click away! 🚀

---

*Configuration guide generated for deployment: https://financial-planner-ffw6crpqvq-ew.a.run.app*
