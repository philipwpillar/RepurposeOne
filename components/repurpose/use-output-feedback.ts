"use client";

import { useCallback, useState } from "react";
import type { RepurposeOutput, UserRating } from "@/types";

export type FeedbackProps = {
  repurposeId?: string;
  initialRating?: UserRating | null;
  initialUserOutput?: RepurposeOutput | null;
  onFeedback?: (payload: {
    rating: UserRating | null;
    user_output: RepurposeOutput | null;
  }) => void;
};

type UseOutputFeedbackArgs<T extends RepurposeOutput> = {
  output: T;
  repurposeId?: string;
  initialRating?: UserRating | null;
  initialUserOutput?: T | null;
  onFeedback?: FeedbackProps["onFeedback"];
};

export function useOutputFeedback<T extends RepurposeOutput>({
  output,
  repurposeId,
  initialRating = null,
  initialUserOutput = null,
  onFeedback,
}: UseOutputFeedbackArgs<T>) {
  const feedbackEnabled = Boolean(repurposeId);
  const [displayOutput, setDisplayOutput] = useState<T>(
    (initialUserOutput as T | null) ?? output
  );
  const [rating, setRating] = useState<UserRating | null>(initialRating ?? null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(displayOutput);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchFeedback = useCallback(
    async (body: {
      rating?: UserRating | null;
      user_output?: T;
    }) => {
      if (!repurposeId) return null;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/repurposes/${repurposeId}/feedback`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to save feedback");
        }
        return data.repurpose as {
          user_rating: UserRating | null;
          user_output: T | null;
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save feedback";
        setError(message);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [repurposeId]
  );

  const toggleRating = useCallback(
    async (next: UserRating) => {
      const value: UserRating | null = rating === next ? null : next;
      const updated = await patchFeedback({ rating: value });
      if (!updated) return;
      setRating(updated.user_rating ?? null);
      onFeedback?.({
        rating: updated.user_rating ?? null,
        user_output: (updated.user_output as T | null) ?? displayOutput,
      });
    },
    [displayOutput, onFeedback, patchFeedback, rating]
  );

  const startEdit = useCallback(() => {
    setDraft(displayOutput);
    setEditing(true);
    setError(null);
  }, [displayOutput]);

  const cancelEdit = useCallback(() => {
    setDraft(displayOutput);
    setEditing(false);
    setError(null);
  }, [displayOutput]);

  const saveEdit = useCallback(async () => {
    const updated = await patchFeedback({ user_output: draft });
    if (!updated) return;
    const nextOutput = (updated.user_output as T | null) ?? draft;
    setDisplayOutput(nextOutput);
    setDraft(nextOutput);
    setEditing(false);
    onFeedback?.({
      rating: updated.user_rating ?? rating,
      user_output: nextOutput,
    });
  }, [draft, onFeedback, patchFeedback, rating]);

  return {
    feedbackEnabled,
    displayOutput,
    rating,
    editing,
    draft,
    setDraft,
    saving,
    error,
    toggleRating,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
