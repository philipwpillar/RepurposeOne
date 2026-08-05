import type {
  BrandVoiceInput,
  GenerateErrorResponse,
  RepurposeOutput,
  TargetFormat,
  UsageInfo,
  VoiceVariantId,
} from "@/types";

export class StreamGenerateApiError extends Error {
  usage?: UsageInfo;
  code?: GenerateErrorResponse["code"];

  constructor(
    message: string,
    opts?: { usage?: UsageInfo; code?: GenerateErrorResponse["code"] }
  ) {
    super(message);
    this.name = "StreamGenerateApiError";
    this.usage = opts?.usage;
    this.code = opts?.code;
  }
}

interface BrandVoiceRef {
  id: string;
  samples: string[] | null;
  description: string | null;
}

type StreamMetaEvent = {
  type: "meta";
  repurpose_id: string;
  source_hash: string | null;
  model: string;
};

type StreamPartialEvent = {
  type: "partial";
  object: Partial<RepurposeOutput> & Record<string, unknown>;
};

type StreamDoneEvent = {
  type: "done";
  output: RepurposeOutput;
  usage: UsageInfo;
  model: string;
  tokens_used?: number;
  repurpose_id: string;
  source_hash: string | null;
};

type StreamErrorEvent = {
  type: "error";
  error: string;
  code?: GenerateErrorResponse["code"];
};

type StreamEvent =
  | StreamMetaEvent
  | StreamPartialEvent
  | StreamDoneEvent
  | StreamErrorEvent;

export async function callGenerateStreamApi(params: {
  inputContent: string;
  targetFormat: TargetFormat;
  brandVoice?: BrandVoiceRef | null;
  targetTweets?: number;
  targetWords?: number;
  voiceVariant: VoiceVariantId;
  generationId?: string;
  refinement?: string;
  userCommentary?: string;
  signal?: AbortSignal;
  onPartial?: (partial: StreamPartialEvent["object"]) => void;
}): Promise<{ output: RepurposeOutput; usage: UsageInfo; repurposeId: string }> {
  const body: Record<string, unknown> = {
    input_type: "paste",
    input_content: params.inputContent,
    target_format: params.targetFormat,
    voice_variant: params.voiceVariant,
  };

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

  if (params.refinement) {
    body.refinement = params.refinement;
  }

  if (params.userCommentary?.trim()) {
    body.user_commentary = params.userCommentary.trim();
  }

  const response = await fetch("/api/generate/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  if (!response.ok) {
    const text = await response.text();
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
    throw new StreamGenerateApiError(message, { usage, code });
  }

  if (!response.body) {
    throw new StreamGenerateApiError("Empty stream response from generation API");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  const resultBox: { done: StreamDoneEvent | null } = { done: null };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let event: StreamEvent;
    try {
      event = JSON.parse(trimmed) as StreamEvent;
    } catch {
      throw new StreamGenerateApiError("Malformed stream frame from generation API");
    }

    if (event.type === "partial") {
      params.onPartial?.(event.object);
      return;
    }

    if (event.type === "error") {
      throw new StreamGenerateApiError(event.error, { code: event.code });
    }

    if (event.type === "done") {
      resultBox.done = event;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    carry += decoder.decode(value, { stream: true });
    const lines = carry.split("\n");
    carry = lines.pop() ?? "";

    for (const line of lines) {
      handleLine(line);
    }
  }

  if (carry.trim()) {
    handleLine(carry);
  }

  const doneEvent = resultBox.done;
  if (!doneEvent) {
    if (params.signal?.aborted) {
      const abortErr = new DOMException("Generation aborted", "AbortError");
      throw abortErr;
    }
    throw new StreamGenerateApiError("Stream ended without a complete result");
  }

  if (!doneEvent.output || doneEvent.output.format !== params.targetFormat) {
    throw new StreamGenerateApiError("Unexpected response from generation API");
  }

  return {
    output: doneEvent.output,
    usage: doneEvent.usage,
    repurposeId: doneEvent.repurpose_id,
  };
}
