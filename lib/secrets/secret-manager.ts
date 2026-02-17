/**
 * Google Secret Manager Integration
 * 
 * This module provides secure access to secrets stored in Google Secret Manager.
 * It replaces plain environment variables for sensitive credentials.
 * 
 * SECURITY:
 * - Secrets are stored encrypted in Google Secret Manager
 * - Access is controlled via IAM policies
 * - Secrets can be rotated without redeploying
 * - Audit logs track all access
 * 
 * USAGE:
 * ```ts
 * import { getSecret, SecretName } from '@/lib/secrets/secret-manager';
 * 
 * // Get a secret
 * const apiKey = await getSecret('GOOGLE_CLIENT_SECRET');
 * ```
 * 
 * SETUP:
 * 1. Enable Secret Manager API in Google Cloud Console
 * 2. Create secrets for each sensitive credential
 * 3. Grant Cloud Run service account access to secrets
 * 4. Set SECRET_MANAGER_PROJECT_ID environment variable
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Singleton client instance
let secretManagerClient: SecretManagerServiceClient | null = null;

// Cache for secrets (with TTL)
const secretCache: Map<string, { value: string; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// List of secrets that should be stored in Secret Manager
export type SecretName = 
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'SUPABASE_DATABASE_URL'
  | 'BETTER_AUTH_SECRET'
  | 'GOOGLE_CLIENT_SECRET'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET'
  | 'GOOGLE_AI_API_KEY'
  | 'REPLICATE_API_TOKEN'
  | 'ALPHA_VANTAGE_API_KEY';

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

    return value;
  } catch (error: any) {
    console.error(`Error fetching secret ${name}:`, error.message);
    
    // Fall back to environment variable
    const envValue = process.env[name];
    if (envValue) {
      console.warn(`Falling back to environment variable for ${name}`);
      return envValue;
    }
    
    throw new Error(`Failed to get secret ${name}: ${error.message}`);
  }
}

/**
 * Get multiple secrets at once
 * 
 * @param names - Array of secret names
 * @returns Object with secret names as keys and values
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
 * Call this when you know secrets have been rotated
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Check if all required secrets are available
 * Useful for health checks
 */
export async function checkRequiredSecrets(): Promise<{
  available: SecretName[];
  missing: SecretName[];
}> {
  const requiredSecrets: SecretName[] = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'BETTER_AUTH_SECRET',
    'GOOGLE_CLIENT_SECRET',
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
