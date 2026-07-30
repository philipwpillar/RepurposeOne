import type {
  BrandVoiceInput,
  GenerateErrorResponse,
  GenerateSuccessResponse,
  RepurposeOutput,
  TargetFormat,
  UsageInfo,
  VoiceVariantId,
} from "@/types";
import type { PhotoInputReady } from "@/types/photo-input";

export class PhotoGenerateApiError extends Error {
  usage?: UsageInfo;
  code?: GenerateErrorResponse["code"];

  constructor(
    message: string,
    opts?: { usage?: UsageInfo; code?: GenerateErrorResponse["code"] }
  ) {
    super(message);
    this.name = "PhotoGenerateApiError";
    this.usage = opts?.usage;
    this.code = opts?.code;
  }
}

interface BrandVoiceRef {
  id: string;
  samples: string[] | null;
  description: string | null;
}

export async function callPhotoGenerateApi(params: {
  photo: PhotoInputReady;
  targetFormat: TargetFormat;
  brandVoice?: BrandVoiceRef | null;
  targetTweets?: number;
  targetWords?: number;
  voiceVariant: VoiceVariantId;
  generationId?: string;
}): Promise<{ output: RepurposeOutput; usage: UsageInfo; repurposeId: string }> {
  const body: Record<string, unknown> = {
    input_type: "image",
    image_base64: params.photo.imageBase64,
    image_mime: params.photo.mimeType,
    photo_context: params.photo.context,
    target_format: params.targetFormat,
    voice_variant: params.voiceVariant,
  };

  if (params.photo.cta) {
    body.photo_cta = params.photo.cta;
  }

  if (params.brandVoice?.id) {
    body.brand_voice_id = params.brandVoice.id;
  } else {
    body.brand_voice = {
      samples: [],
      description: "Clear, professional, conversational.",
    } satisfies BrandVoiceInput;
  }

  if (params.targetFormat === "x_thread" && params.targetTweets !== undefined) {
    body.target_tweets = params.targetTweets;
  }

  if (params.targetWords !== undefined) {
    body.target_words = params.targetWords;
  }

  if (params.generationId) {
    body.generation_id = params.generationId;
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
    throw new PhotoGenerateApiError(message, { usage, code });
  }

  const data = JSON.parse(text) as GenerateSuccessResponse;
  if (!data.output || data.output.format !== params.targetFormat) {
    throw new Error("Unexpected response from generation API");
  }

  return {
    output: data.output,
    usage: data.usage,
    repurposeId: data.repurpose_id,
  };
}
