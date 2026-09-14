UPDATE public.seasons
SET name = 'malamoneyball 2026'
WHERE league_id = 'uyqc2yy8'
  AND year = 2026
  AND name IS NULL;

UPDATE public.seasons s
SET name = trim(l.name) || ' ' || s.year
FROM public.leagues l
WHERE l.league_id = s.league_id
  AND s.name IS NULL;

ALTER TABLE public.seasons
ALTER COLUMN name SET NOT NULL;
