# Gemini 403 Error Fix (TTS Preprocessor)

## Issue
The user reported a `403 Forbidden` error when accessing `generativelanguage.googleapis.com`.
This was traced to `lib/tts-preprocessor.ts`, which was being used on the client side (in `ai-chat.tsx`) to preprocess text for speech.
The `TTSPreprocessor` class was attempting to initialize the Google AI SDK directly in the browser, which failed because the API key is server-side only.

## Fix Applied
1.  **Modified `lib/tts-preprocessor.ts`**:
    -   Updated `initialize()` to strictly prevent execution on the client side.
    -   Updated `preprocessForTTS()` to detect the client environment.
    -   **Client-Side**: Now makes a `POST` request to `/api/gemini-proxy` with the preprocessing prompt.
    -   **Server-Side**: Continues to use the SDK directly for performance.

## Verification
-   **Client-Side**: `TTSPreprocessor` now uses the proxy, avoiding direct calls to Google APIs from the browser.
-   **Server-Side**: The proxy handles the request using the server-side API key.
-   **Fallback**: If the proxy fails, it gracefully falls back to rule-based preprocessing.

## Result
The 403 error should be resolved, and AI-powered TTS preprocessing will now work correctly on the client via the proxy.
