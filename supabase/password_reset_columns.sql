-- -----------------------------------------------------------------------------
-- Password reset (website staff). Run in Supabase SQL Editor after core users table exists.
-- Stores a hashed token + expiry on public.users until the user sets a new password.
-- -----------------------------------------------------------------------------
alter table public.users add column if not exists password_reset_token_hash text null;
alter table public.users add column if not exists password_reset_expires_at timestamptz null;

create index if not exists idx_users_password_reset_hash
  on public.users (password_reset_token_hash)
  where password_reset_token_hash is not null;
