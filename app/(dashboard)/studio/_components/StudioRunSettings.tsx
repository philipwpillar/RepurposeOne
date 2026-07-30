"use client";

import Link from "next/link";
import { VOICE_VARIANTS, type VoiceVariantId } from "@/lib/ai/voice-variants";
import { lengthPresetsForVariant } from "@/lib/repurpose/length-presets";
import type { TargetFormat } from "@/types";

const FORMAT_TITLES: Record<TargetFormat, string> = {
  x_thread: "X Thread",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  email: "Email Newsletter",
};

interface StudioRunSettingsProps {
  formats: TargetFormat[];
  lengthWords: Record<TargetFormat, number>;
  voiceVariants: Record<TargetFormat, VoiceVariantId>;
  hasVoiceSamples: boolean;
  disabled?: boolean;
  onLengthChange: (format: TargetFormat, words: number) => void;
  onVoiceVariantChange: (format: TargetFormat, variantId: VoiceVariantId) => void;
}

export default function StudioRunSettings({
  formats,
  lengthWords,
  voiceVariants,
  hasVoiceSamples,
  disabled = false,
  onLengthChange,
  onVoiceVariantChange,
}: StudioRunSettingsProps) {
  if (formats.length === 0) return null;

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card px-4 py-4">
      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">
          RUN SETTINGS
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          These apply to your next generate. Changing them and regenerating uses
          another credit.
        </p>
      </div>

      <div className="space-y-5">
        {formats.map((format) => (
          <div key={format} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
            <div className="text-sm font-medium text-foreground">
              {FORMAT_TITLES[format]}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Delivery</div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={`Delivery for ${FORMAT_TITLES[format]}`}
              >
                {VOICE_VARIANTS.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={
                      voiceVariants[format] === variant.id
                        ? "rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
                        : "rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    }
                    aria-pressed={voiceVariants[format] === variant.id}
                    onClick={() => onVoiceVariantChange(format, variant.id)}
                    disabled={disabled || !hasVoiceSamples}
                    title={variant.description}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
              {!hasVoiceSamples ? (
                <p className="text-xs text-muted-foreground">
                  <Link
                    href="/brand-voice"
                    className="underline underline-offset-2"
                  >
                    Add writing samples
                  </Link>{" "}
                  to choose a delivery variant.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">
                Target length (words)
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={`Target length for ${FORMAT_TITLES[format]}`}
              >
                {lengthPresetsForVariant(format, voiceVariants[format]).map(
                  (words) => (
                    <button
                      key={words}
                      type="button"
                      className={
                        lengthWords[format] === words
                          ? "rounded-full border border-primary bg-primary px-4 py-1.5 font-mono text-xs text-primary-foreground"
                          : "rounded-full border border-border bg-background px-4 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                      }
                      aria-label={`${words} words`}
                      aria-pressed={lengthWords[format] === words}
                      onClick={() => onLengthChange(format, words)}
                      disabled={disabled}
                    >
                      {words}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
