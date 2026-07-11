import OpenAI from "openai";
import type { PhotoMimeType } from "@/lib/image/constants";
import {
  AI_CONFIG,
  getModelForFormat,
  getTierForFormat,
  type ModelTier,
} from "@/lib/config";
import {
  buildBrandVoiceBlock,
  buildGenerationPrompt,
  buildPhotoGenerationPrompt,
  type PromptContext,
} from "@/lib/ai/prompts";
import {
  RepurposeOutputSchema,
  type BrandVoiceInput,
  type RepurposeOutput,
  type TargetFormat,
} from "@/types";

type OpenRouterChatCompletionParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParams & {
    reasoning?: { enabled: boolean };
  };

export interface GenerateInput {
  inputContent: string;
  brandVoice: BrandVoiceInput;
  targetFormat: TargetFormat;
  targetTweets?: number;
  /** Optional tier override; defaults to FORMAT_MODEL_TIER mapping. */
  modelTier?: ModelTier;
}

export interface GenerateResult {
  output: RepurposeOutput;
  model: string;
  modelTier: ModelTier;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
}

function getAiClient(): OpenAI {
  if (AI_CONFIG.provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    return new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown code fences if the model adds them despite instructions.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;
  return JSON.parse(jsonText);
}

/**
 * Core AI generation abstraction.
 * Model selection is routed via FORMAT_MODEL_TIER in lib/config.ts
 * (override model IDs with AI_MODEL_FAST / AI_MODEL_STRONG env vars).
 * x_thread uses the strong tier (STRONG_MODEL) for multi-tweet coherence.
 */
export async function generateRepurpose(
  input: GenerateInput
): Promise<GenerateResult> {
  const truncatedContent = input.inputContent.slice(0, AI_CONFIG.maxInputChars);
  const brandVoiceText = buildBrandVoiceBlock(input.brandVoice);

  const ctx: PromptContext = {
    brandVoiceText,
    sourceText: truncatedContent,
    targetFormat: input.targetFormat,
    targetTweets: input.targetTweets,
  };

  const { system, user } = buildGenerationPrompt(ctx);
  const modelTier = input.modelTier ?? getTierForFormat(input.targetFormat);
  const model = getModelForFormat(input.targetFormat, modelTier);

  const client = getAiClient();

  const completionParams: OpenRouterChatCompletionParams = {
    model,
    temperature: AI_CONFIG.temperature,
    response_format: { type: "json_object" },
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  const response = await client.chat.completions.create(completionParams);

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = parseJsonResponse(rawContent);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const validated = RepurposeOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `AI output failed validation: ${validated.error.issues.map((i) => i.message).join("; ")}`
    );
  }

  return {
    output: validated.data,
    model,
    modelTier,
    tokensUsed: response.usage?.total_tokens,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  };
}

export interface GenerateImageInput {
  imageBase64: string;
  imageMime: PhotoMimeType;
  context: string;
  cta?: string;
  brandVoice: BrandVoiceInput;
  targetFormat: TargetFormat;
  targetTweets?: number;
}

/**
 * Vision-model generation for photo + guided context input.
 */
export async function generateRepurposeFromImage(
  input: GenerateImageInput
): Promise<GenerateResult> {
  const brandVoiceText = buildBrandVoiceBlock(input.brandVoice);
  const { system, user } = buildPhotoGenerationPrompt({
    brandVoiceText,
    context: input.context,
    cta: input.cta,
    targetFormat: input.targetFormat,
    targetTweets: input.targetTweets,
  });

  const model = AI_CONFIG.visionModel;
  const client = getAiClient();
  const imageUrl = `data:${input.imageMime};base64,${input.imageBase64}`;

  const completionParams: OpenRouterChatCompletionParams = {
    model,
    temperature: AI_CONFIG.temperature,
    response_format: { type: "json_object" },
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  };

  const response = await client.chat.completions.create(completionParams);

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = parseJsonResponse(rawContent);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const validated = RepurposeOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `AI output failed validation: ${validated.error.issues.map((i) => i.message).join("; ")}`
    );
  }

  return {
    output: validated.data,
    model,
    modelTier: "strong",
    tokensUsed: response.usage?.total_tokens,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  };
}

/** Exported for unit tests — validate arbitrary AI JSON against schema. */
export function validateAiOutput(data: unknown): RepurposeOutput {
  return RepurposeOutputSchema.parse(data);
}

/** Zod schema re-export for route-level validation. */
export { RepurposeOutputSchema };
