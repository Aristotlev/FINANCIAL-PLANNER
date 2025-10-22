import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// This handles all Better Auth routes:
// - /api/auth/sign-in
// - /api/auth/sign-up
// - /api/auth/sign-out
// - /api/auth/callback/google
// - /api/auth/session
// And more...

export const { GET, POST } = toNextJsHandler(auth);
