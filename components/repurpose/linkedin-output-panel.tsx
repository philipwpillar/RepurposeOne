"use client";

import type { LinkedInOutput } from "@/types";
import {
  formatLinkedInPostForCopy,
  formatLinkedInSlidesForCopy,
} from "@/lib/format-output";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyActionButton } from "./copy-action-button";
import { ShareActionButton } from "./share-action-button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

interface LinkedInOutputPanelProps {
  output: LinkedInOutput;
  variant?: "studio" | "library";
}

export function LinkedInOutputPanel({
  output,
  variant = "studio",
}: LinkedInOutputPanelProps) {
  const { copy, copiedKey, errorKey } = useCopyToClipboard();

  const copyActions = (
    <div className="flex flex-wrap gap-2">
      <ShareActionButton
        target="linkedin"
        getText={() => formatLinkedInPostForCopy(output)}
        variant={variant}
      />
      <CopyActionButton
        copyKey="linkedin:post"
        label="Copy post"
        copiedKey={copiedKey}
        errorKey={errorKey}
        variant={variant}
        onCopy={() =>
          copy(formatLinkedInPostForCopy(output), "linkedin:post")
        }
      />
      <CopyActionButton
        copyKey="linkedin:slides"
        label="Copy carousel slides"
        copiedKey={copiedKey}
        errorKey={errorKey}
        variant={variant}
        onCopy={() =>
          copy(formatLinkedInSlidesForCopy(output), "linkedin:slides")
        }
      />
    </div>
  );

  const content = (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          POST
        </div>
        <div
          className={
            variant === "studio"
              ? "rounded-2xl bg-secondary p-4 text-sm leading-relaxed whitespace-pre-line text-foreground"
              : "whitespace-pre-wrap text-sm"
          }
        >
          {output.post}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          CAROUSEL SLIDES
        </div>
        <div className="space-y-2">
          {output.carousel_slides.map((slide) => (
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
