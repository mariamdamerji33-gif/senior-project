-- -----------------------------------------------------------------------------
-- Student profile photo (object path inside Storage bucket student-documents)
-- -----------------------------------------------------------------------------
alter table public.children add column if not exists profile_photo_storage_path text null;

comment on column public.children.profile_photo_storage_path is
  'Path in student-documents bucket, e.g. students/<childId>/profile_<ts>.jpg';
