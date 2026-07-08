"use client";

import type { InputMode } from "@/types/photo-input";

interface InputModeTabsProps {
  value: InputMode;
  onChange: (mode: InputMode) => void;
  disabled?: boolean;
}

const TABS: { value: InputMode; label: string }[] = [
  { value: "paste", label: "Paste text" },
  { value: "photo", label: "Upload photo" },
];

export default function InputModeTabs({
  value,
  onChange,
  disabled = false,
}: InputModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Input mode"
      className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1"
    >
      {TABS.map((tab) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(tab.value)}
            className={[
              "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
