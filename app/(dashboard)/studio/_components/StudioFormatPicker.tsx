"use client";

import { FORMAT_OPTIONS } from "@/lib/format-config";
import { cn } from "@/lib/utils";
import type { TargetFormat } from "@/types";

const SHORT_LABELS: Record<TargetFormat, string> = {
  x_thread: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  email: "Email",
};

interface StudioFormatPickerProps {
  selected: Set<TargetFormat>;
  onChange: (next: Set<TargetFormat>) => void;
  disabled?: boolean;
}

export default function StudioFormatPicker({
  selected,
  onChange,
  disabled = false,
}: StudioFormatPickerProps) {
  const toggle = (format: TargetFormat) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(format)) {
      if (next.size <= 1) return; // keep at least one
      next.delete(format);
    } else {
      next.add(format);
    }
    onChange(next);
  };

  return (
    <div className="mb-4 px-1">
      <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">
        FORMATS FOR THIS RUN
      </div>
      <div className="flex flex-wrap gap-2">
        {FORMAT_OPTIONS.filter((o) => o.available).map((option) => {
          const id = option.id as TargetFormat;
          const isOn = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled || (isOn && selected.size === 1)}
              aria-pressed={isOn}
              title={option.description}
              onClick={() => toggle(id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                isOn
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              )}
            >
              {SHORT_LABELS[id]}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Selected formats run together. You can still regenerate one card at a
        time after results appear.
      </p>
    </div>
  );
}
