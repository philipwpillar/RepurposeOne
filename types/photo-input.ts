import type { PhotoMimeType } from "@/lib/image/constants";

export type InputMode = "paste" | "photo";

export interface PhotoInputState {
  imageBase64: string | null;
  mimeType: PhotoMimeType | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  previewUrl: string | null;
}

export interface PhotoContextState {
  context: string;
  cta: string;
}

export interface PhotoInputReady {
  imageBase64: string;
  mimeType: PhotoMimeType;
  context: string;
  cta?: string;
}

export const EMPTY_PHOTO_INPUT_STATE: PhotoInputState = {
  imageBase64: null,
  mimeType: null,
  fileName: null,
  width: null,
  height: null,
  byteSize: null,
  previewUrl: null,
};
