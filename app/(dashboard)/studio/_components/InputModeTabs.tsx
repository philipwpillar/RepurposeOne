"use client";

import type { InputMode } from "@/types/photo-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InputModeTabsProps {
  value: InputMode;
  onChange: (mode: InputMode) => void;
  disabled?: boolean;
}

export default function InputModeTabs({
  value,
  onChange,
  disabled = false,
}: InputModeTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as InputMode)}
      className="mb-5"
    >
      <TabsList aria-label="Input mode" className="grid w-full grid-cols-3">
        <TabsTrigger value="paste" disabled={disabled}>
          Paste text
        </TabsTrigger>
        <TabsTrigger value="link" disabled={disabled}>
          Link
        </TabsTrigger>
        <TabsTrigger value="photo" disabled={disabled}>
          Upload photo
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
