# Day-0 acceptance — Voice Lab service_role grants

**Branch:** `fix/voice-lab-hits-service-role-grants`  
**Date:** 2026-07-29  
**Baseline:** `main` @ `1d38a55`

## Problem

`public.voice_lab_hits` had RLS + revoke from anon/authenticated, but **no grants to `service_role`**. Sweep cron `purgeExpiredVoiceLabHits` returned 500; `/api/voice-lab` fail-closed with 503. Table had 0 rows.

## Fix

- [`20260729153000_voice_lab_hits_service_role_grants.sql`](../supabase/migrations/20260729153000_voice_lab_hits_service_role_grants.sql) — `grant select, insert, delete … to service_role`
- [`20260729153100_protect_profile_billing_search_path.sql`](../supabase/migrations/20260729153100_protect_profile_billing_search_path.sql) — pin `search_path = public` on billing trigger

## Verify (execution, not grep)

```sql
select
  has_table_privilege('service_role','public.voice_lab_hits','SELECT') as sel,
  has_table_privilege('service_role','public.voice_lab_hits','INSERT') as ins,
  has_table_privilege('service_role','public.voice_lab_hits','DELETE') as del;
-- expect true, true, true
```

1. Re-run **Sweep pending orphans** via `workflow_dispatch` → green
2. One real `POST /api/voice-lab` on Preview → **200** and one row in `voice_lab_hits`

## Phil ops (not in this PR)

- Supabase Auth → enable **leaked-password protection**
- Decide: make repo **private**, or move `docs/briefs/` (open vuln write-ups) out before holding page down
