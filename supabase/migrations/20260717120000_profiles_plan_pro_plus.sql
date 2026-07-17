-- Add pro_plus to profiles.plan CHECK (Brief 0b)
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'creator', 'pro', 'pro_plus'));
