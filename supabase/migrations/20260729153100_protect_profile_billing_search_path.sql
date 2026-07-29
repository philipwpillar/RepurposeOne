-- Pin search_path on protect_profile_billing_columns (matches every other
-- SECURITY DEFINER / trigger function in this schema). Body unchanged from
-- 20260728133324_payment_failed_event_at.sql.

create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
set search_path = public
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

  if new.payment_failed_event_at is distinct from old.payment_failed_event_at then
    raise exception 'payment_failed_event_at is read-only';
  end if;

  -- email: intentionally weaker than the service_role-only neighbours.
  -- Auth's sync_profile_email trigger carries no JWT, so auth.role() is never
  -- service_role there; a blanket block would break email sync. RLS still
  -- limits row access to auth.uid() = id. Do not add a GUC/set_config bypass —
  -- that would create a billing-column write primitive.
  if new.email is distinct from old.email
     and coalesce((select auth.role()), '') = 'authenticated' then
    raise exception 'email is read-only';
  end if;

  return new;
end;
$$;
