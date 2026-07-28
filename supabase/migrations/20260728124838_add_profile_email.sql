-- Store auth email on profiles for admin/query convenience.
-- Source of truth remains auth.users; clients cannot write this column.

alter table public.profiles
  add column if not exists email text;

-- Backfill existing rows from Auth.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is distinct from u.email;

-- Keep signup path in sync.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Keep profiles.email aligned when Auth email changes.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function public.sync_profile_email();

revoke execute on function public.sync_profile_email() from public, anon, authenticated;

-- Clients may SELECT email via RLS; only service_role / Auth triggers may change it.
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

  if new.payment_failed_at is distinct from old.payment_failed_at then
    raise exception 'payment_failed_at is read-only';
  end if;

  if new.payment_failed_invoice_id is distinct from old.payment_failed_invoice_id then
    raise exception 'payment_failed_invoice_id is read-only';
  end if;

  -- Block client writes only. Auth email-sync and service_role must still work
  -- (auth triggers are not JWT service_role, so a blanket block would break sync).
  if new.email is distinct from old.email
     and coalesce((select auth.role()), '') = 'authenticated' then
    raise exception 'email is read-only';
  end if;

  return new;
end;
$$;
