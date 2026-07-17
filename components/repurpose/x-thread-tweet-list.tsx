"use client";

import type { Tweet, XThreadOutput } from "@/types";
import { formatXThreadForCopy } from "@/lib/format-output";
import { CopyActionButton } from "./copy-action-button";
import { ShareActionButton } from "./share-action-button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

interface XThreadTweetListProps {
  tweets: Tweet[];
  threadSummary?: string | null;
  variant?: "studio" | "library";
  showCopyAll?: boolean;
}

export function XThreadTweetList({
  tweets,
  threadSummary,
  variant = "studio",
  showCopyAll = true,
}: XThreadTweetListProps) {
  const { copy, copiedKey, errorKey } = useCopyToClipboard();

  const tweetCardClass =
    variant === "studio"
      ? "group relative rounded-2xl bg-secondary p-4"
      : "group relative rounded-lg border border-border bg-muted/30 p-4";

  return (
    <div className="space-y-3">
      {showCopyAll && tweets.length > 0 && (
        <div className="flex justify-end">
          <CopyActionButton
            copyKey="x_thread:all"
            label="Copy all"
            copiedKey={copiedKey}
            errorKey={errorKey}
            variant={variant}
            onCopy={() =>
              copy(
                formatXThreadForCopy({ format: "x_thread", tweets }),
                "x_thread:all"
              )
            }
          />
        </div>
      )}

      {threadSummary && (
        <p className="text-sm text-muted-foreground">{threadSummary}</p>
      )}

      {tweets.map((tweet) => (
        <div key={tweet.number} className={tweetCardClass}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Tweet {tweet.number}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tweet.text.length}/280
              </span>
              <ShareActionButton
                target="x"
                getText={() => tweet.text}
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
                onCopy={() =>
                  copy(tweet.text, `x_thread:tweet:${tweet.number}`)
                }
              />
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {tweet.text}
          </p>
          {tweet.media_suggestion && (
            <p className="mt-2 text-xs text-muted-foreground">
              Media idea: {tweet.media_suggestion}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface XThreadOutputPanelProps {
  output: XThreadOutput;
  variant?: "studio" | "library";
}

export function XThreadOutputPanel({
  output,
  variant = "studio",
}: XThreadOutputPanelProps) {
  return (
    <XThreadTweetList
      tweets={output.tweets}
      threadSummary={output.thread_summary}
      variant={variant}
    />
  );
}
