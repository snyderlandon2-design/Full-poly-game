-- PolyClash Arena database
-- Run this in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  points integer not null default 500,
  level integer not null default 1,
  xp integer not null default 0,
  selected_char integer not null default 0,
  unlocked integer[] not null default array[0],
  fighter_levels integer[] not null default array_fill(1, ARRAY[20]),
  wins integer not null default 0,
  losses integer not null default 0,
  private_room_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  powers jsonb not null default '{}'::jsonb
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.rooms enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_roles where user_id=auth.uid()); $$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_roles where user_id=auth.uid() and role='owner'); $$;

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles for select using (id=auth.uid() or public.is_admin());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id=auth.uid());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (id=auth.uid());

drop policy if exists "admin roles owner read" on public.admin_roles;
create policy "admin roles owner read" on public.admin_roles for select using (user_id=auth.uid() or public.is_owner());

drop policy if exists "rooms read" on public.rooms;
create policy "rooms read" on public.rooms for select using (is_public or owner_id=auth.uid() or public.is_admin());

drop policy if exists "rooms create" on public.rooms;
create policy "rooms create" on public.rooms for insert with check (owner_id=auth.uid());

drop policy if exists "rooms delete owner" on public.rooms;
create policy "rooms delete owner" on public.rooms for delete using (owner_id=auth.uid() or public.is_owner());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,username)
  values(new.id, coalesce(new.raw_user_meta_data->>'username','Player_'||substr(new.id::text,1,6)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- IMPORTANT:
-- After creating YOUR account, put its UUID here:
-- insert into public.admin_roles(user_id,role,powers) values('YOUR-USER-UUID','owner','{"godMode":true,"infiniteStamina":true,"doubleDamage":true,"speed":true}');
-- For Niles/Hudson, create their accounts first, then add their UUIDs as role='admin'.
-- Do not store or publish their passwords/codes.
