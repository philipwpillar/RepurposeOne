/**
 * Node ESM resolve hook: map `@/*` to the repo root (matches tsconfig paths).
 * Used by scripts/voice-eval.mjs via --import.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const rel = specifier.slice(2);
  const base = path.join(root, rel);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return pathToFileURL(`${base}.ts`).href;
}

export async function resolve(specifier, context, nextResolve) {
  const mapped = resolveAlias(specifier);
  if (mapped) {
    return nextResolve(mapped, context);
  }
  return nextResolve(specifier, context);
}
