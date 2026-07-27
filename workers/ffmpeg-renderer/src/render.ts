import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";
import { buildOutputStoragePath, isSafeStoragePath } from "./paths";
import {
  OVERLAY_BOX_BORDER_W,
  OVERLAY_FONT_SIZE,
  prewrapOverlayText,
} from "./text";
import type { BundleAssetRow, BundleClipRow } from "./types";

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${command} timed out after ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        const output = stderr.trim() || stdout.trim();
        reject(
          new Error(
            `${command} exited with code ${code} signal ${signal ?? "none"}: ${output}`
          )
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function probeDurationSeconds(
  inputPath: string,
  timeoutMs: number
): Promise<number> {
  const { stdout } = await runCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ],
    timeoutMs
  );
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not determine source video duration");
  }
  return duration;
}

async function removeDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

export async function renderClip(params: {
  supabase: SupabaseClient;
  config: WorkerConfig;
  clip: BundleClipRow;
  asset: BundleAssetRow;
}): Promise<string> {
  const { supabase, config, clip, asset } = params;

  if (!asset.storage_path) {
    throw new Error("Source asset has no storage_path");
  }

  if (
    !isSafeStoragePath(asset.storage_path, clip.user_id, clip.bundle_id)
  ) {
    throw new Error("Source storage path failed safety check");
  }

  const outputPath = buildOutputStoragePath({
    userId: clip.user_id,
    bundleId: clip.bundle_id,
    clipId: clip.id,
  });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "clip-render-"));
  const sourcePath = path.join(tempDir, "source");
  const overlayPath = path.join(tempDir, "overlay.txt");
  const outputFile = path.join(tempDir, "output.mp4");

  try {
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(config.bucket)
      .download(asset.storage_path);

    if (downloadError || !downloadData) {
      throw new Error(
        downloadError?.message || "Failed to download source video"
      );
    }

    const sourceBuffer = Buffer.from(await downloadData.arrayBuffer());
    await fs.writeFile(sourcePath, sourceBuffer);

    const sourceDuration = await probeDurationSeconds(
      sourcePath,
      config.renderTimeoutMs
    );

    const startS = Math.max(0, Number(clip.start_s));
    let endS = Math.min(Number(clip.end_s), sourceDuration);
    if (endS <= startS) {
      endS = sourceDuration;
    }

    const windowS = endS - startS;
    if (windowS < 5) {
      throw new Error(
        `Clip window too short after duration clamp (${windowS.toFixed(2)}s < 5s)`
      );
    }

    const overlayText = prewrapOverlayText(clip.overlay_text);
    await fs.writeFile(overlayPath, overlayText, "utf8");

    const fontfile = escapeFilterPath(config.fontPath);
    const textfile = escapeFilterPath(overlayPath);
    const hdrTonemap =
      "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p";
    const vf = [
      hdrTonemap,
      "scale=1080:1920:force_original_aspect_ratio=increase",
      "crop=1080:1920",
      `drawtext=fontfile=${fontfile}:textfile=${textfile}:fontsize=${OVERLAY_FONT_SIZE}:fontcolor=white:line_spacing=8:box=1:boxcolor=0x0A0F2E@0.65:boxborderw=${OVERLAY_BOX_BORDER_W}:x=max(0\\,(w-text_w)/2):y=h*0.72`,
    ].join(",");

    await runCommand(
      "ffmpeg",
      [
        "-y",
        "-ss",
        startS.toFixed(3),
        "-t",
        windowS.toFixed(3),
        "-i",
        sourcePath,
        "-vf",
        vf,
        "-threads",
        "1",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-x264-params",
        "threads=1:lookahead-threads=1:rc-lookahead=10",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputFile,
      ],
      config.renderTimeoutMs
    );

    const rendered = await fs.readFile(outputFile);

    const { error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(outputPath, rendered, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    return outputPath;
  } finally {
    await removeDir(tempDir);
  }
}
