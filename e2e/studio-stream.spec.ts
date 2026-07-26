import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __streamDone?: boolean;
    __lastRefinement?: string;
  }
}

test("paints a partial before done and abort restores v1 without a phantom chip", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    let streamRequestCount = 0;

    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (!url.includes("/api/generate/stream")) {
        return nativeFetch(input, init);
      }

      streamRequestCount += 1;
      const requestBody =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as { refinement?: string })
          : {};
      window.__lastRefinement = requestBody.refinement;
      window.__streamDone = false;

      const encoder = new TextEncoder();
      const frame = (value: unknown) =>
        encoder.encode(`${JSON.stringify(value)}\n`);
      const repurposeId =
        streamRequestCount === 1
          ? "00000000-0000-4000-8000-000000000001"
          : "00000000-0000-4000-8000-000000000002";
      const usage = {
        plan: "creator",
        used: streamRequestCount,
        limit: 200,
        period_start: "2026-07-01T00:00:00.000Z",
        period_end: "2026-08-01T00:00:00.000Z",
      };

      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            frame({
              type: "meta",
              repurpose_id: repurposeId,
              source_hash: "e2e-stream-hash",
              model: "e2e-stream-model",
            })
          );

          if (streamRequestCount === 1) {
            const output = {
              format: "x_thread",
              tweets: [
                { number: 1, text: "E2E tweet one." },
                { number: 2, text: "E2E tweet two." },
                { number: 3, text: "E2E tweet three." },
              ],
            };
            controller.enqueue(
              frame({ type: "partial", object: output })
            );
            controller.enqueue(
              frame({
                type: "done",
                output,
                usage,
                model: "e2e-stream-model",
                repurpose_id: repurposeId,
                source_hash: "e2e-stream-hash",
              })
            );
            window.__streamDone = true;
            controller.close();
            return;
          }

          // Deliberately never send `done`: the test must observe this partial
          // while the request remains open, then exercise the abort path.
          controller.enqueue(
            frame({
              type: "partial",
              object: {
                format: "x_thread",
                tweets: [
                  { number: 1, text: "Streaming v2 partial hook." },
                ],
              },
            })
          );

          const signal =
            init?.signal ??
            (typeof Request !== "undefined" && input instanceof Request
              ? input.signal
              : undefined);
          signal?.addEventListener(
            "abort",
            () => controller.error(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        },
      });

      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      });
    };
  });

  await page.goto("/studio?stream=1");

  // Keep the run deterministic and limited to the X card.
  for (const label of ["LinkedIn", "Instagram", "Email"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }

  await page.getByRole("button", { name: "Change" }).click();
  await page.locator("textarea").fill("E2E source content. ".repeat(20));
  await page.getByRole("button", { name: /Update & Regenerate All/ }).click();

  const card = page.locator('article[data-format="x_thread"]');
  await expect(card).toContainText("E2E tweet one.", { timeout: 15_000 });

  await card.getByRole("button", { name: "Punchier hook" }).click();
  await expect(card).toContainText("Streaming v2 partial hook.");
  await expect
    .poll(() => page.evaluate(() => window.__streamDone))
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__lastRefinement))
    .toBe("Make the opening hook punchier.");

  await card.getByRole("button", { name: "Stop" }).click();
  await expect(card).toContainText("E2E tweet one.");
  await expect(card).not.toContainText("Streaming v2 partial hook.");
  await expect(card.getByRole("button", { name: "Show version 2" })).toHaveCount(
    0
  );
});

test("returns 402 before opening an OpenRouter stream", async ({ page }) => {
  test.skip(
    process.env.PLAN_LIMIT_FREE !== "0",
    "Run with PLAN_LIMIT_FREE=0 and a free E2E user for the billing fence proof."
  );

  await page.goto("/studio?stream=1");
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/generate/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_type: "paste",
        input_content: "Billing fence proof source content. ".repeat(10),
        target_format: "x_thread",
        brand_voice: {
          samples: [],
          description: "Clear, professional, conversational.",
        },
      }),
    });
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      body: (await response.json()) as { code?: string },
    };
  });

  expect(result.status).toBe(402);
  expect(result.contentType).toContain("application/json");
  expect(result.body.code).toBe("limit_exceeded");
});
