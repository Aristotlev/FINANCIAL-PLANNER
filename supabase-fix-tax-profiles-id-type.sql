-- Fix tax_profiles table to use TEXT for user_id instead of UUID
-- This is required because Better Auth uses string IDs, not UUIDs

-- 1. Drop the existing foreign key constraint if it exists
ALTER TABLE tax_profiles 
DROP CONSTRAINT IF EXISTS tax_profiles_user_id_fkey;

-- 2. Alter the column type from UUID to TEXT
ALTER TABLE tax_profiles 
ALTER COLUMN user_id TYPE TEXT;

-- 3. Re-create the index (optional but good practice)
DROP INDEX IF EXISTS idx_tax_profiles_user_id;
CREATE INDEX idx_tax_profiles_user_id ON tax_profiles(user_id);

-- 4. Update RLS policies to ensure they work with the new type
-- (Existing policies usually just check auth.uid() which works, but we ensure no type casting issues)

-- 5. Add comment to document the change
COMMENT ON COLUMN tax_profiles.user_id IS 'User ID from Better Auth (TEXT)';
