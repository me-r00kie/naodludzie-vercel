-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy for users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create policy for users to view profiles of people they have booking relationships with
CREATE POLICY "Users can view profiles for booking relationships"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests
      WHERE (guest_id = profiles.id AND host_id = auth.uid())
         OR (host_id = profiles.id AND guest_id = auth.uid())
    )
  );

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));