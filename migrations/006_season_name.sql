ALTER TABLE public.seasons
ADD COLUMN name TEXT;

WITH existing_season_names AS (
  SELECT DISTINCT ON (c.season_id)
    c.season_id,
    regexp_replace(
      trim(c.name),
      '\s+week\s+[0-9]+\s*$',
      '',
      'i'
    ) AS season_name
  FROM public.contests c
  ORDER BY c.season_id, c.fetched_at
)
UPDATE public.seasons s
SET name = esn.season_name
FROM existing_season_names esn
WHERE esn.season_id = s.season_id
  AND length(esn.season_name) > 0;

ALTER TABLE public.seasons
ADD CONSTRAINT seasons_name_not_blank
CHECK (name IS NULL OR length(trim(name)) > 0);

CREATE UNIQUE INDEX seasons_league_name_idx
  ON public.seasons(league_id, name)
  WHERE name IS NOT NULL;

DROP VIEW public.season_standings;

CREATE VIEW public.season_standings
WITH (security_invoker = true)
AS
SELECT
  s.league_id,
  s.season_id,
  s.year AS season_year,
  s.name AS season_name,
  p.user_key,
  p.current_user_name AS participant_name,
  count(o.contest_key) FILTER (WHERE o.outcome = 'WIN')::INTEGER AS wins,
  count(o.contest_key) FILTER (WHERE o.outcome = 'LOSS')::INTEGER AS losses,
  count(o.contest_key) FILTER (WHERE o.outcome = 'TIE')::INTEGER AS ties,
  COALESCE(sum(o.fantasy_points), 0)::NUMERIC(12, 2) AS total_points
FROM public.season_participants sp
JOIN public.seasons s ON s.season_id = sp.season_id
JOIN public.participants p ON p.user_key = sp.user_key
LEFT JOIN public.contest_entry_outcomes o
  ON o.season_id = sp.season_id
 AND o.user_key = sp.user_key
WHERE sp.active = true
GROUP BY
  s.league_id,
  s.season_id,
  s.year,
  s.name,
  p.user_key,
  p.current_user_name;
