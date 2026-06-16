"use client";

import { useState } from "react";
import Link from "next/link";
import type { GenerateErrorResponse, GenerateSuccessResponse } from "@/types";

const SAMPLE_INPUT = `Building in public has changed how I ship products. Six months ago I was stuck in endless planning — now I ship a small improvement every week and talk about what worked and what didn't.

The biggest shift wasn't a framework or a tool. It was deciding that "good enough to learn from" beats "perfect but never launched." My audience started responding when I shared the messy middle, not just the wins.

If you're sitting on an idea, publish one honest update this week. You'll learn more from one real conversation than a month of private polishing.`;

const SAMPLE_VOICE = {
  description:
    "Direct, warm, founder-to-founder tone. Short sentences. No corporate jargon. Occasional rhetorical questions. Minimal emoji. First person. Practical and encouraging without hype.",
  samples: [
    "Shipped a rough v1 on Tuesday. It's ugly. It works. That's the whole game at this stage.",
    "Hot take: most 'strategy' is procrastination in a nicer outfit. Talk to three users instead.",
  ],
};

export default function TestGeneratePage() {
  const [inputContent, setInputContent] = useState(SAMPLE_INPUT);
  const [description, setDescription] = useState(SAMPLE_VOICE.description);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateSuccessResponse | null>(null);
  const [error, setError] = useState<GenerateErrorResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_type: "paste",
          input_content: inputContent,
          brand_voice: { description, samples: SAMPLE_VOICE.samples },
          target_format: "x_thread",
          target_tweets: 7,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data as GenerateErrorResponse);
      } else {
        setResult(data as GenerateSuccessResponse);
      }
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : "Request failed",
        code: "internal_error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Generate</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          Home
        </Link>
      </div>

      <p className="text-sm text-neutral-600">
        Requires an authenticated Supabase session (sign in via your auth flow).
        Sends a POST to <code className="rounded bg-neutral-100 px-1">/api/generate</code>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Input content</span>
          <textarea
            className="w-full rounded border p-3 text-sm"
            rows={8}
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Brand voice description</span>
          <textarea
            className="w-full rounded border p-3 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate X thread"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">{error.error}</p>
          {error.upgrade_message && (
            <p className="mt-2 text-red-700">{error.upgrade_message}</p>
          )}
          {error.usage && (
            <p className="mt-1 text-red-600">
              Usage: {error.usage.used}/{error.usage.limit} ({error.usage.plan})
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
            <span>Model: {result.model}</span>
            {result.tokens_used != null && (
              <span>Tokens: {result.tokens_used}</span>
            )}
            <span>
              Usage: {result.usage.used}/{result.usage.limit}
            </span>
          </div>

          {result.output.format === "x_thread" && (
            <>
              <ol className="space-y-3">
                {result.output.tweets.map((tweet) => (
                  <li key={tweet.number} className="rounded bg-neutral-50 p-3 text-sm">
                    <span className="font-medium">{tweet.number}/</span> {tweet.text}
                    {tweet.media_suggestion && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Media: {tweet.media_suggestion}
                      </p>
                    )}
                  </li>
                ))}
              </ol>

              {result.output.thread_summary && (
                <p className="text-sm text-neutral-600">
                  Summary: {result.output.thread_summary}
                </p>
              )}
            </>
          )}

          <pre className="overflow-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <section className="rounded-lg bg-neutral-50 p-4 text-sm">
        <h2 className="font-medium">curl example</h2>
        <pre className="mt-2 overflow-auto text-xs">
{`curl -X POST http://localhost:3000/api/generate \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your-supabase-session-cookies>" \\
  -d '{
    "input_type": "paste",
    "input_content": "Your long-form content here (min 50 chars)...",
    "brand_voice": {
      "description": "Direct, warm founder voice. Short sentences.",
      "samples": ["Example tweet or post one.", "Example two."]
    },
    "target_format": "x_thread",
    "target_tweets": 7
  }'`}
        </pre>
      </section>
    </main>
  );
}
