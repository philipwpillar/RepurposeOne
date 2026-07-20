"use client";

import type { XThreadOutput, UserRating } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XThreadTweetList } from "./x-thread-tweet-list";
import type { FeedbackProps } from "./use-output-feedback";

interface XThreadOutputDisplayProps extends FeedbackProps {
  output: XThreadOutput;
}

export function XThreadOutputDisplay({
  output,
  repurposeId,
  initialRating,
  initialUserOutput,
  initialWorkflowStatus,
  onFeedback,
}: XThreadOutputDisplayProps) {
  const tweetCount =
    (initialUserOutput as XThreadOutput | null | undefined)?.tweets.length ??
    output.tweets.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Your X thread</CardTitle>
            <CardDescription>
              {tweetCount} tweets — copy individually or all at once
            </CardDescription>
          </div>
          {repurposeId && (
            <Badge variant="secondary" className="self-center">
              Saved to history
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <XThreadTweetList
          tweets={output.tweets}
          threadSummary={output.thread_summary}
          variant="library"
          output={output}
          repurposeId={repurposeId}
          initialRating={initialRating as UserRating | null | undefined}
          initialUserOutput={
            initialUserOutput as XThreadOutput | null | undefined
          }
          initialWorkflowStatus={initialWorkflowStatus}
          onFeedback={onFeedback}
        />
      </CardContent>
    </Card>
  );
}
