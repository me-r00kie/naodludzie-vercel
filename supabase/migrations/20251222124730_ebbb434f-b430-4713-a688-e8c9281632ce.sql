-- Dodanie kolumn do profilu hosta (dane firmowe)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS nip text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- Dodanie kolumn do domków (weryfikacja przelewem)
ALTER TABLE public.cabins
ADD COLUMN IF NOT EXISTS manual_payment_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_transfer_sent boolean DEFAULT false;