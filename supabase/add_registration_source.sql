-- Optional: run once if registration_requests already exists without registration_source.
alter table public.registration_requests
  add column if not exists registration_source text not null default 'website'
  check (registration_source in ('mobile', 'website'));

update public.registration_requests
set registration_source = case when requested_role = 'parent' then 'mobile' else 'website' end
where registration_source = 'website' and requested_role = 'parent';
