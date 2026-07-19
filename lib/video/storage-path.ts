import { VIDEO_MAX_BYTES } from "@/lib/video/constants";

const VIDEO_MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function videoExtFromFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "mp4";
  const ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ext || ext.length > 8) return "mp4";
  return ext;
}

export function videoMimeFromFilename(filename: string): string {
  const ext = videoExtFromFilename(filename);
  return VIDEO_MIME_BY_EXT[ext] ?? "video/mp4";
}

export function buildSourceStoragePath(params: {
  userId: string;
  bundleId: string;
  assetId: string;
  filename: string;
}): string {
  const ext = videoExtFromFilename(params.filename);
  return `${params.userId}/${params.bundleId}/${params.assetId}.${ext}`;
}

export function parseStorageObjectPath(storagePath: string): {
  folder: string;
  filename: string;
} | null {
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const filename = parts[parts.length - 1];
  const folder = parts.slice(0, -1).join("/");
  if (!filename || !folder) return null;
  return { folder, filename };
}

/** Max bytes allowed for a source video object (matches bucket limit). */
export const BUNDLE_MEDIA_MAX_BYTES = VIDEO_MAX_BYTES;
