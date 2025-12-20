# Google OAuth Troubleshooting Guide

## The Problem
You are seeing `invalid_client` (401 Unauthorized) errors when trying to sign in with Google.
You have confirmed your **Client ID** is correct: `YOUR_GOOGLE_CLIENT_ID`

## The Cause
The `invalid_client` error specifically means that Google **rejects the Client Secret** that is paired with that Client ID.
Even if the ID is correct, if the Secret is wrong, expired, or has a typo, Google will reject the login.

## The Solution

### 1. Verify Your Secret
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on the pencil icon next to your OAuth 2.0 Client ID.
3. Look at the **Client Secret** field on the right side.
4. Compare it with the one currently configured:
   - Current Configured Secret: `YOUR_GOOGLE_CLIENT_SECRET`

### 2. If the Secret is Different
If the secret in the console is different, you need to update it:

```bash
gcloud run services update financial-planner --region=europe-west1 --update-env-vars=GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_SECRET_FROM_CONSOLE
```

### 3. If the Secret Looks the Same
If it looks the same, it might be corrupted or revoked. **Generate a new one**:
1. In the Google Cloud Console, click **"RESET SECRET"** (or create a new credential).
2. Copy the NEW secret.
3. Update your app with the new secret:

```bash
gcloud run services update financial-planner --region=europe-west1 --update-env-vars=GOOGLE_CLIENT_SECRET=YOUR_NEW_SECRET
```

### 4. Verify with Script
You can use the script `scripts/verify-google-creds.js` to test a secret *before* deploying.
1. Edit `scripts/verify-google-creds.js` and put your new secret in the `CLIENT_SECRET` variable.
2. Run `node scripts/verify-google-creds.js`.
3. Follow the instructions to test if it works.
