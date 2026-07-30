"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CopyActionButton } from "@/components/repurpose/copy-action-button";
import { useCopyToClipboard } from "@/components/repurpose/use-copy-to-clipboard";
import { fetchBundleStatus } from "@/lib/repurpose/bundle-generate-client";
import type { BundleClipStatus } from "@/types";
import {
  CLIP_POLL_CEILING_MS,
  CLIP_POLL_INTERVAL_MS,
  formatMmSs,
} from "./bundle-clips-utils";

const VIDEO_BUNDLES_DEV =
  process.env.NEXT_PUBLIC_VIDEO_BUNDLES_DEV === "true";

function isInFlight(clips: BundleClipStatus[]): boolean {
  return clips.some(
    (c) => c.render_status === "pending" || c.render_status === "rendering"
  );
}

interface BundleClipsPanelProps {
  bundleId: string;
  id?: string;
  className?: string;
}

export default function BundleClipsPanel({
  bundleId,
  id = "bundle-clips-panel",
  className,
}: BundleClipsPanelProps) {
  const [clips, setClips] = useState<BundleClipStatus[] | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const { copy, copiedKey, errorKey } = useCopyToClipboard();

  useEffect(() => {
    if (!VIDEO_BUNDLES_DEV || !bundleId) return;

    let cancelled = false;
    let done = false;
    let intervalId: number | undefined;
    const startedAt = Date.now();

    const stop = () => {
      done = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const tick = async () => {
      if (cancelled || done) return;

      if (Date.now() - startedAt >= CLIP_POLL_CEILING_MS) {
        setPollTimedOut(true);
        stop();
        return;
      }

      try {
        const status = await fetchBundleStatus(bundleId);
        if (cancelled || done) return;
        setClips(status.clips);

        if (!isInFlight(status.clips)) {
          stop();
        }
      } catch (err) {
        console.error("Clip status poll failed:", err);
      }
    };

    intervalId = window.setInterval(() => {
      void tick();
    }, CLIP_POLL_INTERVAL_MS);
    void tick();

    return () => {
      cancelled = true;
      stop();
    };
  }, [bundleId]);

  if (!VIDEO_BUNDLES_DEV) return null;
  if (!clips || clips.length === 0) return null;

  return (
    <div
      id={id}
      className={
        className ??
        "space-y-3 rounded-2xl border border-border bg-card p-4"
      }
    >
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Suggested clips
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Preview and download rendered clips when they&apos;re ready.
        </p>
      </div>
      {pollTimedOut && (
        <p className="text-xs text-muted-foreground">
          Still working - check back shortly.
        </p>
      )}
      <ul className="space-y-3">
        {clips.map((clip, i) => {
          const tagsText = clip.tags.join(" ");
          const inFlight =
            clip.render_status === "pending" ||
            clip.render_status === "rendering";
          const isComplete = clip.render_status === "complete";
          const isExpired = isComplete && !clip.download_url;
          const isFailed = clip.render_status === "failed";

          return (
            <li
              key={clip.clip_id}
              className="rounded-xl border border-border/80 bg-background px-3 py-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Video {clip.video_index + 1} · {formatMmSs(clip.start_s)}-
                {formatMmSs(clip.end_s)}
              </p>
              {clip.overlay_text && (
                <p className="mt-1 text-sm font-medium text-foreground">
                  Overlay: {clip.overlay_text}
                </p>
              )}

              {inFlight && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rendering…
                </div>
              )}

              {isComplete && clip.download_url && (
                <div className="mt-2 space-y-2">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={clip.download_url}
                    className="max-h-64 w-full rounded-lg bg-black"
                  />
                  <a
                    href={clip.download_url}
                    download
                    className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
                  >
                    Download clip
                  </a>
                </div>
              )}

              {isExpired && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Clip expired
                </p>
              )}

              {isFailed && (
                <p className="mt-2 text-sm text-destructive">
                  {clip.error_message || "Clip rendering failed."}
                </p>
              )}

              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                {clip.caption}
              </p>
              {tagsText && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tagsText}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyActionButton
                  copyKey={`clip-caption-${clip.clip_id}`}
                  label="Copy caption"
                  copiedKey={copiedKey}
                  errorKey={errorKey}
                  onCopy={() =>
                    copy(clip.caption, `clip-caption-${clip.clip_id}`)
                  }
                  variant="studio"
                />
                {tagsText && (
                  <CopyActionButton
                    copyKey={`clip-tags-${clip.clip_id}`}
                    label="Copy tags"
                    copiedKey={copiedKey}
                    errorKey={errorKey}
                    onCopy={() => copy(tagsText, `clip-tags-${clip.clip_id}`)}
                    variant="studio"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
