"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { UserRating } from "@/types";

interface OutputFeedbackControlsProps {
  rating: UserRating | null;
  editing: boolean;
  saving: boolean;
  error: string | null;
  pendingRestore?: boolean;
  onRate: (rating: UserRating) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRestoreDraft?: () => void;
  onDiscardDraft?: () => void;
  variant?: "studio" | "library";
}

export function OutputFeedbackControls({
  rating,
  editing,
  saving,
  error,
  pendingRestore = false,
  onRate,
  onEdit,
  onSave,
  onCancel,
  onRestoreDraft,
  onDiscardDraft,
  variant = "library",
}: OutputFeedbackControlsProps) {
  const buttonClass =
    variant === "studio"
      ? "text-xs px-3 py-1.5 rounded-2xl border border-border disabled:opacity-50"
      : "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50";

  const activeUp =
    rating === 1
      ? "border-green-600/50 bg-green-600/10 text-green-700"
      : "";
  const activeDown =
    rating === -1
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : "";

  return (
    <div className="flex flex-col gap-2">
      {pendingRestore && editing && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <p className="mb-2">Unsaved draft found from a previous edit.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onRestoreDraft}
              className={buttonClass}
            >
              Restore draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onDiscardDraft}
              className={buttonClass}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Thumbs up"
          aria-pressed={rating === 1}
          disabled={saving || editing}
          onClick={() => onRate(1)}
          className={`${buttonClass} ${activeUp}`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Thumbs down"
          aria-pressed={rating === -1}
          disabled={saving || editing}
          onClick={() => onRate(-1)}
          className={`${buttonClass} ${activeDown}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>

        {editing ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className={buttonClass}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className={buttonClass}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={onEdit}
            className={buttonClass}
          >
            Edit
          </button>
        )}

        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    </div>
  );
}
