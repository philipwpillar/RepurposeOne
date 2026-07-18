import {
  FRAME_MAX_EDGE_PX,
  SHEET_CELLS,
  SHEET_COLS,
  SHEET_JPEG_QUALITY,
  SHEET_MAX,
  SHEET_ROWS,
} from "./constants";
import { sheetOverflowError } from "./errors";
import type { SampledFrame } from "./frame-sampler";

export interface ContactSheet {
  /** JPEG data URL (q0.7). */
  dataUrl: string;
  /**
   * Timestamps (seconds) for real frames on this sheet only — length 1–9.
   * Never padded for empty black tiles (spike finding #7).
   */
  timestamps: number[];
}

export interface BuildContactSheetsOptions {
  tileSizePx?: number;
  jpegQuality?: number;
}

/**
 * Pack sampled frames into ≤4 contact sheets (3×3 grids).
 * Empty remainder cells are filled black; timestamps omit those cells.
 */
export function buildContactSheets(
  frames: SampledFrame[],
  opts: BuildContactSheetsOptions = {}
): ContactSheet[] {
  if (frames.length === 0) {
    return [];
  }

  const tileSize = opts.tileSizePx ?? FRAME_MAX_EDGE_PX;
  const quality = opts.jpegQuality ?? SHEET_JPEG_QUALITY;
  const sheetCount = Math.ceil(frames.length / SHEET_CELLS);

  if (sheetCount > SHEET_MAX) {
    throw sheetOverflowError(frames.length);
  }

  const sheets: ContactSheet[] = [];

  for (let s = 0; s < sheetCount; s++) {
    const start = s * SHEET_CELLS;
    const chunk = frames.slice(start, start + SHEET_CELLS);
    const canvas = document.createElement("canvas");
    canvas.width = SHEET_COLS * tileSize;
    canvas.height = SHEET_ROWS * tileSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const timestamps: number[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const col = i % SHEET_COLS;
      const row = Math.floor(i / SHEET_COLS);
      const x = col * tileSize;
      const y = row * tileSize;
      const { canvas: frameCanvas, t } = chunk[i];

      // Center the (possibly non-square) frame in the tile.
      const scale = Math.min(
        tileSize / frameCanvas.width,
        tileSize / frameCanvas.height
      );
      const dw = Math.round(frameCanvas.width * scale);
      const dh = Math.round(frameCanvas.height * scale);
      const dx = x + Math.floor((tileSize - dw) / 2);
      const dy = y + Math.floor((tileSize - dh) / 2);
      ctx.drawImage(frameCanvas, dx, dy, dw, dh);
      timestamps.push(t);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    sheets.push({ dataUrl, timestamps });
  }

  return sheets;
}
