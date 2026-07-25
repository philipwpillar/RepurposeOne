import { test, expect } from "@playwright/test";

test.describe("signed out", () => {
  test("protected routes redirect to sign-in", async ({ page }) => {
    for (const route of ["/studio", "/library", "/account", "/bundles"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });

  test("sign-up form renders its fields", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
  });
});
