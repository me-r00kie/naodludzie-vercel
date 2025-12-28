-- Allow users to insert their own initial role during registration
CREATE POLICY "Users can insert own initial role"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());