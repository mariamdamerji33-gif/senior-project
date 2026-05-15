-- Pending account requests (public signup → School Admin approves in dashboard).
-- Run once in the Supabase SQL editor.

create table if not exists registration_requests (
  id uuid primary key default gen_random_uuid(),
  name text null,
  email text not null,
  password_hash text not null,
  requested_role text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid null references users(id) on delete set null
);

create index if not exists idx_registration_requests_status_created
  on registration_requests (status, created_at desc);

-- At most one open request per email (normalized to lowercase in the app).
create unique index if not exists idx_registration_requests_pending_email
  on registration_requests (lower(trim(email)))
  where status = 'pending';
