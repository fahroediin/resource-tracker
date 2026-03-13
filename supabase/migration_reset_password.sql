-- ============================================
-- MIGRATION: Add email to profiles + Auto-assign division
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add email column to profiles
alter table public.profiles add column if not exists email text;

-- 2. Backfill email from auth.users for existing profiles
update public.profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id
    and p.email is null;

-- 3. Backfill division_id for existing profiles by matching members email
update public.profiles p
  set division_id = m.division_id
  from public.members m
  where lower(p.email) = lower(m.email)
    and p.division_id is null
    and m.division_id is not null;

-- 4. Update trigger to also store email AND auto-match division on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  matched_division_id uuid;
begin
  -- Try to find the division from members table by email match
  select m.division_id into matched_division_id
    from public.members m
    where lower(m.email) = lower(new.email)
    limit 1;

  insert into public.profiles (id, full_name, role, email, division_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    new.email,
    matched_division_id  -- NULL if no match found
  );
  return new;
end;
$$ language plpgsql security definer;
