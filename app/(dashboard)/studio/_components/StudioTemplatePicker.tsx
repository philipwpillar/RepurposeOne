"use client";

import { STUDIO_TEMPLATES } from "@/lib/repurpose/templates";

interface StudioTemplatePickerProps {
  disabled?: boolean;
  onApply: (body: string) => void;
}

export default function StudioTemplatePicker({
  disabled = false,
  onApply,
}: StudioTemplatePickerProps) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Try a template
      </p>
      <div className="flex flex-wrap gap-2">
        {STUDIO_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            onClick={() => onApply(template.body)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {template.title}
          </button>
        ))}
      </div>
    </div>
  );
}
