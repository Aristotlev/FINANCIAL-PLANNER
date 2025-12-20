# Google OAuth Setup Guide for Omnifolio

## Quick Reference

### Your OAuth Client ID
```
YOUR_GOOGLE_CLIENT_ID
```

### Required Google Cloud Console Settings

#### 1. Authorized JavaScript Origins
Add ALL of these:
- `https://www.omnifolio.app`
- `https://omnifolio.app`
- `http://localhost:3000`

#### 2. Authorized Redirect URIs ⚠️ CRITICAL
Add ALL of these **EXACTLY** as shown:
- `https://www.omnifolio.app/api/auth/callback/google`
- `https://omnifolio.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`

### Steps to Configure

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized JavaScript origins", click "+ ADD URI" and add each origin
4. Under "Authorized redirect URIs", click "+ ADD URI" and add each callback URL
5. Click "SAVE" at the bottom

### Troubleshooting

#### Error: `redirect_uri_mismatch`
- The callback URL in your app doesn't match Google Console
- Make sure `https://www.omnifolio.app/api/auth/callback/google` is added EXACTLY

#### Error: `state_mismatch`
- The OAuth flow started on one domain but ended on another
- Both domains (www and non-www) should redirect to `www.omnifolio.app`

#### Error: 500 on `/api/auth/sign-in/social`
- Check that environment variables are set in deployment:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `SUPABASE_DATABASE_URL`
  - `BETTER_AUTH_SECRET`

### Environment Variables Checklist

| Variable | Value | Status |
|----------|-------|--------|
| `GOOGLE_CLIENT_ID` | `YOUR_GOOGLE_CLIENT_ID` | ✅ Set |
| `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` | ✅ Set |
| `BETTER_AUTH_SECRET` | `5SeG5WpB/...` | ✅ Set |
| `BETTER_AUTH_URL` | `https://www.omnifolio.app` | ✅ Set |
| `SUPABASE_DATABASE_URL` | `postgresql://...` | ✅ Set |

### OAuth Flow Diagram

```
1. User clicks "Sign in with Google"
   ↓
2. App calls POST /api/auth/sign-in/social
   ↓
3. User redirected to Google OAuth
   ↓
4. User authorizes app
   ↓
5. Google redirects to: https://www.omnifolio.app/api/auth/callback/google
   ↓
6. Better Auth creates session
   ↓
7. User redirected to dashboard
```

### Last Updated
December 20, 2025
