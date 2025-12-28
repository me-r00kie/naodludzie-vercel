-- Add category column to cabins table
ALTER TABLE public.cabins ADD COLUMN category text NOT NULL DEFAULT 'domek';

-- Add check constraint for valid categories
ALTER TABLE public.cabins ADD CONSTRAINT cabins_category_check 
CHECK (category IN ('domek', 'camping', 'jurta', 'glamping'));

-- Create index for category filtering
CREATE INDEX idx_cabins_category ON public.cabins(category);