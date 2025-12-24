/**
 * Secure Secrets Management
 * 
 * This module provides a unified interface for accessing secrets.
 * - In production: Uses Google Secret Manager
 * - In development: Falls back to environment variables
 * 
 * SECURITY:
 * - Secrets are cached with TTL to minimize API calls
 * - Audit logging for secret access in production
 * - Graceful fallback with warnings
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Singleton client instance
let secretManagerClient: SecretManagerServiceClient | null = null;

// Cache for secrets (with TTL)
const secretCache: Map<string, { value: string; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// List of all secrets that should be in Secret Manager
export type SecretName =
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'SUPABASE_DATABASE_URL'
  | 'BETTER_AUTH_SECRET'
  | 'GOOGLE_CLIENT_SECRET'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET'
  | 'GOOGLE_AI_API_KEY'
  | 'ELEVENLABS_API_KEY'
  | 'FINNHUB_API_KEY'
  | 'ALPHA_VANTAGE_API_KEY'
  | 'REPLICATE_API_TOKEN';

/**
 * Check if Secret Manager is configured and available
 */
export function isSecretManagerConfigured(): boolean {
  // In development, we use environment variables
  if (process.env.NODE_ENV === 'development') {
    return false;
  }

  // In production, check for project ID
  return !!process.env.SECRET_MANAGER_PROJECT_ID;
}

/**
 * Get the Secret Manager client
 */
function getClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

/**
 * Get a secret from Google Secret Manager
 * Falls back to environment variables if Secret Manager is not configured
 * 
 * @param name - The name of the secret
 * @param version - The version of the secret (default: 'latest')
 * @returns The secret value
 */
export async function getSecret(name: SecretName, version: string = 'latest'): Promise<string> {
  // In development, use environment variables
  if (!isSecretManagerConfigured()) {
    const envValue = process.env[name];
    if (!envValue) {
      throw new Error(`Secret ${name} not found in environment variables`);
    }
    return envValue;
  }

  const cacheKey = `${name}:${version}`;

  // Check cache
  const cached = secretCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  try {
    const projectId = process.env.SECRET_MANAGER_PROJECT_ID;
    const client = getClient();

    const secretPath = `projects/${projectId}/secrets/${name}/versions/${version}`;

    const [accessResponse] = await client.accessSecretVersion({
      name: secretPath,
    });

    const payload = accessResponse.payload?.data;
    if (!payload) {
      throw new Error(`Secret ${name} has no payload`);
    }

    const value = typeof payload === 'string'
      ? payload
      : new TextDecoder().decode(payload as Uint8Array);

    // Cache the secret
    secretCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Log secret access for audit (redacted)
    console.log(`[SECRET_ACCESS] Retrieved secret: ${name}`);

    return value;
  } catch (error: any) {
    console.error(`[SECRET_ERROR] Error fetching secret ${name}:`, error.message);

    // Fall back to environment variable
    const envValue = process.env[name];
    if (envValue) {
      console.warn(`[SECRET_FALLBACK] Falling back to environment variable for ${name}`);
      return envValue;
    }

    throw new Error(`Failed to get secret ${name}: ${error.message}`);
  }
}

/**
 * Get a secret synchronously (from env var only)
 * Use this only when async is not possible (e.g., module initialization)
 */
export function getSecretSync(name: SecretName): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Secret ${name} not found in environment variables`);
  }
  return value;
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets<T extends SecretName>(
  names: T[]
): Promise<Record<T, string>> {
  const results = await Promise.all(
    names.map(async (name) => {
      const value = await getSecret(name);
      return [name, value] as const;
    })
  );

  return Object.fromEntries(results) as Record<T, string>;
}

/**
 * Clear the secret cache
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Check if all required secrets are available
 */
export async function checkRequiredSecrets(): Promise<{
  available: SecretName[];
  missing: SecretName[];
}> {
  const requiredSecrets: SecretName[] = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'BETTER_AUTH_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'STRIPE_SECRET_KEY',
  ];

  const available: SecretName[] = [];
  const missing: SecretName[] = [];

  for (const name of requiredSecrets) {
    try {
      await getSecret(name);
      available.push(name);
    } catch {
      missing.push(name);
    }
  }

  return { available, missing };
}
