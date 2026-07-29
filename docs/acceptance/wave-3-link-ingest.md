# Wave 3 acceptance — Studio Link ingest (3a)

**Branch:** `feat/wave3-link-ingest`  
**Date:** 2026-07-29  
**Baseline:** `main` after Wave 2

## Gate command

```bash
bash scripts/ac-check.sh floor
bash scripts/ac-check.sh wave3
```

## What shipped (3a)

| Area | Evidence |
|---|---|
| Studio Link mode | Third tab in [`InputModeTabs`](app/(dashboard)/studio/_components/InputModeTabs.tsx); [`LinkSourceCard`](app/(dashboard)/studio/_components/LinkSourceCard.tsx) |
| `POST /api/ingest/url` | Auth required; `runtime = "nodejs"`; `maxDuration = 30` |
| SSRF bar | [`lib/ingest/ssrf.ts`](lib/ingest/ssrf.ts) + manual redirects in [`fetch-url.ts`](lib/ingest/fetch-url.ts): max 3 hops, re-validate every hop, DNS IP reject (private/loopback/link-local/CGNAT), **8s total** across hops, 2 MB HTML, HTML Content-Type, identifying User-Agent |
| Extract | `@mozilla/readability` + JSDOM → paste `input_type` path (no new generate type) |
| PRODUCT_SPEC | Link ingest marked shipped |

## Known / accepted residuals

- **DNS rebinding:** hostname is resolved for the SSRF check, then `fetch()` re-resolves. A 0-TTL record could return a public IP to the check and a private one to fetch. Closing it needs a pinned-IP custom agent — disproportionate for v1. Accepted residual.
- **IPv6 literal hostnames** (`http://[::1]/`) fail closed via DNS `ENOTFOUND` rather than via `isIP` (brackets). Not a hole; stripping brackets would be tidier later.

## Pre-launch follow-up (before holding page down)

- **Rate-limit `/api/ingest/url`.** Authenticated today, but each call is DNS + full-page fetch + JSDOM up to 2 MB from your IP. Once anyone can sign up, add an `ingest_hits` table mirroring `voice_lab_hits` (same shape, same sweeper) — and **include `grant select, insert, delete … to service_role` in the migration** (do not repeat the Voice Lab grants miss).

## Out of this slice

- Wave 3b photo reorder, 3c length/display, 3d video un-gate
- Web launch / holding page
- Persisting `source_url` on `repurposes` (optional later)

## Manual smoke

1. Sign in → Studio → Link → paste a public article URL → Extract
2. Confirm editable text ≥ 50 chars → generate one format
3. Rejected: `http://127.0.0.1/`, `file:///etc/passwd`, metadata IP via redirect (if testable)
