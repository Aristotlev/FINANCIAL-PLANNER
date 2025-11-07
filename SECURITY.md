# 🔐 Security Guide - Money Hub App

## Table of Contents
- [Overview](#overview)
- [API Key Security](#api-key-security)
- [Environment Variables](#environment-variables)
- [GitHub Security](#github-security)
- [Application Security](#application-security)
- [Console Security](#console-security)
- [Deployment Security](#deployment-security)
- [Security Checklist](#security-checklist)
- [Incident Response](#incident-response)

---

## Overview

This document outlines the security measures implemented in the Money Hub App to protect sensitive data, API keys, and user information.

### Security Principles
1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access rights for components
3. **Secure by Default**: Security features enabled from the start
4. **Zero Trust**: Never trust, always verify
5. **Regular Audits**: Continuous security monitoring

---

## API Key Security

### 🎯 Server-Side Only API Keys

**NEVER** expose sensitive API keys to the client. Use the following pattern:

```bash
# ✅ SECURE - Server-side only (NO NEXT_PUBLIC_ prefix)
GOOGLE_AI_API_KEY=AIzaSyC...
ELEVENLABS_API_KEY=sk_...
REPLICATE_API_TOKEN=r8_...
CMC_API_KEY=...
FINNHUB_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# ✅ SAFE - Client-side (NEXT_PUBLIC_ prefix - these are designed to be public)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Row-level security protected
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...  # API restricted + HTTP referrer limits
NEXT_PUBLIC_APP_URL=https://...
```

### API Key Restrictions

#### Google Maps API Key
```yaml
Restrictions:
  - Application restrictions: HTTP referrers (websites)
  - Website restrictions: 
    - https://yourdomain.com/*
    - http://localhost:3000/*
  - API restrictions: 
    - Maps JavaScript API
    - Places API
    - Geocoding API
```

#### Google AI (Gemini) API Key
```yaml
Restrictions:
  - NEVER use NEXT_PUBLIC_ prefix
  - Server-side only through /api/gemini
  - Rate limiting: 60 requests/minute per user
  - IP restrictions (production)
```

#### Supabase Keys
```yaml
Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY):
  - Safe to expose (protected by RLS policies)
  - Used for client-side queries
  
Service Role Key (SUPABASE_SERVICE_ROLE_KEY):
  - ⚠️ NEVER expose to client
  - Bypasses Row Level Security
  - Server-side admin operations only
```

### API Proxy Pattern

All sensitive API calls go through your API routes:

```
Client → /api/gemini → Google AI API
Client → /api/tts → ElevenLabs API
Client → /api/market-data → CoinMarketCap/Finnhub API
```

**Benefits:**
- ✅ API keys never exposed to client
- ✅ Rate limiting control
- ✅ Request logging/monitoring
- ✅ Can add authentication
- ✅ Can cache responses
- ✅ Centralized error handling

---

## Environment Variables

### Local Development (`.env.local`)

```bash
# === SERVER-SIDE ONLY (NEVER use NEXT_PUBLIC_ prefix) ===
GOOGLE_AI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=your_voice_id
REPLICATE_API_TOKEN=your_token_here
CMC_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# === CLIENT-SAFE (Can use NEXT_PUBLIC_ prefix) ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ⚠️ CRITICAL: `.gitignore` Configuration

Ensure these patterns are in `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env*.local
.env.local.backup
.env.local.bak

# Never commit these!
*.pem
*.key
*.cert
secrets/
credentials/
```

### Environment Variable Validation

Use the validation script before deployment:

```bash
./scripts/validate-env.sh
```

---

## GitHub Security

### 1. GitHub Secrets Scanning

**Enable GitHub Advanced Security** (if available):
- Go to Repository Settings → Security → Code security and analysis
- Enable: Dependency graph, Dependabot alerts, Dependabot security updates
- Enable: Secret scanning (detects committed API keys)

### 2. Branch Protection Rules

```yaml
Main Branch Protection:
  - Require pull request reviews: 1
  - Dismiss stale PR approvals: true
  - Require status checks: true
  - Require branches to be up to date: true
  - Include administrators: false
```

### 3. `.github/workflows/security.yml`

Automated security scanning (created separately)

### 4. Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
```

### 5. Pre-commit Hooks

Install git-secrets to prevent committing secrets:

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Linux

# Setup in your repo
git secrets --install
git secrets --register-aws
git secrets --add 'NEXT_PUBLIC_GOOGLE_AI_API_KEY'
git secrets --add 'sk_[0-9a-zA-Z]+'  # ElevenLabs pattern
```

---

## Application Security

### 1. Content Security Policy (CSP)

Configured in `middleware.ts`:

```typescript
// Strict CSP headers to prevent XSS attacks
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' [trusted-domains]",
  "style-src 'self' 'unsafe-inline' [trusted-domains]",
  "img-src 'self' data: https:",
  "connect-src 'self' [api-domains]",
  "frame-ancestors 'none'",  // Prevent clickjacking
  "object-src 'none'",       // Disable plugins
];
```

### 2. Security Headers

Implemented in `middleware.ts`:

```typescript
// Prevent MIME sniffing
response.headers.set('X-Content-Type-Options', 'nosniff');

// Prevent clickjacking
response.headers.set('X-Frame-Options', 'DENY');

// XSS protection
response.headers.set('X-XSS-Protection', '1; mode=block');

// Referrer policy
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

// Permissions policy
response.headers.set('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(self)');
```

### 3. Rate Limiting

Implement rate limiting on API routes:

```typescript
// lib/rate-limiter.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  request: NextRequest,
  limit: number = 60,
  windowMs: number = 60000
): { success: boolean; remaining: number } {
  const identifier = getClientIdentifier(request);
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}

function getClientIdentifier(request: NextRequest): string {
  // Use IP address or authenticated user ID
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}
```

### 4. Input Validation

Always validate and sanitize user input:

```typescript
import { z } from 'zod';

// Define schemas for validation
const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(50),
  description: z.string().max(500),
});

// Validate before processing
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = transactionSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  
  // Process validated data
  const data = result.data;
}
```

### 5. Authentication & Authorization

Using Better Auth with Supabase RLS:

```typescript
// Check authentication status
const user = await auth.api.getSession({ headers: request.headers });
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Verify ownership
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.user.id)  // RLS ensures this
  .single();
```

---

## Console Security

### 1. Remove Debug Logs in Production

```typescript
// utils/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);  // Always log errors
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },
};

// Replace console.log with logger.log
logger.log('API key found');  // Only in dev
```

### 2. Prevent API Key Leakage

```typescript
// ❌ NEVER DO THIS
console.log('API Key:', process.env.GOOGLE_AI_API_KEY);

// ✅ DO THIS
console.log('API Key:', process.env.GOOGLE_AI_API_KEY ? '✓ Found' : '✗ Missing');

// Or use masking
const maskKey = (key: string) => 
  key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 'missing';

console.log('API Key:', maskKey(process.env.GOOGLE_AI_API_KEY || ''));
```

### 3. Error Messages

```typescript
// ❌ NEVER expose sensitive info in errors
throw new Error(`Failed to connect with key: ${apiKey}`);

// ✅ Generic error messages for clients
throw new Error('Authentication failed');

// ✅ Detailed logging server-side only
logger.error('Gemini API authentication failed', { 
  keyPrefix: apiKey.substring(0, 4),
  timestamp: new Date().toISOString()
});
```

---

## Deployment Security

### 1. Cloud Build Environment Variables

Store secrets in Google Cloud Secret Manager:

```bash
# Create secrets
echo -n "your_api_key" | gcloud secrets create GOOGLE_AI_API_KEY --data-file=-

# Grant access to Cloud Build
gcloud secrets add-iam-policy-binding GOOGLE_AI_API_KEY \
  --member=serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### 2. Dockerfile Security

```dockerfile
# Use specific versions (not 'latest')
FROM node:20-alpine AS base

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Don't copy unnecessary files
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

# Set security headers
ENV NODE_ENV=production
```

### 3. Cloud Run Security

```bash
# Deploy with security settings
gcloud run deploy financial-planner \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \  # For public access
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest" \
  --service-account=financial-planner@PROJECT.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=10 \
  --cpu-throttling \
  --vpc-connector=your-connector  # Restrict network access
```

---

## Security Checklist

### Before Every Commit
- [ ] No API keys or secrets in code
- [ ] No `console.log` with sensitive data
- [ ] `.env.local` is gitignored
- [ ] Run security validation script
- [ ] Code reviewed for security issues

### Before Every Deployment
- [ ] Environment variables set correctly
- [ ] API keys rotated if compromised
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] Dependencies updated (no critical vulnerabilities)

### Monthly Security Review
- [ ] Audit API usage logs
- [ ] Review failed authentication attempts
- [ ] Check for outdated dependencies
- [ ] Rotate API keys
- [ ] Review access permissions
- [ ] Test security measures
- [ ] Update security documentation

### After Security Incident
- [ ] Identify compromised keys
- [ ] Rotate all affected keys immediately
- [ ] Review access logs
- [ ] Patch vulnerability
- [ ] Update security measures
- [ ] Document incident and response

---

## Incident Response

### If API Key is Compromised

1. **Immediate Actions** (First 5 minutes)
   ```bash
   # 1. Revoke the compromised key
   # Google Cloud: console.cloud.google.com/apis/credentials
   # ElevenLabs: elevenlabs.io/settings
   
   # 2. Generate new key
   # 3. Update locally
   nano .env.local
   
   # 4. Update Cloud Run
   gcloud run services update financial-planner \
     --region=europe-west1 \
     --update-env-vars="GOOGLE_AI_API_KEY=new_key_here"
   ```

2. **Investigation** (First hour)
   - Check Git history: `git log -S "compromised_key"`
   - Review API usage logs
   - Identify exposure timeline
   - Assess potential damage

3. **Remediation** (First 24 hours)
   - Update all deployment environments
   - Notify affected users (if applicable)
   - Implement additional security measures
   - Document the incident

4. **Prevention** (First week)
   - Add pre-commit hooks
   - Implement additional validation
   - Update security training
   - Review and update this guide

### Emergency Contacts

- **Google Cloud Support**: [Link]
- **Supabase Support**: support@supabase.io
- **GitHub Security**: security@github.com

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: November 7, 2025
**Review Schedule**: Monthly
**Next Review**: December 7, 2025
