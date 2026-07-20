-- Critical billing security hardening
-- 1. Block client updates to billing columns on profiles
-- 2. generation_id NOT NULL + one row per format per billing group
-- 3. Revoke authenticated writes on metering tables (API uses service role)

-- ---------------------------------------------------------------------------
-- 1. profiles: protect plan + Stripe columns (onboarding_completed_at stays editable)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
as $$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if new.plan is distinct from old.plan then
    raise exception 'plan is read-only';
  end if;

  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'stripe_customer_id is read-only';
  end if;

  if new.stripe_subscription_id is distinct from old.stripe_subscription_id then
    raise exception 'stripe_subscription_id is read-only';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_billing_columns_trigger on public.profiles;

create trigger protect_profile_billing_columns_trigger
  before update on public.profiles
  for each row
  execute function public.protect_profile_billing_columns();

-- ---------------------------------------------------------------------------
-- 2. repurposes.generation_id: backfill, NOT NULL, unique per user/group/format
-- ---------------------------------------------------------------------------
update public.repurposes
  set generation_id = id
  where generation_id is null;

alter table public.repurposes
  alter column generation_id set not null;

create unique index if not exists repurposes_user_gen_format_uidx
  on public.repurposes (user_id, generation_id, target_format);

-- ---------------------------------------------------------------------------
-- 3. Metering tables: authenticated may SELECT only; writes via service role
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.repurposes from authenticated;
revoke insert, update, delete on public.bundles from authenticated;
revoke insert, update, delete on public.bundle_assets from authenticated;
revoke insert, update, delete on public.bundle_clips from authenticated;
