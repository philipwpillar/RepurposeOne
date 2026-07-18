import {
  SEEK_TIMEOUT_MESSAGE,
  VIDEO_TOO_LARGE_MESSAGE,
  VIDEO_TOO_LONG_MESSAGE,
  VIDEO_UNSUPPORTED_MESSAGE,
} from "./constants";

export type VideoSampleErrorCode =
  | "video_too_long"
  | "video_too_large"
  | "video_unsupported"
  | "seek_timeout"
  | "sheet_overflow";

export class VideoSampleError extends Error {
  readonly code: VideoSampleErrorCode;

  constructor(code: VideoSampleErrorCode, message: string) {
    super(message);
    this.name = "VideoSampleError";
    this.code = code;
  }
}

export function videoTooLongError(): VideoSampleError {
  return new VideoSampleError("video_too_long", VIDEO_TOO_LONG_MESSAGE);
}

export function videoTooLargeError(): VideoSampleError {
  return new VideoSampleError("video_too_large", VIDEO_TOO_LARGE_MESSAGE);
}

export function videoUnsupportedError(
  detail?: string
): VideoSampleError {
  return new VideoSampleError(
    "video_unsupported",
    detail ? `${VIDEO_UNSUPPORTED_MESSAGE} (${detail})` : VIDEO_UNSUPPORTED_MESSAGE
  );
}

export function seekTimeoutError(): VideoSampleError {
  return new VideoSampleError("seek_timeout", SEEK_TIMEOUT_MESSAGE);
}

export function sheetOverflowError(frameCount: number): VideoSampleError {
  return new VideoSampleError(
    "sheet_overflow",
    `Frame count ${frameCount} would need more than 4 contact sheets — sampler formula bug.`
  );
}
