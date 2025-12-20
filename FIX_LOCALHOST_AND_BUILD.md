# Fix for Localhost "Invalid Code" & Cloud Build Info

## 1. Localhost "Invalid Code" Fix
I have updated `lib/auth.ts` to automatically override the `BETTER_AUTH_URL` environment variable when running in development mode. 

**Why this was happening:**
Your `.env.local` file contains `BETTER_AUTH_URL=https://www.omnifolio.app`. Even though we had logic to use `localhost`, the `better-auth` library was reading this environment variable directly and getting confused, thinking it should be validating against the production URL.

**Action Required:**
1.  **Stop the development server** (Ctrl+C).
2.  **Restart the server**: `npm run dev`.
3.  **Clear your browser cookies** for `localhost`.
4.  Try logging in again.

## 2. Google Cloud Build Issues
You mentioned you don't see any builds on Google Cloud Console.

**Possible Reasons:**
1.  **You haven't pushed your changes:** Cloud Build triggers usually run when you push to a specific branch (e.g., `main`).
    *   *Solution:* Run `git push origin main` (or your working branch).
2.  **Triggers are not set up:** You need to have a Cloud Build trigger connected to your GitHub repository.
    *   *Solution:* Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers) and ensure a trigger exists for your repository.
3.  **Wrong Project:** Ensure you are looking at the correct Google Cloud Project in the console.

**To Deploy Manually (if you have gcloud CLI installed):**
You can trigger a build manually from your terminal:
```bash
gcloud builds submit --config cloudbuild.yaml .
```
(Note: This requires `gcloud` CLI to be authenticated and configured for your project).
