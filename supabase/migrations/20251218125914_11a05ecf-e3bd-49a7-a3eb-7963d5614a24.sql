-- Add ical_url column to cabins table for iCal calendar synchronization
ALTER TABLE public.cabins ADD COLUMN ical_url TEXT;