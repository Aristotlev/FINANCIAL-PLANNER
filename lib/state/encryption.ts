/**
 * End-to-End Encryption Module for State Sync
 * 
 * Implements client-side encryption using WebCrypto API:
 * - AES-GCM for data encryption (authenticated encryption)
 * - PBKDF2 for key derivation from passphrase
 * - Random DEK (Data Encryption Key) wrapped with KEK (Key Encryption Key)
 * 
 * Architecture:
 * 1. User provides a "Sync Key" (passphrase)
 * 2. PBKDF2 derives a KEK from the passphrase + salt
 * 3. A random DEK is generated for actual data encryption
 * 4. DEK is wrapped (encrypted) with KEK for storage
 * 5. Data is encrypted with DEK using AES-GCM
 * 
 * This allows changing the passphrase without re-encrypting all data.
 */

import type { AppState } from './app-state';

// ============================================================================
// Types
// ============================================================================

export interface EncryptedPayload {
  ciphertext: string;      // Base64-encoded encrypted data
  iv: string;              // Base64-encoded IV for AES-GCM
  salt: string;            // Base64-encoded salt for PBKDF2
  wrappedDek: string;      // Base64-encoded wrapped DEK
  dekIv: string;           // Base64-encoded IV for DEK wrapping
}

export interface EncryptionError {
  type: 'wrong_key' | 'corrupted' | 'invalid_format' | 'crypto_error';
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

const PBKDF2_ITERATIONS = 600000;  // OWASP recommended for 2024
const SALT_LENGTH = 32;            // 256 bits
const IV_LENGTH = 12;              // 96 bits for AES-GCM
const DEK_LENGTH = 256;            // 256-bit DEK

// ============================================================================
// Utility Functions
// ============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Type assertion helper for WebCrypto APIs that expect BufferSource
// TypeScript's Uint8Array typing can be overly strict with ArrayBufferLike
function toBuffer(arr: Uint8Array): ArrayBuffer {
  // Use type assertion since we know crypto.getRandomValues returns a proper ArrayBuffer
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generate a new Sync Key (human-readable passphrase).
 * Format: XXXX-XXXX-XXXX-XXXX (16 alphanumeric chars, uppercase)
 */
export function generateSyncKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0/1/I/L for clarity
  const bytes = generateRandomBytes(16);
  let key = '';
  
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      key += '-';
    }
    key += chars[bytes[i] % chars.length];
  }
  
  return key;
}

/**
 * Validate sync key format
 */
export function validateSyncKey(key: string): boolean {
  const pattern = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(key.toUpperCase());
}

/**
 * Normalize sync key (uppercase, add dashes if missing)
 */
export function normalizeSyncKey(key: string): string {
  const cleaned = key.toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (cleaned.length !== 16) {
    return key.toUpperCase(); // Return as-is if wrong length
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
}

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Derive a Key Encryption Key (KEK) from the sync key using PBKDF2
 */
async function deriveKEK(
  syncKey: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import sync key as raw key material
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(syncKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive KEK using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: DEK_LENGTH },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a new Data Encryption Key (DEK)
 */
async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: DEK_LENGTH },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap (encrypt) the DEK with the KEK
 */
async function wrapDEK(
  dek: CryptoKey,
  kek: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.wrapKey(
    'raw',
    dek,
    kek,
    { name: 'AES-GCM', iv: toBuffer(iv) }
  );
}

/**
 * Unwrap (decrypt) the DEK with the KEK
 */
async function unwrapDEK(
  wrappedDek: ArrayBuffer,
  kek: CryptoKey,
  iv: Uint8Array
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedDek,
    kek,
    { name: 'AES-GCM', iv: toBuffer(iv) },
    { name: 'AES-GCM', length: DEK_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Encrypt the AppState with the sync key
 */
export async function encryptState(
  state: AppState,
  syncKey: string
): Promise<EncryptedPayload> {
  try {
    // Validate sync key
    if (!validateSyncKey(syncKey)) {
      throw new Error('Invalid sync key format');
    }
    
    // Generate fresh salt and IVs
    const salt = generateRandomBytes(SALT_LENGTH);
    const dataIv = generateRandomBytes(IV_LENGTH);
    const dekIv = generateRandomBytes(IV_LENGTH);
    
    // Derive KEK from sync key
    const kek = await deriveKEK(syncKey, salt);
    
    // Generate new DEK
    const dek = await generateDEK();
    
    // Wrap DEK with KEK
    const wrappedDek = await wrapDEK(dek, kek, dekIv);
    
    // Serialize state to JSON
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(state));
    
    // Encrypt data with DEK
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBuffer(dataIv) },
      dek,
      plaintext
    );
    
    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(dataIv),
      salt: arrayBufferToBase64(salt),
      wrappedDek: arrayBufferToBase64(wrappedDek),
      dekIv: arrayBufferToBase64(dekIv),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt the AppState with the sync key
 * Returns the decrypted state or throws an error
 */
export async function decryptState(
  payload: EncryptedPayload,
  syncKey: string
): Promise<AppState> {
  try {
    // Validate sync key
    if (!validateSyncKey(syncKey)) {
      throw createEncryptionError('wrong_key', 'Invalid sync key format');
    }
    
    // Decode all Base64 values
    const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
    const dataIv = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const dekIv = new Uint8Array(base64ToArrayBuffer(payload.dekIv));
    const wrappedDek = base64ToArrayBuffer(payload.wrappedDek);
    const ciphertext = base64ToArrayBuffer(payload.ciphertext);
    
    // Derive KEK from sync key
    const kek = await deriveKEK(syncKey, salt);
    
    // Try to unwrap DEK - this will fail if the key is wrong
    let dek: CryptoKey;
    try {
      dek = await unwrapDEK(wrappedDek, kek, dekIv);
    } catch (error) {
      throw createEncryptionError('wrong_key', 'Invalid sync key - decryption failed');
    }
    
    // Decrypt data with DEK
    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: dataIv },
        dek,
        ciphertext
      );
    } catch (error) {
      throw createEncryptionError('wrong_key', 'Invalid sync key - decryption failed');
    }
    
    // Parse JSON
    const decoder = new TextDecoder();
    const json = decoder.decode(plaintext);
    
    let state: AppState;
    try {
      state = JSON.parse(json);
    } catch (error) {
      throw createEncryptionError('corrupted', 'Decrypted data is not valid JSON');
    }
    
    // Basic validation
    if (
      typeof state.schemaVersion !== 'number' ||
      typeof state.rev !== 'number' ||
      !state.portfolio
    ) {
      throw createEncryptionError('invalid_format', 'Decrypted state has invalid structure');
    }
    
    return state;
  } catch (error) {
    if (isEncryptionError(error)) {
      throw error;
    }
    console.error('Decryption error:', error);
    throw createEncryptionError('crypto_error', 'Decryption failed');
  }
}

// ============================================================================
// Error Handling
// ============================================================================

function createEncryptionError(type: EncryptionError['type'], message: string): EncryptionError & Error {
  const error = new Error(message) as EncryptionError & Error;
  error.type = type;
  return error;
}

export function isEncryptionError(error: unknown): error is EncryptionError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'type' in error &&
    typeof (error as any).type === 'string' &&
    ['wrong_key', 'corrupted', 'invalid_format', 'crypto_error'].includes((error as any).type)
  );
}

// ============================================================================
// Key Storage (Encrypted in localStorage)
// ============================================================================

const STORED_KEY_KEY = 'omnifolio_sync_key_encrypted';
const STORED_KEY_CHECK = 'omnifolio_sync_key_check';

/**
 * Store the sync key locally (encrypted with a device-specific key)
 * This provides "Remember on this device" functionality
 */
export async function storeSyncKeyLocally(syncKey: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Generate a device-specific key from random data stored in localStorage
  let deviceSecret = localStorage.getItem('omnifolio_device_secret');
  if (!deviceSecret) {
    deviceSecret = arrayBufferToBase64(generateRandomBytes(32));
    localStorage.setItem('omnifolio_device_secret', deviceSecret);
  }
  
  // Derive encryption key from device secret
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceSecret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  const salt = generateRandomBytes(16);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Encrypt sync key
  const iv = generateRandomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    encoder.encode(syncKey)
  );
  
  // Store encrypted key
  const stored = {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext),
  };
  
  localStorage.setItem(STORED_KEY_KEY, JSON.stringify(stored));
  
  // Store a check value to verify the key is correct
  localStorage.setItem(STORED_KEY_CHECK, 'valid');
}

/**
 * Retrieve the locally stored sync key
 */
export async function getStoredSyncKey(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const storedJson = localStorage.getItem(STORED_KEY_KEY);
  const deviceSecret = localStorage.getItem('omnifolio_device_secret');
  
  if (!storedJson || !deviceSecret) return null;
  
  try {
    const stored = JSON.parse(storedJson);
    
    // Derive key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(deviceSecret),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const salt = new Uint8Array(base64ToArrayBuffer(stored.salt));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Decrypt sync key
    const iv = new Uint8Array(base64ToArrayBuffer(stored.iv));
    const ciphertext = base64ToArrayBuffer(stored.ciphertext);
    
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error('Failed to retrieve stored sync key:', error);
    return null;
  }
}

/**
 * Check if a sync key is stored locally
 */
export function hasSyncKeyStored(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORED_KEY_KEY) !== null;
}

/**
 * Remove the locally stored sync key
 */
export function forgetSyncKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORED_KEY_KEY);
  localStorage.removeItem(STORED_KEY_CHECK);
}

/**
 * Check if sync is enabled (key is stored)
 */
export function isSyncEnabled(): boolean {
  return hasSyncKeyStored();
}
