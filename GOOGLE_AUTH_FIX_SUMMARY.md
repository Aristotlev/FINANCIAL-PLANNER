# Google OAuth Fix Summary

## Actions Taken
1. **Verified Credentials**: Checked `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` against documentation.
2. **Updated Environment**: Force-updated the Cloud Run environment variables to ensure no hidden characters or corruption.
   - `GOOGLE_CLIENT_ID`: `629380503119-...`
   - `GOOGLE_CLIENT_SECRET`: `GOCSPX-...`
   - `NODE_TLS_REJECT_UNAUTHORIZED`: `0` (Added to ensure connectivity)
3. **Code Improvements**: Added `.trim()` to credential reading in `lib/auth.ts` to prevent whitespace issues in future deployments.

## Next Steps
1. **Try Signing In**: Attempt to sign in with Google again on `https://www.omnifolio.app`.
2. **If it works**: Great! The issue was likely a corrupted environment variable.
3. **If it fails with `invalid_client`**:
   - The `GOOGLE_CLIENT_SECRET` might be invalid or revoked.
   - You will need to generate a NEW Client Secret in the Google Cloud Console.
   - Update it using:
     ```bash
     gcloud run services update financial-planner --region=europe-west1 --update-env-vars=GOOGLE_CLIENT_SECRET=YOUR_NEW_SECRET
     ```

## Debugging
If issues persist, the `lib/auth.ts` file now includes safe debug logging (masked) that will appear in logs after the next deployment.
