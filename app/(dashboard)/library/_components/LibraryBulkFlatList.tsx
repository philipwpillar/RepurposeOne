"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkflowStatusBadge } from "@/components/repurpose/workflow-status-badge";
import { formatLabel, getOutputPreview } from "@/lib/format-output";
import { deriveSourceTitle } from "@/lib/source-title";
import type { RepurposeOutput, TargetFormat, UserWorkflowStatus } from "@/types";

export type FlatLibraryItem = {
  id: string;
  target_format: TargetFormat;
  created_at: string;
  input_content: string;
  source_hash: string | null;
  output: unknown;
  user_workflow_status: UserWorkflowStatus | null;
};

function copyTextForItem(item: FlatLibraryItem): string {
  const title = deriveSourceTitle(item.input_content);
  const preview = item.output
    ? getOutputPreview(item.output as RepurposeOutput)
    : "";
  const formatName = formatLabel(item.target_format);
  return [`[${formatName}] ${title}`, preview].filter(Boolean).join("\n");
}

/**
 * Flat Library list with bulk select + Copy all.
 * Selection is component state only - clears on unmount / navigation.
 */
export function LibraryBulkFlatList({ items }: { items: FlatLibraryItem[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const selectedCount = selectedIds.size;
  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const itemById = useMemo(() => {
    const map = new Map<string, FlatLibraryItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const copySelected = async () => {
    const chunks: string[] = [];
    for (const id of selectedIds) {
      const item = itemById.get(id);
      if (item) chunks.push(copyTextForItem(item));
    }
    const text = chunks.join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        selectedCount === 1
          ? "Copied 1 item"
          : `Copied ${selectedCount} items`
      );
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(v) => toggleAll(v === true)}
          aria-label="Select all on this page"
        />
        <span>Select all on this page</span>
      </div>

      {selectedCount > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm"
        >
          <span className="font-medium text-foreground">
            {selectedCount} selected
          </span>
          <span className="text-muted-foreground" aria-hidden="true">
            ·
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={copySelected}>
            Copy all
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      ) : null}

      {items.map((item) => {
        const checked = selectedIds.has(item.id);
        const href = item.source_hash
          ? `/library/${item.source_hash}/${item.id}`
          : "/library";

        return (
          <div key={item.id} className="flex items-start gap-3">
            <div className="pt-5">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => toggleOne(item.id, v === true)}
                aria-label={`Select ${formatLabel(item.target_format)} output`}
              />
            </div>
            <Link href={href} className="min-w-0 flex-1 block">
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {formatLabel(item.target_format)}
                      </Badge>
                      <WorkflowStatusBadge status={item.user_workflow_status} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {deriveSourceTitle(item.input_content)}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.output
                        ? getOutputPreview(item.output as RepurposeOutput)
                        : "No preview available"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(item.created_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
