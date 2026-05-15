-- Run in Supabase → SQL Editor (once) to enable daily parent check-ins.

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  parent_id uuid not null references public.users (id) on delete cascade,
  therapist_id uuid null references public.users (id) on delete set null,
  checkin_date date not null default current_date,
  mood text null check (mood in ('great','good','ok','hard','happy','calm','confused','sad','angry') or mood is null),
  sleep_hours numeric null,
  appetite text null check (appetite in ('high','normal','low') or appetite is null),
  meltdowns integer null,
  notes text null,
  created_at timestamptz not null default now()
);

create unique index if not exists daily_checkins_unique_day on public.daily_checkins (child_id, checkin_date);
create index if not exists daily_checkins_child_date on public.daily_checkins (child_id, checkin_date desc);

alter table public.daily_checkins enable row level security;

-- Note:
-- This project reads/writes via the backend API using the service role key.
-- With RLS enabled and no policies, direct access from the client is blocked by default.

