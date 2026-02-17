# Deploying Omnifolio to Cloudflare Pages

## 🚀 Quick Deployment Steps

### 1. Login to Cloudflare (First Time Only)

```bash
npx wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 2. Deploy Your App

```bash
npm run deploy
```

This will:
- Build your Next.js app
- Convert it for Cloudflare Pages using OpenNext
- Deploy to Cloudflare Pages

### 3. Connect Your Custom Domain (omnifolio.app)

After the first deployment:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on **Workers & Pages** in the sidebar
3. Find your **omnifolio** project
4. Go to **Custom domains** tab
5. Click **Set up a custom domain**
6. Enter: `omnifolio.app`
7. Follow the prompts to configure DNS

#### If your domain is already on Cloudflare DNS:
- The setup will be automatic

#### If your domain is elsewhere:
You'll need to either:
- **Option A**: Transfer DNS to Cloudflare (recommended)
- **Option B**: Add CNAME record pointing to `omnifolio.pages.dev`

---

## 🔐 Environment Variables

You need to set these in Cloudflare Dashboard:

1. Go to **Workers & Pages** → **omnifolio** → **Settings** → **Environment Variables**
2. Add these variables:

### Required Variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ljatyfyeqiicskahmzmp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key |
| `NEXT_PUBLIC_APP_URL` | `https://omnifolio.app` |
| `GOOGLE_AI_API_KEY` | Your Google AI API key (server-side) |
| `REPLICATE_API_TOKEN` | Your Replicate API token |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `SUPABASE_DATABASE_URL` | Your Supabase database connection string |
| `BETTER_AUTH_SECRET` | A random 32+ character secret |
| `BETTER_AUTH_URL` | `https://omnifolio.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://omnifolio.app` |
| `NEXT_PUBLIC_API_URL` | `https://omnifolio.app` |

### Optional Variables:
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_COINGECKO_API_KEY` | CoinGecko API key |
| `NEXT_PUBLIC_NEWS_API_KEY` | News API key |

---

## 🧪 Local Preview

Test the Cloudflare build locally before deploying:

```bash
npm run preview:cloudflare
```

This builds and runs a local preview using Wrangler.

---

## 📋 Deployment Checklist

- [ ] Run `npx wrangler login` to authenticate
- [ ] Update `NEXT_PUBLIC_APP_URL` in `.env.local` to `https://omnifolio.app`
- [ ] Update `BETTER_AUTH_URL` to `https://omnifolio.app`
- [ ] Update `NEXT_PUBLIC_BETTER_AUTH_URL` to `https://omnifolio.app`
- [ ] Update `NEXT_PUBLIC_API_URL` to `https://omnifolio.app`
- [ ] Run `npm run deploy`
- [ ] Add environment variables in Cloudflare Dashboard
- [ ] Connect `omnifolio.app` domain in Cloudflare Pages
- [ ] Update Google OAuth authorized redirect URIs to include `https://omnifolio.app`

---

## 🔄 Continuous Deployment (Optional)

To enable automatic deployments from GitHub:

1. Go to **Workers & Pages** → Create project
2. Select **Connect to Git**
3. Choose your repository
4. Set build settings:
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `.open-next/cloudflare`
5. Add environment variables
6. Deploy!

Now every push to `main` will automatically deploy.

---

## 🛠 Troubleshooting

### Build Fails
- Check that all dependencies are compatible with Cloudflare Workers
- Some Node.js APIs may not be available in the edge runtime

### API Routes Not Working
- Ensure routes use Edge Runtime compatible code
- Check the Cloudflare Pages logs in the dashboard

### Domain Not Working
- DNS propagation can take up to 48 hours
- Verify SSL certificate is provisioned in Cloudflare

---

## 📁 Files Created

- `wrangler.jsonc` - Cloudflare Pages configuration
- `open-next.config.ts` - OpenNext adapter configuration
- Updated `next.config.mjs` - Removed standalone output
- Updated `package.json` - Added Cloudflare scripts
