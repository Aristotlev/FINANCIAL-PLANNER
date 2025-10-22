# Better Auth + Supabase + Google OAuth Setup

## ✅ Your Google OAuth Credentials
- **Client ID:** `629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l.apps.googleusercontent.com`
- **Client Secret:** (You'll need to get this from Google Console)

---

## 🔗 Callback URLs & JavaScript Origins

### **For Google Cloud Console:**

#### **Authorized JavaScript origins:**
```
http://localhost:3000
http://localhost:3001
https://yourdomain.com
```

#### **Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
https://yourdomain.com/api/auth/callback/google
```

### **Better Auth Endpoints:**
All authentication happens through these routes:
- **Sign In:** `POST /api/auth/sign-in`
- **Sign Up:** `POST /api/auth/sign-up`
- **Sign Out:** `POST /api/auth/sign-out`
- **Google OAuth:** `GET /api/auth/sign-in/google`
- **Google Callback:** `GET /api/auth/callback/google`
- **Session:** `GET /api/auth/session`

---

## 📋 Setup Steps

### **1. Update Environment Variables**

Add to your `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ljatyfyeqiicskahmzmp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqYXR5ZnllcWlpY3NrYWhtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTIzNzgsImV4cCI6MjA3NTMyODM3OH0.xryuX4YUKJJqaQu33RVD8fKtsaeFAxzaGoOGBw9ZMoI

# Supabase Service Role Key (get from Supabase Dashboard -> Settings -> API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google OAuth
GOOGLE_CLIENT_ID=629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google AI (Already configured)
GOOGLE_AI_API_KEY=your_existing_key_here
```

**To get Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp/settings/api
2. Find "Project API keys" section
3. Copy the `service_role` key (NOT the anon key)

---

### **2. Run Database Migration**

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp/sql/new

2. **Copy the entire `supabase-better-auth-migration.sql` file**

3. **Paste and run it in the SQL Editor**

4. **Verify tables were created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'sessions', 'accounts', 'verification_tokens');
   ```

---

### **3. Configure Google Cloud Console**

1. **Go to Google Cloud Console:**
   - URL: https://console.cloud.google.com/apis/credentials

2. **Find your OAuth 2.0 Client:**
   - Look for client ID: `629380503119-6h41katf4dlj38ecqd5cg3nq7fnovl5l`
   - Click on it to edit

3. **Update Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```

4. **Update Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   ```

5. **Get your Client Secret:**
   - It should be displayed on the credentials page
   - Copy it to `.env.local`

6. **Click SAVE**

---

### **4. Update Auth Components**

Now let's update your login and signup forms to use Better Auth:

#### **Login Form** (`components/auth/login-form.tsx`):
```typescript
import { authClient } from '@/lib/auth-client';

// Email/Password login
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await authClient.signIn.email({
      email,
      password,
    });
    router.push('/dashboard');
  } catch (error) {
    setError('Invalid credentials');
  }
};

// Google OAuth login
const handleGoogleLogin = async () => {
  await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/dashboard',
  });
};
```

#### **Signup Form** (`components/auth/signup-form.tsx`):
```typescript
import { authClient } from '@/lib/auth-client';

// Email/Password signup
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await authClient.signUp.email({
      email,
      password,
      name: fullName,
    });
    router.push('/dashboard');
  } catch (error) {
    setError('Signup failed');
  }
};

// Google OAuth signup
const handleGoogleSignup = async () => {
  await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/dashboard',
  });
};
```

---

### **5. Protect Routes with Session**

#### **Create Auth Middleware** (`middleware.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

#### **Use Session in Components:**
```typescript
'use client';
import { authClient } from '@/lib/auth-client';

export function Dashboard() {
  const { data: session, isLoading } = authClient.useSession();

  if (isLoading) return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <p>Email: {session.user.email}</p>
      <button onClick={() => authClient.signOut()}>
        Sign Out
      </button>
    </div>
  );
}
```

---

## 🚀 Testing

### **1. Start Development Server:**
```bash
npm run dev
```

### **2. Test Email/Password:**
- Go to: http://localhost:3000
- Click "Sign Up"
- Fill in email and password
- Should redirect to dashboard

### **3. Test Google OAuth:**
- Click "Continue with Google"
- Select Google account
- Grant permissions
- Should redirect to dashboard

### **4. Verify in Supabase:**
- Go to: https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp/editor
- Check the `users` table
- Check the `accounts` table (provider = 'google')
- Check the `profiles` table

---

## 🔒 Security Features

✅ **Automatic password hashing** (bcrypt)  
✅ **Secure session tokens** (JWT)  
✅ **HTTP-only cookies** (XSS protection)  
✅ **CSRF protection** (built-in)  
✅ **Row Level Security** (RLS on all tables)  
✅ **OAuth state validation**  
✅ **Session expiration** (7 days)  

---

## 📊 Database Schema

Better Auth creates these tables:

| Table | Purpose |
|-------|---------|
| `users` | Core user credentials (email, name) |
| `sessions` | Active sessions with expiration |
| `accounts` | OAuth providers + password hashes |
| `verification_tokens` | Email verification tokens |
| `profiles` | Your app-specific user data |

All your existing financial tables (`cash_accounts`, `savings_accounts`, etc.) are updated to reference the new `users` table.

---

## 🐛 Troubleshooting

### **Error: "redirect_uri_mismatch"**
- Make sure you added: `http://localhost:3000/api/auth/callback/google`
- Check for typos in Google Console

### **Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"**
- Get it from: Supabase Dashboard → Settings → API
- Add to `.env.local`
- Restart dev server

### **Error: "Database connection failed"**
- Make sure you ran the migration SQL
- Check Supabase project is active
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct

### **Sessions not persisting:**
- Check browser cookies are enabled
- Clear cookies and try again
- Check `NEXT_PUBLIC_APP_URL` matches your URL

---

## 🎯 Next Steps

Once working:
- [ ] Add email verification
- [ ] Add password reset flow
- [ ] Add more OAuth providers (GitHub, Facebook)
- [ ] Set up production environment
- [ ] Configure custom email templates
- [ ] Add 2FA (two-factor authentication)

---

## 📚 Resources

- **Better Auth Docs:** https://better-auth.com
- **Supabase Docs:** https://supabase.com/docs
- **Google OAuth Setup:** https://console.cloud.google.com

Need help? Check the error message and refer to the Troubleshooting section!
