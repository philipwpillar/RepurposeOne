"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BrandVoiceWizardDraftSchema,
  type BrandVoiceWizardDraft,
} from "@/types";

const SAMPLE_FIELD_COUNT = 3;
const EMPTY_SAMPLES = () => Array.from({ length: SAMPLE_FIELD_COUNT }, () => "");

type WizardStep = "questions" | "samples" | "generating" | "review";

interface BrandVoiceWizardProps {
  defaultAsDefault: boolean;
  disabled?: boolean;
  onAccept: (
    draft: BrandVoiceWizardDraft,
    samples: string[],
    setAsDefault: boolean
  ) => Promise<void>;
}

export function BrandVoiceWizard({
  defaultAsDefault,
  disabled = false,
  onAccept,
}: BrandVoiceWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("questions");
  const [audience, setAudience] = useState("");
  const [toneWords, setToneWords] = useState("");
  const [doMore, setDoMore] = useState("");
  const [avoid, setAvoid] = useState("");
  const [samples, setSamples] = useState<string[]>(EMPTY_SAMPLES);
  const [draft, setDraft] = useState<BrandVoiceWizardDraft | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(defaultAsDefault);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isBusy = step === "generating" || isSaving;

  const reset = () => {
    setStep("questions");
    setAudience("");
    setToneWords("");
    setDoMore("");
    setAvoid("");
    setSamples(EMPTY_SAMPLES());
    setDraft(null);
    setDraftName("");
    setDraftDescription("");
    setDraftSummary("");
    setSetAsDefault(defaultAsDefault);
    setError(null);
    setIsSaving(false);
  };

  const closeAndReset = () => {
    if (isBusy) return;
    setOpen(false);
    reset();
  };

  const openWizard = () => {
    reset();
    setOpen(true);
  };

  const continueToSamples = () => {
    setError(null);
    if (audience.trim().length < 2) {
      setError("Tell us who you usually write for.");
      return;
    }
    if (toneWords.trim().length < 2) {
      setError("Add a few tone words.");
      return;
    }
    setStep("samples");
  };

  const updateSample = (index: number, value: string) => {
    setSamples((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const generateDraft = async () => {
    setError(null);
    const trimmedSamples = samples
      .map((sample) => sample.trim())
      .filter((sample) => sample.length > 0);

    if (trimmedSamples.length === 0) {
      setError("Add at least one writing sample.");
      return;
    }
    if (trimmedSamples.some((sample) => sample.length < 20)) {
      setError("Each writing sample must be at least 20 characters.");
      return;
    }

    setStep("generating");

    try {
      const response = await fetch("/api/brand-voice/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: audience.trim(),
          tone_words: toneWords.trim(),
          do_more: doMore.trim(),
          avoid: avoid.trim(),
          samples: trimmedSamples,
        }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "We could not create a draft. Please try again.";
        throw new Error(message);
      }

      const candidate =
        body && typeof body === "object" && "draft" in body
          ? body.draft
          : null;
      const parsed = BrandVoiceWizardDraftSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new Error("The draft returned in an unexpected format.");
      }

      setDraft(parsed.data);
      setDraftName(parsed.data.name);
      setDraftDescription(parsed.data.description);
      setDraftSummary(parsed.data.voice_range.summary);
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not create a draft. Please try again."
      );
      setStep("samples");
    }
  };

  const acceptDraft = async () => {
    if (!draft) return;
    setError(null);

    const editedDraft = BrandVoiceWizardDraftSchema.safeParse({
      name: draftName,
      description: draftDescription,
      voice_range: {
        summary: draftSummary,
        sampleMarkers: draft.voice_range.sampleMarkers,
      },
    });
    if (!editedDraft.success) {
      setError(editedDraft.error.issues[0]?.message ?? "Review the draft fields.");
      return;
    }

    const trimmedSamples = samples
      .map((sample) => sample.trim())
      .filter((sample) => sample.length > 0);

    setIsSaving(true);
    try {
      await onAccept(editedDraft.data, trimmedSamples, setAsDefault);
      setOpen(false);
      reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save the brand voice."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openWizard}
        disabled={disabled}
      >
        <Sparkles className="h-4 w-4" />
        Guide me
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeAndReset();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a guided brand voice</DialogTitle>
            <DialogDescription>
              Answer a few short questions, add your writing, then review the AI
              draft before anything is saved.
            </DialogDescription>
          </DialogHeader>

          {step === "questions" && (
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step 1 of 3 - Questions
              </p>
              <div className="space-y-2">
                <Label htmlFor="wizard-audience">Who do you write for?</Label>
                <Textarea
                  id="wizard-audience"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="Founders and small marketing teams"
                  maxLength={500}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  {audience.length}/500 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-tone">Which tone words fit?</Label>
                <Input
                  id="wizard-tone"
                  value={toneWords}
                  onChange={(event) => setToneWords(event.target.value)}
                  placeholder="Clear, warm, direct, practical"
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">
                  Use a few words or a short sentence.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wizard-do">Do more of</Label>
                  <Textarea
                    id="wizard-do"
                    value={doMore}
                    onChange={(event) => setDoMore(event.target.value)}
                    placeholder="Short examples and practical takeaways"
                    maxLength={500}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-avoid">Avoid</Label>
                  <Textarea
                    id="wizard-avoid"
                    value={avoid}
                    onChange={(event) => setAvoid(event.target.value)}
                    placeholder="Hype, jargon, and vague claims"
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {step === "samples" && (
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step 2 of 3 - Writing samples
              </p>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                Your samples matter most. The answers help with context, but the
                draft should follow the writing you actually provide.
              </div>
              <div className="space-y-4">
                {samples.map((sample, index) => (
                  <div key={index} className="space-y-1.5">
                    <Label htmlFor={`wizard-sample-${index}`}>
                      Sample {index + 1}
                      {index === 0 ? "" : " (optional)"}
                    </Label>
                    <Textarea
                      id={`wizard-sample-${index}`}
                      value={sample}
                      onChange={(event) =>
                        updateSample(index, event.target.value)
                      }
                      placeholder="Paste a post, email, or paragraph in your voice."
                      maxLength={2000}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {sample.length}/2000 characters
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Building your draft
                </p>
                <p className="text-sm text-muted-foreground">
                  Comparing your answers with the range across your samples.
                </p>
              </div>
            </div>
          )}

          {step === "review" && draft && (
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step 3 of 3 - Review draft
              </p>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                Your samples still matter most. This summary is a starting point,
                so edit it until it feels accurate.
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-draft-name">Name</Label>
                <Input
                  id="wizard-draft-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={60}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  {draftName.length}/60 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-draft-description">Style note</Label>
                <Textarea
                  id="wizard-draft-description"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  {draftDescription.length}/2000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-draft-summary">Observed voice range</Label>
                <Textarea
                  id="wizard-draft-summary"
                  value={draftSummary}
                  onChange={(event) => setDraftSummary(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  {draftSummary.length}/1000 characters
                </p>
              </div>

              {draft.voice_range.sampleMarkers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Sample range markers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {draft.voice_range.sampleMarkers.map((marker) => (
                      <span
                        key={marker.index}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
                      >
                        Sample {marker.index + 1}: {marker.position}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="wizard-set-default"
                  checked={setAsDefault}
                  onCheckedChange={(checked) =>
                    setSetAsDefault(checked === true)
                  }
                  disabled={isSaving}
                />
                <Label htmlFor="wizard-set-default" className="font-normal">
                  Set as default (used in Studio)
                </Label>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {step !== "generating" && (
            <DialogFooter>
              {step === "questions" && (
                <>
                  <Button type="button" variant="outline" onClick={closeAndReset}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={continueToSamples}>
                    Continue
                  </Button>
                </>
              )}

              {step === "samples" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setStep("questions");
                    }}
                  >
                    Back
                  </Button>
                  <Button type="button" onClick={() => void generateDraft()}>
                    <Sparkles className="h-4 w-4" />
                    Create draft
                  </Button>
                </>
              )}

              {step === "review" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeAndReset}
                    disabled={isSaving}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void acceptDraft()}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Accept and save"
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
