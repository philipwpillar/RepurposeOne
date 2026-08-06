#!/usr/bin/env node

/**
 * Voice learning eval harness (brief-voice-learning-v2 Stage B).
 *
 * Offline assertions always run. Live assertions run only when
 * OPENROUTER_API_KEY is set. Missing key skips live work with a log; it does
 * not prevent offline checks.
 *
 * E3 / E4 / E5 are EXPECTED_FAIL against main until Stage C
 * (`fix/voice-exemplar-correctness`). They are recorded as expected-red so
 * this stage can ship without gating CI. Stage C removes those entries once
 * the bugs are fixed and wires `voice-eval` into CI.
 *
 * Run:
 *   npm run voice-eval
 *   OPENROUTER_API_KEY=... npm run voice-eval
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apiKey = process.env.OPENROUTER_API_KEY;

const variantsMod = await import(
  pathToFileURL(path.join(root, "lib/ai/voice-variants.ts")).href
);
const exemplarsMod = await import(
  pathToFileURL(path.join(root, "lib/ai/exemplars.ts")).href
);
const promptsMod = await import(
  pathToFileURL(path.join(root, "lib/ai/prompts.ts")).href
);
const configMod = await import(
  pathToFileURL(path.join(root, "lib/config.ts")).href
);

const {
  assembleVoiceLayers,
  buildVoiceIdentityBlock,
  VOICE_IDENTITY_PRECEDENCE,
  VOICE_VARIANT_BY_ID,
} = variantsMod;
const { buildVoiceExemplars, fetchVoiceExemplarsText } = exemplarsMod;
// Touch prompts so the import stays honest (Stage C/D may extend PromptContext).
void promptsMod.buildBrandVoiceBlock;

// Pin production allowlist. Do not inherit AI_MODEL_* overrides - a local
// GPT/Claude override has no deepinfra/fp8 endpoint.
const providers = ["deepinfra/fp8"];
const model = "qwen/qwen3.5-397b-a17b";
const temperature = configMod.AI_CONFIG.temperature;

/**
 * Known-red against main. Stage C removes an id from this map when that
 * assertion goes green, then wires voice-eval into CI.
 */
const EXPECTED_FAIL_UNTIL = {
  E3: "Stage C (negative exemplar polarity)",
  E4: "Stage C (brand_voice_id exemplar scope)",
  E5: "Stage C (voice_range injection)",
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VOICE_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VOICE_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VOICE_C_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const VOICE_B_MARKER =
  "VOICE_B_ONLY_MARKER_blunt_contrarian_never_hedge_xyz";
const USER_CORRECTED_MARKER =
  "USER_CORRECTED_VOICE_MARKER_should_not_appear_in_negative";
const DISLIKED_MODEL_MARKER =
  "DISLIKED_MODEL_OUTPUT_MARKER_generic_hedging_style";
const VOICE_RANGE_SUMMARY_A =
  "VOICE_RANGE_SUMMARY_MARKER_terse_technical_short_claims";

const brandVoices = {
  terse: {
    id: VOICE_A_ID,
    description:
      "Terse technical operator voice. Short claims. Prefer nouns over adjectives. No fluff.",
    samples: [
      "Ship the smallest change that proves the path. Everything else is inventory.",
      "Latency budgets are product decisions. Treat them that way in the write-up.",
      "If the reader cannot act in one step, the draft is not finished.",
    ],
    voice_range: {
      summary: VOICE_RANGE_SUMMARY_A,
      sampleMarkers: [
        { index: 0, position: "opening claim" },
        { index: 1, position: "constraint" },
      ],
    },
  },
  warm: {
    id: VOICE_B_ID,
    description:
      "Warm discursive newsletter voice. Soft transitions. Prefer shared feeling and questions.",
    samples: [
      `I keep returning to the quiet work behind a launch. ${VOICE_B_MARKER}`,
      "Have you noticed how the same idea needs a different breath in each room?",
      "Perhaps the kindest edit is the one that leaves space for the reader.",
    ],
    voice_range: {
      summary: "Warm, reflective, question-led pacing with soft transitions.",
      sampleMarkers: [{ index: 0, position: "reflective open" }],
    },
  },
  blunt: {
    id: VOICE_C_ID,
    description:
      "Blunt contrarian. Lead with disagreement. Cut filler. Name the bad advice.",
    samples: [
      "Most thought-leadership threads are recycled certainty. Start with the cut instead.",
      "Stop asking for alignment. Ask who owns the decision and by when.",
      "If it needs a preamble, it is not the point yet.",
    ],
    voice_range: {
      summary: "Blunt, disagree-first, short paragraphs, zero softener.",
      sampleMarkers: [{ index: 0, position: "contrarian open" }],
    },
  },
};

const sources = {
  news: "A major cloud provider announced regional capacity limits for AI inference this quarter, forcing teams to redesign batching and caching strategies.",
  anecdote:
    "Last Tuesday I watched a founder rewrite the same launch post four times because each channel punished a different sentence.",
  technical:
    "The queue drained in 40ms under load until a retry storm doubled write amplification and p99 crossed 800ms.",
  opinion:
    "Remote-first is not a perk policy. It is an operating model, and most companies still staff as if the office were the default truth.",
};

function linkedInOutput(post) {
  return {
    format: "linkedin",
    post,
    carousel_slides: [
      { number: 1, title: "One", body: "Point one." },
      { number: 2, title: "Two", body: "Point two." },
      { number: 3, title: "Three", body: "Point three." },
    ],
  };
}

/** Rows shaped for buildVoiceExemplars / Stage C ranking. */
const exemplarFixtureRows = [
  {
    brand_voice_id: VOICE_A_ID,
    user_rating: -1,
    output: linkedInOutput(
      `Generic draft with hedging. ${DISLIKED_MODEL_MARKER} It might perhaps work.`
    ),
    user_output: linkedInOutput(
      `Edited into the user's real voice. ${USER_CORRECTED_MARKER}`
    ),
    edited_at: "2026-08-01T12:00:00.000Z",
    created_at: "2026-08-01T11:00:00.000Z",
  },
  {
    brand_voice_id: VOICE_B_ID,
    user_rating: 1,
    output: linkedInOutput(`Warm liked draft. ${VOICE_B_MARKER}`),
    user_output: null,
    edited_at: null,
    created_at: "2026-08-02T12:00:00.000Z",
  },
  {
    brand_voice_id: VOICE_A_ID,
    user_rating: 1,
    output: linkedInOutput("Terse liked draft without edit."),
    user_output: null,
    edited_at: null,
    created_at: "2026-08-03T12:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Result bookkeeping
// ---------------------------------------------------------------------------

/** @type {{ id: string, status: string, detail: string }[]} */
const results = [];

function record(id, status, detail) {
  results.push({ id, status, detail });
  const tag =
    status === "PASS"
      ? "PASS"
      : status === "EXPECTED_FAIL"
        ? "EXPECTED_FAIL"
        : status === "SKIP"
          ? "SKIP"
          : status === "ADVISORY_FAIL"
            ? "ADVISORY_FAIL"
            : "FAIL";
  console.log(`[${tag}] ${id}: ${detail}`);
}

function expectFailOrPass(id, ok, detail) {
  if (ok) {
    if (EXPECTED_FAIL_UNTIL[id]) {
      record(
        id,
        "FAIL",
        `${detail} (was listed as expected-red for ${EXPECTED_FAIL_UNTIL[id]}; remove from EXPECTED_FAIL_UNTIL)`
      );
      return;
    }
    record(id, "PASS", detail);
    return;
  }
  if (EXPECTED_FAIL_UNTIL[id]) {
    record(
      id,
      "EXPECTED_FAIL",
      `${detail} - expected until ${EXPECTED_FAIL_UNTIL[id]}`
    );
    return;
  }
  record(id, "FAIL", detail);
}

// ---------------------------------------------------------------------------
// Metrics (live)
// ---------------------------------------------------------------------------

function allTokens(text) {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function charNgrams(text, n = 4) {
  const s = text.toLowerCase().replace(/\s+/g, " ").trim();
  const grams = new Set();
  for (let i = 0; i <= s.length - n; i++) grams.add(s.slice(i, i + n));
  return grams;
}

function jaccardDistance(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  if (!union) return 0;
  return 1 - inter / union;
}

function lexicalDistance(textA, textB) {
  return jaccardDistance(charNgrams(textA), charNgrams(textB));
}

const HEDGE_RE =
  /\b(might|perhaps|arguably|in my opinion)\b/gi;

function hedgeHits(text) {
  return text.match(HEDGE_RE) || [];
}

async function generateOnce({ system, user }) {
  const body = JSON.stringify({
    model,
    temperature,
    max_tokens: 500,
    provider: { only: [...providers] },
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.min(30_000, 1500 * 2 ** (attempt - 1));
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
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) return content;
    throw new Error("empty content from model");
  }
  throw new Error(`rate-limited after retries: ${lastError}`);
}

// ---------------------------------------------------------------------------
// Offline assertions
// ---------------------------------------------------------------------------

function runE3() {
  // Stage C: negative polarity must use output only, never user_output.
  const block = buildVoiceExemplars([
    {
      user_rating: -1,
      output: exemplarFixtureRows[0].output,
      user_output: exemplarFixtureRows[0].user_output,
      created_at: exemplarFixtureRows[0].created_at,
    },
  ]);
  const leaked = block.includes(USER_CORRECTED_MARKER);
  const hasDisliked = block.includes(DISLIKED_MODEL_MARKER);
  expectFailOrPass(
    "E3",
    !leaked && hasDisliked,
    leaked
      ? `negative exemplar block contains user_output marker (${USER_CORRECTED_MARKER})`
      : !hasDisliked
        ? `negative block missing disliked model marker (${DISLIKED_MODEL_MARKER}); measured block length=${block.length}`
        : "negative block uses model output only"
  );
}

function runE4() {
  // Stage C: fetchVoiceExemplarsText gains required brandVoiceId (4th arg).
  // On main arity is 3, so multi-voice rows cannot be scoped at the fetch.
  const arity = fetchVoiceExemplarsText.length;
  const hasBrandVoiceParam = arity >= 4;

  const voiceARows = exemplarFixtureRows
    .filter((r) => r.brand_voice_id === VOICE_A_ID)
    .map((r) => ({
      user_rating: r.user_rating,
      output: r.output,
      user_output: r.user_output,
      created_at: r.created_at,
    }));
  const scopedText = buildVoiceExemplars(voiceARows);
  const scopedClean = !scopedText.includes(VOICE_B_MARKER);

  // Unscoped assembly (main behaviour) mixes voices - documents the bug.
  const unscopedText = buildVoiceExemplars(
    exemplarFixtureRows.map((r) => ({
      user_rating: r.user_rating,
      output: r.output,
      user_output: r.user_output,
      created_at: r.created_at,
    }))
  );
  const unscopedLeaks = unscopedText.includes(VOICE_B_MARKER);

  expectFailOrPass(
    "E4",
    hasBrandVoiceParam && scopedClean,
    !hasBrandVoiceParam
      ? `fetchVoiceExemplarsText arity=${arity}, need >= 4 (brandVoiceId). Unscoped assembly leaks voice B=${unscopedLeaks}`
      : !scopedClean
        ? `scoped voice A assembly still contains voice B marker`
        : `arity=${arity}; scoped assembly excludes voice B marker`
  );
}

function runE5() {
  // Stage C: voice_range.summary joins the identity block above precedence.
  const withRange = {
    description: brandVoices.terse.description,
    samples: brandVoices.terse.samples,
    voice_range: brandVoices.terse.voice_range,
  };
  const assembled = assembleVoiceLayers(withRange, "signature");
  const identity = buildVoiceIdentityBlock(withRange);
  const hasSummary = assembled.includes(VOICE_RANGE_SUMMARY_A);
  const summaryBeforePrecedence =
    hasSummary &&
    identity.indexOf(VOICE_RANGE_SUMMARY_A) <
      identity.indexOf(VOICE_IDENTITY_PRECEDENCE);

  const withoutRange = assembleVoiceLayers(
    {
      description: brandVoices.terse.description,
      samples: brandVoices.terse.samples,
    },
    "signature"
  );
  const nullOk =
    withoutRange.includes(VOICE_IDENTITY_PRECEDENCE) &&
    withoutRange.includes(brandVoices.terse.description);

  expectFailOrPass(
    "E5",
    hasSummary && summaryBeforePrecedence && nullOk,
    !hasSummary
      ? `assembled prompt missing voice_range.summary marker (${VOICE_RANGE_SUMMARY_A})`
      : !summaryBeforePrecedence
        ? "voice_range.summary not above VOICE_IDENTITY_PRECEDENCE inside identity block"
        : !nullOk
          ? "null voice_range path produced a malformed prompt"
          : "voice_range.summary present above precedence; null path well-formed"
  );
}

function runE6() {
  // Stage D: learned rules inject after identity precedence, never above it.
  const ruleMarker = "LEARNED_RULE_MARKER_never_open_with_a_rhetorical_question";
  const input = {
    description: brandVoices.terse.description,
    samples: brandVoices.terse.samples,
    // Stage D threads rules via ResolvedBrandVoice; accept either field name.
    learned_rules: [{ rule: ruleMarker, status: "active" }],
    voice_rules: [{ rule: ruleMarker, status: "active" }],
    rules: [ruleMarker],
  };
  const assembled = assembleVoiceLayers(input, "signature");
  if (!assembled.includes(ruleMarker)) {
    record(
      "E6",
      "SKIP",
      "learned rules not injected yet (Stage D); assembleVoiceLayers ignores rule fields on main"
    );
    return;
  }
  const ruleAt = assembled.indexOf(ruleMarker);
  const precAt = assembled.indexOf(VOICE_IDENTITY_PRECEDENCE);
  const ok = precAt >= 0 && ruleAt > precAt;
  expectFailOrPass(
    "E6",
    ok,
    ok
      ? "learned rule appears below VOICE_IDENTITY_PRECEDENCE"
      : `learned rule at ${ruleAt} is not below precedence at ${precAt}`
  );
}

async function runE7a() {
  // Stage D: export a post-parse validator; hard offline guarantee.
  let validate;
  try {
    const deriveMod = await import(
      pathToFileURL(path.join(root, "lib/ai/voice-derive.ts")).href
    );
    validate =
      deriveMod.validateDerivedRules ||
      deriveMod.validateVoiceRules ||
      deriveMod.postParseValidateRules;
  } catch {
    record(
      "E7a",
      "SKIP",
      "lib/ai/voice-derive.ts not present yet (Stage D)"
    );
    return;
  }
  if (typeof validate !== "function") {
    record(
      "E7a",
      "SKIP",
      "voice-derive loaded but no exported validator (Stage D)"
    );
    return;
  }

  const evidenceIds = [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
  ];
  const synthetic = [
    {
      rule: "Prefer short claims",
      evidence_ids: [evidenceIds[0]],
    },
    {
      rule: "This rule has far too many words to be accepted by the fifteen word cap and must be dropped",
      evidence_ids: evidenceIds,
    },
    {
      rule: "Cite unknown id",
      evidence_ids: [
        evidenceIds[0],
        "99999999-9999-9999-9999-999999999999",
      ],
    },
    {
      rule: "Keep under fifteen words always",
      evidence_ids: evidenceIds,
    },
  ];
  const kept = validate(synthetic, new Set(evidenceIds));
  const keptRules = (kept || []).map((r) => r.rule || r);
  const onlyGood =
    keptRules.length === 1 &&
    keptRules[0] === "Keep under fifteen words always";
  expectFailOrPass(
    "E7a",
    onlyGood,
    onlyGood
      ? "validator dropped under-cited, over-long, and foreign-id rules"
      : `validator returned unexpected set: ${JSON.stringify(keptRules)}`
  );
}

// ---------------------------------------------------------------------------
// Live assertions
// ---------------------------------------------------------------------------

async function runE1() {
  /**
   * E1 floor derivation (do not invent a threshold):
   * On first live run, compute normalised lexical distance across all
   * voice-pair x source combinations, write the full distribution into the
   * artefact, and set the floor at observed minimum minus a margin (0.05).
   * Later changes to the floor must argue against that recorded derivation.
   */
  const voiceKeys = /** @type {const} */ (["terse", "warm", "blunt"]);
  const sourceKeys = Object.keys(sources);
  /** @type {{ pair: string, source: string, distance: number }[]} */
  const distances = [];
  /** @type {Record<string, string>} */
  const outputs = {};

  for (const voiceKey of voiceKeys) {
    for (const sourceKey of sourceKeys) {
      const voice = brandVoices[voiceKey];
      const layers = assembleVoiceLayers(
        {
          description: voice.description,
          samples: voice.samples,
          voice_range: voice.voice_range,
        },
        "signature"
      );
      process.stderr.write(`E1 generating ${voiceKey}/${sourceKey}...\n`);
      const text = await generateOnce({
        system:
          "Write one short LinkedIn post from the source. Return plain text only.",
        user: `${layers}\n\nSource content:\n${sources[sourceKey]}`,
      });
      outputs[`${voiceKey}::${sourceKey}`] = text;
    }
  }

  for (let i = 0; i < voiceKeys.length; i++) {
    for (let j = i + 1; j < voiceKeys.length; j++) {
      for (const sourceKey of sourceKeys) {
        const a = outputs[`${voiceKeys[i]}::${sourceKey}`];
        const b = outputs[`${voiceKeys[j]}::${sourceKey}`];
        const distance = lexicalDistance(a, b);
        distances.push({
          pair: `${voiceKeys[i]}-vs-${voiceKeys[j]}`,
          source: sourceKey,
          distance: Number(distance.toFixed(4)),
        });
      }
    }
  }

  const values = distances.map((d) => d.distance);
  const observedMin = Math.min(...values);
  const margin = 0.05;
  // Floor derivation: observedMin - margin, floored at 0.
  // Recorded so a later change is an argued change, not a silent one.
  const floor = Math.max(0, Number((observedMin - margin).toFixed(4)));
  const allAbove = values.every((v) => v >= floor);

  runE1._artefact = { distances, observedMin, margin, floor, outputs };

  expectFailOrPass(
    "E1",
    allAbove && values.length > 0,
    `lexical distances n=${values.length}, min=${observedMin.toFixed(4)}, floor=${floor} (min - ${margin}); all>=floor=${allAbove}`
  );
}

async function runE2() {
  const voice = brandVoices.blunt;
  const layers = assembleVoiceLayers(
    {
      description: voice.description,
      samples: voice.samples,
      voice_range: voice.voice_range,
    },
    "provoke"
  );
  process.stderr.write("E2 generating provoke output...\n");
  const text = await generateOnce({
    system:
      "Write one short LinkedIn post. Return plain text only. Follow the delivery variant strictly.",
    user: `${layers}\n\nSource content:\n${sources.opinion}`,
  });
  const hits = hedgeHits(text);
  runE2._artefact = { text, hits };
  expectFailOrPass(
    "E2",
    hits.length === 0,
    hits.length
      ? `provoke output contains hedging tokens ${JSON.stringify(hits)}; fixture=blunt/opinion`
      : "provoke output has no banned hedging tokens"
  );
}

async function runE7b() {
  let derive;
  try {
    const deriveMod = await import(
      pathToFileURL(path.join(root, "lib/ai/voice-derive.ts")).href
    );
    derive = deriveMod.deriveVoiceRules || deriveMod.deriveRules;
  } catch {
    record("E7b", "SKIP", "lib/ai/voice-derive.ts not present yet (Stage D)");
    return;
  }
  if (typeof derive !== "function") {
    record("E7b", "SKIP", "no derive export yet (Stage D)");
    return;
  }

  // Evidence set with no recurring pattern: unrelated one-off edits.
  const evidence = [
    {
      repurposeId: "11111111-1111-1111-1111-111111111111",
      targetFormat: "linkedin",
      original: "Alpha draft about queues.",
      edited: "Alpha draft about queues, with a comma.",
    },
    {
      repurposeId: "22222222-2222-2222-2222-222222222222",
      targetFormat: "linkedin",
      original: "Beta note on pricing pages.",
      edited: "Beta note on pricing pages for enterprise.",
    },
  ];
  process.stderr.write("E7b live derivation (advisory)...\n");
  try {
    const rules = await derive(evidence, { apiKey, model, providers });
    const count = Array.isArray(rules) ? rules.length : -1;
    if (count === 0) {
      record("E7b", "PASS", "derivation returned zero rules on non-recurring evidence");
    } else {
      record(
        "E7b",
        "ADVISORY_FAIL",
        `derivation returned ${count} rules on non-recurring evidence (advisory; do not gate)`
      );
    }
  } catch (err) {
    record(
      "E7b",
      "ADVISORY_FAIL",
      `derivation threw: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!apiKey) {
  console.log(
    "OPENROUTER_API_KEY is not set. Running offline assertions only; live E1/E2/E7b skipped."
  );
}

runE3();
runE4();
runE5();
runE6();
await runE7a();

if (apiKey) {
  await runE1();
  await runE2();
  await runE7b();
} else {
  record("E1", "SKIP", "no OPENROUTER_API_KEY");
  record("E2", "SKIP", "no OPENROUTER_API_KEY");
  record("E7b", "SKIP", "no OPENROUTER_API_KEY");
}

const artefactPath = path.join(root, "docs/acceptance/voice-eval-artefact.md");
const lines = [];
lines.push("# Voice eval artefact");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Model: ${model}`);
lines.push(`Provider pin: ${providers.join(", ")}`);
lines.push(`Temperature: ${temperature} (from AI_CONFIG)`);
lines.push(`API key present: ${Boolean(apiKey)}`);
lines.push("");
lines.push("## Results");
lines.push("");
lines.push("| ID | Status | Detail |");
lines.push("| --- | --- | --- |");
for (const r of results) {
  lines.push(`| ${r.id} | ${r.status} | ${r.detail.replace(/\|/g, "\\|")} |`);
}
lines.push("");
lines.push("## Expected-red map (Stage B)");
lines.push("");
lines.push(
  "E3, E4, E5 fail against main until Stage C. Entries in `EXPECTED_FAIL_UNTIL` keep the harness exit green while those bugs remain. Stage C deletes each entry when the matching fix lands, then adds `voice-eval` to CI."
);
lines.push("");
for (const [id, stage] of Object.entries(EXPECTED_FAIL_UNTIL)) {
  lines.push(`- **${id}** - ${stage}`);
}
lines.push("");

if (runE1._artefact) {
  const { distances, observedMin, margin, floor } = runE1._artefact;
  lines.push("## E1 lexical distance distribution");
  lines.push("");
  lines.push(
    `Observed min: ${observedMin}. Margin: ${margin}. Floor: ${floor} (= min - margin, floored at 0).`
  );
  lines.push("");
  lines.push(
    "Floor derivation: first live run sets floor to observed minimum lexical distance across all voice-pair and source combinations, minus 0.05. Changing this number later requires an argued comment, not a silent edit."
  );
  lines.push("");
  lines.push("| pair | source | distance |");
  lines.push("| --- | --- | ---: |");
  for (const d of distances) {
    lines.push(`| ${d.pair} | ${d.source} | ${d.distance} |`);
  }
  lines.push("");
}

if (runE2._artefact) {
  lines.push("## E2 provoke sample");
  lines.push("");
  lines.push(runE2._artefact.text);
  lines.push("");
}

lines.push("## Fixtures");
lines.push("");
lines.push(
  `Brand voices: ${Object.keys(brandVoices).join(", ")}. Sources: ${Object.keys(sources).join(", ")}.`
);
lines.push("");

await fs.writeFile(artefactPath, lines.join("\n"));
console.log(`Wrote ${artefactPath}`);

const hardFails = results.filter((r) => r.status === "FAIL");
if (hardFails.length) {
  console.error(
    `Hard failures:\n${hardFails.map((f) => `  - ${f.id}: ${f.detail}`).join("\n")}`
  );
  process.exit(1);
}

process.exit(0);
