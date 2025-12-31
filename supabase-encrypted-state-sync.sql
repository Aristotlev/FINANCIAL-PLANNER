-- ============================================================================
-- Encrypted State Sync Table for OmniFolio
-- 
-- Stores one encrypted snapshot per user with E2E encryption.
-- All encryption/decryption happens client-side.
-- Server only sees encrypted blobs.
-- 
-- NOTE: This app uses Better Auth (not Supabase Auth), so user_id is a TEXT
-- field containing Better Auth user IDs, not UUID references to auth.users.
-- RLS policies use a custom function to get the current user from JWT claims.
-- ============================================================================

-- Create the encrypted_state_snapshots table
CREATE TABLE IF NOT EXISTS public.encrypted_state_snapshots (
  -- Primary key: one row per user (Better Auth uses text IDs)
  user_id TEXT PRIMARY KEY,
  
  -- Revision tracking (for conflict detection)
  rev INTEGER NOT NULL DEFAULT 0,
  schema_version INTEGER NOT NULL DEFAULT 1,
  
  -- Encrypted data (all client-side encrypted, server never sees plaintext)
  ciphertext TEXT NOT NULL,           -- Base64-encoded AES-GCM encrypted AppState
  iv TEXT NOT NULL,                    -- Base64-encoded initialization vector for AES-GCM
  salt TEXT NOT NULL,                  -- Base64-encoded salt for PBKDF2 key derivation
  wrapped_dek TEXT NOT NULL,           -- Base64-encoded wrapped Data Encryption Key
  dek_iv TEXT NOT NULL,                -- Base64-encoded IV for DEK wrapping
  
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on updated_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_encrypted_state_updated_at 
  ON public.encrypted_state_snapshots(updated_at DESC);

-- ============================================================================
-- Row Level Security Policies
-- 
-- NOTE: This app uses Better Auth (not Supabase Auth).
-- RLS with auth.uid() won't work. Instead, we use service_role access
-- through a secure API endpoint that validates Better Auth sessions.
-- 
-- The table is still RLS-enabled to prevent direct anonymous access,
-- but authenticated access goes through the API which uses service_role.
-- ============================================================================

-- Enable RLS
ALTER TABLE public.encrypted_state_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Block all direct access - force use of service_role via API
-- Service role bypasses RLS automatically
CREATE POLICY "Block direct access - use API with service_role"
  ON public.encrypted_state_snapshots
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- Trigger to auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_encrypted_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_encrypted_state_updated_at 
  ON public.encrypted_state_snapshots;

CREATE TRIGGER trigger_update_encrypted_state_updated_at
  BEFORE UPDATE ON public.encrypted_state_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_encrypted_state_updated_at();

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Grant usage to authenticated users (RLS handles row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encrypted_state_snapshots 
  TO authenticated;

-- ============================================================================
-- Optional: Add comment for documentation
-- ============================================================================

COMMENT ON TABLE public.encrypted_state_snapshots IS 
  'Stores end-to-end encrypted state snapshots for cross-device sync. All encryption happens client-side.';

COMMENT ON COLUMN public.encrypted_state_snapshots.ciphertext IS 
  'Base64-encoded AES-GCM encrypted AppState JSON';

COMMENT ON COLUMN public.encrypted_state_snapshots.iv IS 
  'Base64-encoded 12-byte initialization vector for AES-GCM';

COMMENT ON COLUMN public.encrypted_state_snapshots.salt IS 
  'Base64-encoded salt for PBKDF2 key derivation from user passphrase';

COMMENT ON COLUMN public.encrypted_state_snapshots.wrapped_dek IS 
  'Base64-encoded Data Encryption Key, wrapped with KEK derived from passphrase';

COMMENT ON COLUMN public.encrypted_state_snapshots.dek_iv IS 
  'Base64-encoded IV used when wrapping the DEK';
