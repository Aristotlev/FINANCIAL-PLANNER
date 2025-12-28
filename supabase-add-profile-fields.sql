-- Add location and website columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website TEXT;
