-- Add icon_url column to crypto_holdings table
ALTER TABLE crypto_holdings ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Update RLS policies if needed (usually not needed for adding a column if policies are row-based)
-- But good to verify permissions
GRANT ALL ON crypto_holdings TO service_role;
GRANT ALL ON crypto_holdings TO authenticated;
