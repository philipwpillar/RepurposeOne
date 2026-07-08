export const PHOTO_MAX_EDGE_PX = 1024;
export const PHOTO_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PHOTO_CONTEXT_MIN_LENGTH = 10;
export const PHOTO_CONTEXT_MAX_LENGTH = 2000;
export const PHOTO_CTA_MAX_LENGTH = 500;

export const PHOTO_ACCEPTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoMimeType = (typeof PHOTO_ACCEPTED_MIMES)[number];

export const PHOTO_ACCEPT_ATTRIBUTE = PHOTO_ACCEPTED_MIMES.join(",");
