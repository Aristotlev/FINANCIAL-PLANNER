# Bot Defense Implementation

## Overview
We have implemented a multi-layered defense system against bot attacks, specifically targeting mass account creation and automated abuse of authentication endpoints.

## Layers of Defense

### 1. Client-Side Honeypot
**Location**: `components/auth/signup-form.tsx`

- **Mechanism**: A hidden input field named `website` is injected into the Sign Up form.
- **Visibility**: The field is visually hidden using CSS (`opacity: 0`, `z-index: -1`) but remains in the DOM.
- **Logic**: 
  - Legitimate users (humans) do not see or fill this field.
  - Dumb bots that fill all form fields will fill this field.
  - If the field is filled, the client-side handler intercepts the submission and simulates a successful registration without ever contacting the server.

### 2. Server-Side Bot Detection
**Location**: `lib/security/auth-protection.ts`

The `detectBot` function analyzes incoming requests for bot signatures:

#### A. User-Agent Analysis
- Blocks requests with missing or very short User-Agents.
- Blocks known bot User-Agents (e.g., `curl`, `python`, `wget`, `selenium`, `puppeteer`).

#### B. Origin Verification
- For mutation requests (POST/PUT), verifies that the `Origin` header matches the `Host` header.
- Prevents CSRF-like attacks from external sites or scripts.

#### C. Server-Side Honeypot Check
- Inspects the request body for the `website` field.
- If a bot bypasses the client-side check (e.g., by scraping HTML and posting directly to the API), the server detects the filled honeypot field and blocks the request.

### 3. Rate Limiting
**Location**: `lib/rate-limit.ts`

- **Strict Auth Limits**: 5 attempts per 15 minutes per IP for authentication endpoints.
- **Global Limits**: General API rate limiting for other endpoints.

## Audit Logging
Blocked bot attempts are logged with the event type `BOT_BLOCKED` in the security audit log, including the reason for blocking (e.g., "Honeypot field filled", "Suspicious User-Agent").

## Testing
To test the honeypot:
1. Open the Sign Up form.
2. Use DevTools to unhide the "Website" field.
3. Fill it with any text.
4. Attempt to sign up.
5. Result: The form should close as if successful, but no network request is sent to the server.
