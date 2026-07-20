"use client";

import type { EmailOutput, UserRating } from "@/types";
import {
  formatEmailBodyForCopy,
  formatEmailSubjectForCopy,
} from "@/lib/format-output";
import { EMAIL_SUBJECT_MAX } from "@/lib/repurpose/output-limits";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyActionButton } from "./copy-action-button";
import { LengthIndicator } from "./length-indicator";
import { OutputFeedbackControls } from "./output-feedback-controls";
import { EmailInboxChrome } from "./platform-preview-chrome";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import { useOutputFeedback, type FeedbackProps } from "./use-output-feedback";

interface EmailOutputPanelProps extends FeedbackProps {
  output: EmailOutput;
  variant?: "studio" | "library";
}

export function EmailOutputPanel({
  output,
  variant = "studio",
  repurposeId,
  initialRating,
  initialUserOutput,
  onFeedback,
}: EmailOutputPanelProps) {
  const { copy, copiedKey, errorKey } = useCopyToClipboard();
  const feedback = useOutputFeedback({
    output,
    repurposeId,
    initialRating,
    initialUserOutput: initialUserOutput as EmailOutput | null | undefined,
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
          onRate={(r: UserRating) => void feedback.toggleRating(r)}
          onEdit={feedback.startEdit}
          onSave={() => void feedback.saveEdit()}
          onCancel={feedback.cancelEdit}
          variant={variant}
        />
      )}
      {!feedback.editing && (
        <>
          <CopyActionButton
            copyKey="email:subject"
            label="Copy subject"
            copiedKey={copiedKey}
            errorKey={errorKey}
            variant={variant}
            onCopy={() =>
              copy(formatEmailSubjectForCopy(display), "email:subject")
            }
          />
          <CopyActionButton
            copyKey="email:body"
            label="Copy body"
            copiedKey={copiedKey}
            errorKey={errorKey}
            variant={variant}
            onCopy={() => copy(formatEmailBodyForCopy(display), "email:body")}
          />
        </>
      )}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {variant === "studio" && !feedback.editing && (
        <EmailInboxChrome
          subject={display.subject_line}
          previewText={display.preview_text}
        />
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">
            SUBJECT LINE
          </div>
          {feedback.editing && (
            <LengthIndicator
              mode="hard"
              length={active.subject_line.length}
              max={EMAIL_SUBJECT_MAX}
            />
          )}
        </div>
        {feedback.editing ? (
          <input
            type="text"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium"
            maxLength={EMAIL_SUBJECT_MAX}
            value={active.subject_line}
            onChange={(e) =>
              feedback.setDraft({
                ...feedback.draft,
                subject_line: e.target.value,
              })
            }
          />
        ) : (
          <div className="text-sm font-medium text-foreground">
            {display.subject_line}
          </div>
        )}
      </div>

      {display.preview_text && !feedback.editing && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            PREVIEW TEXT
          </div>
          <div className="text-sm text-muted-foreground">
            {display.preview_text}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          BODY
        </div>
        {feedback.editing ? (
          <textarea
            className="w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed"
            rows={12}
            value={active.body}
            onChange={(e) =>
              feedback.setDraft({ ...feedback.draft, body: e.target.value })
            }
          />
        ) : (
          <div
            className={
              variant === "studio"
                ? "rounded-2xl bg-secondary p-4 text-sm leading-relaxed whitespace-pre-line text-foreground"
                : "whitespace-pre-wrap text-sm"
            }
          >
            {display.body}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "library") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Email newsletter</CardTitle>
              <CardDescription>{display.subject_line}</CardDescription>
            </div>
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
