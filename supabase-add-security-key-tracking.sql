-- Add security key tracking to user_preferences
-- This tracks if the user has seen and saved their unique security key

-- Add column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'has_seen_security_modal'
    ) THEN 
        ALTER TABLE public.user_preferences 
        ADD COLUMN has_seen_security_modal BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add column for the encrypted key (optional, if we want to store a backup or verification)
-- For now, we just track if they've seen it.
