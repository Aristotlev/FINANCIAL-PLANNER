# 🚀 Create Cloud Build Trigger for FINANCIAL-PLANNER

## ✅ Quick Steps to Create the Trigger

### Option 1: Using Cloud Console (Recommended)

1. **Open Cloud Build Triggers**
   - Go to: https://console.cloud.google.com/cloud-build/triggers?project=629380503119
   - Click **"CREATE TRIGGER"**

2. **Configure the Trigger**
   - **Name:** `financial-planner-deploy`
   - **Description:** `Build and deploy Financial Planner on push to main`
   - **Event:** Repository event
   - **Source:** Choose **Aristotlev/FINANCIAL-PLANNER** (from the dropdown)
     - If you don't see it, click **"CONNECT NEW REPOSITORY"** and select your GitHub repo
   - **Branch:** `^main$` (regex pattern)
   - **Configuration:** Cloud Build configuration file (yaml or json)
   - **Location:** Repository
   - **Cloud Build configuration file location:** `cloudbuild.yaml`

3. **Add Substitution Variables**
   Click **"ADD VARIABLE"** for each of these:

   ```
   _NEXT_PUBLIC_SUPABASE_URL = <your-supabase-url>
   _NEXT_PUBLIC_SUPABASE_ANON_KEY = <your-anon-key>
   _NEXT_PUBLIC_APP_URL = https://financial-planner-629380503119.europe-west1.run.app
   _NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = <your-maps-key>
   _NEXT_PUBLIC_GOOGLE_AI_API_KEY = <your-ai-key>
   _CMC_API_KEY = <your-cmc-key>
   _NEXT_PUBLIC_ELEVENLABS_API_KEY = <your-elevenlabs-key>
   _NEXT_PUBLIC_ELEVENLABS_VOICE_ID = <your-voice-id>
   _GOOGLE_CLIENT_ID = <your-client-id>
   _GOOGLE_CLIENT_SECRET = <your-client-secret>
   _SUPABASE_DATABASE_URL = <your-db-url>
   ```

   **Pro tip:** Copy from your `.env.local` file!

4. **Create the Trigger**
   - Click **"CREATE"**
   - You're done! 🎉

### Option 2: Using Provided Script

If you prefer to update an existing trigger with the environment variables:

```bash
# First, create the trigger via the Console (steps above)
# Then run this to add all the env vars:
./setup-cloud-build-trigger.sh
```

## 🧪 Test Your Trigger

### Manual Trigger Test
```bash
gcloud builds triggers run financial-planner-deploy --branch=main
```

### Or Push a Commit
```bash
git add .
git commit -m "Test deployment trigger"
git push origin main
```

## 📊 Monitor Your Build

```bash
# Watch ongoing builds
gcloud builds list --ongoing

# Or check in the console
# https://console.cloud.google.com/cloud-build/builds?project=629380503119
```

## 🔍 Verify Your Setup

After creating the trigger, verify it's correctly configured:

```bash
# List all triggers
gcloud builds triggers list

# You should see:
# - name: financial-planner-deploy (or similar)
# - github.name: FINANCIAL-PLANNER
# - github.owner: Aristotlev
```

## ❓ Common Issues

### Issue: Repository Not Listed
**Solution:** You need to connect your GitHub repository first:
1. In Cloud Build > Triggers
2. Click "CONNECT REPOSITORY"
3. Select GitHub
4. Authenticate and select **Aristotlev/FINANCIAL-PLANNER**

### Issue: Missing Environment Variables
**Solution:** Make sure all substitution variables are added in the trigger configuration. You can edit the trigger later to add missing variables.

### Issue: Build Fails
**Solution:** Check the logs:
```bash
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>
```

## 🎯 What Happens Next

Once your trigger is created:

1. ✅ Every push to `main` branch will automatically:
   - Build your Docker image
   - Push to Container Registry
   - Deploy to Cloud Run
   - Update your production service

2. ✅ Your app will be available at:
   - https://financial-planner-629380503119.europe-west1.run.app

3. ✅ All environment variables will be injected during build and runtime

## 🔗 Useful Links

- **Cloud Build Triggers:** https://console.cloud.google.com/cloud-build/triggers?project=629380503119
- **Cloud Build History:** https://console.cloud.google.com/cloud-build/builds?project=629380503119
- **Cloud Run Service:** https://console.cloud.google.com/run/detail/europe-west1/financial-planner?project=629380503119
- **Container Registry:** https://console.cloud.google.com/gcr/images/629380503119?project=629380503119

---

## 🚀 Quick Start Checklist

- [ ] Open Cloud Build Triggers console
- [ ] Click "CREATE TRIGGER"
- [ ] Select FINANCIAL-PLANNER repository
- [ ] Set branch pattern to `^main$`
- [ ] Set configuration file to `cloudbuild.yaml`
- [ ] Add all 11 substitution variables
- [ ] Click "CREATE"
- [ ] Test with manual trigger or git push
- [ ] Verify deployment at Cloud Run URL

---

**Need help?** Check the existing triggers (PeakFlux, Bitbay-Repo) for reference - they're configured the same way! 🎯
