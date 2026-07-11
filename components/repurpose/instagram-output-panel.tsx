"use client";

import type { InstagramOutput } from "@/types";
import { formatInstagramCaptionForCopy } from "@/lib/format-output";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyActionButton } from "./copy-action-button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

interface InstagramOutputPanelProps {
  output: InstagramOutput;
  variant?: "studio" | "library";
}

function formatHashtags(hashtags: string[]): string {
  return hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
}

export function InstagramOutputPanel({
  output,
  variant = "studio",
}: InstagramOutputPanelProps) {
  const { copy, copiedKey, errorKey } = useCopyToClipboard();

  const copyActions = (
    <CopyActionButton
      copyKey="instagram:caption"
      label="Copy caption + hashtags"
      copiedKey={copiedKey}
      errorKey={errorKey}
      variant={variant}
      onCopy={() =>
        copy(formatInstagramCaptionForCopy(output), "instagram:caption")
      }
    />
  );

  const content = (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          CAPTION
        </div>
        <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {output.caption}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          HOOK VARIATIONS
        </div>
        <ul className="space-y-2">
          {output.hook_variations.map((hook, index) => (
            <li
              key={index}
              className={
                variant === "studio"
                  ? "group flex items-start justify-between gap-2 rounded-2xl bg-secondary p-3 text-sm text-foreground"
                  : "group flex items-start justify-between gap-2 text-sm"
              }
            >
              <span className="flex-1">{hook}</span>
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
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          HASHTAGS
        </div>
        <div className="text-sm text-primary">
          {formatHashtags(output.hashtags)}
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
