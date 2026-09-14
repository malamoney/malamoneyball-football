DROP VIEW public.season_standings;
DROP VIEW public.contest_entry_outcomes;
DROP VIEW public.effective_contest_entries;

DROP INDEX public.seasons_league_name_idx;

ALTER TABLE public.seasons
DROP CONSTRAINT seasons_league_id_year_key;

ALTER TABLE public.seasons
ADD CONSTRAINT seasons_league_id_name_key UNIQUE (league_id, name);

ALTER TABLE public.seasons
DROP COLUMN year;

CREATE VIEW public.effective_contest_entries
WITH (security_invoker = true)
AS
SELECT
  s.league_id,
  s.season_id,
  s.name AS season_name,
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
        CASE
          WHEN e.result_source = 'missing_default' AND NOT e.is_overridden
            THEN 1
          ELSE 0
        END,
        e.fantasy_points DESC,
        e.user_key
    ) AS split_position,
    rank() OVER (
      PARTITION BY e.contest_key
      ORDER BY
        CASE
          WHEN e.result_source = 'missing_default' AND NOT e.is_overridden
            THEN 1
          ELSE 0
        END,
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
      AND NOT (
        b.result_source = 'missing_default'
        AND NOT b.is_overridden
      )
      THEN 'TIE'::public.contest_outcome
    WHEN b.participant_count % 2 = 1
      AND b.split_position < (b.participant_count + 1) / 2
      THEN 'WIN'::public.contest_outcome
    WHEN b.participant_count % 2 = 1
      THEN 'LOSS'::public.contest_outcome
    WHEN b.even_upper_middle_points = b.even_lower_middle_points
      AND b.fantasy_points = b.even_upper_middle_points
      AND NOT (
        b.result_source = 'missing_default'
        AND NOT b.is_overridden
      )
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
  s.name,
  p.user_key,
  p.current_user_name;
