CREATE TYPE public.contest_result_source AS ENUM (
  'draftkings',
  'missing_default'
);

CREATE TYPE public.contest_outcome AS ENUM (
  'WIN',
  'LOSS',
  'TIE'
);

CREATE TABLE public.leagues (
  league_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.participants (
  user_key TEXT PRIMARY KEY,
  current_user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.league_participants (
  league_id TEXT NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  user_key TEXT NOT NULL REFERENCES public.participants(user_key),
  active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, user_key)
);

CREATE TABLE public.contests (
  contest_key TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES public.leagues(league_id),
  name TEXT NOT NULL,
  draft_group_id BIGINT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contest_entries (
  contest_entry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contest_key TEXT NOT NULL REFERENCES public.contests(contest_key) ON DELETE CASCADE,
  user_key TEXT NOT NULL REFERENCES public.participants(user_key),
  entry_key TEXT UNIQUE,
  lineup_id BIGINT,
  draftkings_rank INTEGER,
  fantasy_points NUMERIC(10, 2) NOT NULL DEFAULT 0,
  result_source public.contest_result_source NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contest_key, user_key),
  UNIQUE (contest_entry_id, contest_key),
  CHECK (draftkings_rank IS NULL OR draftkings_rank > 0),
  CHECK (
    result_source <> 'draftkings'
    OR (entry_key IS NOT NULL AND lineup_id IS NOT NULL AND draftkings_rank IS NOT NULL)
  )
);

CREATE TABLE public.contest_players (
  contest_key TEXT NOT NULL REFERENCES public.contests(contest_key) ON DELETE CASCADE,
  draftable_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  percent_drafted NUMERIC(5, 2) NOT NULL,
  stats_description TEXT NOT NULL,
  fantasy_points NUMERIC(10, 2) NOT NULL,
  player_image TEXT NOT NULL,
  salary INTEGER NOT NULL,
  PRIMARY KEY (contest_key, draftable_id),
  CHECK (percent_drafted >= 0 AND percent_drafted <= 100),
  CHECK (salary >= 0)
);

CREATE TABLE public.entry_rosters (
  contest_entry_id BIGINT NOT NULL,
  contest_key TEXT NOT NULL,
  roster_index SMALLINT NOT NULL,
  draftable_id BIGINT NOT NULL,
  position TEXT NOT NULL,
  PRIMARY KEY (contest_entry_id, roster_index),
  UNIQUE (contest_entry_id, draftable_id),
  FOREIGN KEY (contest_entry_id, contest_key)
    REFERENCES public.contest_entries(contest_entry_id, contest_key)
    ON DELETE CASCADE,
  FOREIGN KEY (contest_key, draftable_id)
    REFERENCES public.contest_players(contest_key, draftable_id)
    ON DELETE CASCADE,
  CHECK (roster_index >= 0)
);

CREATE TABLE public.contest_entry_overrides (
  contest_entry_id BIGINT PRIMARY KEY
    REFERENCES public.contest_entries(contest_entry_id) ON DELETE CASCADE,
  fantasy_points NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contest_entry_override_history (
  override_history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contest_entry_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  previous_fantasy_points NUMERIC(10, 2),
  new_fantasy_points NUMERIC(10, 2),
  previous_reason TEXT,
  new_reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.import_runs (
  import_run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contest_key TEXT NOT NULL REFERENCES public.contests(contest_key) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  draftkings_entry_count INTEGER NOT NULL,
  missing_entry_count INTEGER NOT NULL,
  raw_payload JSONB NOT NULL,
  CHECK (draftkings_entry_count >= 0),
  CHECK (missing_entry_count >= 0)
);

CREATE INDEX contests_league_id_idx
  ON public.contests(league_id);

CREATE INDEX contest_entries_user_key_idx
  ON public.contest_entries(user_key);

CREATE INDEX contest_entries_contest_points_idx
  ON public.contest_entries(contest_key, fantasy_points DESC);

CREATE INDEX import_runs_contest_key_idx
  ON public.import_runs(contest_key, imported_at DESC);

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leagues_set_updated_at
BEFORE UPDATE ON public.leagues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER participants_set_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contests_set_updated_at
BEFORE UPDATE ON public.contests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contest_entries_set_updated_at
BEFORE UPDATE ON public.contest_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contest_entry_overrides_set_updated_at
BEFORE UPDATE ON public.contest_entry_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.audit_contest_entry_override()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contest_entry_override_history (
      contest_entry_id,
      action,
      new_fantasy_points,
      new_reason,
      changed_by
    )
    VALUES (
      NEW.contest_entry_id,
      TG_OP,
      NEW.fantasy_points,
      NEW.reason,
      NEW.updated_by
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.contest_entry_override_history (
      contest_entry_id,
      action,
      previous_fantasy_points,
      new_fantasy_points,
      previous_reason,
      new_reason,
      changed_by
    )
    VALUES (
      NEW.contest_entry_id,
      TG_OP,
      OLD.fantasy_points,
      NEW.fantasy_points,
      OLD.reason,
      NEW.reason,
      NEW.updated_by
    );
    RETURN NEW;
  ELSE
    INSERT INTO public.contest_entry_override_history (
      contest_entry_id,
      action,
      previous_fantasy_points,
      previous_reason,
      changed_by
    )
    VALUES (
      OLD.contest_entry_id,
      TG_OP,
      OLD.fantasy_points,
      OLD.reason,
      OLD.updated_by
    );
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER contest_entry_overrides_audit
AFTER INSERT OR UPDATE OR DELETE ON public.contest_entry_overrides
FOR EACH ROW EXECUTE FUNCTION public.audit_contest_entry_override();

CREATE VIEW public.effective_contest_entries
WITH (security_invoker = true)
AS
SELECT
  c.league_id,
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
      ORDER BY e.fantasy_points DESC, e.user_key
    ) AS split_position,
    rank() OVER (
      PARTITION BY e.contest_key
      ORDER BY e.fantasy_points DESC
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

CREATE VIEW public.league_standings
WITH (security_invoker = true)
AS
SELECT
  lp.league_id,
  p.user_key,
  p.current_user_name AS participant_name,
  count(o.contest_key) FILTER (WHERE o.outcome = 'WIN')::INTEGER AS wins,
  count(o.contest_key) FILTER (WHERE o.outcome = 'LOSS')::INTEGER AS losses,
  count(o.contest_key) FILTER (WHERE o.outcome = 'TIE')::INTEGER AS ties,
  COALESCE(sum(o.fantasy_points), 0)::NUMERIC(12, 2) AS total_points
FROM public.league_participants lp
JOIN public.participants p ON p.user_key = lp.user_key
LEFT JOIN public.contest_entry_outcomes o
  ON o.league_id = lp.league_id
 AND o.user_key = lp.user_key
GROUP BY lp.league_id, p.user_key, p.current_user_name;

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_entry_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_entry_override_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
