import { test, expect } from "@playwright/test";

/**
 * Visual regression — Phase 8.
 * Baselines and CI must use the same Playwright Docker image
 * (mcr.microsoft.com/playwright:v1.62.0-noble) so font rasterisation matches.
 * Do not run against a bare ubuntu-latest Chromium install.
 */
test.describe("visual baselines", () => {
  test("landing desktop screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("landing-1440.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("landing mobile screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("landing-390.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("sign-in screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sign-in");
    await expect(page).toHaveScreenshot("sign-in-1440.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("privacy screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/privacy");
    await expect(page).toHaveScreenshot("privacy-1440.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
