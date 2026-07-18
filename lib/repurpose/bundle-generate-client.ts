import type {
  BundleGenerateErrorResponse,
  BundleGenerateSuccessResponse,
  BundlePack,
  BundleRepurposeResult,
  BundleVideoInput,
  TargetFormat,
  UsageInfo,
} from "@/types";

export class BundleGenerateApiError extends Error {
  usage?: UsageInfo;
  code?: BundleGenerateErrorResponse["code"];

  constructor(
    message: string,
    opts?: { usage?: UsageInfo; code?: BundleGenerateErrorResponse["code"] }
  ) {
    super(message);
    this.name = "BundleGenerateApiError";
    this.usage = opts?.usage;
    this.code = opts?.code;
  }
}

export async function callBundleGenerateApi(params: {
  photos: Array<{ data: string; filename?: string }>;
  videos?: BundleVideoInput[];
  context: string;
  title?: string;
  formats?: TargetFormat[];
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

  const response = await fetch("/api/bundles/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    let message = "Failed to generate Moment Bundle";
    let usage: UsageInfo | undefined;
    let code: BundleGenerateErrorResponse["code"] | undefined;
    try {
      const errorData = JSON.parse(text) as BundleGenerateErrorResponse;
      if (errorData.error) {
        message = errorData.error;
      }
      usage = errorData.usage;
      code = errorData.code;
    } catch {
      if (text) {
        message = text;
      }
    }
    throw new BundleGenerateApiError(message, { usage, code });
  }

  const data = JSON.parse(text) as BundleGenerateSuccessResponse;
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
