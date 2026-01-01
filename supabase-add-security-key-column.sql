-- Add security_key column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS security_key TEXT;
