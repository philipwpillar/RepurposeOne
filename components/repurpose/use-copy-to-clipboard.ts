"use client";

import { useCallback, useState } from "react";

export type CopyKey = string;

export function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [errorKey, setErrorKey] = useState<CopyKey | null>(null);

  const copy = useCallback(async (text: string, key: CopyKey) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setErrorKey(null);
      setTimeout(
        () => setCopiedKey((current) => (current === key ? null : current)),
        2000
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
  }, []);

  return { copy, copiedKey, errorKey };
}
