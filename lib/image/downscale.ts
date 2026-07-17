import {
  BUNDLE_MAX_PHOTOS,
  HEIC_DECODE_ERROR,
  PHOTO_ACCEPTED_MIMES,
  PHOTO_HEIC_INPUT_MIMES,
  PHOTO_MAX_EDGE_PX,
  PHOTO_MAX_FILE_BYTES,
  type PhotoMimeType,
} from "./constants";

export interface DownscaleResult {
  base64: string;
  mimeType: PhotoMimeType;
  width: number;
  height: number;
  byteSize: number;
  previewUrl: string;
}

function isOutputMime(mime: string): mime is PhotoMimeType {
  return (PHOTO_ACCEPTED_MIMES as readonly string[]).includes(mime);
}

function isHeicInputMime(mime: string): boolean {
  return (PHOTO_HEIC_INPUT_MIMES as readonly string[]).includes(mime);
}

function looksLikeHeicFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".heic") || lower.endsWith(".heif");
}

function isAcceptedInputMime(mime: string, fileName: string): boolean {
  if (isOutputMime(mime) || isHeicInputMime(mime)) return true;
  // iOS sometimes omits a usable MIME; allow by extension for HEIC only.
  if (!mime && looksLikeHeicFilename(fileName)) return true;
  return false;
}

export function validateImageFile(
  file: File
): { ok: true } | { ok: false; error: string } {
  if (!isAcceptedInputMime(file.type, file.name)) {
    return {
      ok: false,
      error: "Please upload a JPEG, PNG, WebP, or HEIC image.",
    };
  }

  if (file.size > PHOTO_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: "Image must be 10 MB or smaller.",
    };
  }

  return { ok: true };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };

    img.src = url;
  });
}

function scaleDimensions(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: PhotoMimeType,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode image."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Failed to encode image."));
    reader.readAsDataURL(blob);
  });
}

function isHeicFile(file: File): boolean {
  return isHeicInputMime(file.type) || looksLikeHeicFilename(file.name);
}

/**
 * Downscale + normalize for upload.
 * HEIC/HEIF: native Image()/canvas decode only (Safari / iOS). No WASM decoder.
 * On decode failure for HEIC, throws HEIC_DECODE_ERROR so callers can skip that file.
 */
export async function downscaleImage(file: File): Promise<DownscaleResult> {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const heic = isHeicFile(file);
  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    if (heic) {
      throw new Error(HEIC_DECODE_ERROR);
    }
    throw new Error("Could not read this image file.");
  }

  const { width, height } = scaleDimensions(
    img.naturalWidth,
    img.naturalHeight,
    PHOTO_MAX_EDGE_PX
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to process image.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  // HEIC always re-encoded as JPEG; other types keep their mime when possible.
  const mimeType: PhotoMimeType = heic
    ? "image/jpeg"
    : isOutputMime(file.type)
      ? file.type
      : "image/jpeg";

  const quality = mimeType === "image/png" ? undefined : 0.85;
  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas, mimeType, quality ?? 0.92);
  } catch {
    if (heic) {
      throw new Error(HEIC_DECODE_ERROR);
    }
    throw new Error("Failed to process image.");
  }

  const base64 = await blobToBase64(blob);
  const previewUrl = URL.createObjectURL(blob);

  return {
    base64,
    mimeType,
    width,
    height,
    byteSize: blob.size,
    previewUrl,
  };
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { BUNDLE_MAX_PHOTOS, HEIC_DECODE_ERROR };
