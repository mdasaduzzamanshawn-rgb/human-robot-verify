-- Human or Robot? — Supabase schema. Run once in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  nickname text check (nickname is null or char_length(nickname) <= 30),
  declared_identity text not null check (declared_identity in ('Human','Robot')),
  verified_identity text not null check (verified_identity in ('Human','Robot')),
  verification_score integer not null check (verification_score between 0 and 100),
  verification_answers jsonb not null,
  blind_game_answers jsonb not null,
  final_category text not null,
  final_description text not null,
  photo_path text,
  ip_hash text,                      -- salted hash used only for the hourly spam limit
  created_at timestamptz not null default now()
);
create index if not exists submissions_created_idx on public.submissions (created_at desc);
create index if not exists submissions_ip_idx on public.submissions (ip_hash, created_at desc);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Row Level Security: enabled with NO policies for anon/authenticated = no access at all.
-- Only the server (Cloudflare Functions using the secret key) can read or write.
alter table public.submissions enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.submissions from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

-- Private photo bucket (no public URLs, no storage policies => only the server can touch files).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submission-photos', 'submission-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];
