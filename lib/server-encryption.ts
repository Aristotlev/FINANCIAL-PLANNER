/**
 * Server-Side Encryption — AES-256-GCM with key versioning
 *
 * Design goals:
 *  1. AES-256-GCM: authenticated encryption → integrity + confidentiality.
 *  2. Versioned key envelope: prefix v<N>: so you can rotate keys by adding
 *     a new entry to KEY_RING without re-encrypting existing ciphertext.
 *  3. Deterministic key derivation: scrypt(secret, APP_SALT, 32) — uses a
 *     separate ENCRYPTION_KEY env var so the auth secret and encryption key
 *     are never the same value.
 *  4. Backwards-compatible decrypt: recognises legacy CBC format (iv:hex)
 *     and the new GCM format (v<N>:iv:tag:ciphertext) automatically.
 *
 * ENV VARS (set in .env.local and Cloud Run secrets):
 *   ENCRYPTION_KEY          — high-entropy string for the CURRENT key (required in prod)
 *   ENCRYPTION_KEY_PREVIOUS — previous key string used only for decrypting old data
 *                             (optional, set during key-rotation window then remove)
 *   BETTER_AUTH_SECRET      — used only as a last-resort fallback in dev (never in prod)
 */

import crypto from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // 96-bit IV — NIST recommended for GCM
const AUTH_TAG_LENGTH = 16;  // 128-bit tag
const KEY_BYTE_LENGTH = 32;  // AES-256

// A fixed, public application salt — security comes from the secret, not this salt.
// Using a fixed salt makes key derivation deterministic (same secret → same key).
const APP_SALT = 'omnifolio-v1-encryption-salt';

// Version tag prepended to every new ciphertext so we can support rotation
const CURRENT_VERSION = 'v1';

// ─── Key ring ─────────────────────────────────────────────────────────────────
// Maps version string → derived 32-byte Buffer.
// Built lazily on first use so missing env vars fail at request time, not at
// module load (which would crash the Next.js build).

let _keyRing: Map<string, Buffer> | null = null;

function getKeyRing(): Map<string, Buffer> {
  if (_keyRing) return _keyRing;

  const ring = new Map<string, Buffer>();

  const deriveKey = (secret: string): Buffer =>
    crypto.scryptSync(secret, APP_SALT, KEY_BYTE_LENGTH);

  // Current key (v1)
  const currentSecret =
    process.env.ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET ||
    'default-dev-secret-CHANGE-IN-PRODUCTION';

  if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
    console.error('⚠️  ENCRYPTION_KEY is not set in production — using BETTER_AUTH_SECRET as fallback. Set ENCRYPTION_KEY immediately.');
  }

  ring.set(CURRENT_VERSION, deriveKey(currentSecret));

  // Previous key (optional — only needed during rotation window)
  if (process.env.ENCRYPTION_KEY_PREVIOUS) {
    ring.set('v0', deriveKey(process.env.ENCRYPTION_KEY_PREVIOUS));
  }

  _keyRing = ring;
  return ring;
}

function getCurrentKey(): Buffer {
  const key = getKeyRing().get(CURRENT_VERSION);
  if (!key) throw new Error('Encryption key not available');
  return key;
}

// ─── New GCM format: v<N>:<iv_hex>:<tag_hex>:<ciphertext_hex> ────────────────

export function encrypt(text: string): string {
  const key = getCurrentKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  // ── New GCM format ──────────────────────────────────────────────────────────
  if (text.startsWith('v') && text.split(':').length === 4) {
    const [version, ivHex, tagHex, cipherHex] = text.split(':');
    const key = getKeyRing().get(version);
    if (!key) {
      throw new Error(`Unknown encryption key version "${version}". Add ENCRYPTION_KEY_PREVIOUS to decrypt old data.`);
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ── Legacy CBC format: iv_hex:ciphertext_hex ────────────────────────────────
  // Silently decrypts old data encrypted with the previous AES-256-CBC module.
  // Once all rows have been re-encrypted, this branch can be removed.
  try {
    const parts = text.split(':');
    if (parts.length >= 2) {
      const legacySecret =
        process.env.ENCRYPTION_KEY ||
        process.env.BETTER_AUTH_SECRET ||
        'default-dev-secret-CHANGE-IN-PRODUCTION';
      const legacyKey = crypto.scryptSync(legacySecret, 'salt', KEY_BYTE_LENGTH);

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts.slice(1).join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    }
  } catch {
    // Not legacy CBC either — fall through
  }

  // ── Plaintext (unencrypted legacy value) ────────────────────────────────────
  console.warn('[server-encryption] Could not decrypt value — treating as plaintext. Consider re-encrypting this row.');
  return text;
}
