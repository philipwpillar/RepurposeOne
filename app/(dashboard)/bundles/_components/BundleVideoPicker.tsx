"use client";

import { useRef } from "react";
import { Film, Loader2, X } from "lucide-react";
import { buildContactSheets } from "@/lib/video/contact-sheets";
import {
  VIDEO_MAX_BYTES,
  VIDEO_MAX_MB,
  VIDEO_TOO_LARGE_MESSAGE,
  VIDEO_TOO_LONG_MESSAGE,
  VIDEO_UNSUPPORTED_MESSAGE,
} from "@/lib/video/constants";
import { VideoSampleError } from "@/lib/video/errors";
import { sampleVideoFrames } from "@/lib/video/frame-sampler";
import type { BundleVideoInput } from "@/types";

export interface BundleVideoItem {
  id: string;
  file: File;
  fileName: string;
  durationS: number;
  thumbDataUrl: string;
  payload: BundleVideoInput;
  approxBytes: number;
}

interface BundleVideoPickerProps {
  videos: BundleVideoItem[];
  processing?: boolean;
  disabled?: boolean;
  progressLabel?: string | null;
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
}

const MAX_VIDEOS = 2;

export default function BundleVideoPicker({
  videos,
  processing = false,
  disabled = false,
  progressLabel = null,
  onAddFiles,
  onRemove,
}: BundleVideoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atCap = videos.length >= MAX_VIDEOS;
  const locked = disabled || processing || atCap;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Add videos (up to {MAX_VIDEOS}) — preview / dev
        </p>
        {progressLabel && (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progressLabel}
          </p>
        )}
      </div>

      {videos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.thumbDataUrl}
                alt={`Video ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-white">
                  Video {index + 1} · {video.durationS.toFixed(0)}s
                </p>
                <p className="truncate text-[10px] text-white/80">
                  {video.fileName}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled || processing}
                onClick={() => onRemove(video.id)}
                aria-label={`Remove video ${index + 1}`}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white hover:bg-black/75 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={locked}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full min-h-[100px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-4 py-5 text-center transition-colors hover:bg-accent/40 disabled:pointer-events-none disabled:opacity-60"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.m4v"
          multiple
          className="sr-only"
          disabled={locked}
          onChange={(e) => {
            if (e.target.files?.length) {
              onAddFiles(e.target.files);
            }
            e.target.value = "";
          }}
        />
        <Film className="mb-2 h-5 w-5 text-primary" />
        <p className="text-sm font-medium text-foreground">
          {atCap
            ? `Maximum ${MAX_VIDEOS} videos`
            : processing
              ? "Preparing video…"
              : "Choose video"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          15s–3 min · ≤{VIDEO_MAX_MB} MB · H.264 on desktop; HEVC on iPhone
        </p>
      </button>
    </div>
  );
}

export async function prepareBundleVideo(
  file: File
): Promise<BundleVideoItem> {
  if (file.size > VIDEO_MAX_BYTES) {
    throw new VideoSampleError("video_too_large", VIDEO_TOO_LARGE_MESSAGE);
  }

  const sampled = await sampleVideoFrames(file);
  const sheets = buildContactSheets(sampled.frames);

  for (const frame of sampled.frames) {
    frame.canvas.width = 0;
    frame.canvas.height = 0;
  }

  const payload: BundleVideoInput = {
    duration_s: sampled.duration,
    filename: file.name,
    sheets: sheets.map((s) => {
      const comma = s.dataUrl.indexOf(",");
      const data = comma >= 0 ? s.dataUrl.slice(comma + 1) : s.dataUrl;
      return { data, timestamps: s.timestamps };
    }),
  };

  const approxBytes = payload.sheets.reduce((sum, s) => sum + s.data.length, 0);

  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    durationS: sampled.duration,
    thumbDataUrl: sheets[0]?.dataUrl ?? "",
    payload,
    approxBytes,
  };
}

export function videoErrorMessage(err: unknown): string {
  if (err instanceof VideoSampleError) {
    if (err.code === "video_unsupported") {
      return `${VIDEO_UNSUPPORTED_MESSAGE} On desktop, try exporting as MP4 (H.264), or run this on your phone.`;
    }
    if (err.code === "video_too_short") return err.message;
    if (err.code === "video_too_long") return VIDEO_TOO_LONG_MESSAGE;
    if (err.code === "video_too_large") return VIDEO_TOO_LARGE_MESSAGE;
    return err.message;
  }
  return err instanceof Error ? err.message : "Could not prepare video.";
}
