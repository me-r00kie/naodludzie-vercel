-- Add voivodeship column to cabins table
ALTER TABLE public.cabins ADD COLUMN IF NOT EXISTS voivodeship text;

-- Update existing cabins with voivodeships based on address patterns
UPDATE public.cabins SET voivodeship = 
  CASE 
    WHEN address ILIKE '%dolnośląsk%' OR address ILIKE '%wrocław%' OR address ILIKE '%wałbrzych%' OR address ILIKE '%legnica%' OR address ILIKE '%jelenia góra%' THEN 'dolnośląskie'
    WHEN address ILIKE '%kujawsko%' OR address ILIKE '%bydgoszcz%' OR address ILIKE '%toruń%' THEN 'kujawsko-pomorskie'
    WHEN address ILIKE '%lubelsk%' OR address ILIKE '%lublin%' OR address ILIKE '%zamość%' THEN 'lubelskie'
    WHEN address ILIKE '%lubusk%' OR address ILIKE '%zielona góra%' OR address ILIKE '%gorzów%' THEN 'lubuskie'
    WHEN address ILIKE '%łódzk%' OR address ILIKE '%łódź%' OR address ILIKE '%piotrków%' THEN 'łódzkie'
    WHEN address ILIKE '%małopolsk%' OR address ILIKE '%kraków%' OR address ILIKE '%tarnów%' OR address ILIKE '%nowy sącz%' OR address ILIKE '%zakopane%' OR address ILIKE '%tatry%' THEN 'małopolskie'
    WHEN address ILIKE '%mazowieck%' OR address ILIKE '%warszaw%' OR address ILIKE '%radom%' OR address ILIKE '%płock%' THEN 'mazowieckie'
    WHEN address ILIKE '%opolsk%' OR address ILIKE '%opole%' THEN 'opolskie'
    WHEN address ILIKE '%podkarpack%' OR address ILIKE '%rzeszów%' OR address ILIKE '%przemyśl%' OR address ILIKE '%bieszczady%' THEN 'podkarpackie'
    WHEN address ILIKE '%podlask%' OR address ILIKE '%białystok%' OR address ILIKE '%suwałk%' THEN 'podlaskie'
    WHEN address ILIKE '%pomorsk%' OR address ILIKE '%gdańsk%' OR address ILIKE '%gdynia%' OR address ILIKE '%sopot%' THEN 'pomorskie'
    WHEN address ILIKE '%śląsk%' OR address ILIKE '%katowice%' OR address ILIKE '%częstochowa%' OR address ILIKE '%bielsko%' THEN 'śląskie'
    WHEN address ILIKE '%świętokrzysk%' OR address ILIKE '%kielce%' THEN 'świętokrzyskie'
    WHEN address ILIKE '%warmińsko%' OR address ILIKE '%olsztyn%' OR address ILIKE '%elbląg%' OR address ILIKE '%mazury%' THEN 'warmińsko-mazurskie'
    WHEN address ILIKE '%wielkopolsk%' OR address ILIKE '%poznań%' OR address ILIKE '%kalisz%' THEN 'wielkopolskie'
    WHEN address ILIKE '%zachodniopomorsk%' OR address ILIKE '%szczecin%' OR address ILIKE '%koszalin%' THEN 'zachodniopomorskie'
    ELSE NULL
  END
WHERE status = 'active';