"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { CopyActionButton } from "@/components/repurpose/copy-action-button";
import { UpgradePrompt, type UpgradeGate } from "@/components/repurpose/upgrade-prompt";
import { useCopyToClipboard } from "@/components/repurpose/use-copy-to-clipboard";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  BUNDLE_MAX_PHOTOS,
  HEIC_DECODE_ERROR,
  PHOTO_CONTEXT_MAX_LENGTH,
  PHOTO_CONTEXT_MIN_LENGTH,
} from "@/lib/image/constants";
import {
  downscaleImage,
  validateImageFile,
} from "@/lib/image/downscale";
import {
  BundleGenerateApiError,
  BundleUploadError,
  callBundleGenerateApi,
  prepareUploadAndGenerate,
} from "@/lib/repurpose/bundle-generate-client";
import { createClient } from "@/lib/supabase/client";
import type { BundlePack, Plan } from "@/types";
import BundleClipsPanel from "./BundleClipsPanel";
import BundlePhotoPicker, {
  type BundlePhotoItem,
} from "./BundlePhotoPicker";
import BundleVideoPicker, {
  prepareBundleVideo,
  videoErrorMessage,
  type BundleVideoItem,
} from "./BundleVideoPicker";
import PastBundlesList, {
  type PastBundleItem,
} from "./PastBundlesList";

const VIDEO_BUNDLES_DEV =
  process.env.NEXT_PUBLIC_VIDEO_BUNDLES_DEV === "true";

const MAX_REQUEST_CHARS = 4_000_000;

const PROGRESS_MESSAGES = [
  "Reading your photos…",
  "Finding the story…",
  "Writing your pack…",
] as const;

function bundleErrorUpgradeGate(code?: string): UpgradeGate | null {
  if (code === "limit_exceeded") return "monthly_limit";
  if (code === "bundle_limit_reached") return "bundle_monthly_cap";
  if (code === "plan_required") return "bundles";
  if (code === "rate_limited") return "rate_limit";
  return null;
}

interface BundleWorkspaceProps {
  pastBundles: PastBundleItem[];
  userPlan: Plan;
  viewClipBundleId?: string;
}

export default function BundleWorkspace({
  pastBundles,
  userPlan,
  viewClipBundleId,
}: BundleWorkspaceProps) {
  const [photos, setPhotos] = useState<BundlePhotoItem[]>([]);
  const [videos, setVideos] = useState<BundleVideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [processingFiles, setProcessingFiles] = useState(false);
  const [processingVideos, setProcessingVideos] = useState(false);
  const [videoProgress, setVideoProgress] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    billingHint?: boolean;
  } | null>(null);
  const [pack, setPack] = useState<BundlePack | null>(null);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [libraryHash, setLibraryHash] = useState<string | null>(null);
  const [resultPreviews, setResultPreviews] = useState<
    Array<{ photoIndex: number; previewUrl: string }>
  >([]);

  const { copy, copiedKey, errorKey } = useCopyToClipboard();
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const videosRef = useRef(videos);
  videosRef.current = videos;

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!generating) {
      setProgressIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setProgressIndex((i) => (i + 1) % PROGRESS_MESSAGES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [generating]);

  useEffect(() => {
    if (!viewClipBundleId) return;
    document
      .getElementById("bundle-clips-panel")
      ?.scrollIntoView({ behavior: "smooth" });
  }, [viewClipBundleId]);

  const approxPayloadChars = () => {
    const photoChars = photosRef.current.reduce(
      (sum, p) => sum + p.base64.length,
      0
    );
    const videoChars = videosRef.current.reduce(
      (sum, v) => sum + v.approxBytes,
      0
    );
    return photoChars + videoChars + context.length + 500;
  };

  const handleAddFiles = useCallback(async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    setFileErrors([]);
    setProcessingFiles(true);

    const nextErrors: string[] = [];
    const room = BUNDLE_MAX_PHOTOS - photosRef.current.length;

    if (room <= 0) {
      setFileErrors([`You can add up to ${BUNDLE_MAX_PHOTOS} photos.`]);
      setProcessingFiles(false);
      return;
    }

    const accepted: BundlePhotoItem[] = [];
    let slots = room;

    for (const file of incoming) {
      if (slots <= 0) {
        nextErrors.push(
          `Only ${BUNDLE_MAX_PHOTOS} photos allowed — extra files were skipped.`
        );
        break;
      }

      const validation = validateImageFile(file);
      if (!validation.ok) {
        nextErrors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const result = await downscaleImage(file);
        accepted.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          previewUrl: result.previewUrl,
          base64: result.base64,
          byteSize: result.byteSize,
          width: result.width,
          height: result.height,
        });
        slots -= 1;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not process photo.";
        const isHeicFail =
          message === HEIC_DECODE_ERROR ||
          message.includes("couldn't be read by your browser");
        nextErrors.push(
          `${file.name}: ${isHeicFail ? HEIC_DECODE_ERROR : message}`
        );
      }
    }

    if (accepted.length) {
      setPhotos((prev) => {
        const remaining = BUNDLE_MAX_PHOTOS - prev.length;
        return [...prev, ...accepted.slice(0, remaining)];
      });
    }
    if (nextErrors.length) {
      setFileErrors(nextErrors);
    }
    setProcessingFiles(false);
  }, []);

  const handleAddVideos = useCallback(async (fileList: FileList | File[]) => {
    if (!VIDEO_BUNDLES_DEV) return;
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    setFileErrors([]);
    setProcessingVideos(true);

    const nextErrors: string[] = [];
    let room = 2 - videosRef.current.length;

    for (const file of incoming) {
      if (room <= 0) {
        nextErrors.push("Only 2 videos allowed — extra files were skipped.");
        break;
      }

      const label = `Preparing video ${videosRef.current.length + (2 - room) + 1}…`;
      setVideoProgress(label);

      try {
        const item = await prepareBundleVideo(file);
        setVideos((prev) => {
          if (prev.length >= 2) return prev;
          return [...prev, item];
        });
        room -= 1;
      } catch (err) {
        nextErrors.push(`${file.name}: ${videoErrorMessage(err)}`);
      }
    }

    if (nextErrors.length) {
      setFileErrors(nextErrors);
    }
    setVideoProgress(null);
    setProcessingVideos(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setPack(null);
    setBundleId(null);
    setLibraryHash(null);
  }, []);

  const handleRemoveVideo = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setPack(null);
    setBundleId(null);
    setLibraryHash(null);
  }, []);

  const validateContext = () => {
    const trimmed = context.trim();
    if (trimmed.length < PHOTO_CONTEXT_MIN_LENGTH) {
      setContextError(
        `Context must be at least ${PHOTO_CONTEXT_MIN_LENGTH} characters.`
      );
      return false;
    }
    if (trimmed.length > PHOTO_CONTEXT_MAX_LENGTH) {
      setContextError(
        `Context must be at most ${PHOTO_CONTEXT_MAX_LENGTH} characters.`
      );
      return false;
    }
    setContextError(null);
    return true;
  };

  const handleGenerate = async () => {
    setError(null);
    const hasMedia = photos.length > 0 || (VIDEO_BUNDLES_DEV && videos.length > 0);
    if (!hasMedia) {
      setError({
        message: VIDEO_BUNDLES_DEV
          ? "Add at least one photo or video to generate a pack."
          : "Add at least one photo to generate a pack.",
      });
      return;
    }
    if (!validateContext()) return;

    const payloadChars = approxPayloadChars();
    if (payloadChars > MAX_REQUEST_CHARS) {
      setError({
        message:
          "This pack is too large to upload. Remove a photo or video and try again.",
      });
      return;
    }

    setGenerating(true);
    setUploadProgress(null);
    setPack(null);
    setBundleId(null);
    setLibraryHash(null);

    try {
      const photoPayload = photos.map((p) => ({
        data: p.base64,
        filename: p.fileName,
      }));
      const contextTrimmed = context.trim();
      const titleOpt = title.trim() || undefined;

      const result =
        VIDEO_BUNDLES_DEV && videos.length > 0
          ? await prepareUploadAndGenerate({
              photos: photoPayload,
              videos: videos.map((v) => ({
                file: v.file,
                payload: v.payload,
              })),
              context: contextTrimmed,
              title: titleOpt,
              onUploadProgress: setUploadProgress,
            })
          : await callBundleGenerateApi({
              photos: photoPayload,
              context: contextTrimmed,
              title: titleOpt,
            });

      setPack(result.pack);
      setBundleId(result.bundleId);
      setResultPreviews(
        photos.map((p, index) => ({
          photoIndex: index,
          previewUrl: p.previewUrl,
        }))
      );

      const complete = result.repurposes.find((r) => r.status === "complete");
      if (complete) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from("repurposes")
            .select("source_hash")
            .eq("id", complete.id)
            .single();
          if (data?.source_hash) {
            setLibraryHash(data.source_hash as string);
          }
        } catch (hashErr) {
          console.error("Failed to resolve library hash:", hashErr);
        }
      }
    } catch (err) {
      if (err instanceof BundleUploadError) {
        setError({ message: err.message });
      } else if (err instanceof BundleGenerateApiError) {
        setError({
          message: err.message,
          code: err.code,
          billingHint:
            err.code === "generation_failed" ||
            err.code === "internal_error" ||
            err.code === "limit_exceeded" ||
            err.code === "bundle_limit_reached" ||
            err.code === "plan_required" ||
            err.code === "rate_limited" ||
            !err.code,
        });
      } else {
        setError({
          message:
            err instanceof Error
              ? err.message
              : "Network error — please try again.",
          billingHint: true,
        });
      }
    } finally {
      setUploadProgress(null);
      setGenerating(false);
    }
  };

  const inputsDisabled =
    generating || processingFiles || processingVideos;
  const canGenerate =
    photos.length > 0 || (VIDEO_BUNDLES_DEV && videos.length > 0);
  const payloadKb = Math.round(approxPayloadChars() / 1024);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title={VIDEO_BUNDLES_DEV ? "Moment pack" : "Photo pack"}
        description={`Upload up to ${BUNDLE_MAX_PHOTOS} photos${
          VIDEO_BUNDLES_DEV ? " and 2 short videos" : ""
        }, add context, and get captions, a posting order, and four platform posts in one run.`}
      />

      <ol className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <li className="rounded-full border border-border bg-card px-2.5 py-1">
          1. Assets
        </li>
        <li className="rounded-full border border-border bg-card px-2.5 py-1">
          2. Context
        </li>
        <li className="rounded-full border border-border bg-card px-2.5 py-1">
          3. Generate
        </li>
        <li className="rounded-full border border-border bg-card px-2.5 py-1">
          4. Library
        </li>
      </ol>

      <section className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">New pack</h2>
          <p className="text-xs text-muted-foreground">
            Assets → context → generate. Long runs keep a job row in Past bundles
            if you leave this page.
          </p>
        </div>

        <BundlePhotoPicker
          photos={photos}
          processing={processingFiles}
          disabled={generating || processingVideos}
          onAddFiles={handleAddFiles}
          onRemove={handleRemove}
        />

        {VIDEO_BUNDLES_DEV && (
          <BundleVideoPicker
            videos={videos}
            processing={processingVideos}
            disabled={generating || processingFiles}
            progressLabel={videoProgress}
            onAddFiles={handleAddVideos}
            onRemove={handleRemoveVideo}
          />
        )}

        {VIDEO_BUNDLES_DEV && (photos.length > 0 || videos.length > 0) && (
          <p className="text-xs text-muted-foreground">
            Approx. request size: {payloadKb} KB
            {payloadKb > 3500 ? " — getting close to the upload limit" : ""}
          </p>
        )}

        {fileErrors.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
            {fileErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <label
            htmlFor="bundle-title"
            className="text-xs font-medium text-muted-foreground"
          >
            Title (optional)
          </label>
          <input
            id="bundle-title"
            type="text"
            maxLength={200}
            value={title}
            disabled={inputsDisabled}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Saturday market shoot"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="bundle-context"
            className="text-xs font-medium text-muted-foreground"
          >
            Context
          </label>
          <textarea
            id="bundle-context"
            value={context}
            disabled={inputsDisabled}
            onChange={(e) => {
              setContext(e.target.value);
              if (contextError) setContextError(null);
            }}
            onBlur={validateContext}
            rows={4}
            maxLength={PHOTO_CONTEXT_MAX_LENGTH}
            placeholder="What’s happening across these photos? Who’s there, what matters, what should the posts feel like?"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {contextError ? (
                <span className="text-destructive">{contextError}</span>
              ) : (
                `${PHOTO_CONTEXT_MIN_LENGTH}–${PHOTO_CONTEXT_MAX_LENGTH} characters`
              )}
            </span>
            <span>
              {context.trim().length}/{PHOTO_CONTEXT_MAX_LENGTH}
            </span>
          </div>
        </div>

        {error && bundleErrorUpgradeGate(error.code) ? (
          <UpgradePrompt
            gate={bundleErrorUpgradeGate(error.code)!}
            plan={userPlan}
            message={error.message}
            billingHint={error.billingHint}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3"
          />
        ) : error ? (
          <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <p>{error.message}</p>
            {error.billingHint && (
              <p className="text-xs text-muted-foreground">
                This attempt wasn’t billed — you can retry safely.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
            >
              Dismiss and retry
            </Button>
          </div>
        ) : null}

        {generating ? (
          <p
            className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Generating your pack… You can leave this page — check{" "}
            <span className="font-medium text-foreground">Past bundles</span>{" "}
            when you return for status and Library links.
          </p>
        ) : null}

        <button
          type="button"
          disabled={inputsDisabled || !canGenerate}
          onClick={handleGenerate}
          className="aurora inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[color:var(--aurora-foreground)] disabled:opacity-50 sm:w-auto"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {uploadProgress ?? PROGRESS_MESSAGES[progressIndex]}
            </>
          ) : (
            "Generate pack"
          )}
        </button>
      </section>

      {pack && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your pack</h2>
            <p className="text-sm text-muted-foreground">
              Captions in recommended posting order. Platform posts live in the
              Library — this page keeps the pack preview for this session.
            </p>
          </div>

          {libraryHash && (
            <Link
              href={`/library/${libraryHash}`}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10"
            >
              View & edit your 4 posts in the Library
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {pack.posting_order.length > 0 && (
            <div className="space-y-4">
              {pack.posting_order.map((photoIndex, orderPos) => {
                const caption = pack.photo_captions.find(
                  (c) => c.photo_index === photoIndex
                );
                const preview = resultPreviews.find(
                  (p) => p.photoIndex === photoIndex
                );
                const displayNum = orderPos + 1;

                return (
                  <article
                    key={`${photoIndex}-${orderPos}`}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex gap-3">
                      {preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview.previewUrl}
                          alt={`Photo ${displayNum}`}
                          className="h-20 w-20 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Photo {displayNum}
                        </p>
                        {caption && (
                          <>
                            <p className="whitespace-pre-wrap text-sm text-foreground">
                              {caption.caption}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <CopyActionButton
                                copyKey={`caption-${photoIndex}`}
                                label="Copy caption"
                                copiedKey={copiedKey}
                                errorKey={errorKey}
                                onCopy={() =>
                                  copy(
                                    caption.caption,
                                    `caption-${photoIndex}`
                                  )
                                }
                                variant="studio"
                              />
                              {caption.alt_text && (
                                <CopyActionButton
                                  copyKey={`alt-${photoIndex}`}
                                  label="Copy alt text"
                                  copiedKey={copiedKey}
                                  errorKey={errorKey}
                                  onCopy={() =>
                                    copy(
                                      caption.alt_text,
                                      `alt-${photoIndex}`
                                    )
                                  }
                                  variant="studio"
                                />
                              )}
                            </div>
                            {caption.alt_text && (
                              <p className="text-xs text-muted-foreground">
                                Alt: {caption.alt_text}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {VIDEO_BUNDLES_DEV &&
            bundleId &&
            pack?.clip_specs &&
            pack.clip_specs.length > 0 && (
              <BundleClipsPanel bundleId={bundleId} />
            )}
        </section>
      )}

      {VIDEO_BUNDLES_DEV && viewClipBundleId && (
        <BundleClipsPanel bundleId={viewClipBundleId} />
      )}

      <PastBundlesList bundles={pastBundles} />
    </div>
  );
}
