import crypto from 'crypto';

// Use the BETTER_AUTH_SECRET as the master key, or fallback to a generated one for dev
// In production, this MUST be a stable, long random string
const SECRET_KEY = process.env.BETTER_AUTH_SECRET || 'default-dev-secret-key-change-in-prod-123';

// Derive a 32-byte key from the secret
const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
const algorithm = 'aes-256-cbc';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails, it might be an old plain-text key
    // Return original text or handle error
    console.warn('Decryption failed, returning original text (might be unencrypted legacy data)');
    return text;
  }
}
