import { test, expect } from "@playwright/test";

test.describe("landing", () => {
  test("renders the Voiceora hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Voiceora/i).first()).toBeVisible();
  });
});
