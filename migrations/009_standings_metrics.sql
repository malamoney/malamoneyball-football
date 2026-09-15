DROP VIEW public.season_standings;

CREATE VIEW public.season_standings
WITH (security_invoker = true)
AS
WITH outcome_history AS (
  SELECT
    o.*,
    c.created_at AS contest_created_at,
    first_value(o.outcome::TEXT) OVER (
      PARTITION BY o.season_id, o.user_key
      ORDER BY c.created_at DESC, c.contest_key DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS latest_outcome
  FROM public.contest_entry_outcomes o
  JOIN public.contests c ON c.contest_key = o.contest_key
),
streak_history AS (
  SELECT
    h.*,
    sum(
      CASE WHEN h.outcome::TEXT = h.latest_outcome THEN 0 ELSE 1 END
    ) OVER (
      PARTITION BY h.season_id, h.user_key
      ORDER BY h.contest_created_at DESC, h.contest_key DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS prior_outcome_changes
  FROM outcome_history h
),
current_streaks AS (
  SELECT
    season_id,
    user_key,
    latest_outcome,
    count(*)::INTEGER AS streak_length
  FROM streak_history
  WHERE prior_outcome_changes = 0
  GROUP BY season_id, user_key, latest_outcome
)
SELECT
  s.league_id,
  s.season_id,
  s.name AS season_name,
  p.user_key,
  p.current_user_name AS participant_name,
  count(o.contest_key) FILTER (WHERE o.outcome = 'WIN')::INTEGER AS wins,
  count(o.contest_key) FILTER (WHERE o.outcome = 'LOSS')::INTEGER AS losses,
  count(o.contest_key) FILTER (WHERE o.outcome = 'TIE')::INTEGER AS ties,
  COALESCE(sum(o.fantasy_points), 0)::NUMERIC(12, 2) AS total_points,
  COALESCE(max(o.fantasy_points), 0)::NUMERIC(10, 2) AS high_score,
  COALESCE(avg(o.fantasy_points), 0)::NUMERIC(12, 2) AS average_score,
  CASE
    WHEN cs.streak_length IS NULL THEN '0'
    ELSE cs.streak_length::TEXT || CASE cs.latest_outcome
      WHEN 'WIN' THEN 'W'
      WHEN 'LOSS' THEN 'L'
      ELSE 'T'
    END
  END AS streak
FROM public.season_participants sp
JOIN public.seasons s ON s.season_id = sp.season_id
JOIN public.participants p ON p.user_key = sp.user_key
LEFT JOIN public.contest_entry_outcomes o
  ON o.season_id = sp.season_id
 AND o.user_key = sp.user_key
LEFT JOIN current_streaks cs
  ON cs.season_id = sp.season_id
 AND cs.user_key = sp.user_key
WHERE sp.active = true
GROUP BY
  s.league_id,
  s.season_id,
  s.name,
  p.user_key,
  p.current_user_name,
  cs.latest_outcome,
  cs.streak_length;
