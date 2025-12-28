-- Drop existing overly permissive storage upload policy
DROP POLICY IF EXISTS "Authenticated users can upload cabin images" ON storage.objects;

-- Create restrictive upload policy: only hosts can upload to their own folder
CREATE POLICY "Hosts can upload cabin images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cabin-images' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  public.has_role(auth.uid(), 'host')
);