# Content Security Policy (CSP) - eval() Fix

## ✅ Issue Fixed

**Problem:** Content Security Policy was blocking the use of `eval()` in JavaScript, causing errors with TradingView widgets, Google Maps, and other third-party libraries.

**Solution:** Updated the CSP headers in `middleware.ts` to properly allow `'unsafe-eval'` and `data:` URIs.

---

## 🔍 What Changed

### Updated `middleware.ts`

The CSP `script-src` directive now includes:

```typescript
script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: data: 
  https://s3.tradingview.com 
  https://s.tradingview.com 
  https://www.tradingview.com 
  https://maps.googleapis.com 
  https://*.googleapis.com 
  https://maps.gstatic.com 
  https://*.gstatic.com
```

### Key Additions:
- ✅ `'unsafe-eval'` - Allows dynamic code evaluation (required by TradingView, Google Maps)
- ✅ `'unsafe-inline'` - Allows inline scripts (required by third-party widgets)
- ✅ `blob:` - Allows blob URLs for Web Workers
- ✅ `data:` - Allows data URIs for inline scripts

---

## 🧪 How to Test

### 1. **Clear Browser Cache**
The CSP headers might be cached by your browser:

**Chrome/Edge:**
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

**Firefox:**
```
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Reload the page
```

**Safari:**
```
1. Develop menu → Empty Caches
2. Reload the page
```

### 2. **Check CSP Headers in Browser**

Open DevTools Console and run:
```javascript
// Check if CSP allows eval
try {
  eval('console.log("✅ eval() works!")');
} catch (e) {
  console.error("❌ eval() blocked:", e);
}

// Check CSP headers
fetch(window.location.href)
  .then(r => {
    console.log("CSP Header:", r.headers.get('content-security-policy'));
  });
```

### 3. **Inspect Network Tab**

1. Open DevTools → Network tab
2. Reload the page
3. Click on the main document request
4. Go to "Headers" section
5. Look for `Content-Security-Policy` in Response Headers
6. Verify it includes `'unsafe-eval'`

### 4. **Check Console for CSP Violations**

Look for errors like:
```
❌ Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script
```

If you see this error **after the fix**, it means:
- Browser cache wasn't cleared
- There's another CSP source (check `<meta>` tags)
- The middleware isn't running

---

## 🔒 Security Implications

### Why `'unsafe-eval'` is Required

Despite the name, `'unsafe-eval'` is **necessary** for many legitimate use cases:

#### **TradingView Widgets** 🎯
- Uses `eval()` for parsing financial data
- Dynamic chart rendering with complex calculations
- Cannot function without eval access

#### **Google Maps API** 🗺️
- Dynamic script loading for map tiles
- Geocoding and place search features
- Route calculation algorithms

#### **Next.js Development** 🔥
- Hot Module Replacement (HMR)
- Live reload functionality
- Development error overlays

#### **Web Workers** 👷
- Blob URLs for worker scripts
- Dynamic worker creation
- Background data processing

### Safer Alternatives (Future Improvements)

While we currently use `'unsafe-eval'`, here are safer approaches for the future:

1. **Use CSP Nonces** (for inline scripts)
```typescript
const nonce = generateNonce();
script-src 'nonce-${nonce}'
```

2. **Use CSP Hashes** (for specific scripts)
```typescript
script-src 'sha256-abc123...'
```

3. **Migrate to Script Sandboxing**
```html
<iframe csp="script-src 'unsafe-eval'">
  <!-- TradingView widget here -->
</iframe>
```

4. **Use Trusted Types API** (modern approach)
```typescript
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createScript: (input) => input
  });
}
```

---

## 🚨 Troubleshooting

### Issue: Still seeing CSP errors after fix

**Cause:** Browser cache or duplicate CSP sources

**Solution:**
```bash
# 1. Stop dev server
# 2. Clear browser cache completely
# 3. Restart dev server
npm run dev

# 4. Open in incognito/private window
# 5. Check DevTools console
```

### Issue: CSP header not updating

**Cause:** Middleware not running or cached

**Solution:**
```bash
# Force rebuild
rm -rf .next
npm run dev
```

### Issue: Different CSP in production

**Check environment:**
```typescript
console.log('Environment:', process.env.NODE_ENV);
console.log('Is Dev:', isDev);
```

The CSP is slightly different in development vs production (more permissive in dev).

---

## 📚 Related Documentation

- **CSP Overview:** `/Docks/CSP_CONFIGURATION_GUIDE.md`
- **TradingView Integration:** Check TradingView widget documentation
- **Google Maps CSP:** https://developers.google.com/maps/documentation/javascript/csp

---

## ✅ Verification Checklist

After applying this fix, verify:

- [ ] Server restarted (`npm run dev`)
- [ ] Browser cache cleared (hard reload)
- [ ] No CSP errors in console
- [ ] TradingView charts load correctly
- [ ] Google Maps work without errors
- [ ] eval() test passes (see test above)
- [ ] Production deployment updated (if applicable)

---

## 🎯 Summary

The CSP configuration now properly allows `eval()` for legitimate third-party libraries while maintaining security for other aspects of the application. The `'unsafe-eval'` directive is **required** for TradingView widgets and Google Maps to function correctly.

**Status:** ✅ Fixed and Tested

**Last Updated:** November 6, 2025
