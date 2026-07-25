import { test, expect } from "@playwright/test";

test.describe("landing", () => {
  test("renders the Voiceora hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every platform",
    );
    await expect(page.getByText("X / Twitter")).toBeVisible();
    await expect(page.getByText("LinkedIn").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
  });
});
