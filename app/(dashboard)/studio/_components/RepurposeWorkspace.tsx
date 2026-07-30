"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  INPUT_CONTENT_MIN_LENGTH,
  STREAM_STUDIO,
  planAllowsVision,
} from "@/lib/config";
import {
  callPhotoGenerateApi,
  PhotoGenerateApiError,
} from "@/lib/repurpose/photo-generate-client";
import {
  callGenerateStreamApi,
  StreamGenerateApiError,
} from "@/lib/repurpose/stream-generate-client";
import {
  getDefaultWords,
  isValidWords,
  lengthPresetsForVariant,
  nearestLengthForVariant,
  wordsToTweets,
} from "@/lib/repurpose/length-presets";
import {
  DEFAULT_VOICE_VARIANT_BY_FORMAT,
  VOICE_VARIANTS,
} from "@/lib/ai/voice-variants";
import type { InputMode, PhotoInputReady } from "@/types/photo-input";
import type { Plan } from "@/types";
import InputModeTabs from "./InputModeTabs";
import LinkSourceCard from "./LinkSourceCard";
import PhotoInputSection from "./PhotoInputSection";
import StudioTemplatePicker from "./StudioTemplatePicker";
import TextSourceCard from "./TextSourceCard";
import VoiceSetupBanner from "./VoiceSetupBanner";
import StudioFormatPicker from "./StudioFormatPicker";
import { ModeSwitchDialog } from "./ModeSwitchDialog";
import { RefinementChips } from "./RefinementChips";
import {
  StudioFormatResultCard,
  type FormatCardStatus,
} from "./StudioFormatResultCard";
import { EmailOutputPanel } from "@/components/repurpose/email-output-panel";
import { InstagramOutputPanel } from "@/components/repurpose/instagram-output-panel";
import { LinkedInOutputPanel } from "@/components/repurpose/linkedin-output-panel";
import { UpgradePrompt, type UpgradeGate } from "@/components/repurpose/upgrade-prompt";
import { ProcessingTrustNote } from "@/components/repurpose/processing-trust-note";
import { XThreadTweetList } from "@/components/repurpose/x-thread-tweet-list";
import {
  EmailGlyph,
  InstagramMark,
  LinkedInMark,
  XMark,
} from "@/components/landing/platform-marks";
import {
  formatEmailForCopy,
  formatInstagramForCopy,
  formatLinkedInForCopy,
  formatXThreadForCopy,
} from "@/lib/format-output";
import { voiceDisplayName } from "@/lib/repurpose/voice-display-name";
import { hapticImpact } from "@/lib/haptics";
import type {
  BrandVoiceInput,
  EmailOutput,
  GenerateErrorResponse,
  GenerateSuccessResponse,
  InstagramOutput,
  LinkedInOutput,
  RepurposeOutput,
  TargetFormat,
  UsageInfo,
  VoiceVariantId,
  XThreadOutput,
} from "@/types";

const ALL_FORMATS: TargetFormat[] = ["x_thread", "linkedin", "instagram", "email"];

const FORMAT_FALLBACK_ERRORS: Record<TargetFormat, string> = {
  x_thread: "Something went wrong while generating the Twitter thread. Please try again.",
  linkedin: "Something went wrong while generating the LinkedIn content. Please try again.",
  instagram: "Something went wrong while generating the Instagram caption. Please try again.",
  email: "Something went wrong while generating the email newsletter. Please try again.",
};

const FORMAT_TITLES: Record<TargetFormat, string> = {
  x_thread: "X / Twitter Thread",
  linkedin: "LinkedIn post + carousel",
  instagram: "Instagram Caption",
  email: "Email Newsletter",
};

type FormatLoadingState = Record<TargetFormat, boolean>;
type FormatErrorState = Record<TargetFormat, string | null>;
type FormatIdState = Record<TargetFormat, string | null>;

/** One generated result. Variants are client state only - every variant is
 * already its own `repurposes` row (Regenerate mints a new generation_id), so
 * this array is purely presentational; no schema or billing change. */
type FormatVariant = { repurposeId: string; output: RepurposeOutput };
type FormatVariantsState = Record<TargetFormat, FormatVariant[]>;

function createVariantsRecord(): FormatVariantsState {
  return {
    x_thread: [],
    linkedin: [],
    instagram: [],
    email: [],
  };
}

function createFormatRecord<T>(value: T): Record<TargetFormat, T> {
  return {
    x_thread: value,
    linkedin: value,
    instagram: value,
    email: value,
  };
}

function createDefaultLengthWords(): Record<TargetFormat, number> {
  return {
    x_thread: getDefaultWords("x_thread"),
    linkedin: getDefaultWords("linkedin"),
    instagram: getDefaultWords("instagram"),
    email: getDefaultWords("email"),
  };
}

function createDefaultVoiceVariants(): Record<TargetFormat, VoiceVariantId> {
  return { ...DEFAULT_VOICE_VARIANT_BY_FORMAT };
}

function FormatGeneratingPlaceholder() {
  return (
    <div className="space-y-3 py-1" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating…</span>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function isFormatOutput<F extends TargetFormat>(
  output: RepurposeOutput,
  format: F
): output is Extract<RepurposeOutput, { format: F }> {
  return output.format === format;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function coercePartialXThread(
  partial: Record<string, unknown>
): XThreadOutput | null {
  if (!Array.isArray(partial.tweets)) return null;
  const tweets = partial.tweets
    .map((tweet, index) => {
      if (!tweet || typeof tweet !== "object") return null;
      const row = tweet as { number?: unknown; text?: unknown };
      const text = typeof row.text === "string" ? row.text : "";
      if (!text) return null;
      return {
        number: typeof row.number === "number" ? row.number : index + 1,
        text,
      };
    })
    .filter((tweet): tweet is { number: number; text: string } => tweet !== null);
  if (tweets.length === 0) return null;
  return {
    format: "x_thread",
    tweets,
    thread_summary:
      typeof partial.thread_summary === "string"
        ? partial.thread_summary
        : null,
  };
}

function coercePartialLinkedIn(
  partial: Record<string, unknown>
): LinkedInOutput | null {
  const post = typeof partial.post === "string" ? partial.post : "";
  const slides: LinkedInOutput["carousel_slides"] = [];
  if (Array.isArray(partial.carousel_slides)) {
    partial.carousel_slides.forEach((slide, index) => {
      if (!slide || typeof slide !== "object") return;
      const row = slide as {
        number?: unknown;
        title?: unknown;
        body?: unknown;
      };
      const title = typeof row.title === "string" ? row.title : "";
      if (!title && typeof row.body !== "string") return;
      slides.push({
        number: typeof row.number === "number" ? row.number : index + 1,
        title: title || `Slide ${index + 1}`,
        body: typeof row.body === "string" ? row.body : undefined,
      });
    });
  }
  if (!post && slides.length === 0) return null;
  return {
    format: "linkedin",
    post: post || "…",
    carousel_slides:
      slides.length > 0 ? slides : [{ number: 1, title: "…" }],
    post_summary:
      typeof partial.post_summary === "string"
        ? partial.post_summary
        : undefined,
  };
}

function coercePartialInstagram(
  partial: Record<string, unknown>
): InstagramOutput | null {
  const caption = typeof partial.caption === "string" ? partial.caption : "";
  const hooks = Array.isArray(partial.hook_variations)
    ? partial.hook_variations.filter(
        (hook): hook is string => typeof hook === "string" && hook.length > 0
      )
    : [];
  const hashtags = Array.isArray(partial.hashtags)
    ? partial.hashtags.filter(
        (tag): tag is string => typeof tag === "string" && tag.length > 0
      )
    : [];
  if (!caption && hooks.length === 0) return null;
  return {
    format: "instagram",
    caption: caption || "…",
    hook_variations: hooks.length > 0 ? hooks : ["…"],
    hashtags,
  };
}

function coercePartialEmail(
  partial: Record<string, unknown>
): EmailOutput | null {
  const subject =
    typeof partial.subject_line === "string" ? partial.subject_line : "";
  const body = typeof partial.body === "string" ? partial.body : "";
  if (!subject && !body) return null;
  return {
    format: "email",
    subject_line: subject || "…",
    preview_text:
      typeof partial.preview_text === "string"
        ? partial.preview_text
        : undefined,
    body: body || "…",
  };
}

class GenerateApiError extends Error {
  usage?: UsageInfo;
  code?: GenerateErrorResponse["code"];

  constructor(
    message: string,
    opts?: { usage?: UsageInfo; code?: GenerateErrorResponse["code"] }
  ) {
    super(message);
    this.name = "GenerateApiError";
    this.usage = opts?.usage;
    this.code = opts?.code;
  }
}

interface BrandVoiceProp {
  id: string;
  name?: string | null;
  samples: string[] | null;
  description: string | null;
  is_default?: boolean | null;
}

interface RepurposeWorkspaceProps {
  initialInput?: string;
  initialTwitterOutput?: string;
  initialTwitterLength?: number;
  repurposesUsed: number;
  repurposesLimit: number;
  userPlan: Plan;
  brandVoice?: BrandVoiceProp | null;
  onTwitterGenerate?: (output: string) => void;
}

export default function RepurposeWorkspace({
  initialInput = "",
  initialTwitterOutput,
  repurposesUsed,
  repurposesLimit,
  userPlan,
  brandVoice = null,
  onTwitterGenerate,
}: RepurposeWorkspaceProps) {
  const searchParams = useSearchParams();
  const useStream =
    STREAM_STUDIO || searchParams.get("stream") === "1";

  const formatAbortRef = useRef<Map<TargetFormat, AbortController>>(new Map());
  const runAbortRef = useRef<AbortController | null>(null);

  const [inputSummary, setInputSummary] = useState(initialInput);
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [photoInput, setPhotoInput] = useState<PhotoInputReady | null>(null);
  const [pendingMode, setPendingMode] = useState<InputMode | null>(null);

  const [lengthWords, setLengthWords] = useState<Record<TargetFormat, number>>(
    createDefaultLengthWords
  );
  const [voiceVariants, setVoiceVariants] = useState<
    Record<TargetFormat, VoiceVariantId>
  >(createDefaultVoiceVariants);
  const [formatVariants, setFormatVariants] = useState<FormatVariantsState>(
    () => {
      const base = createVariantsRecord();
      if (initialTwitterOutput) {
        base.x_thread = [
          {
            repurposeId: "",
            output: {
              format: "x_thread",
              tweets: initialTwitterOutput
                .split(/\n\n+/)
                .filter(Boolean)
                .map((text, index) => ({ number: index + 1, text })),
            },
          },
        ];
      }
      return base;
    }
  );
  // null → show newest; a number pins a specific variant chip.
  const [selectedVariant, setSelectedVariant] = useState<
    Record<TargetFormat, number | null>
  >(() => createFormatRecord<number | null>(null));
  // Streaming partial preview (uncommitted, no repurposeId yet).
  const [partialPreview, setPartialPreview] = useState<
    Record<TargetFormat, RepurposeOutput | null>
  >(() => createFormatRecord<RepurposeOutput | null>(null));

  const activeIndexFor = useCallback(
    (format: TargetFormat) =>
      selectedVariant[format] ??
      Math.max(0, formatVariants[format].length - 1),
    [selectedVariant, formatVariants]
  );

  const displayOutputFor = useCallback(
    (format: TargetFormat): RepurposeOutput | null => {
      // Preview is only ever set while a stream is in flight and is cleared on
      // commit or abort, so it takes precedence when present.
      return (
        partialPreview[format] ??
        formatVariants[format][activeIndexFor(format)]?.output ??
        null
      );
    },
    [partialPreview, formatVariants, activeIndexFor]
  );

  const repurposeIds: FormatIdState = {
    x_thread:
      partialPreview.x_thread === null
        ? formatVariants.x_thread[activeIndexFor("x_thread")]?.repurposeId || null
        : null,
    linkedin:
      partialPreview.linkedin === null
        ? formatVariants.linkedin[activeIndexFor("linkedin")]?.repurposeId || null
        : null,
    instagram:
      partialPreview.instagram === null
        ? formatVariants.instagram[activeIndexFor("instagram")]?.repurposeId ||
          null
        : null,
    email:
      partialPreview.email === null
        ? formatVariants.email[activeIndexFor("email")]?.repurposeId || null
        : null,
  };

  const selectVariant = useCallback((format: TargetFormat, index: number) => {
    setSelectedVariant((prev) => ({ ...prev, [format]: index }));
  }, []);

  const [formatLoading, setFormatLoading] = useState<FormatLoadingState>(
    createFormatRecord(false)
  );
  const [formatErrors, setFormatErrors] = useState<FormatErrorState>(
    createFormatRecord(null)
  );
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<TargetFormat>>(
    () => new Set(ALL_FORMATS)
  );
  const [usedCount, setUsedCount] = useState(repurposesUsed);
  const [reactiveUpgradeGate, setReactiveUpgradeGate] = useState<UpgradeGate | null>(
    null
  );
  const [expandedFormat, setExpandedFormat] = useState<TargetFormat>("x_thread");

  const atLimit = usedCount >= repurposesLimit;
  const hasVoiceSamples = Boolean(brandVoice?.samples?.length);

  const activeFormats = ALL_FORMATS.filter((format) => selectedFormats.has(format));

  const isAnyLoading =
    isRegeneratingAll || activeFormats.some((format) => formatLoading[format]);

  const xThreadActive = displayOutputFor("x_thread");
  const xThreadOutput =
    xThreadActive && isFormatOutput(xThreadActive, "x_thread")
      ? xThreadActive
      : null;
  const linkedinActive = displayOutputFor("linkedin");
  const linkedinOutput =
    linkedinActive && isFormatOutput(linkedinActive, "linkedin")
      ? linkedinActive
      : null;
  const instagramActive = displayOutputFor("instagram");
  const instagramOutput =
    instagramActive && isFormatOutput(instagramActive, "instagram")
      ? instagramActive
      : null;
  const emailActive = displayOutputFor("email");
  const emailOutput =
    emailActive && isFormatOutput(emailActive, "email") ? emailActive : null;

  const hasAnyOutput = ALL_FORMATS.some(
    (format) => formatVariants[format].length > 0
  );

  const liveStatus = useMemo(() => {
    const generating = ALL_FORMATS.filter((f) => formatLoading[f]);
    if (generating.length === 0) return null;
    if (generating.length === 1) {
      return `Generating ${FORMAT_TITLES[generating[0]]}…`;
    }
    return `Generating ${generating.length} formats…`;
  }, [formatLoading]);

  useEffect(() => {
    const stored = createDefaultLengthWords();
    for (const format of ALL_FORMATS) {
      const value = Number.parseInt(
        window.localStorage.getItem(`vo-length-${format}`) ?? "",
        10
      );
      if (isValidWords(format, value)) {
        stored[format] = value;
      }
    }
    setLengthWords(stored);

    try {
      const overrides = JSON.parse(
        window.localStorage.getItem("vo-variant-override") ?? "{}"
      ) as Partial<Record<TargetFormat, VoiceVariantId>>;
      const resolvedVariants = createDefaultVoiceVariants();
      setVoiceVariants((current) => {
        const next = { ...current };
        for (const format of ALL_FORMATS) {
          if (VOICE_VARIANTS.some((variant) => variant.id === overrides[format])) {
            next[format] = overrides[format]!;
            resolvedVariants[format] = overrides[format]!;
          }
        }
        return next;
      });
      setLengthWords((current) => {
        const next = { ...current };
        for (const format of ALL_FORMATS) {
          next[format] = nearestLengthForVariant(
            format,
            resolvedVariants[format],
            next[format]
          );
        }
        return next;
      });
    } catch {
      window.localStorage.removeItem("vo-variant-override");
    }
  }, []);

  const handleLengthWordsChange = (format: TargetFormat, words: number) => {
    if (!isValidWords(format, words)) return;
    setLengthWords((prev) => ({ ...prev, [format]: words }));
    window.localStorage.setItem(`vo-length-${format}`, String(words));
  };

  const handleVoiceVariantChange = (
    format: TargetFormat,
    voiceVariant: VoiceVariantId
  ) => {
    if (!hasVoiceSamples) return;
    setVoiceVariants((prev) => ({ ...prev, [format]: voiceVariant }));
    setLengthWords((prev) => ({
      ...prev,
      [format]: nearestLengthForVariant(format, voiceVariant, prev[format]),
    }));

    let overrides: Partial<Record<TargetFormat, VoiceVariantId>> = {};
    try {
      overrides = JSON.parse(
        window.localStorage.getItem("vo-variant-override") ?? "{}"
      );
    } catch {
      overrides = {};
    }
    overrides[format] = voiceVariant;
    window.localStorage.setItem("vo-variant-override", JSON.stringify(overrides));
  };

  // --- Protected fence: generate clients + usage error handling ---

  const callGenerateApi = useCallback(
    async (
      inputContent: string,
      targetFormat: TargetFormat,
      targetWords: number,
      voiceVariant: VoiceVariantId,
      generationId?: string
    ): Promise<{ output: RepurposeOutput; usage: UsageInfo; repurposeId: string }> => {
      const body: Record<string, unknown> = {
        input_type: "paste",
        input_content: inputContent,
        target_format: targetFormat,
        target_words: targetWords,
        voice_variant: voiceVariant,
      };

      if (brandVoice?.id) {
        body.brand_voice_id = brandVoice.id;
      } else {
        // No saved voice yet - minimal inline fallback so first-run still works.
        body.brand_voice = {
          samples: [],
          description: "Clear, professional, conversational.",
        } satisfies BrandVoiceInput;
      }

      if (targetFormat === "x_thread") {
        body.target_tweets = wordsToTweets(targetWords);
      }

      if (generationId) {
        body.generation_id = generationId;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();

      if (!response.ok) {
        let message = "Failed to generate content";
        let usage: UsageInfo | undefined;
        let code: GenerateErrorResponse["code"] | undefined;
        try {
          const errorData = JSON.parse(text) as GenerateErrorResponse;
          if (errorData.error) {
            message = errorData.error;
          }
          usage = errorData.usage;
          code = errorData.code;
        } catch {
          if (text) {
            message = text;
          }
        }
        throw new GenerateApiError(message, { usage, code });
      }

      const data = JSON.parse(text) as GenerateSuccessResponse;
      if (!data.output || data.output.format !== targetFormat) {
        throw new Error("Unexpected response from generation API");
      }

      return {
        output: data.output,
        usage: data.usage,
        repurposeId: data.repurpose_id,
      };
    },
    [brandVoice]
  );

  const applyOutput = useCallback(
    (format: TargetFormat, output: RepurposeOutput, repurposeId: string) => {
      // Append as a new variant; clear the streaming preview; snap to newest.
      setFormatVariants((prev) => ({
        ...prev,
        [format]: [...prev[format], { repurposeId, output }],
      }));
      setSelectedVariant((prev) => ({ ...prev, [format]: null }));
      setPartialPreview((prev) => ({ ...prev, [format]: null }));
      if (format === "x_thread" && isFormatOutput(output, "x_thread")) {
        onTwitterGenerate?.(formatXThreadForCopy(output));
      }
    },
    [onTwitterGenerate]
  );

  const clearPartialPreview = useCallback((format: TargetFormat) => {
    setPartialPreview((prev) =>
      prev[format] === null ? prev : { ...prev, [format]: null }
    );
  }, []);

  const applyPartialOutput = useCallback(
    (format: TargetFormat, partial: Record<string, unknown>) => {
      let coerced: RepurposeOutput | null = null;
      switch (format) {
        case "x_thread":
          coerced = coercePartialXThread(partial);
          break;
        case "linkedin":
          coerced = coercePartialLinkedIn(partial);
          break;
        case "instagram":
          coerced = coercePartialInstagram(partial);
          break;
        case "email":
          coerced = coercePartialEmail(partial);
          break;
      }
      if (coerced) {
        setPartialPreview((prev) => ({ ...prev, [format]: coerced }));
      }
    },
    []
  );

  const stopFormat = useCallback((format: TargetFormat) => {
    formatAbortRef.current.get(format)?.abort();
  }, []);

  const stopAll = useCallback(() => {
    runAbortRef.current?.abort();
    for (const controller of formatAbortRef.current.values()) {
      controller.abort();
    }
  }, []);

  const resolveGenerateError = useCallback(
    (
      err: unknown,
      format: TargetFormat,
      fallbackMessages: Record<TargetFormat, string>
    ): boolean => {
      const apiErr =
        err instanceof GenerateApiError ||
        err instanceof PhotoGenerateApiError ||
        err instanceof StreamGenerateApiError
          ? err
          : null;

      if (apiErr?.usage) {
        setUsedCount(apiErr.usage.used);
      }

      if (apiErr?.code === "limit_exceeded") {
        setReactiveUpgradeGate("monthly_limit");
        setFormatErrors((prev) => ({ ...prev, [format]: null }));
        return true;
      }

      if (apiErr?.code === "plan_required") {
        setReactiveUpgradeGate("vision");
        setFormatErrors((prev) => ({ ...prev, [format]: null }));
        return true;
      }

      if (apiErr?.code === "rate_limited") {
        setReactiveUpgradeGate("rate_limit");
        setFormatErrors((prev) => ({ ...prev, [format]: null }));
        return true;
      }

      setFormatErrors((prev) => ({
        ...prev,
        [format]:
          err instanceof Error ? err.message : fallbackMessages[format],
      }));
      return false;
    },
    []
  );

  const isPhotoMode = inputMode === "photo";
  const isLinkMode = inputMode === "link";
  const canGeneratePhoto =
    isPhotoMode && photoInput !== null && planAllowsVision(userPlan);

  const modeLabel = (mode: InputMode) => {
    if (mode === "photo") return "Upload photo";
    if (mode === "link") return "Link";
    return "Paste text";
  };

  const requestModeChange = (mode: InputMode) => {
    if (mode === inputMode) return;

    // Photo ↔ text modes need a clear confirm; paste ↔ link share inputSummary.
    if (mode === "paste" || mode === "link") {
      if (photoInput) {
        setPendingMode(mode);
        return;
      }
      setInputMode(mode);
      return;
    }

    if (mode === "photo" && inputSummary.trim().length > 0) {
      setPendingMode(mode);
      return;
    }

    setInputMode(mode);
  };

  const confirmModeChange = () => {
    if (!pendingMode) return;
    if (pendingMode === "paste" || pendingMode === "link") {
      setPhotoInput(null);
    }
    if (pendingMode === "photo") {
      setInputSummary("");
    }
    setInputMode(pendingMode);
    setPendingMode(null);
  };

  const generatePhotoFormat = useCallback(
    async (
      format: TargetFormat,
      options?: { targetWords?: number; generationId?: string }
    ) => {
      if (!photoInput || !planAllowsVision(userPlan)) {
        if (!planAllowsVision(userPlan)) {
          setReactiveUpgradeGate("vision");
          setFormatErrors((prev) => ({ ...prev, [format]: null }));
        } else {
          setFormatErrors((prev) => ({
            ...prev,
            [format]: "Add a photo and context before generating.",
          }));
        }
        return;
      }

      setFormatErrors((prev) => ({ ...prev, [format]: null }));
      setReactiveUpgradeGate(null);
      setFormatLoading((prev) => ({ ...prev, [format]: true }));
      setExpandedFormat(format);
      const targetWords = options?.targetWords ?? lengthWords[format];

      try {
        const { output, usage, repurposeId } = await callPhotoGenerateApi({
          photo: photoInput,
          targetFormat: format,
          brandVoice,
          voiceVariant: voiceVariants[format],
          targetWords,
          targetTweets:
            format === "x_thread" ? wordsToTweets(targetWords) : undefined,
          generationId: options?.generationId,
        });
        applyOutput(format, output, repurposeId);
        setUsedCount(usage.used);
      } catch (err) {
        console.error(err);
        resolveGenerateError(err, format, FORMAT_FALLBACK_ERRORS);
      } finally {
        setFormatLoading((prev) => ({ ...prev, [format]: false }));
      }
    },
    [
      applyOutput,
      brandVoice,
      lengthWords,
      photoInput,
      resolveGenerateError,
      userPlan,
      voiceVariants,
    ]
  );

  const generateFormat = useCallback(
    async (
      format: TargetFormat,
      options?: {
        inputContent?: string;
        targetWords?: number;
        generationId?: string;
        refinement?: string;
      }
    ) => {
      const trimmed = (options?.inputContent ?? inputSummary).trim();
      const targetWords = options?.targetWords ?? lengthWords[format];
      if (trimmed.length < INPUT_CONTENT_MIN_LENGTH) {
        setFormatErrors((prev) => ({
          ...prev,
          [format]: `Source content must be at least ${INPUT_CONTENT_MIN_LENGTH} characters.`,
        }));
        return;
      }

      setFormatErrors((prev) => ({ ...prev, [format]: null }));
      setReactiveUpgradeGate(null);
      setFormatLoading((prev) => ({ ...prev, [format]: true }));
      setExpandedFormat(format);

      const controller = new AbortController();
      formatAbortRef.current.set(format, controller);
      const runSignal = runAbortRef.current?.signal;
      if (runSignal) {
        if (runSignal.aborted) {
          controller.abort();
        } else {
          runSignal.addEventListener("abort", () => controller.abort(), {
            once: true,
          });
        }
      }

      try {
        if (useStream) {
          const { output, usage, repurposeId } = await callGenerateStreamApi({
            inputContent: trimmed,
            targetFormat: format,
            brandVoice,
            voiceVariant: voiceVariants[format],
            targetWords,
            targetTweets:
              format === "x_thread" ? wordsToTweets(targetWords) : undefined,
            generationId: options?.generationId,
            refinement: options?.refinement,
            signal: controller.signal,
            onPartial: (partial) => applyPartialOutput(format, partial),
          });
          applyOutput(format, output, repurposeId);
          setUsedCount(usage.used);
        } else {
          const { output, usage, repurposeId } = await callGenerateApi(
            trimmed,
            format,
            targetWords,
            voiceVariants[format],
            options?.generationId
          );
          applyOutput(format, output, repurposeId);
          setUsedCount(usage.used);
        }
      } catch (err) {
        if (isAbortError(err)) {
          setFormatErrors((prev) => ({ ...prev, [format]: null }));
          clearPartialPreview(format);
          return;
        }
        console.error(err);
        clearPartialPreview(format);
        resolveGenerateError(err, format, FORMAT_FALLBACK_ERRORS);
      } finally {
        formatAbortRef.current.delete(format);
        setFormatLoading((prev) => ({ ...prev, [format]: false }));
      }
    },
    [
      applyOutput,
      applyPartialOutput,
      brandVoice,
      callGenerateApi,
      clearPartialPreview,
      inputSummary,
      lengthWords,
      resolveGenerateError,
      useStream,
      voiceVariants,
    ]
  );

  const regenerateFormat = (format: TargetFormat) => {
    if (isPhotoMode) {
      void generatePhotoFormat(format);
      return;
    }
    void generateFormat(format);
  };

  const refineFormat = (format: TargetFormat, refinement: string) => {
    if (!useStream || isPhotoMode) return;
    void generateFormat(format, { refinement });
  };

  const regenerateAll = async () => {
    setIsRegeneratingAll(true);
    const generationId = crypto.randomUUID();
    const formats = ALL_FORMATS.filter((format) => selectedFormats.has(format));
    const runController = new AbortController();
    runAbortRef.current = runController;

    try {
      if (isPhotoMode) {
        await Promise.allSettled(
          formats.map((format) => generatePhotoFormat(format, { generationId }))
        );
      } else {
        await Promise.allSettled(
          formats.map((format) => generateFormat(format, { generationId }))
        );
      }

      if (!runController.signal.aborted) {
        toast.success("Run complete", {
          description: "Review each format below",
        });
      }
    } finally {
      runAbortRef.current = null;
      setIsRegeneratingAll(false);
    }
  };

  const handleTextInputUpdate = async (content: string) => {
    setInputSummary(content);
    setIsRegeneratingAll(true);
    const generationId = crypto.randomUUID();
    const formats = ALL_FORMATS.filter((format) => selectedFormats.has(format));
    const runController = new AbortController();
    runAbortRef.current = runController;

    try {
      await Promise.allSettled(
        formats.map((format) =>
          generateFormat(format, { generationId, inputContent: content })
        )
      );
      if (!runController.signal.aborted) {
        toast.success("Run complete", {
          description: "Review each format below",
        });
      }
    } finally {
      runAbortRef.current = null;
      setIsRegeneratingAll(false);
    }
  };

  const copyAllToClipboard = async () => {
    const parts: string[] = [];

    if (xThreadOutput) {
      parts.push(`=== X / Twitter Thread ===\n\n${formatXThreadForCopy(xThreadOutput)}`);
    }
    if (linkedinOutput) {
      parts.push(`=== LinkedIn ===\n\n${formatLinkedInForCopy(linkedinOutput)}`);
    }
    if (instagramOutput) {
      parts.push(`=== Instagram ===\n\n${formatInstagramForCopy(instagramOutput)}`);
    }
    if (emailOutput) {
      parts.push(`=== Email ===\n\n${formatEmailForCopy(emailOutput)}`);
    }

    if (parts.length === 0) {
      throw new Error("No generated content to copy");
    }

    await navigator.clipboard.writeText(parts.join("\n\n"));
  };

  const exportBundle = async () => {
    try {
      await copyAllToClipboard();
      toast.success("All formats copied");
    } catch (err) {
      console.error("Clipboard write failed", err);
      toast.error("Could not copy", {
        description: "Your browser may be blocking clipboard access.",
      });
    }
  };

  useEffect(() => {
    if (!selectedFormats.has(expandedFormat)) {
      const next = ALL_FORMATS.find((f) => selectedFormats.has(f));
      if (next) setExpandedFormat(next);
    }
  }, [expandedFormat, selectedFormats]);

  const cardStatus = (format: TargetFormat): FormatCardStatus => {
    if (formatLoading[format]) return "generating";
    if (formatErrors[format]) return "failed";
    if (
      (format === "x_thread" && xThreadOutput) ||
      (format === "linkedin" && linkedinOutput) ||
      (format === "instagram" && instagramOutput) ||
      (format === "email" && emailOutput)
    ) {
      return "ready";
    }
    return "idle";
  };

  const statusLabelFor = (format: TargetFormat, ready: string) => {
    if (formatLoading[format]) return "Generating…";
    if (formatErrors[format]) return "Failed. Retry below";
    if (ready) return ready;
    return "Not generated yet";
  };

  const renderFormatError = (format: TargetFormat, message: string) => (
    <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <div>{message}</div>
        <button
          type="button"
          onClick={() => regenerateFormat(format)}
          className="mt-1 text-[11px] font-medium text-destructive underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );

  const renderFormatBody = (
    format: TargetFormat,
    output: React.ReactNode,
    emptyPlaceholder: React.ReactNode
  ) => {
    if (formatLoading[format] && !output) {
      return <FormatGeneratingPlaceholder />;
    }

    if (output) {
      const variants = formatVariants[format];
      const activeIdx = activeIndexFor(format);
      const activeId = variants[activeIdx]?.repurposeId;
      const previewing = partialPreview[format] !== null;
      const showMeta = !previewing && variants.length > 0;
      return (
        <div className={formatLoading[format] ? "opacity-60 transition-opacity" : undefined}>
          {showMeta ? (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {variants.length > 1 ? (
                <>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Versions
                  </span>
                  {variants.map((variant, index) => (
                    <button
                      key={variant.repurposeId || `v${index}`}
                      type="button"
                      onClick={() => selectVariant(format, index)}
                      aria-pressed={index === activeIdx}
                      aria-label={`Show version ${index + 1}`}
                      className={
                        index === activeIdx
                          ? "rounded-full border border-primary bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary transition-colors"
                          : "rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      }
                    >
                      v{index + 1}
                    </button>
                  ))}
                </>
              ) : null}
              {activeId ? (
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  ID {activeId.slice(0, 8)}
                </span>
              ) : null}
            </div>
          ) : null}
          {output}
        </div>
      );
    }

    return emptyPlaceholder;
  };

  const renderRefinementChips = (format: TargetFormat) =>
    useStream && !isPhotoMode && formatVariants[format].length > 0 ? (
      <RefinementChips
        disabled={formatLoading[format] || atLimit}
        onRefine={(directive) => refineFormat(format, directive)}
      />
    ) : null;

  const renderLengthControls = (format: TargetFormat) => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Delivery</div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={`Delivery for ${FORMAT_TITLES[format]}`}
        >
          {VOICE_VARIANTS.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={
                voiceVariants[format] === variant.id
                  ? "rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              }
              aria-pressed={voiceVariants[format] === variant.id}
              onClick={() => handleVoiceVariantChange(format, variant.id)}
              disabled={formatLoading[format] || !hasVoiceSamples}
              title={variant.description}
            >
              {variant.label}
            </button>
          ))}
        </div>
        {!hasVoiceSamples ? (
          <p className="text-xs text-muted-foreground">
            <Link href="/brand-voice" className="underline underline-offset-2">
              Add writing samples
            </Link>{" "}
            to choose a delivery variant.
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">
          Target length (words)
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={`Target length for ${FORMAT_TITLES[format]}`}
        >
          {lengthPresetsForVariant(format, voiceVariants[format]).map((words) => (
            <button
              key={words}
              type="button"
              className={
                lengthWords[format] === words
                  ? "rounded-full border border-primary bg-primary px-4 py-1.5 font-mono text-xs text-primary-foreground"
                  : "rounded-full border border-border bg-background px-4 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              }
              aria-label={`${words} words`}
              aria-pressed={lengthWords[format] === words}
              onClick={() => handleLengthWordsChange(format, words)}
              disabled={formatLoading[format]}
            >
              {words}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const canStartRun = isPhotoMode
    ? canGeneratePhoto
    : inputSummary.trim().length >= INPUT_CONTENT_MIN_LENGTH;

  return (
    <div className="mx-auto min-h-screen max-w-screen-md bg-background px-4 pb-40 pt-6 md:pb-28">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Content Studio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Source → formats → generate → review → export
        </p>
      </div>

      {!brandVoice && <VoiceSetupBanner />}

      <InputModeTabs
        value={inputMode}
        onChange={requestModeChange}
        disabled={isAnyLoading}
      />

      {isPhotoMode ? (
        <PhotoInputSection
          key="photo-input"
          userPlan={userPlan}
          disabled={isAnyLoading}
          onReadyChange={setPhotoInput}
        />
      ) : isLinkMode ? (
        <LinkSourceCard
          inputSummary={inputSummary}
          isLoading={isAnyLoading}
          onExtracted={(sourceText) => setInputSummary(sourceText)}
          onUpdateText={handleTextInputUpdate}
        />
      ) : (
        <>
          <StudioTemplatePicker
            disabled={isAnyLoading}
            onApply={(body) => setInputSummary(body)}
          />
          <TextSourceCard
            inputSummary={inputSummary}
            isLoading={isAnyLoading}
            onUpdate={handleTextInputUpdate}
          />
        </>
      )}

      <ProcessingTrustNote />

      <div className="mb-6">
        <Link
          href="/brand-voice"
          className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={
            brandVoice
              ? voiceDisplayName(brandVoice)
              : "Set up Brand Voice"
          }
        >
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            Brand Voice:{" "}
            <span className="font-medium">
              {brandVoice
                ? voiceDisplayName(brandVoice)
                : "No voice set, using built-in style"}
            </span>
          </span>
        </Link>
      </div>

      {(atLimit || reactiveUpgradeGate === "monthly_limit") && (
        <UpgradePrompt gate="monthly_limit" plan={userPlan} />
      )}
      {reactiveUpgradeGate === "vision" && (
        <UpgradePrompt gate="vision" plan={userPlan} />
      )}
      {reactiveUpgradeGate === "rate_limit" && (
        <UpgradePrompt gate="rate_limit" plan={userPlan} />
      )}

      <StudioFormatPicker
        selected={selectedFormats}
        onChange={setSelectedFormats}
        disabled={isAnyLoading}
      />

      <div
        className="mb-3 flex items-center justify-between px-1 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">
          GENERATED OUTPUTS
        </div>
        <div className="text-xs text-muted-foreground">
          {activeFormats.length} of {ALL_FORMATS.length} selected
        </div>
      </div>

      {liveStatus ? (
        <p
          className="mb-3 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground"
          role="status"
        >
          {liveStatus}
        </p>
      ) : null}

      <div className="space-y-4">
        <StudioFormatResultCard
          format="x_thread"
          title={FORMAT_TITLES.x_thread}
          status={cardStatus("x_thread")}
          statusLabel={statusLabelFor(
            "x_thread",
            xThreadOutput ? `${xThreadOutput.tweets.length} tweets` : ""
          )}
          icon={
            <span className="text-foreground">
              <XMark size={20} />
            </span>
          }
          selected={selectedFormats.has("x_thread")}
          expanded={expandedFormat === "x_thread"}
          onToggleExpand={() => setExpandedFormat("x_thread")}
          onRegenerate={() => regenerateFormat("x_thread")}
          onStop={useStream ? () => stopFormat("x_thread") : undefined}
          regenerateDisabled={atLimit}
          error={
            formatErrors.x_thread
              ? renderFormatError("x_thread", formatErrors.x_thread)
              : null
          }
          footerExtra={
            <div className="space-y-4">
              {renderLengthControls("x_thread")}
              {renderRefinementChips("x_thread")}
            </div>
          }
        >
          {renderFormatBody(
            "x_thread",
            xThreadOutput ? (
              <XThreadTweetList
                key={repurposeIds.x_thread ?? "x-thread"}
                tweets={xThreadOutput.tweets}
                output={xThreadOutput}
                variant="studio"
                repurposeId={repurposeIds.x_thread ?? undefined}
              />
            ) : null,
            <p className="text-sm italic leading-relaxed text-muted-foreground">
              Generate to create your X thread from the source content. Results
              appear here as soon as this format finishes. You do not need to wait
              for every platform.
            </p>
          )}
        </StudioFormatResultCard>

        <StudioFormatResultCard
          format="linkedin"
          title={FORMAT_TITLES.linkedin}
          status={cardStatus("linkedin")}
          statusLabel={statusLabelFor(
            "linkedin",
            linkedinOutput
              ? `${linkedinOutput.carousel_slides.length} slides`
              : ""
          )}
          icon={
            <span className="text-[color:var(--platform-linkedin)]">
              <LinkedInMark size={20} />
            </span>
          }
          selected={selectedFormats.has("linkedin")}
          expanded={expandedFormat === "linkedin"}
          onToggleExpand={() => setExpandedFormat("linkedin")}
          onRegenerate={() => regenerateFormat("linkedin")}
          onStop={useStream ? () => stopFormat("linkedin") : undefined}
          regenerateDisabled={atLimit}
          error={
            formatErrors.linkedin
              ? renderFormatError("linkedin", formatErrors.linkedin)
              : null
          }
          footerExtra={
            <div className="space-y-4">
              {renderLengthControls("linkedin")}
              {renderRefinementChips("linkedin")}
            </div>
          }
        >
          {renderFormatBody(
            "linkedin",
            linkedinOutput ? (
              <LinkedInOutputPanel
                key={repurposeIds.linkedin ?? "linkedin"}
                output={linkedinOutput}
                variant="studio"
                repurposeId={repurposeIds.linkedin ?? undefined}
              />
            ) : null,
            <p className="text-sm italic text-muted-foreground">
              Generate to create your LinkedIn post and carousel slide ideas.
            </p>
          )}
        </StudioFormatResultCard>

        <StudioFormatResultCard
          format="instagram"
          title={FORMAT_TITLES.instagram}
          status={cardStatus("instagram")}
          statusLabel={statusLabelFor(
            "instagram",
            instagramOutput
              ? `${instagramOutput.hook_variations.length} hook variations`
              : ""
          )}
          icon={
            <span className="text-[color:var(--platform-instagram)]">
              <InstagramMark size={20} />
            </span>
          }
          selected={selectedFormats.has("instagram")}
          expanded={expandedFormat === "instagram"}
          onToggleExpand={() => setExpandedFormat("instagram")}
          onRegenerate={() => regenerateFormat("instagram")}
          onStop={useStream ? () => stopFormat("instagram") : undefined}
          regenerateDisabled={atLimit}
          error={
            formatErrors.instagram
              ? renderFormatError("instagram", formatErrors.instagram)
              : null
          }
          footerExtra={
            <div className="space-y-4">
              {renderLengthControls("instagram")}
              {renderRefinementChips("instagram")}
            </div>
          }
        >
          {renderFormatBody(
            "instagram",
            instagramOutput ? (
              <InstagramOutputPanel
                key={repurposeIds.instagram ?? "instagram"}
                output={instagramOutput}
                variant="studio"
                repurposeId={repurposeIds.instagram ?? undefined}
              />
            ) : null,
            <p className="text-sm italic text-muted-foreground">
              Generate to create your Instagram caption, hooks, and hashtags.
            </p>
          )}
        </StudioFormatResultCard>

        <StudioFormatResultCard
          format="email"
          title={FORMAT_TITLES.email}
          status={cardStatus("email")}
          statusLabel={statusLabelFor(
            "email",
            emailOutput ? "Newsletter draft" : ""
          )}
          icon={
            <span className="text-[color:var(--platform-email)]">
              <EmailGlyph size={20} />
            </span>
          }
          selected={selectedFormats.has("email")}
          expanded={expandedFormat === "email"}
          onToggleExpand={() => setExpandedFormat("email")}
          onRegenerate={() => regenerateFormat("email")}
          onStop={useStream ? () => stopFormat("email") : undefined}
          regenerateDisabled={atLimit}
          error={
            formatErrors.email
              ? renderFormatError("email", formatErrors.email)
              : null
          }
          footerExtra={
            <div className="space-y-4">
              {renderLengthControls("email")}
              {renderRefinementChips("email")}
            </div>
          }
        >
          {renderFormatBody(
            "email",
            emailOutput ? (
              <EmailOutputPanel
                key={repurposeIds.email ?? "email"}
                output={emailOutput}
                variant="studio"
                repurposeId={repurposeIds.email ?? undefined}
              />
            ) : null,
            <p className="text-sm italic text-muted-foreground">
              Generate to create your email subject line and newsletter draft.
            </p>
          )}
        </StudioFormatResultCard>
      </div>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:bottom-0 md:left-64 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-screen-md gap-3">
          {useStream && isAnyLoading ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={stopAll}
            >
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => {
                void hapticImpact("Medium");
                void regenerateAll();
              }}
              disabled={isAnyLoading || atLimit || !canStartRun}
            >
              {isRegeneratingAll
                ? isPhotoMode
                  ? "Analysing your photo…"
                  : "Generating selected formats…"
                : activeFormats.length === ALL_FORMATS.length
                  ? hasAnyOutput
                    ? "Regenerate All"
                    : "Generate All"
                  : `${hasAnyOutput ? "Regenerate" : "Generate"} ${activeFormats.length} format${activeFormats.length === 1 ? "" : "s"}`}
            </Button>
          )}

          <Button
            type="button"
            className="flex-1 rounded-xl"
            onClick={() => void exportBundle()}
            disabled={!hasAnyOutput}
          >
            Export Bundle (Text)
          </Button>
        </div>
      </div>

      <ModeSwitchDialog
        open={pendingMode !== null}
        targetLabel={pendingMode ? modeLabel(pendingMode) : "another mode"}
        clearDescription={
          pendingMode === "photo"
            ? "Switching to photo upload will clear your source text."
            : "Switching away from photo will clear your photo and context."
        }
        onConfirm={confirmModeChange}
        onCancel={() => setPendingMode(null)}
      />
    </div>
  );
}
