# 🔐 Security Quick Reference Card

## ⚡ Quick Commands

```bash
# Validate security
./scripts/validate-security.sh

# Rotate API keys
./scripts/rotate-api-keys.sh

# Check for vulnerabilities
npm audit --audit-level=high

# Clean build and restart
rm -rf .next && npm run dev
```

## 🎯 API Key Rules

### ✅ Safe for Client (Use NEXT_PUBLIC_)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS protected)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (referrer restricted)
- `NEXT_PUBLIC_APP_URL`

### ❌ Server-Side Only (NO prefix)
- `GOOGLE_AI_API_KEY`
- `ELEVENLABS_API_KEY`
- `REPLICATE_API_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CMC_API_KEY`
- `FINNHUB_API_KEY`

## 🛡️ Security Patterns

### Rate Limiting
```typescript
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.AI_API);
  if (!limiter.success) return limiter.response;
  // Your code...
}
```

### Secure Logging
```typescript
import { logger } from '@/lib/logger';

// ❌ Don't do this
console.log('API Key:', apiKey);

// ✅ Do this
logger.apiKeyStatus('Google AI', apiKey);
logger.log('Processing request', { data });
```

### Error Handling
```typescript
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const limiter = withRateLimit(request);
    if (!limiter.success) return limiter.response;
    
    // Your logic
    const result = await processRequest();
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Request failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🚨 Emergency Response

### Key Compromised?
1. Run: `./scripts/rotate-api-keys.sh`
2. Revoke old key from provider
3. Update production environment
4. Check git history: `git log -S "old_key"`

### Found in Git History?
```bash
# Check commits
git log -S "compromised_key" --all

# Remove from history (DANGER!)
# Contact security team first
git filter-repo --path .env.local --invert-paths
```

## 📊 Pre-Deployment Checklist

- [ ] `./scripts/validate-security.sh` passes
- [ ] No NEXT_PUBLIC_ on sensitive keys
- [ ] Rate limiting on API routes
- [ ] Using secure logger
- [ ] Security headers in middleware
- [ ] npm audit clean
- [ ] .env.local gitignored
- [ ] Error handling in API routes

## 📚 Documentation

| File | Purpose |
|------|---------|
| `SECURITY.md` | Complete security guide |
| `RATE_LIMITING_GUIDE.md` | Rate limiting docs |
| `SECURITY_IMPLEMENTATION.md` | Implementation summary |
| `.env.local.example` | Environment variable template |

## 🔗 Quick Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [ElevenLabs Settings](https://elevenlabs.io/app/settings/api-keys)
- [Replicate Account](https://replicate.com/account/api-tokens)

## 💡 Common Issues

**"Rate limit exceeded"**
- Wait for reset time or increase limits
- Check rate limit headers

**"API key not found"**
- Verify .env.local exists
- Check key name (no NEXT_PUBLIC_ for server-side)
- Restart dev server

**"CORS error"**
- Use server-side API route instead
- Check middleware CSP settings

**"401 Unauthorized"**
- Check authentication
- Verify Supabase RLS policies

---

**Need Help?** Check `SECURITY.md` or run `./scripts/validate-security.sh`
