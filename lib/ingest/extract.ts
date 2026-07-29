import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import {
  INPUT_CONTENT_MAX_LENGTH,
  INPUT_CONTENT_MIN_LENGTH,
} from "@/lib/config";

export class IngestExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestExtractError";
  }
}

/**
 * Extract main article text via Mozilla Readability.
 * Requires Node.js runtime (JSDOM is not Edge-compatible).
 */
export function extractArticleText(
  html: string,
  pageUrl: string
): { title: string | null; sourceText: string } {
  let dom: JSDOM;
  try {
    dom = new JSDOM(html, { url: pageUrl });
  } catch {
    throw new IngestExtractError(
      "Could not parse that page. Try pasting the text instead."
    );
  }

  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const title = article?.title?.trim() || null;
  let sourceText = (article?.textContent ?? "").replace(/\s+/g, " ").trim();

  if (!sourceText || sourceText.length < INPUT_CONTENT_MIN_LENGTH) {
    throw new IngestExtractError(
      "Could not extract enough article text (paywall or JavaScript-only page). Paste the text instead."
    );
  }

  if (sourceText.length > INPUT_CONTENT_MAX_LENGTH) {
    sourceText = sourceText.slice(0, INPUT_CONTENT_MAX_LENGTH);
  }

  return { title, sourceText };
}
