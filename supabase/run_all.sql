-- =============================================================================
-- RUN ALL (Supabase → SQL Editor): schema add-ons + optional demo seed
-- =============================================================================
-- PREREQUISITE: Your project already has core tables, e.g.:
--   public.users, public.children, public.sessions, public.activities,
--   public.progress, public.reports
-- If those do not exist, create them from your main schema first; then run this.
--
-- ORDER: feature tables → session fix → registration → demo data (last).
-- Safe to re-run: uses IF NOT EXISTS / idempotent inserts where possible.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Student profile: contacts + documents
-- ---------------------------------------------------------------------------
create table if not exists public.student_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  name text not null,
  relation text null,
  phone text null,
  email text null,
  notes text null,
  is_emergency boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_contacts_child_id on public.student_contacts(child_id);

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  storage_bucket text not null default 'student-documents',
  storage_path text not null,
  uploaded_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_documents_child_id on public.student_documents(child_id);
create index if not exists idx_student_documents_created_at on public.student_documents(created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Chat messages
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  sender_role text not null check (sender_role in ('parent', 'therapist', 'super_admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_child_created on public.chat_messages (child_id, created_at);

alter table public.chat_messages enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Treatment plans + goals
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4) Parent steps (home steps for families)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5) Daily check-ins
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6) Sessions status constraint (fix if inserts fail on old check)
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled'));

-- ---------------------------------------------------------------------------
-- 7) Registration requests (public signup → School Admin approves)
-- ---------------------------------------------------------------------------
create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  name text null,
  email text not null,
  password_hash text not null,
  requested_role text not null,
  registration_source text not null default 'website' check (registration_source in ('mobile', 'website')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid null references public.users(id) on delete set null
);

create index if not exists idx_registration_requests_status_created
  on public.registration_requests (status, created_at desc);

create unique index if not exists idx_registration_requests_pending_email
  on public.registration_requests (lower(trim(email)))
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- 8) OPTIONAL demo data (skip this block for production, or edit emails first)
--     Password for all demo users: demo1234
-- ---------------------------------------------------------------------------
INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Super Admin', 'admin@demo.com', 'demo1234', 'super_admin', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@demo.com');

INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Manager', 'manager@demo.com', 'demo1234', 'manager', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'manager@demo.com');

INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Therapist', 'therapist@demo.com', 'demo1234', 'therapist', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'therapist@demo.com');

INSERT INTO public.users (name, email, password, role, created_at)
SELECT 'Demo Parent', 'parent@demo.com', 'demo1234', 'parent', now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'parent@demo.com');

INSERT INTO public.children (name, age, diagnosis, parent_id, therapist_id)
SELECT
  'Ali',
  7,
  'ASD',
  p.id,
  t.id
FROM public.users p
CROSS JOIN public.users t
WHERE p.email = 'parent@demo.com'
  AND t.email = 'therapist@demo.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.children c
    JOIN public.users pp ON pp.id = c.parent_id
    WHERE pp.email = 'parent@demo.com' AND c.name = 'Ali'
  );

INSERT INTO public.activities (title, description, created_by)
SELECT
  'Visual schedule',
  'Morning routine with picture cards.',
  t.id
FROM public.users t
WHERE t.email = 'therapist@demo.com'
  AND NOT EXISTS (SELECT 1 FROM public.activities WHERE title = 'Visual schedule');

INSERT INTO public.progress (child_id, activity_id, score, date)
SELECT c.id, a.id, 8, CURRENT_DATE
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
JOIN public.activities a ON a.title = 'Visual schedule'
JOIN public.users th ON th.id = c.therapist_id
WHERE p.email = 'parent@demo.com'
  AND th.email = 'therapist@demo.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.progress pr WHERE pr.child_id = c.id AND pr.activity_id = a.id
  );

INSERT INTO public.reports (child_id, therapist_id, notes, progress_score, created_at)
SELECT
  c.id,
  t.id,
  'Good engagement during structured play. Continue visual supports.',
  7,
  now()
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
JOIN public.users t ON t.id = c.therapist_id
WHERE p.email = 'parent@demo.com'
  AND t.email = 'therapist@demo.com'
  AND c.name = 'Ali'
  AND NOT EXISTS (
    SELECT 1 FROM public.reports r WHERE r.child_id = c.id AND r.notes LIKE 'Good engagement%'
  );

INSERT INTO public.sessions (child_id, therapist_id, date, status)
SELECT
  c.id,
  t.id,
  (now() + interval '2 days')::timestamptz,
  'scheduled'
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
JOIN public.users t ON t.id = c.therapist_id
WHERE p.email = 'parent@demo.com'
  AND t.email = 'therapist@demo.com'
  AND c.name = 'Ali'
  AND NOT EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.child_id = c.id AND s.status = 'scheduled'
  );

INSERT INTO public.chat_messages (child_id, sender_id, sender_role, body, created_at)
SELECT
  c.id,
  p.id,
  'parent',
  'Hello, we practiced the schedule this morning.',
  now()
FROM public.children c
JOIN public.users p ON p.id = c.parent_id
WHERE p.email = 'parent@demo.com'
  AND c.name = 'Ali'
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_messages m WHERE m.child_id = c.id AND m.body LIKE 'Hello, we practiced%'
  );

-- ---------------------------------------------------------------------------
-- Student profile photo path (Storage bucket: student-documents)
-- ---------------------------------------------------------------------------
alter table public.children add column if not exists profile_photo_storage_path text null;

-- ---------------------------------------------------------------------------
-- Password reset tokens (staff website sign-in)
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists password_reset_token_hash text null;
alter table public.users add column if not exists password_reset_expires_at timestamptz null;

create index if not exists idx_users_password_reset_hash
  on public.users (password_reset_token_hash)
  where password_reset_token_hash is not null;

-- ---------------------------------------------------------------------------
-- Signed-in account (users): phone, birthday, avatar in student-documents
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists phone text null;
alter table public.users add column if not exists birth_date date null;
alter table public.users add column if not exists profile_photo_storage_path text null;

-- =============================================================================
-- Done. If any step failed: fix the error (often missing core table/column),
-- then re-run from the failed section or use the smaller files under supabase/.
-- =============================================================================
