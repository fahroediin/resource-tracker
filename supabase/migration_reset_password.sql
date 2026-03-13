-- ============================================
-- MIGRATION: Add email to profiles + Reset Password support
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

-- 3. Update trigger to also store email on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;
