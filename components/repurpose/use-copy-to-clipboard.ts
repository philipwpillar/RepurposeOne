"use client";

import { useCallback, useState } from "react";
import { markCopiedIfNeeded } from "@/lib/repurpose/workflow-status-client";
import type { UserWorkflowStatus } from "@/types";

export type CopyKey = string;

type UseCopyToClipboardOptions = {
  repurposeId?: string;
  workflowStatus?: UserWorkflowStatus | null;
  onWorkflowStatusChange?: (status: UserWorkflowStatus) => void;
};

export function useCopyToClipboard(options?: UseCopyToClipboardOptions) {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [errorKey, setErrorKey] = useState<CopyKey | null>(null);

  const copy = useCallback(
    async (text: string, key: CopyKey) => {
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setErrorKey(null);
        setTimeout(
          () => setCopiedKey((current) => (current === key ? null : current)),
          2000
        );
        markCopiedIfNeeded(
          options?.repurposeId,
          options?.workflowStatus,
          options?.onWorkflowStatusChange
        );
      } catch (err) {
        console.error("Clipboard write failed", err);
        setErrorKey(key);
        setCopiedKey(null);
        setTimeout(
          () => setErrorKey((current) => (current === key ? null : current)),
          2000
        );
      }
    },
    [
      options?.repurposeId,
      options?.onWorkflowStatusChange,
      options?.workflowStatus,
    ]
  );

  return { copy, copiedKey, errorKey };
}
