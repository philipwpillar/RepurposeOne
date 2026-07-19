import {
  FRAME_COUNT_MAX,
  FRAME_COUNT_MIN,
  FRAME_MAX_EDGE_PX,
  SEEK_TIMEOUT_MS,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_S,
  VIDEO_MIN_DURATION_S,
} from "./constants";
import {
  seekTimeoutError,
  videoTooLargeError,
  videoTooLongError,
  videoTooShortError,
  videoUnsupportedError,
} from "./errors";

export interface SampledFrame {
  canvas: HTMLCanvasElement;
  /** Timestamp in seconds. */
  t: number;
}

export interface SampleVideoFramesResult {
  frames: SampledFrame[];
  duration: number;
  width: number;
  height: number;
  timings: {
    metadataMs: number;
    totalMs: number;
    slowestSeekMs: number;
  };
}

export interface SampleVideoFramesOptions {
  /** Override max edge for frame canvases (default FRAME_MAX_EDGE_PX). */
  maxEdgePx?: number;
  /** Override seek timeout ms. */
  seekTimeoutMs?: number;
}

function frameCountForDuration(durationS: number): number {
  return Math.min(
    FRAME_COUNT_MAX,
    Math.max(FRAME_COUNT_MIN, Math.ceil(durationS / 2))
  );
}

/** Evenly spaced midpoint timestamps across the duration. */
export function sampleTimestamps(
  durationS: number,
  count: number
): number[] {
  if (count <= 0 || durationS <= 0) return [];
  const interval = durationS / count;
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    // Midpoint of each interval; clamp just below duration for EOF safety.
    const t = Math.min((i + 0.5) * interval, Math.max(0, durationS - 0.001));
    times.push(t);
  }
  return times;
}

function scaleToMaxEdge(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function waitForEvent(
  target: EventTarget,
  event: string,
  timeoutMs: number,
  onTimeout: () => Error
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(onTimeout());
    }, timeoutMs);

    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(videoUnsupportedError());
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
    };

    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
  });
}

async function seekVideo(
  video: HTMLVideoElement,
  t: number,
  timeoutMs: number
): Promise<number> {
  const start = performance.now();
  if (Math.abs(video.currentTime - t) < 0.001) {
    return 0;
  }
  const seeked = waitForEvent(video, "seeked", timeoutMs, () =>
    seekTimeoutError()
  );
  video.currentTime = t;
  await seeked;
  return performance.now() - start;
}

function drawFrame(
  video: HTMLVideoElement,
  maxEdgePx: number
): HTMLCanvasElement {
  const { width, height } = scaleToMaxEdge(
    video.videoWidth,
    video.videoHeight,
    maxEdgePx
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw videoUnsupportedError("canvas unavailable");
  }
  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}

function releaseFrames(frames: SampledFrame[]): void {
  for (const frame of frames) {
    frame.canvas.width = 0;
    frame.canvas.height = 0;
  }
  frames.length = 0;
}

/**
 * Sample evenly spaced frames from a local video via HTMLVideoElement seek loop.
 * Frames are downscaled to FRAME_MAX_EDGE_PX for contact-sheet tiling (never sent alone).
 */
export async function sampleVideoFrames(
  file: File,
  opts: SampleVideoFramesOptions = {}
): Promise<SampleVideoFramesResult> {
  const maxEdgePx = opts.maxEdgePx ?? FRAME_MAX_EDGE_PX;
  const seekTimeoutMs = opts.seekTimeoutMs ?? SEEK_TIMEOUT_MS;
  const totalStart = performance.now();

  if (file.size > VIDEO_MAX_BYTES) {
    throw videoTooLargeError();
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("webkit-playsinline", "true");

  const frames: SampledFrame[] = [];

  try {
    const metaStart = performance.now();
    const loaded = waitForEvent(
      video,
      "loadedmetadata",
      seekTimeoutMs,
      () => videoUnsupportedError("metadata timeout")
    );
    video.src = objectUrl;
    await loaded;

    const metadataMs = performance.now() - metaStart;
    const duration = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      width <= 0 ||
      height <= 0
    ) {
      throw videoUnsupportedError("invalid metadata");
    }

    if (duration < VIDEO_MIN_DURATION_S) {
      throw videoTooShortError(duration);
    }

    if (duration > VIDEO_MAX_DURATION_S) {
      throw videoTooLongError();
    }

    // Ensure we can decode at least one frame (catches HEVC on Chrome early).
    await seekVideo(video, Math.min(0.1, duration / 2), seekTimeoutMs);

    const count = frameCountForDuration(duration);
    const times = sampleTimestamps(duration, count);
    let slowestSeekMs = 0;

    for (const t of times) {
      const seekMs = await seekVideo(video, t, seekTimeoutMs);
      slowestSeekMs = Math.max(slowestSeekMs, seekMs);
      frames.push({ canvas: drawFrame(video, maxEdgePx), t });
    }

    return {
      frames,
      duration,
      width,
      height,
      timings: {
        metadataMs,
        totalMs: performance.now() - totalStart,
        slowestSeekMs,
      },
    };
  } catch (err) {
    releaseFrames(frames);
    throw err;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
