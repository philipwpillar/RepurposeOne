"use client";

import { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { PHOTO_ACCEPT_ATTRIBUTE } from "@/lib/image/constants";

interface PhotoDropZoneProps {
  processing?: boolean;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
}

export default function PhotoDropZone({
  processing = false,
  disabled = false,
  onFileSelect,
}: PhotoDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const openPicker = () => {
    if (!disabled && !processing) {
      fileInputRef.current?.click();
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file || disabled || processing) return;
    onFileSelect(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled || processing) return;
    handleFile(event.dataTransfer.files[0]);
  };

  const borderClass =
    isDragOver ? "border-primary bg-primary/5" : "border-border bg-card";

  return (
    <div
      role="button"
      tabIndex={disabled || processing ? -1 : 0}
      aria-label="Upload photo"
      aria-busy={processing}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled && !processing) {
          setIsDragOver(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
      className={[
        "mb-4 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:min-h-[220px]",
        borderClass,
        disabled || processing ? "pointer-events-none opacity-60" : "hover:bg-accent/40",
      ].join(" ")}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={PHOTO_ACCEPT_ATTRIBUTE}
        className="sr-only"
        aria-hidden
        disabled={disabled || processing}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {processing ? (
        <>
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-foreground">Processing image…</p>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="hidden text-sm font-medium text-foreground sm:block">
            Drop your photo here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="sm:hidden">Tap to choose a photo</span>
            <span className="hidden sm:inline">or tap to choose</span>
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            className="mt-4 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Choose photo
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            JPEG, PNG, WebP · max 10 MB
          </p>
        </>
      )}
    </div>
  );
}
