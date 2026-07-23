-- Payment failure status for non-dismissible billing banner
-- 1. Add payment_failed_at + payment_failed_invoice_id on profiles
-- 2. Protect those columns from client updates (service_role only)

alter table public.profiles
  add column if not exists payment_failed_at timestamptz,
  add column if not exists payment_failed_invoice_id text;

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

  return new;
end;
$$;
