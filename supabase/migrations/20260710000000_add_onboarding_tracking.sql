-- Track first-run onboarding completion on profiles.
-- Existing rows are backfilled as already-onboarded (pre-existing test
-- accounts, not new signups awaiting the onboarding flow). New rows
-- inserted by handle_new_user() get NULL by default, which is what the
-- (dashboard) layout gate checks to redirect to /onboarding.
alter table public.profiles
  add column onboarding_completed_at timestamptz;

update public.profiles
  set onboarding_completed_at = created_at
  where onboarding_completed_at is null;
