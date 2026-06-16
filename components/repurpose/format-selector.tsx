"use client";

import { FORMAT_OPTIONS } from "@/lib/format-config";
import type { TargetFormat } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FormatSelectorProps {
  value: TargetFormat;
  onChange: (format: TargetFormat) => void;
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FORMAT_OPTIONS.map((format) => {
        const isSelected = format.id === value;
        const isDisabled = !format.available;

        return (
          <button
            key={format.id}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (format.available) {
                onChange(format.id as TargetFormat);
              }
            }}
            className={cn(
              "relative rounded-lg border p-4 text-left transition-colors",
              isSelected && format.available
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border hover:border-primary/50",
              isDisabled && "cursor-not-allowed opacity-60 hover:border-border"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{format.label}</span>
              {format.comingSoon && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Coming soon
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {format.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
