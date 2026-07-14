"use client";

import { useState } from "react";
import { INPUT_CONTENT_MIN_LENGTH } from "@/lib/config";

interface TextSourceCardProps {
  inputSummary: string;
  isLoading: boolean;
  onUpdate: (content: string) => void;
}

export default function TextSourceCard({
  inputSummary,
  isLoading,
  onUpdate,
}: TextSourceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(inputSummary);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setDraft(inputSummary);
    setError(null);
    setIsOpen(true);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed.length < INPUT_CONTENT_MIN_LENGTH) {
      setError(
        `Source content must be at least ${INPUT_CONTENT_MIN_LENGTH} characters.`
      );
      return;
    }

    setIsOpen(false);
    setError(null);
    onUpdate(trimmed);
  };

  return (
    <>
      <div
        onClick={openModal}
        className="mb-5 cursor-pointer rounded-2xl border border-border bg-card p-4 transition-colors active:bg-accent"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              SOURCE CONTENT
            </div>
            <div
              className={`line-clamp-2 pr-4 ${
                inputSummary
                  ? "font-medium text-foreground"
                  : "italic text-muted-foreground"
              }`}
            >
              {inputSummary || "Add your source content to get started"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {inputSummary.length.toLocaleString()} characters
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openModal();
            }}
            className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Change
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full rounded-t-3xl bg-card p-5 sm:w-[480px] sm:rounded-3xl">
            <div className="mb-3 font-semibold">Source Content</div>
            <textarea
              className="h-40 w-full rounded-2xl border p-4 text-sm"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            {error ? (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            ) : null}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-2xl border py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 rounded-2xl bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-50"
              >
                {isLoading ? "Generating…" : "Update & Regenerate All"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
