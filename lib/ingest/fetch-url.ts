import {
  assertSafeIngestUrl,
  INGEST_MAX_REDIRECTS,
  SsrfError,
} from "@/lib/ingest/ssrf";

export const INGEST_FETCH_TIMEOUT_MS = 8_000;
export const INGEST_MAX_HTML_BYTES = 2 * 1024 * 1024;

const INGEST_USER_AGENT =
  "VoiceoraLinkIngest/1.0 (+https://voiceora.io; article extraction)";

export class IngestFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestFetchError";
  }
}

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return (
    lower.includes("text/html") ||
    lower.includes("application/xhtml+xml") ||
    lower.includes("application/xml") ||
    lower.includes("text/xml")
  );
}

/**
 * Fetch HTML for article extraction. Follows redirects manually and
 * re-validates scheme + resolved IP on every hop (SSRF bar).
 */
export async function fetchHtmlForIngest(rawUrl: string): Promise<{
  finalUrl: string;
  html: string;
}> {
  let current = await assertSafeIngestUrl(rawUrl);

  // One deadline across all redirect hops (not 8s per hop).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INGEST_FETCH_TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= INGEST_MAX_REDIRECTS; hop++) {
      let response: Response;
      try {
        response = await fetch(current.toString(), {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "User-Agent": INGEST_USER_AGENT,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new IngestFetchError(
            "That page took too long to respond. Try pasting the text instead."
          );
        }
        throw new IngestFetchError(
          "Could not fetch that URL. Try pasting the text instead."
        );
      }

      // 3xx with Location — validate next hop and continue
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new IngestFetchError(
            "That page returned a redirect we could not follow."
          );
        }
        if (hop === INGEST_MAX_REDIRECTS) {
          throw new IngestFetchError(
            "That page redirected too many times. Try pasting the text instead."
          );
        }
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          throw new SsrfError("That page redirected to an invalid URL.");
        }
        current = await assertSafeIngestUrl(next.toString());
        continue;
      }

      if (!response.ok) {
        throw new IngestFetchError(
          `That page returned ${response.status}. Try pasting the text instead.`
        );
      }

      const contentType = response.headers.get("content-type");
      if (!isHtmlContentType(contentType)) {
        throw new IngestFetchError(
          "That URL did not return an HTML page. Try pasting the text instead."
        );
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && Number(contentLength) > INGEST_MAX_HTML_BYTES) {
        throw new IngestFetchError(
          "That page is too large to extract. Try pasting the text instead."
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new IngestFetchError(
          "Could not read that page. Try pasting the text instead."
        );
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > INGEST_MAX_HTML_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw new IngestFetchError(
            "That page is too large to extract. Try pasting the text instead."
          );
        }
        chunks.push(value);
      }

      const html = new TextDecoder("utf-8", { fatal: false }).decode(
        Buffer.concat(chunks.map((c) => Buffer.from(c)))
      );

      return { finalUrl: current.toString(), html };
    }

    throw new IngestFetchError(
      "That page redirected too many times. Try pasting the text instead."
    );
  } finally {
    clearTimeout(timer);
  }
}
