ALTER TABLE public.leagues
ADD COLUMN expected_participant_count INTEGER NOT NULL DEFAULT 14
CHECK (expected_participant_count > 1);
