-- Run once in Supabase → SQL Editor if inserts fail with:
--   "violates check constraint sessions_status_check"
-- The app uses: scheduled, confirmed, completed, cancelled.

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled'));
