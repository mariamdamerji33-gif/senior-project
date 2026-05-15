-- Run in Supabase → SQL Editor (once) to enable persisted chat.

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
