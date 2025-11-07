# 🚀 Quick Start: Deploy to Production

This guide gets your app live in **5 minutes**.

## ✅ Prerequisites Checklist

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Docker installed locally (for script deployment)
- [ ] Supabase project created
- [ ] All API keys ready (see `.env.local`)

## 🎯 Deploy Your App (Current Setup)

Your app is configured to deploy to Google Cloud Run in the `europe-west1` region.

### Step 1: Deploy to Cloud Run

**Option A: Use the deployment script (Easiest)**

```bash
# Make sure you're in the project directory
cd "/Users/aristotelesbasilakos/Money Hub App"

# Deploy
./scripts/deploy-cloud-run.sh
```

**Option B: Use Cloud Build (CI/CD)**

```bash
# Push to trigger automatic deployment
git add .
git commit -m "Deploy to production"
git push origin main
```

### Step 2: Configure Supabase

After deployment, you'll see a URL like:
```
https://financial-planner-ffw6crpqvq-ew.a.run.app
```

1. **Go to Supabase:**
   - Open: https://supabase.com/dashboard
   - Select your project
   - Go to: **Authentication** → **URL Configuration**

2. **Add URLs:**
   
   **Site URL:** (replace with your actual URL)
   ```
   https://financial-planner-ffw6crpqvq-ew.a.run.app
   ```
   
   **Redirect URLs:** (add both)
   ```
   http://localhost:3000/auth/callback
   https://financial-planner-ffw6crpqvq-ew.a.run.app/auth/callback
   ```

3. **Click Save**

### Step 3: Test Your App

1. Visit your Cloud Run URL
2. Click "Sign in with Google"
3. Verify you can log in successfully

## 🎉 That's It!

Your app is now live and ready for beta testing!

---

## 🔧 For First-Time Setup

If this is your first deployment, set up Cloud Build:

### 1. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Configure Cloud Build Substitution Variables

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Create or update trigger (if using CI/CD)
gcloud builds triggers create github \
  --name="deploy-financial-planner" \
  --repo-name="FINANCIAL-PLANNER" \
  --repo-owner="Aristotlev" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions='_NEXT_PUBLIC_SUPABASE_URL='"$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)"',_NEXT_PUBLIC_SUPABASE_ANON_KEY='"$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)"',_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY='"$(grep NEXT_PUBLIC_GOOGLE_MAPS_API_KEY .env.local | cut -d '=' -f2)"',_NEXT_PUBLIC_GOOGLE_AI_API_KEY='"$(grep NEXT_PUBLIC_GOOGLE_AI_API_KEY .env.local | cut -d '=' -f2)"',_CMC_API_KEY='"$(grep CMC_API_KEY .env.local | cut -d '=' -f2)"',_NEXT_PUBLIC_ELEVENLABS_API_KEY='"$(grep NEXT_PUBLIC_ELEVENLABS_API_KEY .env.local | cut -d '=' -f2)"',_NEXT_PUBLIC_ELEVENLABS_VOICE_ID='"$(grep NEXT_PUBLIC_ELEVENLABS_VOICE_ID .env.local | cut -d '=' -f2)"''
```

---

## 🆘 Troubleshooting

### "Permission denied" error

```bash
# Grant Cloud Build permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### "OAuth redirect mismatch"

- Check the Supabase Redirect URLs exactly match your deployed URL
- Include `/auth/callback` at the end
- Make sure you clicked "Save" in Supabase

### App won't load

```bash
# Check logs
gcloud logs read --service=financial-planner --region=europe-west1 --limit=50
```

---

## 📞 Support

- Full documentation: See `MULTI_DOMAIN_DEPLOYMENT.md`
- Check logs: `gcloud logs read --service=financial-planner --region=europe-west1`
- Supabase help: https://supabase.com/docs

**Your Current URLs:**
- **Production:** https://financial-planner-ffw6crpqvq-ew.a.run.app
- **Development:** http://localhost:3000

---

**Ready to launch your beta! 🚀**
