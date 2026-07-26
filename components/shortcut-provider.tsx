"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  SHORTCUTS,
  isEditableShortcutTarget,
  type ShortcutAction,
} from "@/lib/shortcuts";

const CHORD_WINDOW_MS = 1000;

type ShortcutContextValue = {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutSheetOpen: boolean;
  setShortcutSheetOpen: (open: boolean) => void;
};

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

export function useShortcuts() {
  const ctx = useContext(ShortcutContext);
  if (!ctx) {
    throw new Error("useShortcuts must be used within ShortcutProvider");
  }
  return ctx;
}

function matchModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

function eventKeyToken(event: KeyboardEvent): string {
  if (event.key === "?") return "?";
  if (event.key.length === 1) return event.key.toLowerCase();
  return event.key.toLowerCase();
}

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutSheetOpen, setShortcutSheetOpen] = useState(false);
  const chordPrefixRef = useRef<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearChord = useCallback(() => {
    chordPrefixRef.current = null;
    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  const runAction = useCallback((action: ShortcutAction) => {
    if (action === "open-palette") {
      setPaletteOpen(true);
      return;
    }
    if (action === "open-shortcut-sheet") {
      setShortcutSheetOpen(true);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Guard first — editable targets never trigger navigation shortcuts.
      if (isEditableShortcutTarget(event.target)) {
        clearChord();
        return;
      }

      if (event.defaultPrevented || event.altKey) return;

      const token = eventKeyToken(event);

      // mod+k → palette
      if (matchModKey(event) && token === "k" && !event.shiftKey) {
        event.preventDefault();
        clearChord();
        runAction("open-palette");
        return;
      }

      // Ignore other modified keys for chords
      if (matchModKey(event)) {
        clearChord();
        return;
      }

      // ? → shortcut sheet (Shift+/ produces "?" on US layouts; also bare "?")
      if (token === "?" || (event.shiftKey && token === "/")) {
        event.preventDefault();
        clearChord();
        runAction("open-shortcut-sheet");
        return;
      }

      if (event.shiftKey) return;

      // Chord: g then <letter>
      if (chordPrefixRef.current === "g") {
        const chord = SHORTCUTS.find(
          (s) =>
            s.keys.length === 2 &&
            s.keys[0] === "g" &&
            s.keys[1] === token &&
            s.href
        );
        clearChord();
        if (chord?.href) {
          event.preventDefault();
          router.push(chord.href);
        }
        return;
      }

      if (token === "g") {
        chordPrefixRef.current = "g";
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(clearChord, CHORD_WINDOW_MS);
        return;
      }

      clearChord();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearChord();
    };
  }, [clearChord, router, runAction]);

  const value = useMemo(
    () => ({
      paletteOpen,
      setPaletteOpen,
      shortcutSheetOpen,
      setShortcutSheetOpen,
    }),
    [paletteOpen, shortcutSheetOpen]
  );

  return (
    <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>
  );
}
