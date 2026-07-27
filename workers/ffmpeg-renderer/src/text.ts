/** Vertical clip frame width (px). */
export const OVERLAY_FRAME_WIDTH = 1080;

/** drawtext boxborderw — inset from each horizontal edge. */
export const OVERLAY_BOX_BORDER_W = 18;

/**
 * Usable caption width inside the box (1080 − 2×18 = 1044px).
 * drawtext x=(w-text_w)/2 overflows when text_w exceeds the frame; keep wraps within this.
 */
export const OVERLAY_USABLE_WIDTH_PX =
  OVERLAY_FRAME_WIDTH - 2 * OVERLAY_BOX_BORDER_W;

/** Space Grotesk SemiBold approximate average character advance at 1em. */
export const OVERLAY_CHAR_ADVANCE_EM = 0.55;

/** Caption font size — must stay in sync with wrap width below. */
export const OVERLAY_FONT_SIZE = 56;

/**
 * Max characters per overlay line, derived from font size and usable width.
 * At 56px: 1044 / (56 × 0.55) ≈ 33.9; floor − 1 leaves word-boundary slack (~32).
 */
export const OVERLAY_MAX_CHARS_PER_LINE =
  Math.floor(
    OVERLAY_USABLE_WIDTH_PX / (OVERLAY_FONT_SIZE * OVERLAY_CHAR_ADVANCE_EM)
  ) - 1;

/** Mirror lib/ai/bundle-generate.ts stripOverlayEmoji — do not import across runtimes. */
export function stripOverlayEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Pre-wrap at word boundaries into ≤2 lines for drawtext textfile. */
export function prewrapOverlayText(text: string): string {
  const maxChars = OVERLAY_MAX_CHARS_PER_LINE;
  const cleaned = stripOverlayEmoji(text) || "Moment";
  const words = cleaned.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (lines.length >= 2) break;

    if (word.length <= maxChars) {
      current = word;
    } else {
      lines.push(word.slice(0, maxChars));
    }
  }

  if (current && lines.length < 2) {
    lines.push(current);
  }

  return lines.slice(0, 2).join("\n");
}
