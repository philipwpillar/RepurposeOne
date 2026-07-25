import { test, expect } from "@playwright/test";

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
});
