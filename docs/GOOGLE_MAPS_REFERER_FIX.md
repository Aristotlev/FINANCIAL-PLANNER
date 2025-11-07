# Google Maps RefererNotAllowedMapError Fix

## 🚨 Problem
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: https://financial-planner-629380503119.europe-west1.run.app/
```

## 🔍 Root Cause
The Google Maps API key has **Application Restrictions** enabled, but your production URL is not in the allowed referrer list.

## ✅ Solution: Add Production URL to Google Cloud Console

### Step 1: Access Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Find Your API Key
1. Look for your Google Maps API Key in the list
2. Click on the API key name to edit it

### Step 3: Update Application Restrictions
1. Scroll to **Application restrictions** section
2. Select **HTTP referrers (web sites)**
3. Click **+ ADD AN ITEM** under "Website restrictions"

### Step 4: Add These URLs

Add ALL of the following referrer patterns:

```
# Production URL
https://financial-planner-629380503119.europe-west1.run.app/*

# Custom domain (if you have one)
https://your-custom-domain.com/*

# Localhost for development
http://localhost:3000/*
http://localhost:*

# Alternative localhost
http://127.0.0.1:*
```

**Important:** The `/*` at the end is crucial - it allows all paths under that domain.

### Step 5: Verify API Restrictions
Scroll to **API restrictions** section and ensure these APIs are enabled:
- Maps JavaScript API ✅
- Places API ✅
- Geocoding API ✅
- Maps Embed API (if using embedded maps)

### Step 6: Save Changes
1. Click **SAVE** at the bottom
2. Wait 5 minutes for changes to propagate

## 🧪 Testing

After saving, test your production site:

```bash
# Open your production URL
open https://financial-planner-629380503119.europe-west1.run.app/

# Check browser console - the error should be gone
```

## 🔧 Alternative: Temporarily Remove Restrictions (NOT RECOMMENDED)

**⚠️ Only use for testing - this is a security risk:**

1. In API Key settings, select **None** under "Application restrictions"
2. Save and test
3. **Re-enable restrictions** after confirming it works

## 📋 Current Configuration Checklist

- [ ] Added production URL: `https://financial-planner-629380503119.europe-west1.run.app/*`
- [ ] Added localhost URLs for development
- [ ] Verified Maps JavaScript API is enabled
- [ ] Verified Places API is enabled
- [ ] Waited 5 minutes for propagation
- [ ] Tested production site
- [ ] Confirmed no RefererNotAllowedMapError in console

## 🎯 Expected Result

After fixing, you should see:
- ✅ Map loads successfully
- ✅ No RefererNotAllowedMapError in console
- ✅ Place autocomplete works
- ✅ Marker placement works

## 📝 Additional Notes

### Multiple Domains?
If you deploy to multiple domains, add them all:
```
https://domain1.com/*
https://domain2.com/*
https://www.domain1.com/*
```

### Wildcard Subdomains?
You can use wildcards for subdomains:
```
https://*.your-domain.com/*
```

### Environment-Specific Keys?
Consider using different API keys for:
- **Development:** Unrestricted or localhost-only
- **Production:** Restricted to production domains only

### Still Not Working?
1. **Clear browser cache** and hard refresh (Cmd+Shift+R)
2. **Check API key billing** - ensure billing is enabled on your Google Cloud project
3. **Verify API key** is correctly set in Cloud Run environment variables
4. **Check quotas** - ensure you haven't exceeded API limits

## 🚀 Quick Fix Command

To verify your API key is set in Cloud Run:

```bash
gcloud run services describe financial-planner \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env.filter(name:NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).value())"
```

## 📚 Related Documentation

- [Google Maps Referer Error Guide](https://developers.google.com/maps/documentation/javascript/error-messages#referer-not-allowed-map-error)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Application Restrictions](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions)

---

**⏱️ Estimated Fix Time:** 5-10 minutes (including propagation)
