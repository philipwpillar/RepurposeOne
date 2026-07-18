import { completeOpenRouterJson } from "@/lib/ai/generate";
import {
  buildBrandVoiceBlock,
  buildBundlePackSynthesisPrompt,
  buildBundlePhotoAnalysisPrompt,
  buildBundleVideoMomentsPrompt,
} from "@/lib/ai/prompts";
import { AI_CONFIG } from "@/lib/config";
import type { PhotoMimeType } from "@/lib/image/constants";
import {
  BundlePackAiSchema,
  BundlePhotoAnalysisSchema,
  BundleVideoMomentsSchema,
  type BrandVoiceInput,
  type BundleClipSpec,
  type BundlePack,
  type BundlePhotoAnalysis,
  type BundleVideoInput,
  type BundleVideoMoments,
} from "@/types";

const VISION_BATCH_SIZE = 4;

export interface BundlePhotoInput {
  /** Raw base64 (no data-URL prefix) or full data URL. */
  data: string;
  filename?: string;
  mime: PhotoMimeType;
}

export interface BundleTokenTotals {
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
}

export interface RunBundleGenerationInput {
  photos: BundlePhotoInput[];
  videos?: BundleVideoInput[];
  context: string;
  brandVoice: BrandVoiceInput;
}

export interface RunBundleGenerationResult {
  pack: BundlePack;
  stage1b: BundlePhotoAnalysis;
  stage1a: BundleVideoMoments[];
  tokenTotals: BundleTokenTotals;
  visionModel: string;
  strongModel: string;
}

/** @deprecated Prefer runBundleGeneration — kept as photo-only wrapper. */
export type RunPhotoBundleGenerationInput = Omit<
  RunBundleGenerationInput,
  "videos"
>;
export type RunPhotoBundleGenerationResult = RunBundleGenerationResult;

function stripDataUrlPrefix(data: string): string {
  const match = data.match(/^data:[^;]+;base64,(.+)$/i);
  return match ? match[1] : data;
}

function emptyTotals(): BundleTokenTotals {
  return { tokensUsed: 0, promptTokens: 0, completionTokens: 0 };
}

function addTokens(
  totals: BundleTokenTotals,
  usage: {
    tokensUsed?: number;
    promptTokens?: number;
    completionTokens?: number;
  }
): void {
  totals.tokensUsed += usage.tokensUsed ?? 0;
  totals.promptTokens += usage.promptTokens ?? 0;
  totals.completionTokens += usage.completionTokens ?? 0;
}

/** Strip emoji and other non-BMP / symbol-heavy chars from overlay burn text. */
export function stripOverlayEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function applyClipSpecBackstops(
  specs: Array<{
    video_index: number;
    start_s: number;
    end_s: number;
    overlay_text: string;
    caption: string;
    tags: string[];
  }>,
  videoDurations: number[]
): BundleClipSpec[] {
  const out: BundleClipSpec[] = [];

  for (const spec of specs) {
    if (spec.video_index < 0 || spec.video_index >= videoDurations.length) {
      console.info(
        `[bundle] drop clip_spec: video_index ${spec.video_index} out of range`
      );
      continue;
    }

    const duration = videoDurations[spec.video_index];
    let start = spec.start_s;
    let end = spec.end_s;

    if (end > duration) {
      console.info(
        `[bundle] clamp clip end_s ${end} → ${duration} (video ${spec.video_index})`
      );
      end = duration;
    }
    if (start < 0) start = 0;
    if (start >= end) {
      console.info(
        `[bundle] drop clip_spec: start>=end after clamp (video ${spec.video_index})`
      );
      continue;
    }

    const window = end - start;
    if (window < 10) {
      console.info(
        `[bundle] drop clip_spec: window ${window.toFixed(2)}s < 10s after clamp`
      );
      continue;
    }
    if (window > 45) {
      end = start + 45;
      console.info(
        `[bundle] clamp clip window to 45s (video ${spec.video_index})`
      );
    }

    const cleanedOverlay = stripOverlayEmoji(spec.overlay_text);
    if (cleanedOverlay !== spec.overlay_text) {
      console.info(
        `[bundle] stripped emoji/symbols from overlay_text (video ${spec.video_index})`
      );
    }

    out.push({
      ...spec,
      start_s: start,
      end_s: end,
      overlay_text: cleanedOverlay || "Moment",
      tags: spec.tags.slice(0, 12),
    });

    if (out.length >= 6) break;
  }

  return out;
}

async function runVisionBatch(
  photos: BundlePhotoInput[],
  globalIndexes: number[],
  context: string,
  model: string,
  totals: BundleTokenTotals
): Promise<BundlePhotoAnalysis["photos"]> {
  const { system, user } = buildBundlePhotoAnalysisPrompt({
    context,
    photoIndexes: globalIndexes,
  });

  const imageParts = photos.map((photo) => {
    const base64 = stripDataUrlPrefix(photo.data);
    return {
      type: "image_url" as const,
      image_url: {
        url: `data:${photo.mime};base64,${base64}`,
      },
    };
  });

  const result = await completeOpenRouterJson({
    model,
    schema: BundlePhotoAnalysisSchema,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [{ type: "text", text: user }, ...imageParts],
      },
    ],
  });

  addTokens(totals, result);
  return result.data.photos;
}

async function runVideoMoments(
  video: BundleVideoInput,
  context: string,
  model: string,
  totals: BundleTokenTotals
): Promise<BundleVideoMoments> {
  const { system, sheetUserTexts } = buildBundleVideoMomentsPrompt({
    durationS: video.duration_s,
    sheets: video.sheets.map((s) => ({ timestamps: s.timestamps })),
    context,
  });

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  for (let i = 0; i < video.sheets.length; i++) {
    const sheet = video.sheets[i];
    const base64 = stripDataUrlPrefix(sheet.data);
    content.push({ type: "text", text: sheetUserTexts[i] });
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${base64}` },
    });
  }

  const result = await completeOpenRouterJson({
    model,
    schema: BundleVideoMomentsSchema,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
  });

  addTokens(totals, result);
  return result.data;
}

/**
 * A1 bundle generation: stage 1a (per video) + stage 1b (photos) + stage 2.
 * Stage 2 never runs on unvalidated stage-1 output.
 */
export async function runBundleGeneration(
  input: RunBundleGenerationInput
): Promise<RunBundleGenerationResult> {
  const photos = input.photos ?? [];
  const videos = input.videos ?? [];

  if (photos.length > 8) {
    throw new Error("Bundle allows at most 8 photos");
  }
  if (videos.length > 2) {
    throw new Error("Bundle allows at most 2 videos");
  }
  if (photos.length + videos.length < 1) {
    throw new Error("Bundle requires at least one photo or video");
  }

  const visionModel = AI_CONFIG.visionModel;
  const strongModel = AI_CONFIG.strongModel;
  const totals = emptyTotals();

  // --- Stage 1a: per-video contact sheets → moments ---
  const stage1a: BundleVideoMoments[] = [];
  for (let i = 0; i < videos.length; i++) {
    console.info(`[bundle] stage-1a video ${i + 1}/${videos.length}`);
    const moments = await runVideoMoments(
      videos[i],
      input.context,
      visionModel,
      totals
    );
    stage1a.push(moments);
  }

  // --- Stage 1b: photos in batches of ≤4 ---
  let stage1b: BundlePhotoAnalysis = { photos: [] };
  if (photos.length > 0) {
    const mergedPhotos: BundlePhotoAnalysis["photos"] = [];
    for (
      let offset = 0;
      offset < photos.length;
      offset += VISION_BATCH_SIZE
    ) {
      const batch = photos.slice(offset, offset + VISION_BATCH_SIZE);
      const indexes = batch.map((_, i) => offset + i);
      const batchPhotos = await runVisionBatch(
        batch,
        indexes,
        input.context,
        visionModel,
        totals
      );
      mergedPhotos.push(...batchPhotos);
    }

    const stage1bParsed = BundlePhotoAnalysisSchema.safeParse({
      photos: mergedPhotos,
    });
    if (!stage1bParsed.success) {
      throw new Error(
        `Stage-1b merge failed validation: ${stage1bParsed.error.issues.map((i) => i.message).join("; ")}`
      );
    }
    stage1b = stage1bParsed.data;
  }

  const brandVoiceText = buildBrandVoiceBlock(input.brandVoice);
  const videoMomentsPayload = stage1a.map((m, video_index) => ({
    video_index,
    duration_s: videos[video_index].duration_s,
    moments: m.moments,
  }));

  const { system, user } = buildBundlePackSynthesisPrompt({
    brandVoiceText,
    context: input.context,
    photoCount: photos.length,
    stage1bJson: JSON.stringify(stage1b),
    videoCount: videos.length,
    videoMomentsJson:
      videos.length > 0 ? JSON.stringify(videoMomentsPayload) : undefined,
  });

  const stage2 = await completeOpenRouterJson({
    model: strongModel,
    schema: BundlePackAiSchema,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  addTokens(totals, stage2);

  const durations = videos.map((v) => v.duration_s);
  const clip_specs =
    videos.length > 0
      ? applyClipSpecBackstops(stage2.data.clip_specs, durations)
      : [];

  const pack: BundlePack = {
    ...stage2.data,
    clip_specs,
    photo_captions: photos.length > 0 ? stage2.data.photo_captions : [],
    posting_order: photos.length > 0 ? stage2.data.posting_order : [],
  };

  return {
    pack,
    stage1b,
    stage1a,
    tokenTotals: totals,
    visionModel,
    strongModel,
  };
}

export async function runPhotoBundleGeneration(
  input: RunPhotoBundleGenerationInput
): Promise<RunPhotoBundleGenerationResult> {
  return runBundleGeneration({ ...input, videos: [] });
}
