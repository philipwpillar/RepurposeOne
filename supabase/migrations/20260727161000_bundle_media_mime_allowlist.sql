-- Defence in depth: restrict bundle-media uploads to accepted image/video MIMEs.
-- Applied to production 2026-07-27; kept in repo for drift tracking.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm'
]
where id = 'bundle-media';
