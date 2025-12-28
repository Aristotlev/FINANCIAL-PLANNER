-- Fix RLS on users table to allow reading profiles
-- This is required for the community feed to show author details

-- Enable RLS on users table (it is already enabled, but good to be explicit)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (though we saw none)
DROP POLICY IF EXISTS "Authenticated users can read user profiles" ON public.users;

-- Create policy to allow authenticated users to read all user profiles
-- We need this to display author name and avatar in the feed
CREATE POLICY "Authenticated users can read user profiles" ON public.users
FOR SELECT TO authenticated
USING (true);

-- Also allow service role full access (usually implicit, but sometimes needed if using service role client with RLS)
DROP POLICY IF EXISTS "Service role full access" ON public.users;
CREATE POLICY "Service role full access" ON public.users
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
