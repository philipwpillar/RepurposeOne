"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  PHOTO_CONTEXT_MAX_LENGTH,
  PHOTO_CTA_MAX_LENGTH,
} from "@/lib/image/constants";

interface PhotoContextFormProps {
  context: string;
  cta: string;
  contextError: string | null;
  disabled?: boolean;
  onContextChange: (value: string) => void;
  onCtaChange: (value: string) => void;
  onContextBlur: () => void;
}

export default function PhotoContextForm({
  context,
  cta,
  contextError,
  disabled = false,
  onContextChange,
  onCtaChange,
  onContextBlur,
}: PhotoContextFormProps) {
  return (
    <div className="mb-5 space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="photo-context">
          What is this and why are you posting it?{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="photo-context"
          value={context}
          disabled={disabled}
          required
          aria-required="true"
          aria-invalid={Boolean(contextError)}
          aria-describedby={contextError ? "photo-context-error" : undefined}
          maxLength={PHOTO_CONTEXT_MAX_LENGTH}
          placeholder="Launch photo of our new dashboard - want to drive waitlist signups."
          className="min-h-[88px] rounded-2xl"
          onChange={(event) => onContextChange(event.target.value)}
          onBlur={onContextBlur}
        />
        {contextError ? (
          <p id="photo-context-error" className="text-xs text-destructive">
            {contextError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="photo-cta">
          Call to action{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="photo-cta"
          value={cta}
          disabled={disabled}
          maxLength={PHOTO_CTA_MAX_LENGTH}
          placeholder="Sign up at voiceora.io/waitlist"
          className="rounded-2xl"
          onChange={(event) => onCtaChange(event.target.value)}
        />
      </div>
    </div>
  );
}
