-- Fix: Restrict profile access to only approved booking relationships
-- This prevents attackers from harvesting contact info via pending booking requests

DROP POLICY IF EXISTS "Users can view profiles for booking relationships" ON public.profiles;

CREATE POLICY "Users can view profiles for approved bookings only"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests
      WHERE booking_requests.status = 'approved'
        AND (
          (booking_requests.guest_id = profiles.id AND booking_requests.host_id = auth.uid())
          OR (booking_requests.host_id = profiles.id AND booking_requests.guest_id = auth.uid())
        )
    )
  );