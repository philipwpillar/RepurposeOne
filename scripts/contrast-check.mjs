#!/usr/bin/env node
/**
 * WCAG contrast gate for Voiceora design tokens.
 * Parses :root and .dark from app/globals.css, resolves var() chains,
 * composites rgba() over the pair backdrop, exits 1 if any pair fails.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS_PATH = resolve("app/globals.css");

/** @typedef {{ r: number, g: number, b: number, a: number }} RGBA */

function parseBlock(css, selector) {
  const re = new RegExp(
    `${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`,
    "m"
  );
  const m = css.match(re);
  if (!m) return {};
  /** @type {Record<string, string>} */
  const vars = {};
  for (const line of m[1].split(";")) {
    const match = line.match(/--([\w-]+)\s*:\s*([^;]+)/);
    if (match) vars[`--${match[1]}`] = match[2].trim();
  }
  return vars;
}

/** @param {string} value @param {Record<string, string>} map @param {number} depth */
function resolveValue(value, map, depth = 0) {
  if (depth > 12) return value;
  const trimmed = value.trim();
  const varMatch = trimmed.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);
  if (varMatch) {
    const key = varMatch[1];
    if (map[key] != null) return resolveValue(map[key], map, depth + 1);
    if (varMatch[2]) return resolveValue(varMatch[2], map, depth + 1);
  }
  return trimmed;
}

/** @param {string} hex @returns {RGBA} */
function hexToRgba(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 1,
  };
}

/** @param {string} value @returns {RGBA | null} */
function parseColor(value) {
  const v = value.trim();
  if (v.startsWith("#")) return hexToRgba(v);
  const rgba = v.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] != null ? Number(rgba[4]) : 1,
    };
  }
  return null;
}

/** @param {RGBA} fg @param {RGBA} bg @returns {RGBA} */
function composite(fg, bg) {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a: 1,
  };
}

/** @param {number} c */
function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** @param {RGBA} c */
function luminance(c) {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** @param {RGBA} a @param {RGBA} b */
function contrastRatio(a, b) {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * @param {Record<string, string>} map
 * @param {string} name
 * @param {RGBA} backdrop
 */
function resolveColor(map, name, backdrop) {
  const raw = resolveValue(map[name] ?? "", map);
  const parsed = parseColor(raw);
  if (!parsed) throw new Error(`Cannot parse ${name}: ${raw}`);
  return parsed.a < 1 ? composite(parsed, backdrop) : { ...parsed, a: 1 };
}

const PAIRS = [
  { fg: "--foreground", bg: "--surface-0", min: 4.5 },
  { fg: "--foreground", bg: "--surface-1", min: 4.5 },
  { fg: "--muted-foreground", bg: "--surface-0", min: 4.5 },
  { fg: "--muted-foreground", bg: "--surface-1", min: 4.5 },
  { fg: "--primary-foreground", bg: "--primary", min: 4.5 },
  { fg: "--destructive", bg: "--surface-1", min: 4.5 },
  // Decorative hairline only — deliberately below the 3:1 UI-component threshold.
  // Form field boundaries are gated separately via --input on --surface-1.
  { fg: "--border", bg: "--surface-0", min: 1.1 },
  { fg: "--input", bg: "--surface-1", min: 3.0 },
  { fg: "--ring", bg: "--surface-0", min: 3.0 },
  // Landing format cards use --panel; Studio glyphs use --surface-1 (bg-card).
  // --platform-x has no surface-1 pair — Studio uses text-foreground for the X mark.
  { fg: "--platform-x", bg: "--panel", min: 3.0 },
  { fg: "--platform-linkedin", bg: "--panel", min: 3.0 },
  { fg: "--platform-instagram", bg: "--panel", min: 3.0 },
  { fg: "--platform-email", bg: "--panel", min: 3.0 },
  { fg: "--platform-linkedin", bg: "--surface-1", min: 3.0 },
  { fg: "--platform-instagram", bg: "--surface-1", min: 3.0 },
  { fg: "--platform-email", bg: "--surface-1", min: 3.0 },
];

function checkTheme(label, map) {
  const surface0 = resolveColor(map, "--surface-0", { r: 0, g: 0, b: 0, a: 1 });
  let fail = 0;
  console.log(`── ${label} ──`);
  for (const pair of PAIRS) {
    const bg = resolveColor(map, pair.bg, surface0);
    const fg = resolveColor(map, pair.fg, bg);
    const ratio = contrastRatio(fg, bg);
    const ok = ratio >= pair.min;
    const mark = ok ? "PASS" : "FAIL";
    console.log(
      `  ${mark}  ${pair.fg} on ${pair.bg}  ${ratio.toFixed(2)} (min ${pair.min})`
    );
    if (!ok) fail += 1;
  }
  return fail;
}

const css = readFileSync(CSS_PATH, "utf8");
const root = parseBlock(css, ":root");
const darkVars = parseBlock(css, ".dark");
// .dark inherits unresolved brand vars from :root
const dark = { ...root, ...darkVars };

let failures = 0;
failures += checkTheme("LIGHT (:root)", root);
failures += checkTheme("DARK (.dark)", dark);

console.log();
if (failures === 0) {
  console.log("RESULT: PASS");
  process.exit(0);
}
console.log(`RESULT: FAIL (${failures} pair(s))`);
process.exit(1);
