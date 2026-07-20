"use client";

import { useState } from "react";
import type { InstagramOutput, UserRating, UserWorkflowStatus } from "@/types";
import { formatInstagramCaptionForCopy } from "@/lib/format-output";
import {
  INSTAGRAM_CAPTION_MAX,
  INSTAGRAM_SOFT_TRUNCATION,
} from "@/lib/repurpose/output-limits";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyActionButton } from "./copy-action-button";
import { LengthIndicator } from "./length-indicator";
import { OutputFeedbackControls } from "./output-feedback-controls";
import { InstagramPhotoFrame } from "./platform-preview-chrome";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import { useOutputFeedback, type FeedbackProps } from "./use-output-feedback";

interface InstagramOutputPanelProps extends FeedbackProps {
  output: InstagramOutput;
  variant?: "studio" | "library";
}

function formatHashtags(hashtags: string[]): string {
  return hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
}

function CaptionLengthIndicators({ length }: { length: number }) {
  return (
    <div className="flex items-center gap-2">
      <LengthIndicator
        mode="soft"
        length={length}
        softThreshold={INSTAGRAM_SOFT_TRUNCATION}
      />
      <LengthIndicator mode="info" length={length} max={INSTAGRAM_CAPTION_MAX} />
    </div>
  );
}

export function InstagramOutputPanel({
  output,
  variant = "studio",
  repurposeId,
  initialRating,
  initialUserOutput,
  initialWorkflowStatus,
  initialEditedAt,
  onFeedback,
}: InstagramOutputPanelProps) {
  const [workflowStatus, setWorkflowStatus] = useState<UserWorkflowStatus | null>(
    initialWorkflowStatus ?? null
  );
  const { copy, copiedKey, errorKey } = useCopyToClipboard({
    repurposeId,
    workflowStatus,
    onWorkflowStatusChange: setWorkflowStatus,
  });
  const feedback = useOutputFeedback({
    output,
    repurposeId,
    initialRating,
    initialUserOutput: initialUserOutput as InstagramOutput | null | undefined,
    initialEditedAt,
    onFeedback,
  });

  const display = feedback.feedbackEnabled ? feedback.displayOutput : output;
  const active = feedback.editing ? feedback.draft : display;

  const copyActions = (
    <div className="flex flex-wrap gap-2">
      {feedback.feedbackEnabled && (
        <OutputFeedbackControls
          rating={feedback.rating}
          editing={feedback.editing}
          saving={feedback.saving}
          error={feedback.error}
          pendingRestore={feedback.pendingRestore}
          onRate={(r: UserRating) => void feedback.toggleRating(r)}
          onEdit={feedback.startEdit}
          onSave={() => void feedback.saveEdit()}
          onCancel={feedback.cancelEdit}
          onRestoreDraft={feedback.restoreDraft}
          onDiscardDraft={feedback.discardStoredDraft}
          variant={variant}
        />
      )}
      {!feedback.editing && (
        <CopyActionButton
          copyKey="instagram:caption"
          label="Copy caption + hashtags"
          copiedKey={copiedKey}
          errorKey={errorKey}
          variant={variant}
          onCopy={() =>
            copy(formatInstagramCaptionForCopy(display), "instagram:caption")
          }
        />
      )}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {variant === "studio" && <InstagramPhotoFrame />}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">
            CAPTION
          </div>
          {feedback.editing && (
            <CaptionLengthIndicators length={active.caption.length} />
          )}
        </div>
        {feedback.editing ? (
          <textarea
            className="w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed"
            rows={6}
            value={active.caption}
            onChange={(e) =>
              feedback.setDraft({ ...feedback.draft, caption: e.target.value })
            }
          />
        ) : (
          <div
            className={
              variant === "studio"
                ? "rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground"
                : "whitespace-pre-line text-sm leading-relaxed text-foreground"
            }
          >
            {display.caption}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          HOOK VARIATIONS
        </div>
        <ul className="space-y-2">
          {display.hook_variations.map((hook, index) => (
            <li
              key={index}
              className={
                variant === "studio"
                  ? "group flex items-start justify-between gap-2 rounded-2xl bg-secondary p-3 text-sm text-foreground"
                  : "group flex items-start justify-between gap-2 text-sm"
              }
            >
              <span className="flex-1">{hook}</span>
              {!feedback.editing && (
                <CopyActionButton
                  copyKey={`instagram:hook:${index}`}
                  label="Copy hook"
                  copiedKey={copiedKey}
                  errorKey={errorKey}
                  variant={variant}
                  size="icon"
                  className={
                    variant === "studio"
                      ? "flex-shrink-0 rounded-lg border border-border bg-card px-2 py-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      : "flex-shrink-0 rounded-md border border-border bg-background px-2 py-1"
                  }
                  onCopy={() => copy(hook, `instagram:hook:${index}`)}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          HASHTAGS
        </div>
        <div className="text-sm text-primary">
          {formatHashtags(display.hashtags)}
        </div>
      </div>
    </div>
  );

  if (variant === "library") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-lg">Instagram caption</CardTitle>
            {copyActions}
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">{copyActions}</div>
      {content}
    </div>
  );
}
