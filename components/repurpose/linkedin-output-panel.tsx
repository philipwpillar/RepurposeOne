"use client";

import { useState } from "react";
import type { LinkedInOutput, UserRating, UserWorkflowStatus } from "@/types";
import {
  formatLinkedInPostForCopy,
  formatLinkedInSlidesForCopy,
} from "@/lib/format-output";
import {
  LINKEDIN_POST_MAX,
  LINKEDIN_SOFT_TRUNCATION,
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
import {
  LinkedInEngagementBar,
  PlatformAuthorRow,
} from "./platform-preview-chrome";
import { ShareActionButton } from "./share-action-button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import { useOutputFeedback, type FeedbackProps } from "./use-output-feedback";

interface LinkedInOutputPanelProps extends FeedbackProps {
  output: LinkedInOutput;
  variant?: "studio" | "library";
}

function PostLengthIndicators({ length }: { length: number }) {
  return (
    <div className="flex items-center gap-2">
      <LengthIndicator
        mode="soft"
        length={length}
        softThreshold={LINKEDIN_SOFT_TRUNCATION}
      />
      <LengthIndicator mode="info" length={length} max={LINKEDIN_POST_MAX} />
    </div>
  );
}

function PostEditLabelRow({
  label,
  length,
}: {
  label: string;
  length: number;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <PostLengthIndicators length={length} />
    </div>
  );
}

export function LinkedInOutputPanel({
  output,
  variant = "studio",
  repurposeId,
  initialRating,
  initialUserOutput,
  initialWorkflowStatus,
  initialEditedAt,
  onFeedback,
}: LinkedInOutputPanelProps) {
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
    initialUserOutput: initialUserOutput as LinkedInOutput | null | undefined,
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
        <>
          <ShareActionButton
            target="linkedin"
            getText={() => formatLinkedInPostForCopy(display)}
            variant={variant}
          />
          <CopyActionButton
            copyKey="linkedin:post"
            label="Copy post"
            copiedKey={copiedKey}
            errorKey={errorKey}
            variant={variant}
            onCopy={() =>
              copy(formatLinkedInPostForCopy(display), "linkedin:post")
            }
          />
          <CopyActionButton
            copyKey="linkedin:slides"
            label="Copy carousel slides"
            copiedKey={copiedKey}
            errorKey={errorKey}
            variant={variant}
            onCopy={() =>
              copy(formatLinkedInSlidesForCopy(display), "linkedin:slides")
            }
          />
        </>
      )}
    </div>
  );

  const postTextarea = (
    <textarea
      className="w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed"
      rows={8}
      value={active.post}
      onChange={(e) =>
        feedback.setDraft({ ...feedback.draft, post: e.target.value })
      }
    />
  );

  const content = (
    <div className="space-y-4">
      {variant === "studio" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <PlatformAuthorRow
            name="Your name"
            handle="Headline · 1st"
            avatarClassName="bg-blue-600/20"
          />
          <div>
            {feedback.editing ? (
              <>
                <PostEditLabelRow label="Post" length={active.post.length} />
                {postTextarea}
              </>
            ) : (
              <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {display.post}
              </div>
            )}
          </div>
          <LinkedInEngagementBar />
        </div>
      )}

      {variant !== "studio" && (
        <div>
          {feedback.editing ? (
            <>
              <PostEditLabelRow label="POST" length={active.post.length} />
              {postTextarea}
            </>
          ) : (
            <>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                POST
              </div>
              <div className="whitespace-pre-wrap text-sm">{display.post}</div>
            </>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          CAROUSEL SLIDES
        </div>
        <div className="space-y-2">
          {display.carousel_slides.map((slide) => (
            <div
              key={slide.number}
              className={
                variant === "studio"
                  ? "flex items-start gap-3 rounded-2xl bg-secondary p-3 text-sm"
                  : "rounded-md border p-3 text-sm"
              }
            >
              {variant === "studio" && (
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {slide.number}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{slide.title}</p>
                {slide.body && (
                  <p className="mt-1 text-muted-foreground">{slide.body}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === "library") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-lg">LinkedIn post</CardTitle>
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
