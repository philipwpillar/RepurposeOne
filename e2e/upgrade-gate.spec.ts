import { test, expect } from "@playwright/test";

test("at-limit generation surfaces the upgrade prompt", async ({ page }) => {
  await page.route("**/api/generate**", async (route) => {
    await route.fulfill({
      status: 402,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Monthly generation limit reached",
        code: "limit_exceeded",
        usage: {
          plan: "free",
          used: 20,
          limit: 20,
          period_start: "2026-07-01T00:00:00.000Z",
          period_end: "2026-08-01T00:00:00.000Z",
        },
      }),
    });
  });

  await page.goto("/studio");
  await page.getByRole("button", { name: "Change" }).click();
  await page.locator("textarea").fill("E2E source content. ".repeat(20));
  await page.getByRole("button", { name: /Update & Regenerate All/ }).click();

  await expect(page.getByText("Monthly generation limit reached")).toBeVisible({
    timeout: 15_000,
  });
});
