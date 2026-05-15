-- Student Profile upgrades: documents + emergency contacts
-- Run in Supabase SQL editor (once).

-- Emergency / school contacts for a student
create table if not exists student_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  name text not null,
  relation text null,
  phone text null,
  email text null,
  notes text null,
  is_emergency boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_contacts_child_id on student_contacts(child_id);

-- Uploaded documents (metadata). Actual file is stored in Supabase Storage.
create table if not exists student_documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  title text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  storage_bucket text not null default 'student-documents',
  storage_path text not null,
  uploaded_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_documents_child_id on student_documents(child_id);
create index if not exists idx_student_documents_created_at on student_documents(created_at desc);

