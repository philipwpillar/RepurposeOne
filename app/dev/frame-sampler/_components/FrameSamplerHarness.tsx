"use client";

import { useState } from "react";
import { buildContactSheets, type ContactSheet } from "@/lib/video/contact-sheets";
import { VideoSampleError } from "@/lib/video/errors";
import {
  sampleVideoFrames,
  type SampleVideoFramesResult,
} from "@/lib/video/frame-sampler";

function formatSeconds(t: number): string {
  return `${t.toFixed(2)}s`;
}

function approxBase64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil((b64.length * 3) / 4);
}

export default function FrameSamplerHarness() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [result, setResult] = useState<SampleVideoFramesResult | null>(null);
  const [sheets, setSheets] = useState<ContactSheet[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const run = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setErrorCode(null);
    setResult(null);
    setSheets([]);
    setFileName(file.name);

    try {
      const sampled = await sampleVideoFrames(file);
      const contactSheets = buildContactSheets(sampled.frames);
      // Release frame canvases after tiling - harness only needs sheets.
      for (const frame of sampled.frames) {
        frame.canvas.width = 0;
        frame.canvas.height = 0;
      }
      setResult(sampled);
      setSheets(contactSheets);
    } catch (err) {
      if (err instanceof VideoSampleError) {
        setErrorCode(err.code);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setBusy(false);
    }
  };

  const payloadBytes = sheets.reduce(
    (sum, s) => sum + approxBase64Bytes(s.dataUrl),
    0
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Frame sampler harness</h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>
        Dev-only. Flag: NEXT_PUBLIC_VIDEO_BUNDLES_DEV=true. Desktop: use H.264
        MP4 (HEVC often fails in Chrome/Firefox - expected). HEVC belongs on
        iOS shell QA.
      </p>

      <input
        type="file"
        accept="video/*,.mp4,.mov,.m4v"
        disabled={busy}
        onChange={(e) => {
          void run(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {busy && <p style={{ marginTop: 16 }}>Sampling…</p>}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #c00",
            background: "#fff5f5",
            color: "#900",
            fontSize: 14,
          }}
        >
          {errorCode && <strong>[{errorCode}] </strong>}
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.5 }}>
          <div>
            <strong>File:</strong> {fileName}
          </div>
          <div>
            <strong>Duration:</strong> {formatSeconds(result.duration)} ·{" "}
            <strong>Source:</strong> {result.width}×{result.height} ·{" "}
            <strong>Frames:</strong> {result.frames.length} ·{" "}
            <strong>Sheets:</strong> {sheets.length}
          </div>
          <div>
            <strong>Timings:</strong> metadata{" "}
            {result.timings.metadataMs.toFixed(0)}ms · total{" "}
            {result.timings.totalMs.toFixed(0)}ms · slowest seek{" "}
            {result.timings.slowestSeekMs.toFixed(0)}ms
          </div>
          <div>
            <strong>Payload (approx):</strong>{" "}
            {(payloadBytes / 1024).toFixed(1)} KB across sheets
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
        {sheets.map((sheet, i) => (
          <div key={i}>
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>
              Sheet {i + 1} · {sheet.timestamps.length} frame
              {sheet.timestamps.length === 1 ? "" : "s"}
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sheet.dataUrl}
              alt={`Contact sheet ${i + 1}`}
              style={{
                maxWidth: "100%",
                border: "1px solid #ccc",
                background: "#000",
              }}
            />
            <p style={{ fontSize: 12, color: "#444", marginTop: 8 }}>
              timestamps:{" "}
              {sheet.timestamps.map((t) => formatSeconds(t)).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
