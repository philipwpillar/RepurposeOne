# Wave 4: Brand Voice Wizard

## Acceptance checklist

1. `Guide me` opens a three-step flow for short audience and tone guidance, one to three writing samples, and draft review.
2. The AI response remains a draft. No `brand_voices` row is written during generation, navigation, or discard.
3. The user can edit the suggested name, description, and voice-range summary before choosing `Accept and save`.
4. Accept writes a normal `brand_voices` row with the original samples and the `voice_range` JSON object.
5. The wizard uses the configured fast OpenRouter model through `completeOpenRouterJson`, including the existing provider allowlist.
6. Wizard drafts are free and do not consume monthly generation credits. To avoid inventing a billing surface, authenticated users are limited to five draft attempts in a rolling 24-hour period.
7. The rate limit reuses the service-role-only `voice_lab_hits` table with a salted, wizard-namespaced user hash. Attempts are recorded before model spend and expire through the existing hit-retention sweep.
8. Free-text fields are capped by the request schema. Prompt content is enclosed in explicit delimiters and identified as style guidance, not instructions.
9. The samples and review steps state that writing samples matter most and that the generated summary is only a starting point.

## Stored `voice_range`

```ts
{
  summary: string;
  sampleMarkers: Array<{ index: number; position: string }>;
}
```

The existing `20260730140000_brand_voices_voice_range.sql` migration provides the nullable `jsonb` column.
