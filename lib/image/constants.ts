export const PHOTO_MAX_EDGE_PX = 1024;
export const PHOTO_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PHOTO_CONTEXT_MIN_LENGTH = 10;
export const PHOTO_CONTEXT_MAX_LENGTH = 2000;
export const PHOTO_CTA_MAX_LENGTH = 500;

/** Output / studio-accepted mimes after processing. */
export const PHOTO_ACCEPTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoMimeType = (typeof PHOTO_ACCEPTED_MIMES)[number];

/** HEIC/HEIF input only — decoded via Image()/canvas on Safari / iOS shell. */
export const PHOTO_HEIC_INPUT_MIMES = [
  "image/heic",
  "image/heif",
] as const;

export type PhotoHeicInputMime = (typeof PHOTO_HEIC_INPUT_MIMES)[number];

/** Studio + Bundles file picker accept (HEIC decoded client-side where possible). */
export const PHOTO_ACCEPT_ATTRIBUTE = [
  ...PHOTO_ACCEPTED_MIMES,
  ...PHOTO_HEIC_INPUT_MIMES,
  ".heic",
  ".heif",
].join(",");

/** @deprecated Prefer PHOTO_ACCEPT_ATTRIBUTE — same value for Studio/Bundles parity. */
export const BUNDLE_PHOTO_ACCEPT_ATTRIBUTE = PHOTO_ACCEPT_ATTRIBUTE;

export const HEIC_DECODE_ERROR =
  "This photo format couldn't be read by your browser — export it as JPG and try again";

export const BUNDLE_MAX_PHOTOS = 8;
