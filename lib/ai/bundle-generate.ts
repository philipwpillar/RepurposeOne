import { completeOpenRouterJson } from "@/lib/ai/generate";
import {
  buildBrandVoiceBlock,
  buildBundlePackSynthesisPrompt,
  buildBundlePhotoAnalysisPrompt,
} from "@/lib/ai/prompts";
import { AI_CONFIG } from "@/lib/config";
import type { PhotoMimeType } from "@/lib/image/constants";
import {
  BundlePackSchema,
  BundlePhotoAnalysisSchema,
  type BrandVoiceInput,
  type BundlePack,
  type BundlePhotoAnalysis,
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

export interface RunPhotoBundleGenerationInput {
  photos: BundlePhotoInput[];
  context: string;
  brandVoice: BrandVoiceInput;
}

export interface RunPhotoBundleGenerationResult {
  pack: BundlePack;
  stage1b: BundlePhotoAnalysis;
  tokenTotals: BundleTokenTotals;
  visionModel: string;
  strongModel: string;
}

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

/**
 * Two-stage photo pack generation (A1 stage 1b + stage 2).
 * Stage 2 never runs on unvalidated stage-1b output.
 */
export async function runPhotoBundleGeneration(
  input: RunPhotoBundleGenerationInput
): Promise<RunPhotoBundleGenerationResult> {
  if (input.photos.length < 1 || input.photos.length > 8) {
    throw new Error("Bundle requires 1–8 photos");
  }

  const visionModel = AI_CONFIG.visionModel;
  const strongModel = AI_CONFIG.strongModel;
  const totals = emptyTotals();
  const mergedPhotos: BundlePhotoAnalysis["photos"] = [];

  for (let offset = 0; offset < input.photos.length; offset += VISION_BATCH_SIZE) {
    const batch = input.photos.slice(offset, offset + VISION_BATCH_SIZE);
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
  const stage1b = stage1bParsed.data;

  const brandVoiceText = buildBrandVoiceBlock(input.brandVoice);
  const { system, user } = buildBundlePackSynthesisPrompt({
    brandVoiceText,
    context: input.context,
    photoCount: input.photos.length,
    stage1bJson: JSON.stringify(stage1b),
  });

  const stage2 = await completeOpenRouterJson({
    model: strongModel,
    schema: BundlePackSchema,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  addTokens(totals, stage2);

  return {
    pack: stage2.data,
    stage1b,
    tokenTotals: totals,
    visionModel,
    strongModel,
  };
}
