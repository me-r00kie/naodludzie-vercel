-- Add slug column to cabins table
ALTER TABLE public.cabins ADD COLUMN slug TEXT UNIQUE;

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace Polish characters, remove special chars
  base_slug := lower(title);
  base_slug := replace(base_slug, 'ą', 'a');
  base_slug := replace(base_slug, 'ć', 'c');
  base_slug := replace(base_slug, 'ę', 'e');
  base_slug := replace(base_slug, 'ł', 'l');
  base_slug := replace(base_slug, 'ń', 'n');
  base_slug := replace(base_slug, 'ó', 'o');
  base_slug := replace(base_slug, 'ś', 's');
  base_slug := replace(base_slug, 'ź', 'z');
  base_slug := replace(base_slug, 'ż', 'z');
  base_slug := replace(base_slug, 'Ą', 'a');
  base_slug := replace(base_slug, 'Ć', 'c');
  base_slug := replace(base_slug, 'Ę', 'e');
  base_slug := replace(base_slug, 'Ł', 'l');
  base_slug := replace(base_slug, 'Ń', 'n');
  base_slug := replace(base_slug, 'Ó', 'o');
  base_slug := replace(base_slug, 'Ś', 's');
  base_slug := replace(base_slug, 'Ź', 'z');
  base_slug := replace(base_slug, 'Ż', 'z');
  -- Replace spaces and special characters with hyphens
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  -- Limit length
  base_slug := left(base_slug, 80);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.cabins WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION public.set_cabin_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_cabin_slug_trigger
BEFORE INSERT ON public.cabins
FOR EACH ROW
EXECUTE FUNCTION public.set_cabin_slug();

-- Update existing cabins with slugs
UPDATE public.cabins 
SET slug = public.generate_slug(title)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.cabins ALTER COLUMN slug SET NOT NULL;