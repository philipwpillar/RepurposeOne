/**
 * Throwaway screenshot capture for Phase review.
 * Usage: node e2e/capture.mjs
 * Requires a running app (default http://127.0.0.1:3000) and optional
 * E2E_USER_EMAIL / E2E_USER_PASSWORD for authenticated routes.
 * Writes PNGs under e2e/captures/ (gitignored).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = resolve("e2e/captures");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];
const THEMES = ["light", "dark"];
const PUBLIC = ["/", "/sign-in"];
const AUTHED = [
  "/onboarding",
  "/dashboard",
  "/studio",
  "/library",
  "/account",
];

mkdirSync(OUT, { recursive: true });

async function setTheme(page, theme) {
  await page.addInitScript((t) => {
    localStorage.setItem("vo-theme", t);
  }, theme);
}

async function shot(page, path, theme, vp) {
  const slug = path === "/" ? "landing" : path.replace(/^\//, "").replace(/\//g, "-");
  const file = `${OUT}/${slug}-${theme}-${vp}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

const browser = await chromium.launch();
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await setTheme(page, theme);

    for (const path of PUBLIC) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await shot(page, path, theme, vp.name);
    }

    if (email && password) {
      await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(dashboard|studio|onboarding)/, {
        timeout: 15000,
      });

      for (const path of AUTHED) {
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        await shot(page, path, theme, vp.name);
      }
    } else {
      console.warn("Skipping authed routes — set E2E_USER_EMAIL / E2E_USER_PASSWORD");
    }

    await context.close();
  }
}

await browser.close();
console.log("done");
