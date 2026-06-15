"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { XThreadOutput } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface XThreadOutputDisplayProps {
  output: XThreadOutput;
  repurposeId?: string;
}

export function XThreadOutputDisplay({
  output,
  repurposeId,
}: XThreadOutputDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | "all" | null>(null);

  async function copyText(text: string, index: number | "all") {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function copyAllTweets() {
    const text = output.tweets.map((t) => t.text).join("\n\n");
    return copyText(text, "all");
  }

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyAllTweets}>
              {copiedIndex === "all" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy all
            </Button>
            {repurposeId && (
              <Badge variant="secondary" className="self-center">
                Saved to history
              </Badge>
            )}
          </div>
        </div>
        {output.thread_summary && (
          <p className="mt-2 text-sm text-muted-foreground">
            {output.thread_summary}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {output.tweets.map((tweet) => (
          <div
            key={tweet.number}
            className="group relative rounded-lg border border-border bg-muted/30 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Tweet {tweet.number}
              </span>
              <span className="text-xs text-muted-foreground">
                {tweet.text.length}/280
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {tweet.text}
            </p>
            {tweet.media_suggestion && (
              <p className="mt-2 text-xs text-muted-foreground">
                💡 Media idea: {tweet.media_suggestion}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => copyText(tweet.text, tweet.number)}
            >
              {copiedIndex === tweet.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
