"use client";

import { useState } from "react";
import type { UserWorkflowStatus } from "@/types";
import { patchWorkflowStatus } from "@/lib/repurpose/workflow-status-client";
import { WorkflowStatusBadge } from "./workflow-status-badge";

interface WorkflowStatusControlsProps {
  repurposeId: string;
  initialStatus: UserWorkflowStatus | null;
  onStatusChange?: (status: UserWorkflowStatus | null) => void;
}

export function WorkflowStatusControls({
  repurposeId,
  initialStatus,
  onStatusChange,
}: WorkflowStatusControlsProps) {
  const [status, setStatus] = useState<UserWorkflowStatus | null>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function togglePosted() {
    const next: UserWorkflowStatus | null = status === "posted" ? null : "posted";
    setSaving(true);
    const ok = await patchWorkflowStatus(repurposeId, next);
    setSaving(false);
    if (!ok) {
      return;
    }
    setStatus(next);
    onStatusChange?.(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <WorkflowStatusBadge status={status} />
      <button
        type="button"
        disabled={saving}
        onClick={() => void togglePosted()}
        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {saving
          ? "Saving…"
          : status === "posted"
            ? "Unmark posted"
            : "Mark as posted"}
      </button>
    </div>
  );
}
