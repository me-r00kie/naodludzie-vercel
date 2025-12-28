-- Drop restrictive host-only policy
DROP POLICY IF EXISTS "Hosts can upload cabin images to own folder" ON storage.objects;

-- Create policy allowing authenticated users to upload to their own folder
-- This allows users to upload images when creating cabins (before they have host role)
CREATE POLICY "Authenticated users can upload cabin images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cabin-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);