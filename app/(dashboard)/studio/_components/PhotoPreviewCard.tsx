"use client";

import { formatByteSize } from "@/lib/image/downscale";

interface PhotoPreviewCardProps {
  previewUrl: string;
  fileName: string;
  width: number;
  height: number;
  byteSize: number;
  disabled?: boolean;
  onChange: () => void;
  onRemove: () => void;
}

export default function PhotoPreviewCard({
  previewUrl,
  fileName,
  width,
  height,
  byteSize,
  disabled = false,
  onChange,
  onRemove,
}: PhotoPreviewCardProps) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 text-xs font-medium text-muted-foreground">YOUR PHOTO</div>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Uploaded preview"
          className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{fileName}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {width} × {height} · {formatByteSize(byteSize)}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onChange}
              className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              Change
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              aria-label="Remove photo"
              className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
