export const CLIP_POLL_INTERVAL_MS = 3_000;
export const CLIP_POLL_CEILING_MS = 10 * 60 * 1_000;

export function formatMmSs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
