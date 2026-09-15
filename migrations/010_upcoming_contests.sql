CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE FUNCTION public.next_upcoming_contest_expiration()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  WITH local_time AS (
    SELECT timezone('America/New_York', now()) AS local_now
  ), expiration AS (
    SELECT
      local_now,
      date_trunc('week', local_now) + interval '6 days 13 hours' AS sunday_at_one
    FROM local_time
  )
  SELECT (
    CASE
      WHEN local_now < sunday_at_one THEN sunday_at_one
      ELSE sunday_at_one + interval '7 days'
    END
  ) AT TIME ZONE 'America/New_York'
  FROM expiration;
$$;

CREATE TABLE public.upcoming_contests (
  upcoming_contest_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES public.seasons(season_id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  contest_url TEXT NOT NULL CHECK (
    contest_url ~ '^https://([a-z0-9-]+\.)*draftkings\.com(/|$)'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT public.next_upcoming_contest_expiration(),
  UNIQUE (season_id, contest_url)
);

CREATE INDEX upcoming_contests_season_expiration_idx
  ON public.upcoming_contests(season_id, expires_at DESC);

ALTER TABLE public.upcoming_contests ENABLE ROW LEVEL SECURITY;

SELECT cron.schedule(
  'delete-expired-upcoming-contests',
  '0 * * * *',
  $cron$
    DELETE FROM public.upcoming_contests
    WHERE expires_at <= now();
  $cron$
);
