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
const SIDEBAR_PATHS = ["/dashboard", "/library"];

mkdirSync(OUT, { recursive: true });

async function preparePage(context, theme, sidebarCollapsed) {
  const page = await context.newPage();
  await page.addInitScript(
    ({ t, collapsed }) => {
      localStorage.setItem("vo-theme", t);
      localStorage.setItem("vo-sidebar-collapsed", collapsed ? "1" : "0");
    },
    { t: theme, collapsed: sidebarCollapsed }
  );
  return page;
}

async function shot(page, path, theme, vp, suffix = "") {
  const slug = path === "/" ? "landing" : path.replace(/^\//, "").replace(/\//g, "-");
  const file = `${OUT}/${slug}-${theme}-${vp}${suffix}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|studio|onboarding)/, { timeout: 15000 });
}

const browser = await chromium.launch();
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await preparePage(context, theme, false);

    for (const path of PUBLIC) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await shot(page, path, theme, vp.name);
    }

    if (email && password) {
      await signIn(page, email, password);

      for (const path of AUTHED) {
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        await shot(page, path, theme, vp.name, "-expanded");
      }

      await context.close();

      // Collapsed sidebar (boot script reads vo-sidebar-collapsed before paint)
      const collapsedCtx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const collapsedPage = await preparePage(collapsedCtx, theme, true);
      await signIn(collapsedPage, email, password);
      for (const path of SIDEBAR_PATHS) {
        await collapsedPage.goto(`${BASE}${path}`, {
          waitUntil: "networkidle",
        });
        await shot(collapsedPage, path, theme, vp.name, "-collapsed");
      }
      await collapsedCtx.close();
    } else {
      console.warn(
        "Skipping authed routes — set E2E_USER_EMAIL / E2E_USER_PASSWORD"
      );
      await context.close();
    }
  }
}

await browser.close();
console.log("done");
