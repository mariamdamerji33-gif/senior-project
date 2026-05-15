-- Run in Supabase SQL Editor if daily check-in mood saves fail because of the old mood check constraint.
alter table public.daily_checkins
  drop constraint if exists daily_checkins_mood_check;

alter table public.daily_checkins
  add constraint daily_checkins_mood_check
  check (
    mood in ('great', 'good', 'ok', 'hard', 'happy', 'calm', 'confused', 'sad', 'angry')
    or mood is null
  );
