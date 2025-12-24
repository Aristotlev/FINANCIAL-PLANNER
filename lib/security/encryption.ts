import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * AES-256-GCM Encryption Utility
 * 
 * Provides secure authenticated encryption for sensitive data.
 * Uses AES-256-GCM with random IVs and authentication tags.
 */

// Algorithm to use
const ALGORITHM = 'aes-256-gcm';

// Key length for AES-256
const KEY_LENGTH = 32;

// IV length for GCM
const IV_LENGTH = 16; // 12 bytes is standard for GCM, but 16 is also fine. Node docs often use 16 for CBC, but 12 is recommended for GCM. Let's stick to 12 for GCM efficiency, or 16 if we want to be safe with other modes. 
// Actually, NIST recommends 12 bytes (96 bits) for GCM IVs for performance.
const GCM_IV_LENGTH = 12;

// Auth tag length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variables
 * Derives a 32-byte key from the string using scrypt if needed, 
 * or uses the key directly if it's already 32 bytes (hex or base64).
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
  
  if (!secret) {
    throw new Error('ENCRYPTION_KEY or BETTER_AUTH_SECRET must be defined');
  }

  // If the key is exactly 64 hex chars (32 bytes), use it directly
  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }

  // Otherwise, derive a key using a salt (fixed for deterministic key generation from a password)
  // In a real scenario, you might want a random salt stored with the data, 
  // but for a global application key, a fixed derivation is common if the input is a passphrase.
  // However, using the secret directly (padded/hashed) is better if it's high entropy.
  
  // Simple approach: Use scrypt to derive a 32-byte key from the secret
  // We use a fixed salt here because we need the SAME key every time to decrypt.
  // The security relies on the entropy of the ENCRYPTION_KEY env var.
  return scryptSync(secret, 'salt', KEY_LENGTH);
}

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(GCM_IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string value
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt a JSON object
 */
export function encryptJSON(data: any): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt a JSON object
 */
export function decryptJSON<T>(text: string): T {
  const decrypted = decrypt(text);
  return JSON.parse(decrypted);
}
