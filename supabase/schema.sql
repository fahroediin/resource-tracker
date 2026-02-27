-- ============================================
-- BA Resource Tracker — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'head', 'member')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete profiles"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Members (BA team)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'BA',
  status text not null default 'Available',
  email text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

create policy "Members viewable by authenticated"
  on public.members for select
  using (auth.role() = 'authenticated');

create policy "Head and admin can insert members"
  on public.members for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

create policy "Head and admin can update members"
  on public.members for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

create policy "Head and admin can delete members"
  on public.members for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

-- 3. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority text not null default 'Medium',
  status text not null default 'Active',
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Projects viewable by authenticated"
  on public.projects for select
  using (auth.role() = 'authenticated');

create policy "Head and admin can insert projects"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

create policy "Head and admin can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

create policy "Head and admin can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

-- 4. Project Assignments
create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  allocation integer not null default 50 check (allocation >= 0 and allocation <= 100),
  unique(project_id, member_id)
);

alter table public.project_assignments enable row level security;

create policy "Assignments viewable by authenticated"
  on public.project_assignments for select
  using (auth.role() = 'authenticated');

create policy "Head and admin can manage assignments"
  on public.project_assignments for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

-- 5. Member Skills
create table if not exists public.member_skills (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  skill_name text not null,
  level integer not null default 0 check (level >= 0 and level <= 5),
  unique(member_id, skill_name)
);

alter table public.member_skills enable row level security;

create policy "Skills viewable by authenticated"
  on public.member_skills for select
  using (auth.role() = 'authenticated');

create policy "Head and admin can manage skills"
  on public.member_skills for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

-- 6. Activity Log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "Activity log viewable by admin and head"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'head')
    )
  );

create policy "Authenticated users can insert logs"
  on public.activity_log for insert
  with check (auth.role() = 'authenticated');
