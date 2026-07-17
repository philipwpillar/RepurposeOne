"use client";

import { useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import {
  BUNDLE_MAX_PHOTOS,
  BUNDLE_PHOTO_ACCEPT_ATTRIBUTE,
} from "@/lib/image/constants";
import { formatByteSize } from "@/lib/image/downscale";

export interface BundlePhotoItem {
  id: string;
  fileName: string;
  previewUrl: string;
  base64: string;
  byteSize: number;
  width: number;
  height: number;
}

interface BundlePhotoPickerProps {
  photos: BundlePhotoItem[];
  processing?: boolean;
  disabled?: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
}

export default function BundlePhotoPicker({
  photos,
  processing = false,
  disabled = false,
  onAddFiles,
  onRemove,
}: BundlePhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const atCap = photos.length >= BUNDLE_MAX_PHOTOS;
  const locked = disabled || processing || atCap;

  const openPicker = () => {
    if (!locked) {
      fileInputRef.current?.click();
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (locked) return;
    onAddFiles(event.dataTransfer.files);
  };

  const totalBytes = photos.reduce((sum, p) => sum + p.byteSize, 0);

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={`Photo ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-white">
                  Photo {index + 1}
                </p>
                <p className="truncate text-[10px] text-white/80">
                  {formatByteSize(photo.byteSize)}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled || processing}
                onClick={() => onRemove(photo.id)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white hover:bg-black/75 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        role="button"
        tabIndex={locked ? -1 : 0}
        aria-label="Upload photos"
        aria-busy={processing}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!locked) setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        className={[
          "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-border bg-card",
          locked ? "pointer-events-none opacity-60" : "hover:bg-accent/40",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={BUNDLE_PHOTO_ACCEPT_ATTRIBUTE}
          multiple
          className="sr-only"
          aria-hidden
          disabled={locked}
          onChange={(event) => {
            if (event.target.files?.length) {
              onAddFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <ImageIcon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {atCap
            ? `Maximum ${BUNDLE_MAX_PHOTOS} photos`
            : processing
              ? "Processing photos…"
              : photos.length
                ? "Add more photos"
                : "Drop photos here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP, or HEIC · up to {BUNDLE_MAX_PHOTOS} · 10 MB each
        </p>
      </div>

      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {photos.length} / {BUNDLE_MAX_PHOTOS} photos ·{" "}
          {formatByteSize(totalBytes)} total
        </p>
      )}
    </div>
  );
}
