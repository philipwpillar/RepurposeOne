"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShortcuts } from "@/components/shortcut-provider";
import { createClient } from "@/lib/supabase/client";
import { formatLabel, getOutputPreview } from "@/lib/format-output";
import {
  NAVIGATE_SHORTCUTS,
  PALETTE_CREATE_ITEMS,
  formatShortcutKeys,
} from "@/lib/shortcuts";
import type { RepurposeOutput } from "@/types";
import { cn } from "@/lib/utils";

type RecentItem = {
  id: string;
  target_format: string;
  created_at: string;
  source_hash: string | null;
  output: RepurposeOutput | null;
};

/**
 * Authenticated command palette. Mounted under ShortcutProvider.
 * Recent items load lazily on first open via the browser Supabase client - 
 * never from the dashboard layout hot path.
 */
export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, setShortcutSheetOpen } = useShortcuts();
  const [recent, setRecent] = useState<RecentItem[] | null>(null);
  const [recentStatus, setRecentStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!paletteOpen || fetchedRef.current) return;
    fetchedRef.current = true;
    setRecentStatus("loading");

    const supabase = createClient();
    void supabase
      .from("repurposes")
      .select("id, target_format, output, created_at, source_hash")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          console.error("command-palette: recent fetch failed", error);
          setRecent([]);
          setRecentStatus("error");
          return;
        }
        setRecent((data as RecentItem[] | null) ?? []);
        setRecentStatus("ready");
      });
  }, [paletteOpen]);

  const runHref = (href: string) => {
    setPaletteOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 gap-0 max-w-lg",
          "[&>button]:right-3 [&>button]:top-3"
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search navigation, create actions, and recent library items.
        </DialogDescription>
        <Command
          label="Command palette"
          className="vo-cmdk flex max-h-[min(70vh,28rem)] flex-col"
        >
          <CommandInput
            placeholder="Search or jump to…"
            className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <CommandList className="flex-1 overflow-y-auto p-2">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No results.
            </CommandEmpty>

            <CommandGroup
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {NAVIGATE_SHORTCUTS.map((item) =>
                item.href ? (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.href}`}
                    onSelect={() => runHref(item.href!)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <span>{item.label.replace(/^Go to /, "")}</span>
                    <kbd className="text-micro text-muted-foreground">
                      {formatShortcutKeys(item.keys)}
                    </kbd>
                  </CommandItem>
                ) : null
              )}
            </CommandGroup>

            <CommandSeparator className="my-1 h-px bg-border" />

            <CommandGroup
              heading="Create"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {PALETTE_CREATE_ITEMS.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.href}`}
                  onSelect={() => runHref(item.href)}
                  className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-1 h-px bg-border" />

            <CommandGroup
              heading="Recent"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {recentStatus === "loading" || recentStatus === "idle" ? (
                <CommandItem
                  value="loading recent"
                  disabled
                  className="px-2 py-2 text-sm text-muted-foreground"
                >
                  Loading recent…
                </CommandItem>
              ) : null}
              {recentStatus === "ready" && recent?.length === 0 ? (
                <CommandItem
                  value="no recent"
                  disabled
                  className="px-2 py-2 text-sm text-muted-foreground"
                >
                  No recent items
                </CommandItem>
              ) : null}
              {recent?.map((item) => {
                if (!item.source_hash) return null;
                const href = `/library/${item.source_hash}/${item.id}`;
                const preview = item.output
                  ? getOutputPreview(item.output)
                  : "No preview";
                return (
                  <CommandItem
                    key={item.id}
                    value={`recent ${formatLabel(item.target_format)} ${preview}`}
                    onSelect={() => runHref(href)}
                    className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">
                        {formatLabel(item.target_format)}
                      </span>
                      <span className="text-muted-foreground"> - {preview}</span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator className="my-1 h-px bg-border" />

            <CommandGroup
              heading="General"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <CommandItem
                value="keyboard shortcuts"
                onSelect={() => {
                  setPaletteOpen(false);
                  setShortcutSheetOpen(true);
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <span>Keyboard shortcuts</span>
                <kbd className="text-micro text-muted-foreground">
                  ?
                </kbd>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Gate alias - same component. */
export const CommandDialog = CommandPalette;
