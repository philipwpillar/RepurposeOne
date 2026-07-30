#!/usr/bin/env node

/**
 * Voice Variants v1 separation protocol (criterion 5).
 *
 * Hold source, identity, samples, model, temperature, and token budget constant.
 * Change only the variant fragment. Measure mechanical separation and write a
 * foreign-voice control for the fidelity half of the test.
 *
 * Fixture identity is deliberately mid-register (not already in the provoke
 * register) so signature-vs-provoke collapse is detectable.
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
const configMod = await import(
  pathToFileURL(path.join(root, "lib/config.ts")).href
);

const {
  VOICE_VARIANT_BY_ID,
  VOICE_IDENTITY_PRECEDENCE,
  VOICE_VARIANT_IDS,
} = variantsMod;

const model =
  process.env.VARIANT_SEPARATION_MODEL || "qwen/qwen3.5-397b-a17b";
// Always pin the production allowlist. Do not inherit AI_MODEL_* overrides -
// a local GPT/Claude override has no deepinfra/fp8 endpoint.
const providers = ["deepinfra/fp8"];
// Match production generation temperature (AI_CONFIG / AI_TEMPERATURE).
const temperature = configMod.AI_CONFIG.temperature;

const REPEATS = 3;
const FORMATS = [
  {
    id: "x_thread",
    system:
      "Write a short X/Twitter thread of 3 to 5 tweets. Return plain text only, one tweet per line, numbered.",
    sentenceDelta: 1.5,
    secondDelta: 0.015,
  },
  {
    id: "linkedin",
    system: "Write one short LinkedIn post. Return plain text only.",
    sentenceDelta: 2,
    secondDelta: 0.02,
  },
  {
    id: "instagram",
    system: "Write one short Instagram caption. Return plain text only.",
    sentenceDelta: 2,
    secondDelta: 0.02,
  },
];

// Mid-register fixture: must not already sit in the provoke register
// ("Direct, concrete… Short paragraphs…") or signature/provoke cannot separate.
const primaryIdentity =
  "Practitioner writing for operators who ship work. Prefer concrete examples and plain language. Mix short lines with fuller explanations when a point needs room. Sound like a thoughtful peer, not a manifesto and not a tutorial script.";
const primarySamples = [
  "Most teams do not fail because they lack ideas. They fail because the same draft is asked to work in three rooms that reward different kinds of attention. The fix is usually structural: decide what the reader must do next, then rebuild the opening for that room.",
  "When I review a launch note, I look for one decision the reader can take without a meeting. If that decision is buried under context, I move it up. Context still matters, but only after the reader knows why they are there.",
  "A useful habit is to keep a short list of phrases you refuse to reuse across channels. Not because repetition is wrong, but because each channel trains a different ear. Rebuilding the line is cheaper than explaining why the original felt off.",
  "I still draft long first. Then I cut until the remaining sentences each carry a job: frame the problem, name the mechanism, or ask for the next step. Anything that only reassures me gets deleted.",
];
const foreignIdentity =
  "Warm, reflective newsletter voice. Soft transitions. Prefer questions and shared feeling over hard claims.";
const foreignSamples = [
  "I keep coming back to the quiet mornings before a launch, when the only job is to notice what still feels unfinished.",
  "Have you ever shared the same draft everywhere, hoping it would land the same way? It is a common feeling, isn't it? Yet every space has its own rhythm.",
  "Perhaps the kindest thing we can do for our ideas is to let them breathe in new shapes, rebuilding the delivery while keeping the heart of the message intact.",
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
  // Full word count (not content-only) so instruction bands like 8–14 / 15–22
  // are measurable against what the model was asked to produce.
  const lengths = ss.map((s) => allTokens(s).length);
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

function charNgrams(text, n = 4) {
  const s = text.toLowerCase().replace(/\s+/g, " ").trim();
  const grams = new Set();
  for (let i = 0; i <= s.length - n; i++) grams.add(s.slice(i, i + n));
  return grams;
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

/**
 * Share of output char-n-grams that are distinctive to the primary samples
 * (present in primary samples, absent from foreign samples). Absolute Jaccard
 * against the full primary set collapses on short provoke cells and lets
 * foreign warm prose sit inside the primary range; distinctive precision
 * measures identity leakage without that length bias.
 */
function distinctivePrecision(text, distinctiveGrams) {
  const grams = charNgrams(text);
  if (!grams.size || !distinctiveGrams.size) return 0;
  let hit = 0;
  for (const g of grams) {
    if (distinctiveGrams.has(g)) hit += 1;
  }
  return hit / grams.size;
}

/** Character n-gram similarity against sample text (report-only). */
function sampleFidelity(text, sampleGrams) {
  return jaccard(charNgrams(text), sampleGrams);
}

/** Legacy content-word overlap; reported only, not used for the gate. */
function lexiconOverlap(text, lexicon) {
  if (!lexicon.size) return 0;
  const tokens = new Set(contentTokens(text));
  let hit = 0;
  for (const w of lexicon) {
    if (tokens.has(w)) hit += 1;
  }
  return hit / lexicon.size;
}

function metrics(text, lexicon, distinctiveGrams, primaryGrams) {
  const pr = personRatio(text);
  return {
    meanSentenceLength: Number(meanSentenceLength(text).toFixed(2)),
    hedgeCount: hedgeCount(text),
    firstPersonRatio: Number(pr.first.toFixed(4)),
    secondPersonRatio: Number(pr.second.toFixed(4)),
    lexiconOverlap: Number(lexiconOverlap(text, lexicon).toFixed(4)),
    sampleFidelity: Number(sampleFidelity(text, primaryGrams).toFixed(4)),
    distinctivePrecision: Number(
      distinctivePrecision(text, distinctiveGrams).toFixed(4)
    ),
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
    temperature,
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
const primarySampleGrams = charNgrams(primarySamples.join("\n"));
const foreignSampleGrams = charNgrams(foreignSamples.join("\n"));
const distinctivePrimaryGrams = new Set(
  [...primarySampleGrams].filter((g) => !foreignSampleGrams.has(g))
);

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
        metrics: metrics(
          text,
          primaryLexicon,
          distinctivePrimaryGrams,
          primarySampleGrams
        ),
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
        sampleFidelity: Number(
          mean(runs.map((r) => r.metrics.sampleFidelity)).toFixed(4)
        ),
        distinctivePrecision: Number(
          mean(runs.map((r) => r.metrics.distinctivePrecision)).toFixed(4)
        ),
      },
    });
  }
}

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
  const m = metrics(
    text,
    primaryLexicon,
    distinctivePrimaryGrams,
    primarySampleGrams
  );
  foreignRuns.push({
    text,
    metrics: m,
    primaryLexiconOverlap: lexiconOverlap(text, primaryLexicon),
    primarySampleFidelity: sampleFidelity(text, primarySampleGrams),
    distinctivePrecision: m.distinctivePrecision,
  });
}

function cell(format, variant) {
  return cells.find((c) => c.format === format && c.variant === variant);
}

function pairSeparates(a, b, sentenceDelta, secondDelta) {
  return (
    Math.abs(a.meanSentenceLength - b.meanSentenceLength) >= sentenceDelta ||
    Math.abs(a.secondPersonRatio - b.secondPersonRatio) >= secondDelta
  );
}

const pairFailures = [];
const explainSecondFailures = [];
const explainSentenceFailures = [];

for (const format of FORMATS) {
  const sig = cell(format.id, "signature").meanMetrics;
  const exp = cell(format.id, "explain").meanMetrics;
  const prov = cell(format.id, "provoke").meanMetrics;
  const pairs = [
    ["signature", "explain", sig, exp],
    ["signature", "provoke", sig, prov],
    ["explain", "provoke", exp, prov],
  ];
  for (const [left, right, a, b] of pairs) {
    if (!pairSeparates(a, b, format.sentenceDelta, format.secondDelta)) {
      pairFailures.push(
        `${format.id}: ${left} vs ${right} (Δsent=${Math.abs(
          a.meanSentenceLength - b.meanSentenceLength
        ).toFixed(2)}, Δ2nd=${Math.abs(
          a.secondPersonRatio - b.secondPersonRatio
        ).toFixed(4)}; need sent≥${format.sentenceDelta} or 2nd≥${format.secondDelta})`
      );
    }
  }
  // Signed direction: explain sentences must be longer than provoke
  // (fragment bands 15–22 vs 8–14). Absolute Δ alone cannot catch inversion.
  if (
    !(exp.meanSentenceLength >= prov.meanSentenceLength + format.sentenceDelta)
  ) {
    explainSentenceFailures.push(
      `${format.id}: explain meanSentenceLength (${exp.meanSentenceLength}) not ≥ provoke (${prov.meanSentenceLength}) + ${format.sentenceDelta}`
    );
  }
  // Explain must address the reader; signature/provoke must not match that cue.
  if (!(exp.secondPersonRatio > sig.secondPersonRatio + 0.01)) {
    explainSecondFailures.push(
      `${format.id}: explain secondPerson (${exp.secondPersonRatio}) not above signature (${sig.secondPersonRatio})`
    );
  }
  if (!(exp.secondPersonRatio > prov.secondPersonRatio + 0.01)) {
    explainSecondFailures.push(
      `${format.id}: explain secondPerson (${exp.secondPersonRatio}) not above provoke (${prov.secondPersonRatio})`
    );
  }
}

const mechanicalPass =
  pairFailures.length === 0 &&
  explainSecondFailures.length === 0 &&
  explainSentenceFailures.length === 0;

const precisions = cells.map((c) => c.meanMetrics.distinctivePrecision);
const precisionMin = Math.min(...precisions);
const precisionMax = Math.max(...precisions);
const precisionFlat = precisionMax - precisionMin <= 0.12;

const foreignPrecisionMean = mean(
  foreignRuns.map((r) => r.distinctivePrecision)
);
// Foreign voice must sit clearly below every primary cell on distinctive grams.
const fidelityDiscriminates = foreignPrecisionMean < precisionMin - 0.05;

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
lines.push(`Temperature: ${temperature} (from AI_CONFIG)`);
lines.push(`Repeats per cell: ${REPEATS}`);
lines.push(`Formats: ${FORMATS.map((f) => f.id).join(", ")}`);
lines.push("");
lines.push(`## Fixture`);
lines.push("");
lines.push(
  `Primary identity (mid-register, not provoke-shaped): ${primaryIdentity}`
);
lines.push("");
lines.push(`Primary samples: ${primarySamples.length} (expanded for n-gram fidelity).`);
lines.push("");
lines.push(`## Mechanical gate`);
lines.push("");
lines.push(
  `- all variant pairs separate on sentence length or second-person (every format): **${
    pairFailures.length === 0 ? "PASS" : "FAIL"
  }**`
);
lines.push(
  `- explain mean sentence length ≥ provoke + format delta (signed, every format): **${
    explainSentenceFailures.length === 0 ? "PASS" : "FAIL"
  }**`
);
lines.push(
  `- explain second-person above signature and provoke (every format): **${
    explainSecondFailures.length === 0 ? "PASS" : "FAIL"
  }**`
);
lines.push(
  `- distinctive sample n-gram precision stays flat across primary variants (max−min ≤ 0.12): **${
    precisionFlat ? "PASS" : "FAIL"
  }** (spread=${(precisionMax - precisionMin).toFixed(4)})`
);
lines.push(
  `- foreign distinctive precision below every primary cell by ≥ 0.05: **${
    fidelityDiscriminates ? "PASS" : "FAIL"
  }** (foreign=${foreignPrecisionMean.toFixed(4)}, primaryMin=${precisionMin.toFixed(4)})`
);
lines.push("");
if (pairFailures.length) {
  lines.push(`### Pair separation failures`);
  lines.push("");
  for (const f of pairFailures) lines.push(`- ${f}`);
  lines.push("");
}
if (explainSentenceFailures.length) {
  lines.push(`### Explain sentence-length direction failures`);
  lines.push("");
  for (const f of explainSentenceFailures) lines.push(`- ${f}`);
  lines.push("");
}
if (explainSecondFailures.length) {
  lines.push(`### Explain second-person failures`);
  lines.push("");
  for (const f of explainSecondFailures) lines.push(`- ${f}`);
  lines.push("");
}
lines.push(`### Logged follow-ups (non-blocking)`);
lines.push("");
lines.push(
  `- Signature is often the shortest variant; confirm that is acceptable for the Instagram/default path.`
);
lines.push(
  `- Distinctive n-gram precision is partly constructed (foreign samples define the complement). It gates sample-tracking, not independent identity retention under a lean.`
);
lines.push(
  `- Eyeball primary outputs for parroting: distinctive precision around 0.2–0.3 means substantial surface echo of the four samples.`
);
lines.push(
  `- At temperature 0.7, X threads can still collapse signature vs provoke on sentence length even when LinkedIn/Instagram order correctly (explain > signature > provoke).`
);
lines.push("");
lines.push(`### Mean metrics by format × variant`);
lines.push("");
lines.push(
  `| format | variant | meanSentenceLength | hedgeCount | firstPersonRatio | secondPersonRatio | lexiconOverlap (report-only) | sampleFidelity (report-only) | distinctivePrecision |`
);
lines.push(`|---|---|---:|---:|---:|---:|---:|---:|---:|`);
for (const c of cells) {
  const m = c.meanMetrics;
  lines.push(
    `| ${c.format} | ${c.variant} | ${m.meanSentenceLength} | ${m.hedgeCount} | ${m.firstPersonRatio} | ${m.secondPersonRatio} | ${m.lexiconOverlap} | ${m.sampleFidelity} | ${m.distinctivePrecision} |`
  );
}
lines.push("");
lines.push(`## Foreign-voice control (LinkedIn / signature)`);
lines.push("");
lines.push(
  `Distinctive primary-sample n-gram precision on foreign outputs (mean): **${Number(
    foreignPrecisionMean.toFixed(4)
  )}**`
);
lines.push(
  `Primary-sample n-gram fidelity on foreign outputs (mean, report-only): **${Number(
    mean(foreignRuns.map((r) => r.primarySampleFidelity)).toFixed(4)
  )}**`
);
lines.push(
  `Legacy primary-lexicon overlap on foreign outputs (mean, report-only): **${Number(
    mean(foreignRuns.map((r) => r.primaryLexiconOverlap)).toFixed(4)
  )}**`
);
lines.push("");
for (let i = 0; i < foreignRuns.length; i++) {
  lines.push(`### foreign run ${i + 1}`);
  lines.push("");
  lines.push(foreignRuns[i].text);
  lines.push("");
  lines.push(
    `metrics: distinctivePrecision=${foreignRuns[i].distinctivePrecision.toFixed(4)}, sampleFidelity=${foreignRuns[i].primarySampleFidelity.toFixed(4)}, lexiconOverlap=${foreignRuns[i].primaryLexiconOverlap.toFixed(4)}`
  );
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
      `metrics: meanSentenceLength=${run.metrics.meanSentenceLength}, hedgeCount=${run.metrics.hedgeCount}, first=${run.metrics.firstPersonRatio}, second=${run.metrics.secondPersonRatio}, lexiconOverlap=${run.metrics.lexiconOverlap}, sampleFidelity=${run.metrics.sampleFidelity}, distinctivePrecision=${run.metrics.distinctivePrecision}`
    );
    lines.push("");
  });
}
lines.push(`## Reviewer result`);
lines.push("");
lines.push(
  `- [ ] Mechanical gate passed (all pairs separate; explain second-person; distinctive precision flat + foreign lower).`
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

const gatePass =
  mechanicalPass && precisionFlat && fidelityDiscriminates;
console.log(`Wrote ${artefactPath}`);
console.log(
  `Mechanical gate: ${gatePass ? "PASS" : "FAIL"} (pairs=${
    pairFailures.length === 0
  }, explainSent=${explainSentenceFailures.length === 0}, explain2nd=${
    explainSecondFailures.length === 0
  }, precisionFlat=${precisionFlat}, foreignBelow=${fidelityDiscriminates})`
);
if (pairFailures.length) {
  console.error("Pair failures:\n" + pairFailures.map((f) => `  - ${f}`).join("\n"));
}
if (explainSentenceFailures.length) {
  console.error(
    "Explain sentence-length direction failures:\n" +
      explainSentenceFailures.map((f) => `  - ${f}`).join("\n")
  );
}
if (explainSecondFailures.length) {
  console.error(
    "Explain second-person failures:\n" +
      explainSecondFailures.map((f) => `  - ${f}`).join("\n")
  );
}
if (!gatePass) process.exit(1);
