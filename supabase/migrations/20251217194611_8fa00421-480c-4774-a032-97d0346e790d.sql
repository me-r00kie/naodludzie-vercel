-- Drop the existing insert policy
DROP POLICY IF EXISTS "Hosts can insert own cabins" ON public.cabins;

-- Create updated insert policy that allows both hosts and admins to insert cabins
CREATE POLICY "Hosts and admins can insert cabins" 
ON public.cabins 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) AND 
  (has_role(auth.uid(), 'host'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);