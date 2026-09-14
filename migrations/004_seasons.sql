CREATE TABLE public.seasons (
  season_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  year SMALLINT NOT NULL,
  expected_participant_count INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, year),
  CHECK (year >= 2000 AND year <= 9999),
  CHECK (expected_participant_count > 1)
);

CREATE TABLE public.season_participants (
  season_id BIGINT NOT NULL REFERENCES public.seasons(season_id) ON DELETE CASCADE,
  user_key TEXT NOT NULL REFERENCES public.participants(user_key),
  active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, user_key)
);

INSERT INTO public.seasons (
  league_id,
  year,
  expected_participant_count,
  created_at,
  updated_at
)
SELECT
  league_id,
  2026,
  expected_participant_count,
  created_at,
  updated_at
FROM public.leagues;

INSERT INTO public.season_participants (
  season_id,
  user_key,
  active,
  joined_at
)
SELECT
  s.season_id,
  lp.user_key,
  lp.active,
  lp.joined_at
FROM public.league_participants lp
JOIN public.seasons s
  ON s.league_id = lp.league_id
 AND s.year = 2026;

ALTER TABLE public.contests
ADD COLUMN season_id BIGINT REFERENCES public.seasons(season_id);

UPDATE public.contests c
SET season_id = s.season_id
FROM public.seasons s
WHERE s.league_id = c.league_id
  AND s.year = 2026;

ALTER TABLE public.contests
ALTER COLUMN season_id SET NOT NULL;

DROP VIEW public.league_standings;
DROP VIEW public.contest_entry_outcomes;
DROP VIEW public.effective_contest_entries;

DROP INDEX public.contests_league_id_idx;

ALTER TABLE public.contests
DROP COLUMN league_id;

ALTER TABLE public.leagues
DROP COLUMN expected_participant_count;

DROP TABLE public.league_participants;

CREATE INDEX contests_season_id_idx
  ON public.contests(season_id);

CREATE INDEX season_participants_user_key_idx
  ON public.season_participants(user_key);

CREATE TRIGGER seasons_set_updated_at
BEFORE UPDATE ON public.seasons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE VIEW public.effective_contest_entries
WITH (security_invoker = true)
AS
SELECT
  s.league_id,
  s.season_id,
  s.year AS season_year,
  ce.contest_entry_id,
  ce.contest_key,
  ce.user_key,
  ce.entry_key,
  ce.lineup_id,
  ce.draftkings_rank,
  ce.result_source,
  ce.fantasy_points AS source_fantasy_points,
  o.fantasy_points AS override_fantasy_points,
  COALESCE(o.fantasy_points, ce.fantasy_points) AS fantasy_points,
  (o.contest_entry_id IS NOT NULL) AS is_overridden
FROM public.contest_entries ce
JOIN public.contests c ON c.contest_key = ce.contest_key
JOIN public.seasons s ON s.season_id = c.season_id
LEFT JOIN public.contest_entry_overrides o
  ON o.contest_entry_id = ce.contest_entry_id;

CREATE VIEW public.contest_entry_outcomes
WITH (security_invoker = true)
AS
WITH ranked AS (
  SELECT
    e.*,
    row_number() OVER (
      PARTITION BY e.contest_key
      ORDER BY
        CASE WHEN e.result_source = 'missing_default' THEN 1 ELSE 0 END,
        e.fantasy_points DESC,
        e.user_key
    ) AS split_position,
    rank() OVER (
      PARTITION BY e.contest_key
      ORDER BY
        CASE WHEN e.result_source = 'missing_default' THEN 1 ELSE 0 END,
        e.fantasy_points DESC
    ) AS effective_rank,
    count(*) OVER (PARTITION BY e.contest_key) AS participant_count
  FROM public.effective_contest_entries e
),
boundaries AS (
  SELECT
    r.*,
    max(r.fantasy_points) FILTER (
      WHERE r.split_position = (r.participant_count + 1) / 2
    ) OVER (PARTITION BY r.contest_key) AS odd_middle_points,
    max(r.fantasy_points) FILTER (
      WHERE r.split_position = r.participant_count / 2
    ) OVER (PARTITION BY r.contest_key) AS even_upper_middle_points,
    max(r.fantasy_points) FILTER (
      WHERE r.split_position = r.participant_count / 2 + 1
    ) OVER (PARTITION BY r.contest_key) AS even_lower_middle_points
  FROM ranked r
)
SELECT
  b.*,
  CASE
    WHEN b.participant_count % 2 = 1
      AND b.fantasy_points = b.odd_middle_points
      THEN 'TIE'::public.contest_outcome
    WHEN b.participant_count % 2 = 1
      AND b.fantasy_points > b.odd_middle_points
      THEN 'WIN'::public.contest_outcome
    WHEN b.participant_count % 2 = 1
      THEN 'LOSS'::public.contest_outcome
    WHEN b.even_upper_middle_points = b.even_lower_middle_points
      AND b.fantasy_points = b.even_upper_middle_points
      THEN 'TIE'::public.contest_outcome
    WHEN b.split_position <= b.participant_count / 2
      THEN 'WIN'::public.contest_outcome
    ELSE 'LOSS'::public.contest_outcome
  END AS outcome
FROM boundaries b;

CREATE VIEW public.season_standings
WITH (security_invoker = true)
AS
SELECT
  s.league_id,
  s.season_id,
  s.year AS season_year,
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
  p.user_key,
  p.current_user_name;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_participants ENABLE ROW LEVEL SECURITY;
