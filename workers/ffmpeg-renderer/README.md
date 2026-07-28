# ffmpeg render worker

Always-on Railway worker for RepurposeOne Moment Bundles. Polls `bundle_clips` for `pending` rows, downloads source video via Supabase service role, renders trim + Aurora caption burn (1080×1920 H.264), uploads to `{user_id}/{bundle_id}/clips/{clip_id}.mp4`, and marks the row `complete`.

## Requirements

- Node 22+
- ffmpeg with `drawtext` filter (Debian bookworm package satisfies this; Docker build verifies via `grep drawtext`)
- Supabase service role key (**Railway env only** — never in the repo, never in Vercel)

## Local development

```bash
cd workers/ffmpeg-renderer
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_WAKE_SECRET
npm install
npm run build
npm start
```

## Docker

```bash
docker build -t repurposeone-ffmpeg-renderer .
docker run --env-file .env -p 8080:8080 repurposeone-ffmpeg-renderer
```

Health: `GET http://localhost:8080/health`

Wake (immediate poll): `POST http://localhost:8080/wake` with header `x-wake-secret: $WORKER_WAKE_SECRET`

## Railway deploy

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub → repo `RepurposeOne`
2. Set **Root Directory** = `workers/ffmpeg-renderer`
3. Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_WAKE_SECRET`, optional `POLL_INTERVAL_MS`, `RENDER_TIMEOUT_MS`, `SOURCE_GRACE_HOURS`, `PORT`
4. Deploy and check `/health` on the generated URL

## Behaviour

- Poll every 5s (default); claims **one** clip per cycle with optimistic lock
- Pre-flight: requires `bundle_assets.metadata.upload_verified === true`
- Max 2 attempts per clip; failures reset to `pending` until attempt 2, then `failed`
- Render timeout 300s (default) — kills ffmpeg on overrun
- Hourly lifecycle: source cleanup, 24h abandoned grace, 30-day rendered clip retention (media deleted; metadata row kept as tombstone until account deletion)
- SIGTERM: finishes current render, then exits

## Stuck `rendering` rows

The worker lifecycle (boot + periodic) reclaims clips stuck in `rendering`
after `3 × RENDER_TIMEOUT_MS` (default 15 minutes): CAS on `updated_at`,
reset to `pending` if attempts remain, else `failed` with
`orphaned_rendering: reclaimed by worker`. The Vercel/GitHub
`sweep-pending-repurposes` cron is a slower backup (60m threshold) for the
same class of rows, plus Studio/bundle pending orphans.

Manual reset is only needed if reclaim is disabled or misconfigured:

```sql
UPDATE bundle_clips
SET render_status = 'pending', updated_at = now()
WHERE id = '<clip_id>' AND render_status = 'rendering';
```

**Incident log:** 27 Jul 2026 — one clip on bundle `d4dc2a7c-…` stayed
`rendering` ~30 minutes after claim (pre-reclaim). Distinct from the earlier
OOM failure mode (which left rows as `failed`).

## Font

`fonts/SpaceGrotesk-SemiBold.ttf` — static Space Grotesk at weight 600 (SemiBold), instantiated from the OFL variable source via `fonttools varLib.instancer wght=600`. Bundled in the Docker image for consistent caption burn at the correct weight (ffmpeg drawtext does not honour variable-font axes).
