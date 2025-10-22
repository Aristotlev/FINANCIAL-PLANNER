-- Add image column to users table for storing profile pictures from OAuth providers
-- Run this in your Supabase SQL Editor

-- Add the image column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS image TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_image ON users(image) WHERE image IS NOT NULL;

-- Update existing users who have Google OAuth accounts with their profile pictures
-- This will fetch the picture from the Google account if available
UPDATE users u
SET image = (
  SELECT 
    CASE 
      WHEN a.provider = 'google' THEN 
        -- Better Auth may store this in account metadata
        (a.account_id || '/picture')  -- Placeholder, will be updated via API
      ELSE NULL
    END
  FROM accounts a
  WHERE a.user_id = u.id AND a.provider = 'google'
  LIMIT 1
)
WHERE u.image IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'image';
