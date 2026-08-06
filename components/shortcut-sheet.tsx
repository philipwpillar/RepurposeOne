"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShortcuts } from "@/components/shortcut-provider";
import {
  SHORTCUTS,
  formatShortcutKeys,
  type ShortcutGroup,
} from "@/lib/shortcuts";

const GROUP_ORDER: ShortcutGroup[] = ["Navigate", "Create", "General"];

/**
 * Shortcut cheat-sheet - generated only from lib/shortcuts.ts.
 */
export function ShortcutSheet() {
  const { shortcutSheetOpen, setShortcutSheetOpen } = useShortcuts();

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: SHORTCUTS.filter((s) => s.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <Dialog open={shortcutSheetOpen} onOpenChange={setShortcutSheetOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            All shortcuts come from the shared registry - the palette and this
            sheet cannot drift.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map(({ group, items }) => (
            <section key={group} className="space-y-2">
              <h3 className="eyebrow text-muted-foreground">
                {group}
              </h3>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground">{item.label}</span>
                    <kbd className="text-micro shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {formatShortcutKeys(item.keys)}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
