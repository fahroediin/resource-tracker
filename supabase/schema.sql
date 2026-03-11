-- ============================================
-- BA Resource Tracker — Supabase Schema (V2 Multi-Tenant)
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 0: Drop old RLS policies on EXISTING tables only
-- (divisions & division_settings are new — no drop needed)
-- ============================================
drop policy if exists "Public profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins and Head can update profiles in their division" on public.profiles;

drop policy if exists "Members viewable by division or superadmin" on public.members;
drop policy if exists "Head/Admin can insert members" on public.members;
drop policy if exists "Head/Admin can update members" on public.members;
drop policy if exists "Head/Admin can delete members" on public.members;
drop policy if exists "Authenticated users can view members" on public.members;
drop policy if exists "Admin/Head can insert members" on public.members;
drop policy if exists "Admin/Head can update members" on public.members;
drop policy if exists "Admin/Head can delete members" on public.members;

drop policy if exists "Projects viewable by division or superadmin" on public.projects;
drop policy if exists "Head/Admin can insert projects" on public.projects;
drop policy if exists "Head/Admin can update projects" on public.projects;
drop policy if exists "Head/Admin can delete projects" on public.projects;
drop policy if exists "Authenticated users can view projects" on public.projects;
drop policy if exists "Admin/Head can insert projects" on public.projects;
drop policy if exists "Admin/Head can update projects" on public.projects;
drop policy if exists "Admin/Head can delete projects" on public.projects;

drop policy if exists "Assignments viewable by division or superadmin" on public.project_assignments;
drop policy if exists "Head/Admin can manage assignments" on public.project_assignments;
drop policy if exists "Authenticated users can view assignments" on public.project_assignments;
drop policy if exists "Admin/Head can manage project assignments" on public.project_assignments;

drop policy if exists "Skills viewable by division or superadmin" on public.member_skills;
drop policy if exists "Head/Admin can manage skills" on public.member_skills;
drop policy if exists "Authenticated users can view skills" on public.member_skills;
drop policy if exists "Admin/Head can manage skills" on public.member_skills;

drop policy if exists "Logs viewable by division head/admin or superadmin" on public.activity_log;
drop policy if exists "Users can insert logs for their division" on public.activity_log;
drop policy if exists "Authenticated users can view activity log" on public.activity_log;
drop policy if exists "Authenticated users can insert logs" on public.activity_log;

-- ============================================
-- STEP 1: Create / alter tables
-- ============================================

-- Divisions (Tenants)
create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.divisions enable row level security;

-- Division Settings
create table if not exists public.division_settings (
  division_id uuid primary key references public.divisions(id) on delete cascade,
  phases jsonb not null default '[]'::jsonb,
  statuses jsonb not null default '[]'::jsonb,
  capacity_active_phases jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.division_settings enable row level security;

-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  role text not null default 'member',
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists division_id uuid references public.divisions(id) on delete set null;
-- Update role constraint to include superadmin
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('superadmin', 'admin', 'head', 'member'));
alter table public.profiles enable row level security;

-- Members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Staff',
  status text not null default 'Available',
  email text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.members add column if not exists division_id uuid references public.divisions(id) on delete cascade;
alter table public.members enable row level security;

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  type text not null default 'Internal' check (type in ('Internal', 'External', 'POC')),
  priority text not null default 'Medium',
  status text not null default 'Active',
  phase text not null default 'Planning',
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.projects add column if not exists division_id uuid references public.divisions(id) on delete cascade;
alter table public.projects enable row level security;

-- Project Assignments
create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  allocation integer not null default 50 check (allocation >= 0 and allocation <= 100),
  unique(project_id, member_id)
);
alter table public.project_assignments enable row level security;

-- Member Skills
create table if not exists public.member_skills (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  skill_name text not null,
  level integer not null default 0 check (level >= 0 and level <= 5),
  unique(member_id, skill_name)
);
alter table public.member_skills enable row level security;

-- Activity Log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);
alter table public.activity_log add column if not exists division_id uuid references public.divisions(id) on delete cascade;
alter table public.activity_log enable row level security;

-- ============================================
-- STEP 2: Recreate RLS Policies
-- ============================================

-- divisions
create policy "Divisions viewable by authenticated"
  on public.divisions for select using (auth.role() = 'authenticated');

create policy "Superadmin can manage divisions"
  on public.divisions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

-- division_settings
create policy "Settings viewable by members of division"
  on public.division_settings for select using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and (division_id = public.division_settings.division_id or role = 'superadmin'))
  );

create policy "Head and Admin can update settings"
  on public.division_settings for update using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.division_settings.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

create policy "Head and Admin can insert settings"
  on public.division_settings for insert with check (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.division_settings.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

-- profiles
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins and Head can update profiles in their division"
  on public.profiles for update using (
    exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid()
        and (p2.role = 'superadmin'
             or (p2.role in ('admin', 'head') and p2.division_id = public.profiles.division_id))
    )
  );

-- members
create policy "Members viewable by division or superadmin"
  on public.members for select using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and (division_id = public.members.division_id or role = 'superadmin'))
  );

create policy "Head/Admin can insert members"
  on public.members for insert with check (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.members.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

create policy "Head/Admin can update members"
  on public.members for update using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.members.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

create policy "Head/Admin can delete members"
  on public.members for delete using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.members.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

-- projects
create policy "Projects viewable by division or superadmin"
  on public.projects for select using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and (division_id = public.projects.division_id or role = 'superadmin'))
  );

create policy "Head/Admin can insert projects"
  on public.projects for insert with check (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.projects.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

create policy "Head/Admin can update projects"
  on public.projects for update using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.projects.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

create policy "Head/Admin can delete projects"
  on public.projects for delete using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.projects.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

-- project_assignments
create policy "Assignments viewable by division or superadmin"
  on public.project_assignments for select using (
    exists (
      select 1 from public.projects p
      join public.profiles u on u.id = auth.uid()
      where p.id = project_assignments.project_id
        and (p.division_id = u.division_id or u.role = 'superadmin')
    )
  );

create policy "Head/Admin can manage assignments"
  on public.project_assignments for all using (
    exists (
      select 1 from public.projects p
      join public.profiles u on u.id = auth.uid()
      where p.id = project_assignments.project_id
        and ((p.division_id = u.division_id and u.role in ('admin', 'head'))
             or u.role = 'superadmin')
    )
  );

-- Members can update their OWN allocation (email-matched via auth.email())
drop policy if exists "Members can update own allocation" on public.project_assignments;
create policy "Members can update own allocation"
  on public.project_assignments for update
  using (
    exists (
      select 1 from public.members m
      where m.id = project_assignments.member_id
        and lower(m.email) = lower(auth.email())
    )
  );

-- member_skills
create policy "Skills viewable by division or superadmin"
  on public.member_skills for select using (
    exists (
      select 1 from public.members m
      join public.profiles u on u.id = auth.uid()
      where m.id = member_skills.member_id
        and (m.division_id = u.division_id or u.role = 'superadmin')
    )
  );

create policy "Head/Admin can manage skills"
  on public.member_skills for all using (
    exists (
      select 1 from public.members m
      join public.profiles u on u.id = auth.uid()
      where m.id = member_skills.member_id
        and ((m.division_id = u.division_id and u.role in ('admin', 'head'))
             or u.role = 'superadmin')
    )
  );

-- activity_log
create policy "Logs viewable by division head/admin or superadmin"
  on public.activity_log for select using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = public.activity_log.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

create policy "Users can insert logs for their division"
  on public.activity_log for insert with check (
    exists (select 1 from public.profiles where id = auth.uid())
  );

-- ============================================
-- STEP 3: Auto-create profile trigger
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- STEP 4: MIGRATION  
-- Uncomment & run this block ONCE to migrate existing data
-- into the default "Business Analyst" division.
-- ============================================
/*
DO $$
DECLARE v_div_id uuid;
BEGIN
  INSERT INTO public.divisions (name) VALUES ('Business Analyst')
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_div_id;

  IF v_div_id IS NULL THEN
    SELECT id INTO v_div_id FROM public.divisions WHERE name = 'Business Analyst';
  END IF;

  INSERT INTO public.division_settings (division_id, phases, statuses, capacity_active_phases, skills)
  VALUES (
    v_div_id,
    '["Planning","Requirement Gathering","Design","Design Review","Doc Creation","Development","SIT","UAT","Go Live"]'::jsonb,
    '[{"name":"Active","color":"blue"},{"name":"On Hold","color":"orange"},{"name":"Completed","color":"green"}]'::jsonb,
    '["Doc Creation","Design Review","Development"]'::jsonb,
    '["Requirements Gathering","Stakeholder Management","Process Modeling","Data Analysis","User Story Writing","API Documentation","SQL Proficiency","Wireframing","Communication","Agile/Scrum"]'::jsonb
  ) ON CONFLICT (division_id) DO NOTHING;

  UPDATE public.profiles SET division_id = v_div_id WHERE division_id IS NULL AND role != 'superadmin';
  UPDATE public.members SET division_id = v_div_id WHERE division_id IS NULL;
  UPDATE public.projects SET division_id = v_div_id WHERE division_id IS NULL;
  UPDATE public.activity_log SET division_id = v_div_id WHERE division_id IS NULL;
END $$;
*/
