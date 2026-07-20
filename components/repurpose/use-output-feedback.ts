"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RepurposeOutput, UserRating, UserWorkflowStatus } from "@/types";
import {
  clearEditDraft,
  isRecoverableDraft,
  readEditDraft,
  writeEditDraft,
} from "@/lib/repurpose/edit-draft-storage";

export type FeedbackProps = {
  repurposeId?: string;
  initialRating?: UserRating | null;
  initialUserOutput?: RepurposeOutput | null;
  initialWorkflowStatus?: UserWorkflowStatus | null;
  /** ISO timestamp of last server-side user_output save — used for draft staleness. */
  initialEditedAt?: string | null;
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
  initialEditedAt?: string | null;
  onFeedback?: FeedbackProps["onFeedback"];
};

const DRAFT_DEBOUNCE_MS = 500;

export function useOutputFeedback<T extends RepurposeOutput>({
  output,
  repurposeId,
  initialRating = null,
  initialUserOutput = null,
  initialEditedAt = null,
  onFeedback,
}: UseOutputFeedbackArgs<T>) {
  const feedbackEnabled = Boolean(repurposeId);
  const [displayOutput, setDisplayOutput] = useState<T>(
    (initialUserOutput as T | null) ?? output
  );
  const [rating, setRating] = useState<UserRating | null>(initialRating ?? null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraftState] = useState<T>(displayOutput);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState(false);
  const editedAtRef = useRef<string | null>(initialEditedAt ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const persistDraft = useCallback(
    (next: T) => {
      if (!repurposeId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        writeEditDraft(repurposeId, next);
      }, DRAFT_DEBOUNCE_MS);
    },
    [repurposeId]
  );

  const setDraft = useCallback(
    (next: T | ((prev: T) => T)) => {
      setDraftState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        persistDraft(resolved);
        return resolved;
      });
    },
    [persistDraft]
  );

  const clearStoredDraft = useCallback(() => {
    if (!repurposeId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    clearEditDraft(repurposeId);
  }, [repurposeId]);

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
          edited_at?: string | null;
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
    setDraftState(displayOutput);
    setEditing(true);
    setError(null);

    if (!repurposeId) {
      setPendingRestore(false);
      return;
    }

    const stored = readEditDraft<T>(repurposeId);
    const recoverable =
      stored !== null &&
      isRecoverableDraft(stored, displayOutput, editedAtRef.current);

    setPendingRestore(recoverable);
  }, [displayOutput, repurposeId]);

  const restoreDraft = useCallback(() => {
    if (!repurposeId) return;
    const stored = readEditDraft<T>(repurposeId);
    if (!stored) {
      setPendingRestore(false);
      return;
    }
    setDraftState(stored.draft);
    setPendingRestore(false);
  }, [repurposeId]);

  const discardStoredDraft = useCallback(() => {
    clearStoredDraft();
    setPendingRestore(false);
  }, [clearStoredDraft]);

  const cancelEdit = useCallback(() => {
    setDraftState(displayOutput);
    setEditing(false);
    setPendingRestore(false);
    setError(null);
    clearStoredDraft();
  }, [clearStoredDraft, displayOutput]);

  const saveEdit = useCallback(async () => {
    const updated = await patchFeedback({ user_output: draft });
    if (!updated) return;
    const nextOutput = (updated.user_output as T | null) ?? draft;
    setDisplayOutput(nextOutput);
    setDraftState(nextOutput);
    setEditing(false);
    setPendingRestore(false);
    clearStoredDraft();
    if (updated.edited_at) {
      editedAtRef.current = updated.edited_at;
    } else {
      editedAtRef.current = new Date().toISOString();
    }
    onFeedback?.({
      rating: updated.user_rating ?? rating,
      user_output: nextOutput,
    });
  }, [clearStoredDraft, draft, onFeedback, patchFeedback, rating]);

  return {
    feedbackEnabled,
    displayOutput,
    rating,
    editing,
    draft,
    setDraft,
    saving,
    error,
    pendingRestore,
    restoreDraft,
    discardStoredDraft,
    toggleRating,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
