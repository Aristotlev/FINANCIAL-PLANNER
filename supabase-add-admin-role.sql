-- ============================================
-- ADMIN ROLE SYSTEM FOR OMNIFOLIO
-- ============================================
-- This migration adds a role-based access control system.
-- Admins get full access to all paid features without subscription.
-- 
-- USAGE: To add/remove admins, use the helper functions below:
--   SELECT grant_admin_role('email@example.com');
--   SELECT revoke_admin_role('email@example.com');
-- ============================================

-- Step 1: Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Step 2: Create an index on role for faster lookups
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);

-- Step 3: Create helper function to grant admin role
CREATE OR REPLACE FUNCTION grant_admin_role(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.users 
  SET role = 'admin', updated_at = NOW()
  WHERE email = user_email;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows > 0 THEN
    RAISE NOTICE 'Admin role granted to: %', user_email;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'User not found: %', user_email;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create helper function to revoke admin role
CREATE OR REPLACE FUNCTION revoke_admin_role(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.users 
  SET role = 'user', updated_at = NOW()
  WHERE email = user_email;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows > 0 THEN
    RAISE NOTICE 'Admin role revoked from: %', user_email;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'User not found: %', user_email;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = user_email AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create helper function to list all admins
CREATE OR REPLACE FUNCTION list_admins()
RETURNS TABLE (
  id TEXT,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.created_at
  FROM public.users u
  WHERE u.role = 'admin'
  ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant admin role to the primary admin (you)
SELECT grant_admin_role('ariscsc@gmail.com');

-- ============================================
-- EXAMPLE: How to add more admins
-- ============================================
-- Run these in Supabase SQL Editor when needed:
--
-- Grant admin to someone:
--   SELECT grant_admin_role('newadmin@example.com');
--
-- Revoke admin from someone:
--   SELECT revoke_admin_role('formeradmin@example.com');
--
-- Check if someone is admin:
--   SELECT is_admin('user@example.com');
--
-- List all current admins:
--   SELECT * FROM list_admins();
-- ============================================
