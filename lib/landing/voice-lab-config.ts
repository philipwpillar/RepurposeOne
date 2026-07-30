import type { BrandVoiceInput } from "@/types";

/** Shared cap — enforced client-side and in POST /api/voice-lab. */
export const VOICE_LAB_MAX_CHARS = 1500;

export const VOICE_LAB_MIN_CHARS = 20;

export const VOICE_LAB_HOURLY_LIMIT = 5;

export const VOICE_LAB_DAILY_LIMIT = 20;

export const VOICE_LAB_DEFAULT_INPUT =
  "We just shipped photo input. Upload one image, add a line of context, and Voiceora writes the posts in your voice.";

export const VOICE_LAB_LABELS = [
  "Punchy founder",
  "Warm storyteller",
  "Precise analyst",
] as const;

/** Sample voices for the public demo — not visitor-trained profiles. */
export const VOICE_LAB_SAMPLE_VOICES: BrandVoiceInput[] = [
  {
    description:
      "Punchy, direct founder voice. Short sentences. Confident and energetic.",
    samples: [
      "Photos are content now. Upload one, add context, and you're done before your coffee cools.",
    ],
  },
  {
    description:
      "Warm storyteller. Reflective, human, narrative-led. Gentle pacing.",
    samples: [
      "Some ideas start as a picture — the whiteboard after a good meeting, the desk on launch morning.",
    ],
  },
  {
    description:
      "Precise analyst. Clear structure, concrete facts, no fluff.",
    samples: [
      "Photo input is live on the Creator plan. One image plus a short context note produces platform-native drafts.",
    ],
  },
];
