create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  source text not null default 'chat',
  email_thread_id text,
  created_at timestamptz not null default now()
);

alter table public.conversations
  add column if not exists source text not null default 'chat';
alter table public.conversations
  add column if not exists email_thread_id text;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "own conversations" on public.conversations;
create policy "own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  job_title text
);

alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (auth.uid() = id);

create or replace function public.sync_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, job_title)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'job_title'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    job_title = excluded.job_title;
  return new;
end; $$;

drop trigger if exists on_auth_user_change on auth.users;
create trigger on_auth_user_change
  after insert or update on auth.users
  for each row execute function public.sync_profile();

insert into public.profiles (id, email, full_name, job_title)
select id, email, raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'job_title'
from auth.users
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  job_title = excluded.job_title;
