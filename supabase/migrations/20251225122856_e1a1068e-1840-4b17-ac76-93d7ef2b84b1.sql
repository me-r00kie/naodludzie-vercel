-- Add extra_fees column to cabins table for storing additional fees like hot tub, sauna, pet fees
ALTER TABLE public.cabins ADD COLUMN IF NOT EXISTS extra_fees JSONB DEFAULT '[]'::jsonb;