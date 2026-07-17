"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { CopyActionButton } from "@/components/repurpose/copy-action-button";
import { useCopyToClipboard } from "@/components/repurpose/use-copy-to-clipboard";
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
  callBundleGenerateApi,
} from "@/lib/repurpose/bundle-generate-client";
import { createClient } from "@/lib/supabase/client";
import type { BundlePack } from "@/types";
import BundlePhotoPicker, {
  type BundlePhotoItem,
} from "./BundlePhotoPicker";
import PastBundlesList, {
  type PastBundleItem,
} from "./PastBundlesList";

const PROGRESS_MESSAGES = [
  "Reading your photos…",
  "Finding the story…",
  "Writing your pack…",
] as const;

interface BundleWorkspaceProps {
  pastBundles: PastBundleItem[];
}

export default function BundleWorkspace({ pastBundles }: BundleWorkspaceProps) {
  const [photos, setPhotos] = useState<BundlePhotoItem[]>([]);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [processingFiles, setProcessingFiles] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    billingHint?: boolean;
  } | null>(null);
  const [pack, setPack] = useState<BundlePack | null>(null);
  const [libraryHash, setLibraryHash] = useState<string | null>(null);
  const [resultPreviews, setResultPreviews] = useState<
    Array<{ photoIndex: number; previewUrl: string }>
  >([]);

  const { copy, copiedKey, errorKey } = useCopyToClipboard();
  const photosRef = useRef(photos);
  photosRef.current = photos;

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

  const handleRemove = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setPack(null);
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
    if (!photos.length) {
      setError({ message: "Add at least one photo to generate a pack." });
      return;
    }
    if (!validateContext()) return;

    setGenerating(true);
    setPack(null);
    setLibraryHash(null);

    try {
      const result = await callBundleGenerateApi({
        photos: photos.map((p) => ({
          data: p.base64,
          filename: p.fileName,
        })),
        context: context.trim(),
        title: title.trim() || undefined,
      });

      setPack(result.pack);
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
      if (err instanceof BundleGenerateApiError) {
        if (err.code === "plan_required") {
          setError({
            message: err.message,
            code: err.code,
          });
        } else if (err.code === "limit_exceeded") {
          setError({
            message: err.message,
            code: err.code,
          });
        } else if (err.code === "bundle_limit_reached") {
          setError({
            message: err.message,
            code: err.code,
          });
        } else if (err.code === "generation_failed") {
          setError({
            message: err.message,
            code: err.code,
            billingHint: true,
          });
        } else {
          setError({
            message: err.message,
            code: err.code,
            billingHint: true,
          });
        }
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
      setGenerating(false);
    }
  };

  const inputsDisabled = generating || processingFiles;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="eyebrow text-muted-foreground">Moment Bundles</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          <span className="aurora-text">Photo pack</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Upload up to {BUNDLE_MAX_PHOTOS} photos, add context, and get captions,
          a posting order, and four platform posts in one run.
        </p>
      </div>

      <section className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <BundlePhotoPicker
          photos={photos}
          processing={processingFiles}
          disabled={generating}
          onAddFiles={handleAddFiles}
          onRemove={handleRemove}
        />

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

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <p>{error.message}</p>
            {error.code === "plan_required" && (
              <Link
                href="/billing"
                className="mt-2 inline-block font-medium underline underline-offset-2"
              >
                View plans →
              </Link>
            )}
            {error.billingHint && (
              <p className="mt-1 text-xs text-muted-foreground">
                This attempt wasn’t billed — you can retry safely.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={inputsDisabled || photos.length === 0}
          onClick={handleGenerate}
          className="aurora inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#0B0D14] disabled:opacity-50 sm:w-auto"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {PROGRESS_MESSAGES[progressIndex]}
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
              Library.
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
                                copy(caption.caption, `caption-${photoIndex}`)
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
                                  copy(caption.alt_text, `alt-${photoIndex}`)
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
        </section>
      )}

      <PastBundlesList bundles={pastBundles} />
    </div>
  );
}
