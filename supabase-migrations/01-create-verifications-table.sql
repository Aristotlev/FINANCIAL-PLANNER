-- Create verifications table for Better Auth
-- This table is required for email verification and password reset flows

CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON verifications(expires_at);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO service_role;
