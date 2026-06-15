import OpenAI from "openai";
import {
  AI_CONFIG,
  getModelForFormat,
  getTierForFormat,
  type ModelTier,
} from "@/lib/config";
import {
  buildBrandVoiceBlock,
  buildGenerationPrompt,
  type PromptContext,
} from "@/lib/ai/prompts";
import {
  RepurposeOutputSchema,
  type BrandVoiceInput,
  type RepurposeOutput,
  type TargetFormat,
} from "@/types";

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

  const response = await client.chat.completions.create({
    model,
    temperature: AI_CONFIG.temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

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

/** Exported for unit tests — validate arbitrary AI JSON against schema. */
export function validateAiOutput(data: unknown): RepurposeOutput {
  return RepurposeOutputSchema.parse(data);
}

/** Zod schema re-export for route-level validation. */
export { RepurposeOutputSchema };
