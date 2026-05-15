-- Run in Supabase → SQL Editor (once) to enable therapist "Steps for Parents".

create table if not exists public.parent_steps (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  therapist_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body text not null,
  category text null,
  created_at timestamptz not null default now()
);

create index if not exists parent_steps_child_created on public.parent_steps (child_id, created_at desc);

alter table public.parent_steps enable row level security;

-- Note: backend uses service role key; RLS has no policies by default.

