import assert from "node:assert/strict";
import test from "node:test";
import {
  VOICE_IDENTITY_PRECEDENCE,
  VOICE_VARIANTS,
  assembleVoiceLayers,
} from "./voice-variants.ts";

test("variant prompt fragments avoid generic tone adjectives", () => {
  const forbidden = [
    "playful",
    "warm",
    "confident",
    "punchy",
    "energetic",
    "professional",
    "casual",
    "friendly",
    "bold",
    "witty",
  ];

  for (const variant of VOICE_VARIANTS) {
    const fragment = variant.promptFragment.toLowerCase();
    for (const word of forbidden) {
      assert.equal(fragment.includes(word), false, `${variant.id} contains ${word}`);
    }
  }
});

test("signature prompt keeps precedence and variant before samples", () => {
  const voiceSection = assembleVoiceLayers(
    {
      description: "Short paragraphs with concrete nouns.",
      samples: ["A sample sentence in the writer's established voice."],
    },
    "signature"
  );
  const assembledUserPrompt = `${voiceSection}\n\nSource content:\nExample source`;
  const signature = VOICE_VARIANTS.find((variant) => variant.id === "signature");

  assert.ok(signature);
  assert.match(assembledUserPrompt, /The voice identity above is fixed\./);
  assert.ok(assembledUserPrompt.includes(signature.promptFragment));
  assert.ok(
    assembledUserPrompt.indexOf(VOICE_IDENTITY_PRECEDENCE) <
      assembledUserPrompt.indexOf(signature.promptFragment)
  );
  assert.ok(
    assembledUserPrompt.indexOf(signature.promptFragment) <
      assembledUserPrompt.indexOf("Writing samples:")
  );
});
