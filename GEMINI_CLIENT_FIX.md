# Gemini Client-Side Fix

## Issue
The application was encountering a `403 Forbidden` error when using the AI chat feature. The stack trace indicated that `initializeModel` was being called on the client side, attempting to make direct requests to the Google Gemini API without a valid API key (since the key is now server-side only).

## Root Cause
Although `GeminiService` had some checks for `typeof window === 'undefined'`, the `initializeModel` method itself was not explicitly prevented from running on the client. If it was called (e.g., during hydration or due to a race condition), it would attempt to use the `GoogleGenerativeAI` SDK, which would fail or try to use an undefined API key.

## Fix Applied
1.  **Added Guard Clause to `initializeModel`**:
    -   Modified `lib/gemini-service.ts` to explicitly check `if (typeof window !== 'undefined')` at the beginning of `initializeModel`.
    -   If running on the client, the method now returns immediately, preventing any API calls.

2.  **Added Guard Clause to `callGeminiRestAPI`**:
    -   Modified `lib/gemini-service.ts` to throw an error if `callGeminiRestAPI` is called on the client.
    -   This ensures that the fallback REST API logic is also strictly server-side.

## Verification
-   **Client-Side**: The `processMessage` method correctly detects the client environment and routes requests through `/api/gemini-proxy`.
-   **Server-Side**: The `processMessage` method (and the proxy route) can safely call `initializeModel` and `callGeminiRestAPI` as they have access to the server-side environment variables.

## Next Steps
-   Restart the development server to ensure the changes take effect.
-   Test the AI chat to confirm that the 403 error is resolved and responses are generated correctly via the proxy.
