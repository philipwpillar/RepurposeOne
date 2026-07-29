import { NextResponse } from "next/server";
import { z } from "zod";
import { extractArticleText, IngestExtractError } from "@/lib/ingest/extract";
import { fetchHtmlForIngest, IngestFetchError } from "@/lib/ingest/fetch-url";
import { SsrfError } from "@/lib/ingest/ssrf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const IngestUrlBodySchema = z.object({
  url: z.string().min(1).max(2048),
});

/**
 * POST /api/ingest/url
 *
 * Authenticated URL → HTML fetch (SSRF-safe) → Readability extract →
 * plain text for the existing Studio paste generate path.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required", code: "unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "invalid_body" },
      { status: 400 }
    );
  }

  const parsed = IngestUrlBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A URL is required", code: "invalid_url" },
      { status: 400 }
    );
  }

  try {
    const { finalUrl, html } = await fetchHtmlForIngest(parsed.data.url);
    const { title, sourceText } = extractArticleText(html, finalUrl);
    return NextResponse.json({
      title,
      sourceText,
      sourceUrl: finalUrl,
    });
  } catch (err) {
    if (err instanceof SsrfError) {
      return NextResponse.json(
        { error: err.message, code: "ssrf_blocked" },
        { status: 400 }
      );
    }
    if (err instanceof IngestFetchError || err instanceof IngestExtractError) {
      return NextResponse.json(
        { error: err.message, code: "extract_failed" },
        { status: 422 }
      );
    }
    return NextResponse.json(
      {
        error: "Could not extract that URL. Try pasting the text instead.",
        code: "extract_failed",
      },
      { status: 500 }
    );
  }
}
