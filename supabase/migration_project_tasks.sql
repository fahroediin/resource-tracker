-- ============================================
-- MIGRATION: Add project_tasks table
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the table
create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.project_assignments(id) on delete cascade,
  content text not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_tasks enable row level security;

-- 2. Auto-update updated_at trigger
create or replace function public.update_project_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_project_tasks_updated_at on public.project_tasks;
create trigger trg_project_tasks_updated_at
  before update on public.project_tasks
  for each row execute procedure public.update_project_tasks_updated_at();

-- 3. RLS Policies

-- Members can view their own tasks
create policy "Members can view own tasks"
  on public.project_tasks for select using (
    exists (
      select 1 from public.project_assignments pa
      join public.members m on m.id = pa.member_id
      where pa.id = project_tasks.assignment_id
        and lower(m.email) = lower(auth.email())
    )
  );

-- Head/Admin can view all division tasks
create policy "Head/Admin can view division tasks"
  on public.project_tasks for select using (
    exists (
      select 1 from public.project_assignments pa
      join public.projects p on p.id = pa.project_id
      join public.profiles u on u.id = auth.uid()
      where pa.id = project_tasks.assignment_id
        and ((p.division_id = u.division_id and u.role in ('admin', 'head'))
             or u.role = 'superadmin')
    )
  );

-- Members can insert their own tasks
create policy "Members can insert own tasks"
  on public.project_tasks for insert with check (
    exists (
      select 1 from public.project_assignments pa
      join public.members m on m.id = pa.member_id
      where pa.id = project_tasks.assignment_id
        and lower(m.email) = lower(auth.email())
    )
  );

-- Members can update their own tasks
create policy "Members can update own tasks"
  on public.project_tasks for update using (
    exists (
      select 1 from public.project_assignments pa
      join public.members m on m.id = pa.member_id
      where pa.id = project_tasks.assignment_id
        and lower(m.email) = lower(auth.email())
    )
  );

-- Members can delete their own tasks
create policy "Members can delete own tasks"
  on public.project_tasks for delete using (
    exists (
      select 1 from public.project_assignments pa
      join public.members m on m.id = pa.member_id
      where pa.id = project_tasks.assignment_id
        and lower(m.email) = lower(auth.email())
    )
  );
