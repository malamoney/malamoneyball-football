BEGIN;

INSERT INTO public.leagues (league_id, name)
VALUES ('__verification__', 'Database verification');

INSERT INTO public.seasons (
  league_id,
  year,
  expected_participant_count
)
VALUES
  ('__verification__', 2026, 14),
  ('__verification__', 2027, 14);

INSERT INTO public.participants (user_key, current_user_name)
SELECT
  '__verification_user_' || participant_number,
  'Verification User ' || participant_number
FROM generate_series(1, 14) AS participant_number;

INSERT INTO public.season_participants (season_id, user_key)
SELECT
  s.season_id,
  '__verification_user_' || participant_number
FROM public.seasons s
CROSS JOIN generate_series(1, 14) AS participant_number
WHERE s.league_id = '__verification__'
  AND s.year IN (2026, 2027);

INSERT INTO public.contests (
  contest_key,
  season_id,
  name,
  draft_group_id,
  fetched_at
)
SELECT
  contest_key,
  s.season_id,
  contest_name,
  draft_group_id,
  now()
FROM public.seasons s
CROSS JOIN (
  VALUES
    ('__verification_even__', 'Even field', 1),
    ('__verification_tie__', 'Even boundary tie', 2),
    ('__verification_odd__', 'Odd field', 3),
    ('__verification_override__', 'Manual override', 4)
) AS verification_contests(contest_key, contest_name, draft_group_id)
WHERE s.league_id = '__verification__'
  AND s.year = 2026;

INSERT INTO public.contest_entries (
  contest_key,
  user_key,
  entry_key,
  lineup_id,
  draftkings_rank,
  fantasy_points,
  result_source
)
SELECT
  '__verification_even__',
  '__verification_user_' || participant_number,
  CASE
    WHEN participant_number = 14 THEN NULL
    ELSE '__verification_even_entry_' || participant_number
  END,
  CASE
    WHEN participant_number = 14 THEN NULL
    ELSE participant_number
  END,
  CASE
    WHEN participant_number = 14 THEN NULL
    ELSE participant_number
  END,
  CASE
    WHEN participant_number = 14 THEN 0
    WHEN participant_number = 13 THEN -5
    ELSE 100 - participant_number
  END,
  CASE
    WHEN participant_number = 14
      THEN 'missing_default'::public.contest_result_source
    ELSE 'draftkings'::public.contest_result_source
  END
FROM generate_series(1, 14) AS participant_number;

INSERT INTO public.contest_entries (
  contest_key,
  user_key,
  entry_key,
  lineup_id,
  draftkings_rank,
  fantasy_points,
  result_source
)
SELECT
  '__verification_tie__',
  '__verification_user_' || participant_number,
  '__verification_tie_entry_' || participant_number,
  100 + participant_number,
  participant_number,
  CASE
    WHEN participant_number IN (7, 8) THEN 92.5
    ELSE 100 - participant_number
  END,
  'draftkings'
FROM generate_series(1, 14) AS participant_number;

INSERT INTO public.contest_entries (
  contest_key,
  user_key,
  entry_key,
  lineup_id,
  draftkings_rank,
  fantasy_points,
  result_source
)
SELECT
  '__verification_odd__',
  '__verification_user_' || participant_number,
  '__verification_odd_entry_' || participant_number,
  200 + participant_number,
  participant_number,
  100 - participant_number,
  'draftkings'
FROM generate_series(1, 13) AS participant_number;

INSERT INTO public.contest_entries (
  contest_key,
  user_key,
  entry_key,
  lineup_id,
  draftkings_rank,
  fantasy_points,
  result_source
)
SELECT
  '__verification_override__',
  '__verification_user_' || participant_number,
  CASE
    WHEN participant_number = 14 THEN NULL
    ELSE '__verification_override_entry_' || participant_number
  END,
  CASE
    WHEN participant_number = 14 THEN NULL
    ELSE 300 + participant_number
  END,
  CASE
    WHEN participant_number = 14 THEN NULL
    ELSE participant_number
  END,
  CASE
    WHEN participant_number = 14 THEN 0
    ELSE 100 - participant_number
  END,
  CASE
    WHEN participant_number = 14
      THEN 'missing_default'::public.contest_result_source
    ELSE 'draftkings'::public.contest_result_source
  END
FROM generate_series(1, 14) AS participant_number;

INSERT INTO public.contest_entry_overrides (
  contest_entry_id,
  fantasy_points,
  reason
)
SELECT contest_entry_id, 200, 'Database verification'
FROM public.contest_entries
WHERE contest_key = '__verification_override__'
  AND user_key = '__verification_user_14';

DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.contest_entry_outcomes
    WHERE contest_key = '__verification_even__' AND outcome = 'WIN'
  ) <> 7 THEN
    RAISE EXCEPTION 'Even contest should have 7 wins';
  END IF;

  IF (
    SELECT count(*) FROM public.contest_entry_outcomes
    WHERE contest_key = '__verification_even__' AND outcome = 'LOSS'
  ) <> 7 THEN
    RAISE EXCEPTION 'Even contest should have 7 losses';
  END IF;

  IF (
    SELECT split_position FROM public.contest_entry_outcomes
    WHERE contest_key = '__verification_even__'
      AND user_key = '__verification_user_14'
  ) <> 14 THEN
    RAISE EXCEPTION 'A default missing entry must be placed last';
  END IF;

  IF (
    SELECT count(*) FROM public.contest_entry_outcomes
    WHERE contest_key = '__verification_tie__' AND outcome = 'TIE'
  ) <> 2 THEN
    RAISE EXCEPTION 'Even boundary tie should have 2 ties';
  END IF;

  IF (
    SELECT count(*) FROM public.contest_entry_outcomes
    WHERE contest_key = '__verification_odd__' AND outcome = 'TIE'
  ) <> 1 THEN
    RAISE EXCEPTION 'Odd contest should have 1 tie';
  END IF;

  IF (
    SELECT effective_rank FROM public.contest_entry_outcomes
    WHERE contest_key = '__verification_override__'
      AND user_key = '__verification_user_14'
  ) <> 1 THEN
    RAISE EXCEPTION 'Manual override should recalculate effective rank';
  END IF;

  IF (
    SELECT count(*) FROM public.contest_entry_override_history
    WHERE action = 'INSERT'
      AND new_fantasy_points = 200
  ) <> 1 THEN
    RAISE EXCEPTION 'Manual override should create an audit record';
  END IF;

  IF (
    SELECT count(*)
    FROM public.season_standings
    WHERE league_id = '__verification__'
      AND season_year = 2027
      AND wins = 0
      AND losses = 0
      AND ties = 0
      AND total_points = 0
  ) <> 14 THEN
    RAISE EXCEPTION 'A new season should begin with zeroed standings';
  END IF;

  IF (
    SELECT count(*)
    FROM public.season_standings
    WHERE league_id = '__verification__'
      AND season_year = 2026
      AND wins + losses + ties > 0
  ) <> 14 THEN
    RAISE EXCEPTION 'The prior season should retain its contest outcomes';
  END IF;
END;
$$;

ROLLBACK;
