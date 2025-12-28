-- Create storage bucket for cabin images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cabin-images', 'cabin-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload cabin images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cabin-images');

-- Allow anyone to view cabin images (public bucket)
CREATE POLICY "Anyone can view cabin images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cabin-images');

-- Allow owners to update their images
CREATE POLICY "Users can update their own cabin images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'cabin-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow owners to delete their images
CREATE POLICY "Users can delete their own cabin images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cabin-images' AND auth.uid()::text = (storage.foldername(name))[1]);