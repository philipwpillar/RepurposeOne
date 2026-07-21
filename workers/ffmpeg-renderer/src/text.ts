/** Mirror lib/ai/bundle-generate.ts stripOverlayEmoji — do not import across runtimes. */
export function stripOverlayEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Pre-wrap at word boundaries into ≤2 lines of ≤32 chars for drawtext textfile. */
export function prewrapOverlayText(text: string): string {
  const cleaned = stripOverlayEmoji(text) || "Moment";
  const words = cleaned.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= 32) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (lines.length >= 2) break;

    if (word.length <= 32) {
      current = word;
    } else {
      lines.push(word.slice(0, 32));
    }
  }

  if (current && lines.length < 2) {
    lines.push(current);
  }

  return lines.slice(0, 2).join("\n");
}
