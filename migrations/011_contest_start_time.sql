ALTER TABLE public.contests
  ADD COLUMN contest_start_time TIMESTAMPTZ;

COMMENT ON COLUMN public.contests.contest_start_time IS
  'Scheduled DraftKings start time. Null only for contests imported before this column existed.';
