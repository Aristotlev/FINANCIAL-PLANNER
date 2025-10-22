# Content Security Policy (CSP) Configuration

## Overview
This document explains the Content Security Policy implementation for the Money Hub App, including why certain permissions are needed and how to troubleshoot CSP errors.

## Current Configuration

### Location
- **Primary**: `middleware.ts` - All CSP headers managed here
- **Previous**: `next.config.mjs` - Removed to prevent conflicts

### Why Middleware?
- Dynamic CSP based on environment (dev vs production)
- Prevents header conflicts
- Better control over request-specific policies
- Supports nonce/hash generation (future enhancement)

## CSP Directives Explained

### `script-src`
```
'self' 'unsafe-eval' 'unsafe-inline' blob: [external domains]
```

**Why these permissions?**

1. **`'self'`**: Load scripts from our own domain
2. **`'unsafe-eval'`**: Required for:
   - TradingView widgets (dynamic chart generation)
   - Google Maps API (internal eval usage)
   - Next.js development mode
   - Some third-party libraries
3. **`'unsafe-inline'`**: Required for:
   - Inline event handlers
   - Next.js script injection
   - TradingView initialization
4. **`blob:`**: Required for:
   - Web Workers
   - Audio processing
   - Dynamic module loading

**External Domains:**
- `s3.tradingview.com` - TradingView charts
- `maps.googleapis.com` - Google Maps
- `*.googleapis.com` - Google APIs
- `*.gstatic.com` - Google static resources

### `style-src`
```
'self' 'unsafe-inline' [external domains]
```

**Why `'unsafe-inline'`?**
- Tailwind CSS generates inline styles
- Component-level styling
- TradingView widget styles
- Google Maps styling

### `connect-src`
```
'self' https://api.elevenlabs.io https://*.supabase.co ...
```

**Allowed API endpoints:**
- `api.elevenlabs.io` - Text-to-speech
- `*.supabase.co` - Database & auth
- `api.coingecko.com` - Crypto prices
- `finnhub.io` - Stock data
- `query1.finance.yahoo.com` - Stock prices
- `generativelanguage.googleapis.com` - Gemini AI
- `*.tradingview.com` - Chart data
- `wss://*.supabase.co` - WebSocket connections

**Development mode:** 
- Allows all `https:`, `http:`, `ws:`, `wss:` for flexibility

### `worker-src`
```
'self' blob:
```

**Why `blob:`?**
- Audio processor workers
- Background tasks
- Dynamic worker creation

### `media-src`
```
'self' blob: data: https://api.elevenlabs.io https://replicate.delivery
```

**Allowed sources:**
- ElevenLabs audio streams
- Replicate AI media delivery
- Local blob audio
- Data URIs for embedded media

## Common CSP Errors

### Error: "blocked by CSP: eval"

**Cause:** Script trying to use `eval()` or similar

**Solutions:**
1. ✅ Already allowed via `'unsafe-eval'` in our CSP
2. If still occurring:
   - Clear browser cache
   - Restart dev server
   - Check for conflicting meta tags
   - Verify middleware is running

### Error: "blocked by CSP: inline script"

**Cause:** Inline `<script>` tags without nonce

**Solutions:**
1. ✅ Already allowed via `'unsafe-inline'`
2. Future: Implement nonce-based CSP for better security

### Error: "blocked by CSP: external resource"

**Cause:** Loading from unapproved domain

**Solutions:**
1. Add domain to appropriate directive
2. Use a proxy API route for CORS
3. Download and self-host the resource

## Security Considerations

### Current Trade-offs

⚠️ **Using `'unsafe-eval'` and `'unsafe-inline'`**

**Why we need them:**
- Third-party widgets (TradingView, Google Maps)
- Development tools (Next.js HMR)
- Dynamic content generation

**Risks:**
- Makes XSS attacks easier
- Can't prevent all injection attacks

**Mitigations:**
1. Input sanitization on all user data
2. No direct DOM manipulation with user input
3. Validate all API responses
4. Use TypeScript for type safety
5. Regular security audits

### Future Improvements

1. **Nonce-based CSP**
   ```typescript
   // Generate nonce per request
   const nonce = generateNonce();
   script-src 'nonce-${nonce}'
   ```
   - Removes need for `'unsafe-inline'`
   - Better security
   - More complex implementation

2. **Hash-based CSP**
   ```typescript
   // Hash specific inline scripts
   script-src 'sha256-abc123...'
   ```
   - Allows specific inline scripts
   - Requires build-time hash generation

3. **Separate Widget Policies**
   ```typescript
   // Use different CSP for iframe widgets
   <iframe csp="script-src 'unsafe-eval' 'unsafe-inline'">
   ```
   - Isolate risky code
   - Stricter main app policy

## Development vs Production

### Development Mode
```typescript
const isDev = process.env.NODE_ENV === 'development';
```

**More permissive:**
- `connect-src` allows all protocols
- No `frame-ancestors` restriction
- Additional logging
- Hot Module Replacement (HMR) support

### Production Mode

**Stricter:**
- Specific domain allowlist
- `frame-ancestors 'none'` (prevent iframe embedding)
- Explicit API endpoints only
- No wildcard protocols

## Testing CSP

### 1. Check Browser Console
```
Content Security Policy of your site blocks...
```

### 2. Check Response Headers
```bash
curl -I http://localhost:3000 | grep -i csp
```

### 3. Test Specific Directives

**Test script-src:**
```javascript
// Should work with unsafe-eval
eval('console.log("test")');

// Should work with unsafe-inline
<script>console.log("inline")</script>
```

**Test connect-src:**
```javascript
// Should work
fetch('https://api.coingecko.com/...')

// Should fail (not in allowlist)
fetch('https://random-api.com/...')
```

### 4. Use CSP Evaluator
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- Paste your CSP string
- Get security recommendations

## Troubleshooting

### Problem: CSP errors after deployment

**Check:**
1. Middleware is deployed
2. Environment variables set correctly
3. No caching of old headers
4. CDN not modifying headers

**Solution:**
```bash
# Clear CDN cache
# Verify headers in production
curl -I https://yourdomain.com | grep CSP
```

### Problem: Widget not loading

**Check:**
1. Widget domain in `script-src` and `frame-src`
2. Widget API endpoints in `connect-src`
3. Widget styles in `style-src`
4. Browser console for specific CSP errors

**Solution:**
```typescript
// Add all widget requirements to CSP
script-src ... https://widget-domain.com
connect-src ... https://widget-api.com
frame-src ... https://widget-domain.com
```

### Problem: Development tools not working

**Check:**
1. `NODE_ENV=development` is set
2. HMR websocket in `connect-src`
3. `blob:` in `script-src` for workers

**Solution:**
```bash
# Verify environment
echo $NODE_ENV

# Restart dev server
npm run dev
```

## Adding New Integrations

### Checklist for new third-party services:

- [ ] Identify all domains used (scripts, APIs, media)
- [ ] Add script domains to `script-src`
- [ ] Add API endpoints to `connect-src`
- [ ] Add media CDNs to `media-src` or `img-src`
- [ ] Add fonts to `font-src`
- [ ] Test in development mode
- [ ] Test in production build
- [ ] Check browser console for violations
- [ ] Update this documentation

### Example: Adding New Payment Widget

```typescript
// In middleware.ts, add:
const cspDirectives = [
  // ... existing directives
  "script-src 'self' ... https://payment-widget.com",
  "connect-src 'self' ... https://api.payment-widget.com",
  "frame-src 'self' ... https://checkout.payment-widget.com",
];
```

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google CSP Guide](https://developers.google.com/web/fundamentals/security/csp)
- [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Last Updated**: October 19, 2025  
**Maintained by**: Development Team  
**Review Schedule**: Quarterly security audit
