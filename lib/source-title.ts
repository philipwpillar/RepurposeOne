const MAX_TITLE_LENGTH = 80;

/**
 * Derives a human-readable "source" title from a repurpose's raw
 * input_content, for the folder name in the grouped History view.
 * Deterministic — no AI call, no user input required.
 */
export function deriveSourceTitle(
  inputContent: string,
  maxLength: number = MAX_TITLE_LENGTH
): string {
  const trimmed = inputContent.trim();
  if (!trimmed) return "Untitled source";

  const firstLine =
    trimmed
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? trimmed;

  // Strip a leading markdown heading marker ("# ", "## ", etc.) if present.
  const withoutHeadingMarker = firstLine.replace(/^#{1,6}\s+/, "");

  if (withoutHeadingMarker.length <= maxLength) {
    return withoutHeadingMarker;
  }

  return `${withoutHeadingMarker.slice(0, maxLength).trimEnd()}…`;
}
