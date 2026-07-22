import {
  VOICE_TOO_LARGE_MESSAGE,
  VOICE_TOO_LONG_MESSAGE,
  VOICE_UNSUPPORTED_MESSAGE,
} from "./constants";

export type AudioTranscribeErrorCode =
  | "voice_too_large"
  | "voice_too_long"
  | "voice_unsupported"
  | "transcription_failed"
  | "transcription_timeout";

export class AudioTranscribeError extends Error {
  readonly code: AudioTranscribeErrorCode;

  constructor(code: AudioTranscribeErrorCode, message: string) {
    super(message);
    this.name = "AudioTranscribeError";
    this.code = code;
  }
}

export function voiceTooLargeError(): AudioTranscribeError {
  return new AudioTranscribeError("voice_too_large", VOICE_TOO_LARGE_MESSAGE);
}

export function voiceTooLongError(): AudioTranscribeError {
  return new AudioTranscribeError("voice_too_long", VOICE_TOO_LONG_MESSAGE);
}

export function voiceUnsupportedError(detail?: string): AudioTranscribeError {
  return new AudioTranscribeError(
    "voice_unsupported",
    detail
      ? `${VOICE_UNSUPPORTED_MESSAGE} (${detail})`
      : VOICE_UNSUPPORTED_MESSAGE
  );
}

export function transcriptionFailedError(
  message = "Transcription failed. Please try again."
): AudioTranscribeError {
  return new AudioTranscribeError("transcription_failed", message);
}

export function transcriptionTimeoutError(): AudioTranscribeError {
  return new AudioTranscribeError(
    "transcription_timeout",
    "Transcription timed out. Try a shorter clip, or try again."
  );
}
