-- -----------------------------------------------------------------------------
-- Signed-in account profile (web + mobile): phone, optional birthday, avatar
-- Storage: bucket student-documents, path users/<user id>/profile_*.jpg|png|webp
-- -----------------------------------------------------------------------------
alter table public.users add column if not exists phone text null;
alter table public.users add column if not exists birth_date date null;
alter table public.users add column if not exists profile_photo_storage_path text null;
