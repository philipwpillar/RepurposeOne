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
    const body = route.request().postDataJSON() as { target_format?: string };
    const format = body?.target_format ?? "x_thread";

    const outputs: Record<string, unknown> = {
      x_thread: {
        format: "x_thread",
        tweets: [
          { number: 1, text: "E2E tweet one." },
          { number: 2, text: "E2E tweet two." },
          { number: 3, text: "E2E tweet three." },
        ],
      },
      linkedin: {
        format: "linkedin",
        post: "E2E LinkedIn post body.",
        carousel_slides: [
          { number: 1, title: "E2E slide one" },
          { number: 2, title: "E2E slide two" },
          { number: 3, title: "E2E slide three" },
        ],
      },
      instagram: {
        format: "instagram",
        caption: "E2E Instagram caption.",
        hook_variations: ["E2E hook one", "E2E hook two"],
        hashtags: ["#e2e"],
      },
      email: {
        format: "email",
        subject_line: "E2E subject line",
        body: "E2E newsletter body.",
      },
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        repurpose_id: `00000000-0000-4000-8000-00000000000${["x_thread", "linkedin", "instagram", "email"].indexOf(format) + 1}`,
        status: "complete",
        output: outputs[format] ?? outputs.x_thread,
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

  // All four formats succeed (desktop expands every card).
  for (const f of ["x_thread", "linkedin", "instagram", "email"]) {
    await expect(page.locator(`article[data-format="${f}"]`)).toContainText(
      "E2E",
      { timeout: 20_000 },
    );
  }

  // Export is enabled once there is output.
  await expect(page.getByRole("button", { name: /Export Bundle/ })).toBeEnabled();

  // Library loads and its search control is present.
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByLabel("Search source content")).toBeVisible();
});
