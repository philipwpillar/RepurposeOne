#!/usr/bin/env node

/**
 * Voice Variants v1 separation protocol (criterion 5).
 *
 * Hold source, identity, samples, model, temperature, and token budget constant.
 * Change only the variant fragment. Measure mechanical separation and write a
 * foreign-voice control for the fidelity half of the test.
 *
 * Run:
 *   OPENROUTER_API_KEY=... npm run variant-separation
 *   # or: node --experimental-strip-types scripts/variant-separation.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.log(
    "OPENROUTER_API_KEY is not set. Run `npm run variant-separation` with a key, then review docs/acceptance/variant-separation-artefact.md. Stub exit does not satisfy criterion 5."
  );
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const variantsMod = await import(
  pathToFileURL(path.join(root, "lib/ai/voice-variants.ts")).href
);

const {
  VOICE_VARIANTS,
  VOICE_VARIANT_BY_ID,
  VOICE_IDENTITY_PRECEDENCE,
  VOICE_VARIANT_IDS,
} = variantsMod;

const model =
  process.env.VARIANT_SEPARATION_MODEL || "qwen/qwen3.5-397b-a17b";
// Always pin the production allowlist. Do not inherit AI_MODEL_* overrides -
// a local GPT/Claude override has no deepinfra/fp8 endpoint.
const providers = ["deepinfra/fp8"];

const REPEATS = 3;
const FORMATS = [
  {
    id: "x_thread",
    system:
      "Write a short X/Twitter thread of 3 to 5 tweets. Return plain text only, one tweet per line, numbered.",
  },
  {
    id: "linkedin",
    system: "Write one short LinkedIn post. Return plain text only.",
  },
  {
    id: "instagram",
    system: "Write one short Instagram caption. Return plain text only.",
  },
];

const primaryIdentity =
  "Direct, concrete writing. Short paragraphs. Prefer plain verbs and specific mechanisms.";
const primarySamples = [
  "A good workflow removes decisions at the moment they become expensive. Decide the structure first. Then make each draft earn its place.",
  "Ship the smallest version that teaches the point. Cut the rest. Readers stay when every line pays rent.",
];
const foreignIdentity =
  "Warm, reflective newsletter voice. Soft transitions. Prefer questions and shared feeling over hard claims.";
const foreignSamples = [
  "I keep coming back to the quiet mornings before a launch, when the only job is to notice what still feels unfinished.",
];
const source =
  "Teams often publish the same draft everywhere. Platform constraints change how readers scan, respond, and decide whether to continue. A useful repurposing workflow preserves the idea while rebuilding its delivery for each destination.";

const HEDGE_RE =
  /\b(might|perhaps|maybe|possibly|arguably|somewhat|could be|in my opinion|i think|seems|appears)\b/gi;
const STOPWORDS = new Set(
  `a an the and or but if in on at to for of as is was are were be been being this that these those it its with from by into over after before about between through during without within along across behind beyond under above than then so such own same too very can will just also only other into our their my we they he she me him her us them not no nor more most some any each few many much who whom which what when where why how all both did do does doing done have has had having`.split(
    /\s+/
  )
);
const PRONOUNS_FIRST = new Set([
  "i",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
]);
const PRONOUNS_SECOND = new Set(["you", "your", "yours"]);

function allTokens(text) {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function contentTokens(text) {
  return allTokens(text).filter(
    (w) =>
      !STOPWORDS.has(w) &&
      !PRONOUNS_FIRST.has(w) &&
      !PRONOUNS_SECOND.has(w) &&
      w.length > 2
  );
}

function sentenceList(text) {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function meanSentenceLength(text) {
  const ss = sentenceList(text);
  if (!ss.length) return 0;
  const lengths = ss.map((s) => contentTokens(s).length);
  return lengths.reduce((a, b) => a + b, 0) / lengths.length;
}

function hedgeCount(text) {
  return (text.match(HEDGE_RE) || []).length;
}

function personRatio(text) {
  const tokens = allTokens(text);
  if (!tokens.length) return { first: 0, second: 0 };
  let first = 0;
  let second = 0;
  for (const t of tokens) {
    if (PRONOUNS_FIRST.has(t)) first += 1;
    if (PRONOUNS_SECOND.has(t)) second += 1;
  }
  return { first: first / tokens.length, second: second / tokens.length };
}

function lexiconOverlap(text, lexicon) {
  if (!lexicon.size) return 0;
  const tokens = new Set(contentTokens(text));
  let hit = 0;
  for (const w of lexicon) {
    if (tokens.has(w)) hit += 1;
  }
  return hit / lexicon.size;
}

function metrics(text, lexicon) {
  const pr = personRatio(text);
  return {
    meanSentenceLength: Number(meanSentenceLength(text).toFixed(2)),
    hedgeCount: hedgeCount(text),
    firstPersonRatio: Number(pr.first.toFixed(4)),
    secondPersonRatio: Number(pr.second.toFixed(4)),
    lexiconOverlap: Number(lexiconOverlap(text, lexicon).toFixed(4)),
  };
}

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function generateOnce({ system, identity, samples, fragment }) {
  const sampleBlock = samples
    .map((s, i) => `--- Sample ${i + 1} ---\n${s}`)
    .join("\n\n");
  const body = JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: 700,
    provider: { only: [...providers] },
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Voice identity:\n${identity}\n${VOICE_IDENTITY_PRECEDENCE}\n\nDelivery variant:\n${fragment}\n\nWriting samples:\n${sampleBlock}\n\nSource content:\n${source}`,
      },
    ],
  });

  let lastError = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.min(60_000, 2000 * 2 ** (attempt - 1));
      process.stderr.write(`Retry ${attempt} after ${waitMs}ms...\n`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      }
    );
    if (response.status === 429) {
      lastError = await response.text();
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `request failed: ${response.status} ${await response.text()}`
      );
    }
    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content?.trim();
    if (content) return content;
    throw new Error(
      `empty content from model (finish=${data.choices?.[0]?.finish_reason}, hasReasoning=${Boolean(message?.reasoning)})`
    );
  }
  throw new Error(`rate-limited after retries: ${lastError}`);
}

const primaryLexicon = new Set([
  ...contentTokens(primaryIdentity),
  ...primarySamples.flatMap(contentTokens),
]);

const cells = [];

for (const format of FORMATS) {
  for (const variantId of VOICE_VARIANT_IDS) {
    const fragment = VOICE_VARIANT_BY_ID[variantId].promptFragment;
    const runs = [];
    for (let i = 0; i < REPEATS; i++) {
      process.stderr.write(`Generating ${format.id}/${variantId} run ${i + 1}...\n`);
      const text = await generateOnce({
        system: format.system,
        identity: primaryIdentity,
        samples: primarySamples,
        fragment,
      });
      runs.push({
        text,
        metrics: metrics(text, primaryLexicon),
      });
    }
    cells.push({
      format: format.id,
      variant: variantId,
      voice: "primary",
      runs,
      meanMetrics: {
        meanSentenceLength: Number(
          mean(runs.map((r) => r.metrics.meanSentenceLength)).toFixed(2)
        ),
        hedgeCount: Number(
          mean(runs.map((r) => r.metrics.hedgeCount)).toFixed(2)
        ),
        firstPersonRatio: Number(
          mean(runs.map((r) => r.metrics.firstPersonRatio)).toFixed(4)
        ),
        secondPersonRatio: Number(
          mean(runs.map((r) => r.metrics.secondPersonRatio)).toFixed(4)
        ),
        lexiconOverlap: Number(
          mean(runs.map((r) => r.metrics.lexiconOverlap)).toFixed(4)
        ),
      },
    });
  }
}

const foreignLexicon = new Set([
  ...contentTokens(foreignIdentity),
  ...foreignSamples.flatMap(contentTokens),
]);
const foreignFragment = VOICE_VARIANT_BY_ID.signature.promptFragment;
const foreignRuns = [];
for (let i = 0; i < REPEATS; i++) {
  process.stderr.write(`Generating foreign/linkedin/signature run ${i + 1}...\n`);
  const text = await generateOnce({
    system: FORMATS.find((f) => f.id === "linkedin").system,
    identity: foreignIdentity,
    samples: foreignSamples,
    fragment: foreignFragment,
  });
  foreignRuns.push({
    text,
    metrics: metrics(text, foreignLexicon),
    primaryLexiconOverlap: lexiconOverlap(text, primaryLexicon),
  });
}

function cell(format, variant) {
  return cells.find((c) => c.format === format && c.variant === variant);
}

function separates(a, b, minDelta) {
  return Math.abs(a - b) >= minDelta;
}

const linkedInExplain = cell("linkedin", "explain").meanMetrics;
const linkedInProvoke = cell("linkedin", "provoke").meanMetrics;
const xExplain = cell("x_thread", "explain").meanMetrics;
const xProvoke = cell("x_thread", "provoke").meanMetrics;

const mechanicalPass =
  separates(
    linkedInExplain.meanSentenceLength,
    linkedInProvoke.meanSentenceLength,
    2
  ) &&
  separates(
    linkedInExplain.secondPersonRatio,
    linkedInProvoke.secondPersonRatio,
    0.02
  ) &&
  separates(xExplain.meanSentenceLength, xProvoke.meanSentenceLength, 1.5);

const overlaps = cells.map((c) => c.meanMetrics.lexiconOverlap);
const lexiconFlat =
  Math.max(...overlaps) - Math.min(...overlaps) <= 0.25 &&
  Math.min(...overlaps) >= 0.05;

const artefactPath = path.join(
  root,
  "docs/acceptance/variant-separation-artefact.md"
);

const lines = [];
lines.push(`# Voice variant separation artefact`);
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Model: ${model}`);
lines.push(`Provider pin: ${providers.join(", ")}`);
lines.push(`Repeats per cell: ${REPEATS}`);
lines.push(`Formats: ${FORMATS.map((f) => f.id).join(", ")}`);
lines.push("");
lines.push(`## Mechanical gate`);
lines.push("");
lines.push(
  `- explain vs provoke sentence-length / second-person separation: **${mechanicalPass ? "PASS" : "FAIL"}**`
);
lines.push(
  `- lexicon overlap stays relatively flat across variants: **${lexiconFlat ? "PASS" : "FAIL"}**`
);
lines.push("");
lines.push(`### Mean metrics by format × variant`);
lines.push("");
lines.push(
  `| format | variant | meanSentenceLength | hedgeCount | firstPersonRatio | secondPersonRatio | lexiconOverlap |`
);
lines.push(`|---|---|---:|---:|---:|---:|---:|`);
for (const c of cells) {
  const m = c.meanMetrics;
  lines.push(
    `| ${c.format} | ${c.variant} | ${m.meanSentenceLength} | ${m.hedgeCount} | ${m.firstPersonRatio} | ${m.secondPersonRatio} | ${m.lexiconOverlap} |`
  );
}
lines.push("");
lines.push(`## Foreign-voice control (LinkedIn / signature)`);
lines.push("");
lines.push(
  `Primary-lexicon overlap on foreign outputs (mean): **${Number(
    mean(foreignRuns.map((r) => r.primaryLexiconOverlap)).toFixed(4)
  )}**`
);
lines.push("");
for (let i = 0; i < foreignRuns.length; i++) {
  lines.push(`### foreign run ${i + 1}`);
  lines.push("");
  lines.push(foreignRuns[i].text);
  lines.push("");
}
lines.push(`## Primary outputs`);
lines.push("");
for (const c of cells) {
  lines.push(`### ${c.format} / ${c.variant}`);
  lines.push("");
  c.runs.forEach((run, i) => {
    lines.push(`#### run ${i + 1}`);
    lines.push("");
    lines.push(run.text);
    lines.push("");
    lines.push(
      `metrics: meanSentenceLength=${run.metrics.meanSentenceLength}, hedgeCount=${run.metrics.hedgeCount}, first=${run.metrics.firstPersonRatio}, second=${run.metrics.secondPersonRatio}, lexiconOverlap=${run.metrics.lexiconOverlap}`
    );
    lines.push("");
  });
}
lines.push(`## Reviewer result`);
lines.push("");
lines.push(
  `- [ ] Mechanical gate passed (sentence length + hedges separate; lexicon flat).`
);
lines.push(
  `- [ ] Blind match of unlabeled outputs to variant labels is well above chance.`
);
lines.push(
  `- [ ] Foreign-voice control is the odd one out against primary-voice outputs.`
);
lines.push(
  `- [ ] Criterion 5 may be claimed only after the three boxes above are checked.`
);
lines.push("");
lines.push(`Reviewer:`);
lines.push("");
lines.push(`Notes:`);
lines.push("");

await fs.writeFile(artefactPath, lines.join("\n"));
console.log(`Wrote ${artefactPath}`);
console.log(
  `Mechanical gate: ${mechanicalPass && lexiconFlat ? "PASS" : "FAIL"} (separation=${mechanicalPass}, lexiconFlat=${lexiconFlat})`
);
if (!(mechanicalPass && lexiconFlat)) process.exit(1);
