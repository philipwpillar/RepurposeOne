"use client";

import type { XThreadOutput } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XThreadTweetList } from "./x-thread-tweet-list";

interface XThreadOutputDisplayProps {
  output: XThreadOutput;
  repurposeId?: string;
}

export function XThreadOutputDisplay({
  output,
  repurposeId,
}: XThreadOutputDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Your X thread</CardTitle>
            <CardDescription>
              {output.tweets.length} tweets — copy individually or all at once
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
        />
      </CardContent>
    </Card>
  );
}
