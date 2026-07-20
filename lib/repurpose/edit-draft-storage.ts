import type { RepurposeOutput } from "@/types";

const STORAGE_PREFIX = "voiceora:edit-draft:";
const DRAFT_VERSION = 1;

export type StoredEditDraft<T extends RepurposeOutput = RepurposeOutput> = {
  version: typeof DRAFT_VERSION;
  draft: T;
  savedAt: string;
};

function storageKey(repurposeId: string): string {
  return `${STORAGE_PREFIX}${repurposeId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readEditDraft<T extends RepurposeOutput>(
  repurposeId: string
): StoredEditDraft<T> | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(storageKey(repurposeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEditDraft<T>;
    if (parsed?.version !== DRAFT_VERSION || !parsed.draft || !parsed.savedAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeEditDraft<T extends RepurposeOutput>(
  repurposeId: string,
  draft: T
): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredEditDraft<T> = {
      version: DRAFT_VERSION,
      draft,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(repurposeId), JSON.stringify(payload));
  } catch {
    // Quota / private mode — recovery is best-effort.
  }
}

export function clearEditDraft(repurposeId: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(storageKey(repurposeId));
  } catch {
    // ignore
  }
}

/** True when a stored draft is newer than the last server edit and differs from current display. */
export function isRecoverableDraft<T extends RepurposeOutput>(
  stored: StoredEditDraft<T>,
  displayOutput: T,
  editedAt: string | null | undefined
): boolean {
  if (JSON.stringify(stored.draft) === JSON.stringify(displayOutput)) {
    return false;
  }
  if (!editedAt) return true;
  return Date.parse(stored.savedAt) > Date.parse(editedAt);
}
