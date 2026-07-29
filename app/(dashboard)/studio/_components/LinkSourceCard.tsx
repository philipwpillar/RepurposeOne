"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INPUT_CONTENT_MIN_LENGTH } from "@/lib/config";

interface LinkSourceCardProps {
  inputSummary: string;
  isLoading: boolean;
  onExtracted: (sourceText: string, meta: { title: string | null; sourceUrl: string }) => void;
  onUpdateText: (content: string) => void;
}

export default function LinkSourceCard({
  inputSummary,
  isLoading,
  onExtracted,
  onUpdateText,
}: LinkSourceCardProps) {
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  async function handleExtract() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a link to extract.");
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await response.json()) as {
        error?: string;
        title?: string | null;
        sourceText?: string;
        sourceUrl?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not extract that URL.");
        return;
      }

      if (!data.sourceText || data.sourceText.length < INPUT_CONTENT_MIN_LENGTH) {
        setError(
          "Could not extract enough article text. Paste the text instead."
        );
        return;
      }

      setTitle(data.title ?? null);
      onExtracted(data.sourceText, {
        title: data.title ?? null,
        sourceUrl: data.sourceUrl ?? trimmed,
      });
    } catch {
      setError("Could not extract that URL. Try pasting the text instead.");
    } finally {
      setExtracting(false);
    }
  }

  const busy = isLoading || extracting;

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">ARTICLE LINK</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
          placeholder="https://…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label="Article URL"
        />
        <Button
          type="button"
          onClick={() => void handleExtract()}
          disabled={busy || !url.trim()}
          className="shrink-0"
        >
          {extracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Extracting…
            </>
          ) : (
            "Extract"
          )}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {inputSummary ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          {title ? (
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              {title}
            </div>
          ) : null}
          <label className="sr-only" htmlFor="link-extracted-text">
            Extracted article text
          </label>
          <textarea
            id="link-extracted-text"
            value={inputSummary}
            onChange={(e) => onUpdateText(e.target.value)}
            disabled={busy}
            rows={6}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            {inputSummary.length.toLocaleString()} characters — edit before
            generating if needed
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Extract an article, then generate as usual. Paywalled or
          JavaScript-only pages may fail — paste the text instead.
        </p>
      )}
    </div>
  );
}
