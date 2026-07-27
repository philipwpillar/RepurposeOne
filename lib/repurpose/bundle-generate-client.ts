import type {
  BundleGenerateErrorResponse,
  BundleGenerateSuccessResponse,
  BundlePack,
  BundlePrepareErrorResponse,
  BundlePrepareSuccessResponse,
  BundleRepurposeResult,
  BundleStatusResponse,
  BundleVideoInput,
  TargetFormat,
  UsageInfo,
} from "@/types";
import { BundleStatusResponseSchema } from "@/types";

export class BundleGenerateApiError extends Error {
  usage?: UsageInfo;
  code?: BundleGenerateErrorResponse["code"] | BundlePrepareErrorResponse["code"];

  constructor(
    message: string,
    opts?: {
      usage?: UsageInfo;
      code?: BundleGenerateErrorResponse["code"] | BundlePrepareErrorResponse["code"];
    }
  ) {
    super(message);
    this.name = "BundleGenerateApiError";
    this.usage = opts?.usage;
    this.code = opts?.code;
  }
}

export class BundleUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleUploadError";
  }
}

async function parseErrorResponse(
  response: Response,
  fallback: string
): Promise<{
  message: string;
  usage?: UsageInfo;
  code?: BundleGenerateErrorResponse["code"] | BundlePrepareErrorResponse["code"];
}> {
  const text = await response.text();
  let message = fallback;
  let usage: UsageInfo | undefined;
  let code:
    | BundleGenerateErrorResponse["code"]
    | BundlePrepareErrorResponse["code"]
    | undefined;
  try {
    const errorData = JSON.parse(text) as BundleGenerateErrorResponse;
    if (errorData.error) message = errorData.error;
    usage = errorData.usage;
    code = errorData.code;
  } catch {
    if (text) message = text;
  }
  return { message, usage, code };
}

export async function callBundlePrepareApi(params: {
  videos: Array<{ filename: string; size_bytes: number; duration_s: number }>;
}): Promise<BundlePrepareSuccessResponse> {
  const response = await fetch("/api/bundles/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videos: params.videos }),
  });

  if (!response.ok) {
    const { message, usage, code } = await parseErrorResponse(
      response,
      "Failed to prepare video uploads"
    );
    throw new BundleGenerateApiError(message, { usage, code });
  }

  const data = (await response.json()) as BundlePrepareSuccessResponse;
  if (!data.bundle_id || !data.uploads?.length) {
    throw new Error("Unexpected response from bundle prepare API");
  }
  return data;
}

/**
 * PUT a file to a Supabase signed upload URL with progress via XHR.
 * Uses the token query form returned by createSignedUploadUrl.
 */
export function uploadToSignedUrl(params: {
  file: File;
  signedUrl: string;
  token: string;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  const { file, signedUrl, onProgress } = params;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(pct);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      const body = (xhr.responseText || "").trim();
      console.error("Signed upload failed", {
        status: xhr.status,
        body: body || null,
      });
      reject(
        new BundleUploadError(
          body
            ? `Upload failed (${xhr.status}): ${body}`
            : `Upload failed (${xhr.status}).`
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new BundleUploadError(
          "Upload failed. Check your connection and try again."
        )
      );
    };

    xhr.onabort = () => {
      reject(new BundleUploadError("Upload was cancelled."));
    };

    xhr.send(file);
  });
}

export async function callBundleGenerateApi(params: {
  photos: Array<{ data: string; filename?: string }>;
  videos?: BundleVideoInput[];
  context: string;
  title?: string;
  formats?: TargetFormat[];
  bundleId?: string;
}): Promise<{
  bundleId: string;
  pack: BundlePack;
  repurposes: BundleRepurposeResult[];
  usage: UsageInfo;
}> {
  const body: Record<string, unknown> = {
    context: params.context,
    photos: params.photos,
  };

  if (params.videos?.length) {
    body.videos = params.videos;
  }

  if (params.title) {
    body.title = params.title;
  }

  if (params.formats?.length) {
    body.formats = params.formats;
  }

  if (params.bundleId) {
    body.bundle_id = params.bundleId;
  }

  const response = await fetch("/api/bundles/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const { message, usage, code } = await parseErrorResponse(
      response,
      "Failed to generate Moment Bundle"
    );
    throw new BundleGenerateApiError(message, { usage, code });
  }

  const data = (await response.json()) as BundleGenerateSuccessResponse;
  if (!data.bundle_id || !data.pack) {
    throw new Error("Unexpected response from bundle generation API");
  }

  return {
    bundleId: data.bundle_id,
    pack: data.pack,
    repurposes: data.repurposes,
    usage: data.usage,
  };
}

/**
 * Poll clip render status + signed download URLs for a bundle (Brief 3c).
 */
export async function fetchBundleStatus(
  bundleId: string
): Promise<BundleStatusResponse> {
  const response = await fetch(`/api/bundles/${bundleId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const { message, usage, code } = await parseErrorResponse(
      response,
      "Failed to load clip status"
    );
    throw new BundleGenerateApiError(message, { usage, code });
  }

  const data: unknown = await response.json();
  const parsed = BundleStatusResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Unexpected response from bundle status API");
  }
  return parsed.data;
}

/**
 * Video path: prepare → parallel signed PUTs → generate with bundle_id + asset_ids.
 * Photo-only callers should use callBundleGenerateApi directly (no prepare).
 */
export async function prepareUploadAndGenerate(params: {
  photos: Array<{ data: string; filename?: string }>;
  videos: Array<{
    file: File;
    payload: BundleVideoInput;
  }>;
  context: string;
  title?: string;
  formats?: TargetFormat[];
  onUploadProgress?: (label: string) => void;
}): Promise<{
  bundleId: string;
  pack: BundlePack;
  repurposes: BundleRepurposeResult[];
  usage: UsageInfo;
}> {
  const prepared = await callBundlePrepareApi({
    videos: params.videos.map((v) => ({
      filename: v.file.name,
      size_bytes: v.file.size,
      duration_s: v.payload.duration_s,
    })),
  });

  if (prepared.uploads.length !== params.videos.length) {
    throw new BundleUploadError(
      "Prepare returned an unexpected number of upload slots."
    );
  }

  const progressByIndex = new Array(params.videos.length).fill(0);

  const report = () => {
    if (!params.onUploadProgress) return;
    const parts = progressByIndex.map(
      (pct, i) => `Uploading video ${i + 1} — ${pct}%`
    );
    params.onUploadProgress(parts.join(" · "));
  };

  await Promise.all(
    prepared.uploads.map((upload, index) =>
      uploadToSignedUrl({
        file: params.videos[index].file,
        signedUrl: upload.signed_url,
        token: upload.token,
        onProgress: (pct) => {
          progressByIndex[index] = pct;
          report();
        },
      })
    )
  );

  params.onUploadProgress?.("Generating your pack…");

  const videosWithAssets: BundleVideoInput[] = params.videos.map((v, i) => ({
    ...v.payload,
    asset_id: prepared.uploads[i].asset_id,
  }));

  return callBundleGenerateApi({
    photos: params.photos,
    videos: videosWithAssets,
    context: params.context,
    title: params.title,
    formats: params.formats,
    bundleId: prepared.bundle_id,
  });
}
