-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Policy to allow anyone to view images
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- Policy to allow users to delete their own images (optional but good)
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
