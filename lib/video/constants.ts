/** Video sampling caps (N4) and contact-sheet knobs — Brief 2a / 3a. */

export const VIDEO_MIN_DURATION_S = 15;
export const VIDEO_MAX_DURATION_S = 180;

/** Client + server must share this env (NEXT_PUBLIC_ prefix). Default 45 MB. */
export const VIDEO_MAX_MB = Number.parseInt(
  process.env.NEXT_PUBLIC_VIDEO_MAX_MB ?? "45",
  10
);

export const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

/** Longest edge for each sampled frame tile (sheet cell size). */
export const FRAME_MAX_EDGE_PX = 340;

export const FRAME_COUNT_MIN = 12;
export const FRAME_COUNT_MAX = 36;

export const SHEET_COLS = 3;
export const SHEET_ROWS = 3;
export const SHEET_CELLS = SHEET_COLS * SHEET_ROWS;
export const SHEET_MAX = 4;
export const SHEET_JPEG_QUALITY = 0.7;

export const SEEK_TIMEOUT_MS = 10_000;

export const VIDEO_TOO_LARGE_MESSAGE = `This video is too large (max ${VIDEO_MAX_MB} MB). Export at 1080p and retry.`;

export const VIDEO_TOO_LONG_MESSAGE =
  "This video is too long (max 3 minutes). Trim it and try again.";

export function videoTooShortMessage(durationS: number): string {
  const n = Math.max(0, Math.round(durationS));
  return `Videos need to be at least 15 seconds for clip suggestions. This one is ${n}s.`;
}

export const VIDEO_UNSUPPORTED_MESSAGE =
  "This video couldn't be read by your browser. Try a different file or format.";

export const SEEK_TIMEOUT_MESSAGE =
  "Timed out while reading a video frame. Try again, or export as MP4 and retry.";
