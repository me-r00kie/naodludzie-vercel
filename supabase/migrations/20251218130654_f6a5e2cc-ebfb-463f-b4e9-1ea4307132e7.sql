-- Tabela cache dla zablokowanych dat z kalendarzy
CREATE TABLE public.cached_calendar_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cabin_id UUID NOT NULL REFERENCES public.cabins(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'ical',
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cabin_id, blocked_date, source)
);

-- Index dla szybkiego wyszukiwania
CREATE INDEX idx_cached_calendar_dates_cabin ON public.cached_calendar_dates(cabin_id);
CREATE INDEX idx_cached_calendar_dates_date ON public.cached_calendar_dates(blocked_date);

-- RLS - publiczny odczyt, zapis tylko przez service role (edge function)
ALTER TABLE public.cached_calendar_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached dates"
  ON public.cached_calendar_dates
  FOR SELECT
  USING (true);

-- Dodanie kolumny last_ical_sync do cabins
ALTER TABLE public.cabins ADD COLUMN last_ical_sync TIMESTAMP WITH TIME ZONE;