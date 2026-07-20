"use client";

import { useState } from "react";
import type { Tweet, XThreadOutput, UserRating, UserWorkflowStatus } from "@/types";
import { formatXThreadForCopy } from "@/lib/format-output";
import { CopyActionButton } from "./copy-action-button";
import { OutputFeedbackControls } from "./output-feedback-controls";
import { PlatformAuthorRow } from "./platform-preview-chrome";
import { ShareActionButton } from "./share-action-button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import { useOutputFeedback, type FeedbackProps } from "./use-output-feedback";

interface XThreadTweetListProps extends FeedbackProps {
  tweets: Tweet[];
  threadSummary?: string | null;
  variant?: "studio" | "library";
  showCopyAll?: boolean;
  /** Full thread output — required when feedback props are present so edits can be saved. */
  output?: XThreadOutput;
}

export function XThreadTweetList({
  tweets,
  threadSummary,
  variant = "studio",
  showCopyAll = true,
  output,
  repurposeId,
  initialRating,
  initialUserOutput,
  initialWorkflowStatus,
  onFeedback,
}: XThreadTweetListProps) {
  const [workflowStatus, setWorkflowStatus] = useState<UserWorkflowStatus | null>(
    initialWorkflowStatus ?? null
  );
  const { copy, copiedKey, errorKey } = useCopyToClipboard({
    repurposeId,
    workflowStatus,
    onWorkflowStatusChange: setWorkflowStatus,
  });

  const baseOutput: XThreadOutput =
    output ??
    ({
      format: "x_thread",
      tweets,
      thread_summary: threadSummary ?? null,
    } as XThreadOutput);

  const feedback = useOutputFeedback({
    output: baseOutput,
    repurposeId,
    initialRating,
    initialUserOutput: initialUserOutput as XThreadOutput | null | undefined,
    onFeedback,
  });

  const displayTweets = feedback.feedbackEnabled
    ? feedback.displayOutput.tweets
    : tweets;
  const displaySummary = feedback.feedbackEnabled
    ? feedback.displayOutput.thread_summary
    : threadSummary;
  const activeTweets = feedback.editing
    ? feedback.draft.tweets
    : displayTweets;

  const tweetCardClass =
    variant === "studio"
      ? "group relative rounded-2xl border border-border bg-card p-4"
      : "group relative rounded-lg border border-border bg-muted/30 p-4";

  return (
    <div className="space-y-3">
      {(showCopyAll || feedback.feedbackEnabled) && displayTweets.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
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
          {showCopyAll && (
            <CopyActionButton
              copyKey="x_thread:all"
              label="Copy all"
              copiedKey={copiedKey}
              errorKey={errorKey}
              variant={variant}
              onCopy={() =>
                copy(
                  formatXThreadForCopy({
                    format: "x_thread",
                    tweets: displayTweets,
                  }),
                  "x_thread:all"
                )
              }
            />
          )}
        </div>
      )}

      {displaySummary && !feedback.editing && (
        <p className="text-sm text-muted-foreground">{displaySummary}</p>
      )}

      {activeTweets.map((tweet, index) => (
        <div key={tweet.number} className={tweetCardClass}>
          {variant === "studio" && index === 0 && !feedback.editing && (
            <PlatformAuthorRow
              name="Your name"
              handle="@yourhandle"
              avatarClassName="bg-foreground/10"
            />
          )}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Tweet {tweet.number}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tweet.text.length}/280
              </span>
              {!feedback.editing && (
                <>
                  <ShareActionButton
                    target="x"
                    getText={() =>
                      (feedback.feedbackEnabled
                        ? feedback.displayOutput.tweets
                        : tweets
                      ).find((t) => t.number === tweet.number)?.text ??
                      tweet.text
                    }
                    variant={variant}
                    size="icon"
                    className={
                      variant === "studio"
                        ? "rounded-lg border border-border bg-card px-2 py-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        : "rounded-md border border-border bg-background px-2 py-1 opacity-100"
                    }
                  />
                  <CopyActionButton
                    copyKey={`x_thread:tweet:${tweet.number}`}
                    label="Copy"
                    copiedKey={copiedKey}
                    errorKey={errorKey}
                    variant={variant}
                    size="icon"
                    className={
                      variant === "studio"
                        ? "rounded-lg border border-border bg-card px-2 py-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        : "rounded-md border border-border bg-background px-2 py-1"
                    }
                    onCopy={() => {
                      const text =
                        (feedback.feedbackEnabled
                          ? feedback.displayOutput.tweets
                          : tweets
                        ).find((t) => t.number === tweet.number)?.text ??
                        tweet.text;
                      copy(text, `x_thread:tweet:${tweet.number}`);
                    }}
                  />
                </>
              )}
            </div>
          </div>
          {feedback.editing ? (
            <textarea
              className="w-full rounded-md border border-border bg-background p-2 text-sm leading-relaxed"
              rows={3}
              maxLength={280}
              value={tweet.text}
              onChange={(e) => {
                const nextTweets = feedback.draft.tweets.map((t, i) =>
                  i === index ? { ...t, text: e.target.value } : t
                );
                feedback.setDraft({
                  ...feedback.draft,
                  tweets: nextTweets,
                });
              }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {tweet.text}
            </p>
          )}
          {tweet.media_suggestion && !feedback.editing && (
            <p className="mt-2 text-xs text-muted-foreground">
              Media idea: {tweet.media_suggestion}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface XThreadOutputPanelProps extends FeedbackProps {
  output: XThreadOutput;
  variant?: "studio" | "library";
}

export function XThreadOutputPanel({
  output,
  variant = "studio",
  repurposeId,
  initialRating,
  initialUserOutput,
  initialWorkflowStatus,
  onFeedback,
}: XThreadOutputPanelProps) {
  return (
    <XThreadTweetList
      tweets={output.tweets}
      threadSummary={output.thread_summary}
      variant={variant}
      output={output}
      repurposeId={repurposeId}
      initialRating={initialRating}
      initialUserOutput={initialUserOutput as XThreadOutput | null | undefined}
      onFeedback={onFeedback}
    />
  );
}
