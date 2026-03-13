-- ============================================
-- MIGRATION: Block System + Cycles
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create cycles table
create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  division_id uuid references public.divisions(id) on delete cascade,
  created_by uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);
alter table public.cycles enable row level security;

-- RLS for cycles
create policy "Cycles viewable by division members"
  on public.cycles for select using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and (division_id = cycles.division_id or role = 'superadmin'))
  );

create policy "Head/Admin can manage cycles"
  on public.cycles for all using (
    exists (select 1 from public.profiles
      where id = auth.uid()
        and ((division_id = cycles.division_id and role in ('admin', 'head'))
             or role = 'superadmin'))
  );

-- 2. Add cycle_id to project_assignments
alter table public.project_assignments
  add column if not exists cycle_id uuid references public.cycles(id) on delete set null;

-- 3. Convert allocation from percentage (0-100) to blocks (0-4)
-- First, convert existing values: divide by 25, round, clamp 1-4
update public.project_assignments
  set allocation = greatest(0, least(4, round(allocation / 25.0)::integer))
  where allocation > 4;

-- 4. Update constraint from 0-100 to 0-4
alter table public.project_assignments
  drop constraint if exists project_assignments_allocation_check;
alter table public.project_assignments
  add constraint project_assignments_allocation_check
  check (allocation >= 0 and allocation <= 4);
