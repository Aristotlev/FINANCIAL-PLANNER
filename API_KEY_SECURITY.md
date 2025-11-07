# 🔐 API Key Security - Quick Reference

## ✅ Current Status: SECURE

**Last Audit:** November 7, 2025  
**No API keys compromised on GitHub** ✅

## 🎯 Quick Checklist

- [x] No hardcoded API keys in code
- [x] `.env.local` in `.gitignore`
- [x] Environment variables properly used
- [x] GitHub Actions security scanning active
- [x] Docker/Cloud Build uses build args
- [x] Git history clean

## 📍 Where API Keys Should Be

### ✅ CORRECT Locations
```bash
# Local development
.env.local                    # ✅ Gitignored, never committed

# Production (Google Cloud)
Cloud Run Environment Variables  # ✅ Set via cloudbuild.yaml
Cloud Build Substitutions        # ✅ Set in Google Cloud Console
```

### ❌ NEVER Put Keys Here
```bash
# Never hardcode in files:
src/config.ts                 # ❌ NO
lib/api.ts                    # ❌ NO
components/*.tsx              # ❌ NO
Dockerfile                    # ❌ NO
cloudbuild.yaml              # ❌ NO

# Never commit:
.env.local                    # ❌ NO
.env                          # ❌ NO
```

## 🔑 API Key Types

### Server-Side Only (Secret)
```typescript
// Use in API routes only (app/api/**/*.ts)
process.env.GOOGLE_AI_API_KEY          // ✅ Server-side
process.env.REPLICATE_API_TOKEN        // ✅ Server-side
process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Server-side (if used)
```

### Client-Side Safe (Public)
```typescript
// Can be used in components (already public)
process.env.NEXT_PUBLIC_SUPABASE_URL          // ✅ Public
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY     // ✅ Public
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   // ✅ Public (with restrictions)
```

## 🛡️ Security Commands

### Check for Secrets
```bash
# Scan for hardcoded API keys
git grep -nE "(AIza[0-9A-Za-z_-]{35}|sk_[a-f0-9]{32}|r8_[a-zA-Z0-9]{40})"

# Verify .env files are not tracked
git ls-files | grep "\.env"

# Check .gitignore
grep "\.env" .gitignore
```

### Enable Pre-commit Hook
```bash
# Install security pre-commit hook
git config core.hooksPath .git-hooks

# Test it works
echo "AIza1234567890" > test.ts
git add test.ts
git commit -m "test"  # Should fail ✅
```

### Run Security Scan
```bash
# Run npm audit
npm audit

# Check for high/critical vulnerabilities
npm audit --audit-level=high

# Fix vulnerabilities
npm audit fix
```

## 🚨 If a Key is Compromised

### Immediate Actions (in order)
1. **Revoke the key immediately** (in the service dashboard)
2. **Generate a new key**
3. **Update `.env.local`** with the new key
4. **Restart dev server**: `npm run dev`
5. **Update production** (Google Cloud Console → Cloud Run → Edit → Environment Variables)
6. **Review API logs** for unauthorized usage

### Remove from Git History (if committed)
```bash
# Option 1: Use BFG Repo-Cleaner (recommended)
# Download from: https://rpo.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt

# Option 2: Git filter-branch
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Destructive!)
git push --force --all
```

## 🔍 API Key Patterns to Avoid

### ❌ Bad Examples
```typescript
// DON'T hardcode
const API_KEY = "AIzaSyC..."           // ❌ NO!
const token = "sk_abc123..."           // ❌ NO!

// DON'T use NEXT_PUBLIC_ for secrets
const NEXT_PUBLIC_GOOGLE_AI_KEY = "..." // ❌ NO!
```

### ✅ Good Examples
```typescript
// DO use environment variables
const apiKey = process.env.GOOGLE_AI_API_KEY;  // ✅ YES!

// DO check if exists
if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('Missing API token');
}

// DO use in API routes
// app/api/ai/route.ts
export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  // ...
}
```

## 📊 Monitoring

### GitHub Actions
- Automatically runs on every push
- Weekly scheduled scans (Mondays 9 AM UTC)
- View results: GitHub → Actions tab

### API Usage Monitoring
- **Google Cloud Console**: APIs & Services → Credentials
- **ElevenLabs**: Dashboard → Usage
- **Replicate**: Account → Usage

## 🔗 Resources

- [Security Audit Report](./SECURITY_AUDIT_REPORT.md)
- [GitHub Security Workflow](./.github/workflows/security.yml)
- [Environment Variables Guide](./.env.local.example)
- [Git Hooks Documentation](./.git-hooks/README.md)

## 🆘 Need Help?

1. Check [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)
2. Review [GitHub Security Best Practices](https://docs.github.com/en/code-security)
3. Run security scan: `git grep -E "(AIza|sk_|r8_)"`

---

**Last Updated:** November 7, 2025  
**Status:** ✅ All API keys secure
