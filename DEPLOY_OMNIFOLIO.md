# Deploy Omnifolio to Cloudflare Pages

## ✅ Completed Steps
- [x] Cloudflare Pages project created: `omnifolio-app`
- [x] Available at: https://omnifolio-app.pages.dev/

## 🚀 Quick Deploy via GitHub (Recommended - Fastest)

### Step 1: Connect GitHub to Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages** → **omnifolio-app**
3. Click **Settings** → **Builds & deployments**
4. Click **Connect to Git**
5. Select your GitHub repo: `Aristotlev/Omnifolio`
6. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (leave empty)

### Step 2: Add Environment Variables
In the Cloudflare dashboard, go to **Settings** → **Environment variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://omnifolio.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

### Step 3: Add Custom Domain (omnifolio.app)
1. In Cloudflare Dashboard → **Workers & Pages** → **omnifolio-app**
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter: `omnifolio.app`
5. Click **Continue**

#### If domain is NOT on Cloudflare yet:
1. Go to **Websites** in Cloudflare dashboard
2. Click **Add a site** → enter `omnifolio.app`
3. Choose **Free** plan
4. Cloudflare will give you nameservers like:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`
5. Update nameservers at your domain registrar (where you bought it)
6. Wait 5-10 minutes for propagation
7. Return to step 3 above

### Step 4: Add www subdomain (optional)
1. Add custom domain: `www.omnifolio.app`
2. Or create a redirect rule in **Rules** → **Redirect Rules**:
   - From: `www.omnifolio.app/*`
   - To: `https://omnifolio.app/$1`

## 🔧 Alternative: Manual Deploy (Slower)

If you prefer CLI deployment:

```bash
# Build locally
npm run build

# Deploy to Cloudflare
npx wrangler pages deploy .next --project-name omnifolio-app
```

## 📝 Important Notes

1. **First deployment** via GitHub will trigger automatically when you push
2. **SSL certificate** is automatically provisioned by Cloudflare
3. **Environment variables** must be set BEFORE deploying for them to take effect
4. **Build time**: ~3-5 minutes on Cloudflare's servers (faster than local)

## 🔗 Your URLs

- **Cloudflare Pages URL**: https://omnifolio-app.pages.dev
- **Custom Domain**: https://omnifolio.app (after setup)

## Need Help?

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
