-- Add expires_at column to cabins table for 60-day offer duration
ALTER TABLE public.cabins 
ADD COLUMN expires_at timestamp with time zone DEFAULT (now() + interval '60 days');

-- Update existing cabins to have expiration date
UPDATE public.cabins 
SET expires_at = created_at + interval '60 days' 
WHERE expires_at IS NULL;

-- Make the column not nullable
ALTER TABLE public.cabins 
ALTER COLUMN expires_at SET NOT NULL;

-- Create a function to set expires_at on insert
CREATE OR REPLACE FUNCTION public.set_cabin_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = now() + interval '60 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic expiration date setting
CREATE TRIGGER set_cabin_expiration_trigger
BEFORE INSERT ON public.cabins
FOR EACH ROW
EXECUTE FUNCTION public.set_cabin_expiration();