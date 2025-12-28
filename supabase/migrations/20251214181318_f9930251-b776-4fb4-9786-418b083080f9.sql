-- Add external calendar integration column to cabins table
ALTER TABLE public.cabins 
ADD COLUMN external_calendar_needed boolean DEFAULT NULL,
ADD COLUMN external_calendar_details text DEFAULT NULL;