export type ShortcutGroup = "Navigate" | "Create" | "General";

export type ShortcutAction = "open-palette" | "open-shortcut-sheet";

export type Shortcut = {
  id: string;
  keys: string[];
  label: string;
  group: ShortcutGroup;
  href?: string;
  action?: ShortcutAction;
};

/**
 * Single source of truth for the command palette, `?` sheet, and key handler.
 * Do not hardcode parallel lists in UI consumers.
 */
export const SHORTCUTS: Shortcut[] = [
  {
    id: "open-palette",
    keys: ["mod", "k"],
    label: "Open command palette",
    group: "General",
    action: "open-palette",
  },
  {
    id: "nav-dashboard",
    keys: ["g", "d"],
    label: "Go to Dashboard",
    group: "Navigate",
    href: "/dashboard",
  },
  {
    id: "nav-studio",
    keys: ["g", "s"],
    label: "Go to Studio",
    group: "Navigate",
    href: "/studio",
  },
  {
    id: "nav-library",
    keys: ["g", "l"],
    label: "Go to Library",
    group: "Navigate",
    href: "/library",
  },
  {
    id: "nav-bundles",
    keys: ["g", "b"],
    label: "Go to Bundles",
    group: "Navigate",
    href: "/bundles",
  },
  {
    id: "nav-brand-voice",
    keys: ["g", "v"],
    label: "Go to Brand Voice",
    group: "Navigate",
    href: "/brand-voice",
  },
  {
    id: "nav-account",
    keys: ["g", "a"],
    label: "Go to Account",
    group: "Navigate",
    href: "/account",
  },
  {
    id: "open-shortcut-sheet",
    keys: ["?"],
    label: "Show keyboard shortcuts",
    group: "General",
    action: "open-shortcut-sheet",
  },
];

export const NAVIGATE_SHORTCUTS = SHORTCUTS.filter((s) => s.group === "Navigate");
export const CREATE_SHORTCUTS = SHORTCUTS.filter((s) => s.group === "Create");
export const GENERAL_SHORTCUTS = SHORTCUTS.filter((s) => s.group === "General");

/** Create-group entries for the palette (not key-bound in 5A). */
export const PALETTE_CREATE_ITEMS = [
  {
    id: "create-repurpose",
    label: "New repurpose",
    href: "/studio",
    group: "Create" as const,
  },
  {
    id: "create-bundle",
    label: "New bundle",
    href: "/bundles",
    group: "Create" as const,
  },
  {
    id: "create-brand-voice",
    label: "New brand voice",
    href: "/brand-voice",
    group: "Create" as const,
  },
] as const;

export function formatShortcutKeys(keys: string[]): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return keys
    .map((key) => {
      if (key === "mod") return isMac ? "⌘" : "Ctrl";
      if (key === "?") return "?";
      return key.length === 1 ? key.toUpperCase() : key;
    })
    .join(keys.includes("mod") ? "" : " then ");
}

/**
 * Input guard — write this before any chord / mod handling.
 * Typing "g" in Library search must not navigate to Studio.
 */
export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  if (target.isContentEditable) return true;

  const editable = target.closest("[contenteditable]");
  return (
    editable instanceof HTMLElement &&
    editable.isContentEditable &&
    editable.getAttribute("contenteditable") !== "false"
  );
}
