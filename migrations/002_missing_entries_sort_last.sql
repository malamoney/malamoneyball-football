CREATE OR REPLACE VIEW public.contest_entry_outcomes
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
