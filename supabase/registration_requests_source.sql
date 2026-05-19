-- Optional: run in Supabase SQL editor if registration_requests already exists without source.
-- New installs: registration_requests.sql and run_all.sql include registration_source.

alter table public.registration_requests
  add column if not exists registration_source text not null default 'website'
  check (registration_source in ('mobile', 'website'));

update public.registration_requests
set registration_source = 'mobile'
where requested_role = 'parent' and registration_source = 'website';
