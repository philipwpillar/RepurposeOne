#!/usr/bin/env node

/**
 * Voice Variants v1 separation protocol
 *
 * 1. Hold source, voice identity, samples, model, and token budget constant.
 * 2. Generate signature, explain, and provoke outputs independently.
 * 3. Blind-review whether each output satisfies its variant constraints.
 * 4. Confirm the outputs remain recognisably grounded in the same samples.
 * 5. Record outputs and reviewer notes in the acceptance artefact.
 */

import fs from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.log(
    "OPENROUTER_API_KEY is not set. Set it and run `node scripts/variant-separation.mjs`, then review and complete docs/acceptance/variant-separation-artefact.md."
  );
  process.exit(0);
}

const variants = {
  signature: `Delivery for this piece: neutral. Match the rhythm and structure of
the voice samples as closely as possible. Do not lean toward any
particular register.`,
  explain: `Delivery for this piece:
- Address the reader as "you". Do not use first-person plural.
- Average sentence 15 to 22 words. No sentence fragments.
- Open with the problem or the question, not with a claim.
- Include at least one concrete mechanism, number, or step sequence.
- State the conclusion last.`,
  provoke: `Delivery for this piece:
- Open with the position, in one sentence, before any justification.
- Average sentence 8 to 14 words. Fragments allowed.
- Zero hedging: no "might", "perhaps", "in my opinion", "arguably".
- Exactly one claim. Do not enumerate.
- Name the thing you disagree with explicitly.`,
};

const source =
  "Teams often publish the same draft everywhere. Platform constraints change how readers scan, respond, and decide whether to continue. A useful repurposing workflow preserves the idea while rebuilding its delivery for each destination.";
const identity =
  "Direct, concrete writing. Short paragraphs. Prefer plain verbs and specific mechanisms.";
const sample =
  "A good workflow removes decisions at the moment they become expensive. Decide the structure first. Then make each draft earn its place.";
const model = process.env.VARIANT_SEPARATION_MODEL || "openai/gpt-4.1-mini";
const results = {};

for (const [id, fragment] of Object.entries(variants)) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Write one short LinkedIn post. Return plain text only.",
        },
        {
          role: "user",
          content: `Voice identity:\n${identity}\nThe voice identity above is fixed. Later instructions may adjust delivery but must not change vocabulary, self-reference, audience-reference, formatting conventions, or stated positions.\n\n${fragment}\n\nWriting samples:\n${sample}\n\nSource content:\n${source}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`${id} request failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  results[id] = data.choices?.[0]?.message?.content?.trim() || "(empty response)";
}

const artefactPath = path.join(
  process.cwd(),
  "docs/acceptance/variant-separation-artefact.md"
);
const output = `# Voice variant separation artefact

Generated: ${new Date().toISOString()}
Model: ${model}

Criterion 5 has not passed until a reviewer records a result below.

${Object.entries(results)
  .map(([id, text]) => `## ${id}\n\n${text}`)
  .join("\n\n")}

## Reviewer result

- [ ] Each output satisfies its named delivery constraints.
- [ ] All outputs remain grounded in the same voice identity and sample.
- [ ] The three outputs are materially distinguishable.

Reviewer:

Notes:
`;

await fs.writeFile(artefactPath, output);
console.log(`Wrote ${artefactPath}. Complete the blind review before claiming separation.`);
