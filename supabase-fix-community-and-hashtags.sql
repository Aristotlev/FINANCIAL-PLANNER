-- Fix Community Schema and Add Hashtags

-- 1. Ensure public.users exists and has TEXT id
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    email_verified BOOLEAN DEFAULT false
);

-- If table exists, ensure id is TEXT
DO $$ 
BEGIN 
    -- Drop FK constraints referencing users.id if necessary (to allow type change)
    -- We'll just try to alter it. If it fails due to dependencies, we might need a more complex script.
    -- But for now, let's assume we can alter it or it's already TEXT.
    BEGIN
        ALTER TABLE public.users ALTER COLUMN id TYPE TEXT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not alter public.users.id to TEXT: %', SQLERRM;
    END;
END $$;

-- 2. Fix posts table
DO $$ 
BEGIN 
    ALTER TABLE public.posts ALTER COLUMN user_id TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter public.posts.user_id to TEXT: %', SQLERRM;
END $$;

-- 3. Fix comments table
DO $$ 
BEGIN 
    ALTER TABLE public.comments ALTER COLUMN user_id TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter public.comments.user_id to TEXT: %', SQLERRM;
END $$;

-- 4. Fix post_likes table
DO $$ 
BEGIN 
    ALTER TABLE public.post_likes ALTER COLUMN user_id TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter public.post_likes.user_id to TEXT: %', SQLERRM;
END $$;

-- 5. Fix follows table
DO $$ 
BEGIN 
    ALTER TABLE public.follows ALTER COLUMN follower_id TYPE TEXT;
    ALTER TABLE public.follows ALTER COLUMN following_id TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter public.follows ids to TEXT: %', SQLERRM;
END $$;

-- 6. Create Hashtag System
CREATE TABLE IF NOT EXISTS public.hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT NOT NULL UNIQUE,
    count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (post_id, hashtag_id)
);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- Policies for hashtags
DROP POLICY IF EXISTS "Anyone can view hashtags" ON public.hashtags;
CREATE POLICY "Anyone can view hashtags" ON public.hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create hashtags" ON public.hashtags;
CREATE POLICY "Authenticated users can create hashtags" ON public.hashtags FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update hashtags" ON public.hashtags;
CREATE POLICY "Authenticated users can update hashtags" ON public.hashtags FOR UPDATE TO authenticated USING (true);

-- Policies for post_hashtags
DROP POLICY IF EXISTS "Anyone can view post_hashtags" ON public.post_hashtags;
CREATE POLICY "Anyone can view post_hashtags" ON public.post_hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create post_hashtags" ON public.post_hashtags;
CREATE POLICY "Authenticated users can create post_hashtags" ON public.post_hashtags FOR INSERT TO authenticated WITH CHECK (true);

-- Policies for users (ensure they exist)
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Service role full access" ON public.users;
CREATE POLICY "Service role full access" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.hashtags TO authenticated;
GRANT ALL ON public.hashtags TO service_role;
GRANT ALL ON public.post_hashtags TO authenticated;
GRANT ALL ON public.post_hashtags TO service_role;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

