import {
  DEEPINFRA_ASR_ENDPOINT,
  DEEPINFRA_ASR_TIMEOUT_MS,
} from "@/lib/audio/constants";
import {
  transcriptionFailedError,
  transcriptionTimeoutError,
} from "@/lib/audio/errors";

function extensionForMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  switch (normalized) {
    case "audio/webm":
      return "webm";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return "m4a";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return "wav";
    case "audio/ogg":
    case "audio/ogg;codecs=opus":
      return "ogg";
    case "audio/flac":
      return "flac";
    case "audio/aac":
      return "aac";
    default: {
      const subtype = normalized.split("/")[1];
      if (subtype && /^[a-z0-9.+-]+$/i.test(subtype)) {
        return subtype.replace(/[^a-z0-9]+/gi, "") || "bin";
      }
      return "bin";
    }
  }
}

/**
 * Call DeepInfra Whisper directly (multipart). Does not use OpenRouter —
 * STT there cannot enforce provider.only routing.
 */
export async function transcribeAudioWithDeepInfra(params: {
  bytes: Uint8Array;
  mimeType: string;
}): Promise<string> {
  const apiKey = process.env.DEEPINFRA_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPINFRA_API_KEY is not configured");
  }

  const filename = `voice.${extensionForMime(params.mimeType)}`;
  const blob = new Blob([Buffer.from(params.bytes)], {
    type: params.mimeType,
  });
  const form = new FormData();
  form.append("audio", blob, filename);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEEPINFRA_ASR_TIMEOUT_MS
  );

  let response: Response;
  try {
    response = await fetch(DEEPINFRA_ASR_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `bearer ${apiKey}`,
      },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (
      (err instanceof Error && err.name === "AbortError") ||
      controller.signal.aborted
    ) {
      throw transcriptionTimeoutError();
    }
    throw transcriptionFailedError();
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    // Do not forward provider body — log status only.
    console.error(
      `DeepInfra transcription failed: HTTP ${response.status}`
    );
    throw transcriptionFailedError();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw transcriptionFailedError();
  }

  const text =
    payload &&
    typeof payload === "object" &&
    "text" in payload &&
    typeof (payload as { text: unknown }).text === "string"
      ? (payload as { text: string }).text.trim()
      : "";

  if (!text) {
    throw transcriptionFailedError("Transcription returned empty text.");
  }

  return text;
}
