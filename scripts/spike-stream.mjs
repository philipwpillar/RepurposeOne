/**
 * Phase 4 Commit 0 — OpenRouter streaming canary.
 *
 * Proves (or falsifies) that deepinfra/fp8 + stream:true yields incrementally
 * parseable partial JSON (e.g. tweets[0].text) before the stream ends, and does
 * so in BOTH wire formats:
 *   - json_object  — the simple mode.
 *   - json_schema  — what the production route actually sends (the AI SDK's
 *                    `supportsStructuredOutputs: true` emits response_format
 *                    { type: "json_schema", json_schema }).
 *
 * Running both in one pass distinguishes two different incidents:
 *   - both fail            → DeepInfra (or the model) is down.
 *   - only json_schema     → structured-output support regressed; production
 *                            breaks while a json_object-only canary would pass.
 *
 * Usage: node --env-file=.env.local scripts/spike-stream.mjs
 * Requires OPENROUTER_API_KEY. Optional SPIKE_MODEL override.
 */
const API_KEY = process.env.OPENROUTER_API_KEY;
// Canary pins the production strong slug. Do not inherit AI_MODEL_STRONG —
// a local Claude override fails the deepinfra/fp8 allowlist and falsifies the check.
const MODEL = process.env.SPIKE_MODEL ?? "qwen/qwen3.5-397b-a17b";
const TEMPERATURE = Number(process.env.AI_TEMPERATURE ?? 0.7);

if (!API_KEY) {
  console.error("FATAL: OPENROUTER_API_KEY is not set");
  process.exit(1);
}

const started = Date.now();
const elapsed = () => `${Date.now() - started}ms`;

// Mirror of XThreadOutputSchema for the production json_schema wire format.
const X_THREAD_JSON_SCHEMA = {
  name: "x_thread",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["format", "tweets"],
    properties: {
      format: { type: "string", enum: ["x_thread"] },
      tweets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["number", "text"],
          properties: {
            number: { type: "integer" },
            text: { type: "string" },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT =
  'Return ONLY valid JSON: {"format":"x_thread","tweets":[{"number":1,"text":"..."},{"number":2,"text":"..."},{"number":3,"text":"..."}]}. Exactly 3 tweets, each under 280 chars.';
const USER_PROMPT =
  "Source: Most founders over-index on features and under-index on distribution. A mediocre product with great distribution beats a great product nobody sees. Write a short X thread.";

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

function validateXThread(buffer) {
  let output;
  try {
    output = JSON.parse(buffer);
  } catch {
    return "streamed output is not valid JSON";
  }
  if (
    output?.format !== "x_thread" ||
    !Array.isArray(output.tweets) ||
    output.tweets.length !== 3 ||
    output.tweets.some(
      (tweet) =>
        typeof tweet?.number !== "number" ||
        typeof tweet?.text !== "string" ||
        tweet.text.length === 0 ||
        tweet.text.length > 280
    )
  ) {
    return "streamed output does not match the production X schema";
  }
  return null;
}

/**
 * Runs one streamed completion in the given wire format and returns an outcome.
 * Never throws — a failure is reported in the returned object so the caller can
 * run the other mode and print a combined verdict.
 */
async function runStream(label, responseFormat) {
  console.log(`\n=== ${label} — start model=${MODEL} t=${elapsed()} ===`);

  const body = {
    model: MODEL,
    stream: true,
    // Match AI_CONFIG.temperature so this remains a production-path canary.
    temperature: TEMPERATURE,
    response_format: responseFormat,
    provider: { only: ["deepinfra/fp8"] },
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT },
    ],
  };

  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://voiceora.io",
        "X-Title": "Voiceora spike-stream",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { label, ok: false, error: `request failed: ${String(err)}` };
  }

  if (!res.ok) {
    const errText = await res.text();
    return {
      label,
      ok: false,
      error: `OpenRouter ${res.status}: ${errText.slice(0, 300)}`,
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sseCarry = "";
  let chunkCount = 0;
  let resolvedModel = null;
  let resolvedProvider = null;
  let firstPartialAt = null;

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
        console.log(`[${label}] resolved model=${resolvedModel} t=${elapsed()}`);
      }
      if (payload.provider && !resolvedProvider) {
        resolvedProvider = payload.provider;
        console.log(
          `[${label}] resolved provider=${resolvedProvider} t=${elapsed()}`
        );
      }

      const delta = payload.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        chunkCount += 1;
        buffer += delta;
        if (!firstPartialAt) {
          const partial = tryPartialTweetText(buffer);
          if (partial) {
            firstPartialAt = Date.now() - started;
            console.log(
              `[${label}] PARTIAL tweets[0].text readable at ${firstPartialAt}ms: ${JSON.stringify(partial.slice(0, 80))}`
            );
          }
        }
      }
    }
  }

  const schemaError = validateXThread(buffer);
  if (schemaError) {
    return {
      label,
      ok: false,
      resolvedModel,
      resolvedProvider,
      chunkCount,
      error: schemaError,
      tail: buffer.slice(-120),
    };
  }
  if (firstPartialAt == null) {
    return {
      label,
      ok: false,
      resolvedModel,
      resolvedProvider,
      chunkCount,
      error: "no tweets[0].text was readable before stream completion",
      tail: buffer.slice(-120),
    };
  }

  return {
    label,
    ok: true,
    resolvedModel,
    resolvedProvider,
    chunkCount,
    firstPartialAt,
    tail: buffer.slice(-120),
  };
}

const outcomes = [];
outcomes.push(await runStream("json_object", { type: "json_object" }));
outcomes.push(
  await runStream("json_schema", {
    type: "json_schema",
    json_schema: X_THREAD_JSON_SCHEMA,
  })
);

console.log("\n--- SUMMARY ---");
for (const o of outcomes) {
  if (o.ok) {
    console.log(
      `${o.label}: OK — model=${o.resolvedModel} provider=${o.resolvedProvider ?? "(not reported)"} chunks=${o.chunkCount} first_partial=${o.firstPartialAt}ms`
    );
  } else {
    console.log(`${o.label}: FAIL — ${o.error}`);
    if (o.tail) console.log(`  tail=${JSON.stringify(o.tail)}`);
  }
}

const objectOk = outcomes.find((o) => o.label === "json_object")?.ok;
const schemaOk = outcomes.find((o) => o.label === "json_schema")?.ok;

if (objectOk && schemaOk) {
  console.log("OUTCOME: both wire formats stream partial JSON → design stands");
  process.exit(0);
}
if (!objectOk && !schemaOk) {
  console.error(
    "OUTCOME: both modes failed → DeepInfra / model likely down (not a format regression)"
  );
} else if (!schemaOk) {
  console.error(
    "OUTCOME: json_schema failed while json_object worked → structured-output support regressed; PRODUCTION IS BROKEN"
  );
} else {
  console.error(
    "OUTCOME: json_object failed while json_schema worked → object-mode regressed (production path still OK)"
  );
}
process.exit(1);
