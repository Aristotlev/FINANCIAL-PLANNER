-- Add sentiment column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish'));

-- Update RLS policies if needed (usually not for adding a column if insert policy covers all columns)
-- The existing policy "Authenticated users can create posts" uses WITH CHECK (auth.uid()::text = user_id) which is fine.
