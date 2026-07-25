import { test, expect } from "@playwright/test";

// Phase 8: un-skip, generate Linux baselines, and make CI execute this file.
// Visual regression is deferred — Phases 1–7 change pixels by design.
test.describe.skip("visual baselines", () => {
  test("landing desktop screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("landing-1440.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
