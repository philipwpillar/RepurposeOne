"use client";

import type { EmailOutput } from "@/types";
import {
  formatEmailBodyForCopy,
  formatEmailSubjectForCopy,
} from "@/lib/format-output";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyActionButton } from "./copy-action-button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

interface EmailOutputPanelProps {
  output: EmailOutput;
  variant?: "studio" | "library";
}

export function EmailOutputPanel({
  output,
  variant = "studio",
}: EmailOutputPanelProps) {
  const { copy, copiedKey, errorKey } = useCopyToClipboard();

  const copyActions = (
    <div className="flex flex-wrap gap-2">
      <CopyActionButton
        copyKey="email:subject"
        label="Copy subject"
        copiedKey={copiedKey}
        errorKey={errorKey}
        variant={variant}
        onCopy={() =>
          copy(formatEmailSubjectForCopy(output), "email:subject")
        }
      />
      <CopyActionButton
        copyKey="email:body"
        label="Copy body"
        copiedKey={copiedKey}
        errorKey={errorKey}
        variant={variant}
        onCopy={() => copy(formatEmailBodyForCopy(output), "email:body")}
      />
    </div>
  );

  const content = (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          SUBJECT LINE
        </div>
        <div className="text-sm font-medium text-foreground">
          {output.subject_line}
        </div>
      </div>

      {output.preview_text && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            PREVIEW TEXT
          </div>
          <div className="text-sm text-muted-foreground">
            {output.preview_text}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          BODY
        </div>
        <div
          className={
            variant === "studio"
              ? "rounded-2xl bg-secondary p-4 text-sm leading-relaxed whitespace-pre-line text-foreground"
              : "whitespace-pre-wrap text-sm"
          }
        >
          {output.body}
        </div>
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
              <CardDescription>{output.subject_line}</CardDescription>
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
