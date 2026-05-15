-- Run in Supabase → SQL Editor (once) to enable treatment plans & goals.

create table if not exists public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  therapist_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  notes text null,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  start_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treatment_plans_child on public.treatment_plans (child_id, created_at desc);
create index if not exists treatment_plans_therapist on public.treatment_plans (therapist_id, created_at desc);

create table if not exists public.treatment_goals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.treatment_plans (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  therapist_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  target text null,
  baseline text null,
  status text not null default 'active' check (status in ('active', 'achieved', 'paused')),
  due_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treatment_goals_plan on public.treatment_goals (plan_id, created_at desc);
create index if not exists treatment_goals_child on public.treatment_goals (child_id, created_at desc);

alter table public.treatment_plans enable row level security;
alter table public.treatment_goals enable row level security;

-- Note:
-- This project performs all reads/writes via the backend API using the service role key.
-- With RLS enabled and no policies, direct access from the client is blocked by default (safer).

