import { test, expect } from "@playwright/test";

const USAGE = {
  plan: "creator",
  used: 1,
  limit: 200,
  period_start: "2026-07-01T00:00:00.000Z",
  period_end: "2026-08-01T00:00:00.000Z",
};

test("generates a thread from pasted source and reaches the Library", async ({
  page,
}) => {
  // Stub every generate call — deterministic, and zero AI spend in CI.
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        repurpose_id: "00000000-0000-4000-8000-000000000001",
        status: "complete",
        output: {
          format: "x_thread",
          tweets: [
            { number: 1, text: "E2E tweet one." },
            { number: 2, text: "E2E tweet two." },
            { number: 3, text: "E2E tweet three." },
          ],
        },
        usage: USAGE,
        model: "e2e-stub",
        source_hash: "e2ehash",
      }),
    });
  });

  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: "Content Studio" }),
  ).toBeVisible();

  // All four format cards render.
  for (const f of ["x_thread", "linkedin", "instagram", "email"]) {
    await expect(page.locator(`article[data-format="${f}"]`)).toBeVisible();
  }

  // Open the source modal, paste, and trigger the run.
  await page.getByRole("button", { name: "Change" }).click();
  await page.locator("textarea").fill("E2E source content. ".repeat(20));
  await page.getByRole("button", { name: /Update & Regenerate All/ }).click();

  // Progressive reveal: the X card reaches a ready state.
  await expect(
    page.locator('article[data-format="x_thread"]').getByText("E2E tweet one."),
  ).toBeVisible({ timeout: 15_000 });

  // Export is enabled once there is output.
  await expect(page.getByRole("button", { name: /Export Bundle/ })).toBeEnabled();

  // Library loads and its search control is present.
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByLabel("Search source content")).toBeVisible();
});
