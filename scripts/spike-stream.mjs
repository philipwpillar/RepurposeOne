/**
 * Phase 4 Commit 0 — OpenRouter streaming canary.
 *
 * Proves (or falsifies) that deepinfra/fp8 + json_object + stream:true yields
 * incrementally parseable partial JSON (e.g. tweets[0].text) before the stream ends.
 *
 * Usage: node --env-file=.env.local scripts/spike-stream.mjs
 * Requires OPENROUTER_API_KEY. Optional AI_MODEL_STRONG override.
 */
const API_KEY = process.env.OPENROUTER_API_KEY;
// Canary pins the production strong slug. Do not inherit AI_MODEL_STRONG —
// a local Claude override fails the deepinfra/fp8 allowlist and falsifies the check.
const MODEL = process.env.SPIKE_MODEL ?? "qwen/qwen3.5-397b-a17b";

if (!API_KEY) {
  console.error("FATAL: OPENROUTER_API_KEY is not set");
  process.exit(1);
}

const started = Date.now();
const elapsed = () => `${Date.now() - started}ms`;

function tryPartialTweetText(buffer) {
  // Look for tweets[0].text becoming readable without full JSON.parse success.
  const m = buffer.match(
    /"tweets"\s*:\s*\[\s*\{[^}]*?"text"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  if (m) return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  try {
    const parsed = JSON.parse(buffer);
    const text = parsed?.tweets?.[0]?.text;
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

const body = {
  model: MODEL,
  stream: true,
  temperature: 0.4,
  response_format: { type: "json_object" },
  provider: { only: ["deepinfra/fp8"] },
  reasoning: { enabled: false },
  messages: [
    {
      role: "system",
      content:
        'Return ONLY valid JSON: {"format":"x_thread","tweets":[{"number":1,"text":"..."},{"number":2,"text":"..."},{"number":3,"text":"..."}],"thread_summary":"..."}. Exactly 3 tweets, each under 280 chars.',
    },
    {
      role: "user",
      content:
        "Source: Most founders over-index on features and under-index on distribution. A mediocre product with great distribution beats a great product nobody sees. Write a short X thread.",
    },
  ],
};

console.log(`spike-stream start model=${MODEL} t=${elapsed()}`);

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://voiceora.io",
    "X-Title": "Voiceora spike-stream",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const errText = await res.text();
  console.error(`FATAL: OpenRouter ${res.status}: ${errText.slice(0, 500)}`);
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let sseCarry = "";
let chunkCount = 0;
let resolvedModel = null;
let firstPartialAt = null;
let firstPartialText = null;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  sseCarry += decoder.decode(value, { stream: true });
  const lines = sseCarry.split("\n");
  sseCarry = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "data: [DONE]") continue;
    if (!trimmed.startsWith("data: ")) continue;

    let payload;
    try {
      payload = JSON.parse(trimmed.slice(6));
    } catch {
      continue;
    }

    if (payload.model && !resolvedModel) {
      resolvedModel = payload.model;
      console.log(`resolved model=${resolvedModel} t=${elapsed()}`);
    }

    const delta = payload.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      chunkCount += 1;
      buffer += delta;
      console.log(
        `chunk#${chunkCount} +${delta.length}c total=${buffer.length} t=${elapsed()}`
      );

      if (!firstPartialAt) {
        const partial = tryPartialTweetText(buffer);
        if (partial) {
          firstPartialAt = Date.now() - started;
          firstPartialText = partial.slice(0, 80);
          console.log(
            `PARTIAL tweets[0].text readable at ${firstPartialAt}ms: ${JSON.stringify(firstPartialText)}`
          );
        }
      }
    }
  }
}

console.log("---");
console.log(`chunks=${chunkCount} buffer_len=${buffer.length} t=${elapsed()}`);
console.log(`model=${resolvedModel ?? "(none)"}`);
console.log(
  firstPartialAt != null
    ? `OUTCOME: partial_json_readable at ${firstPartialAt}ms`
    : "OUTCOME: chunks_ok_but_json_only_at_end (or empty)"
);
console.log(`tail=${JSON.stringify(buffer.slice(-120))}`);
