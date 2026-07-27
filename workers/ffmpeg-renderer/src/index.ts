import { claimNextClip, processClaimedClip } from "./clip-jobs";
import { loadConfig } from "./config";
import { reclaimRenderingAfterMs, runLifecycleSweep } from "./lifecycle";
import { renderClip } from "./render";
import { createHealthServer } from "./server";
import { createServiceClient } from "./supabase";
import type { HealthSnapshot } from "./types";

async function main(): Promise<void> {
  const config = loadConfig();
  const supabase = createServiceClient(config);
  const startedAt = Date.now();

  // Run often enough to reclaim stuck renders soon after the 3× timeout margin.
  const lifecycleIntervalMs = Math.min(
    reclaimRenderingAfterMs(config.renderTimeoutMs) / 3,
    10 * 60 * 1000
  );

  let lastPollAt: string | null = null;
  let clipsRendered = 0;
  let lastError: string | null = null;
  let pollInFlight = false;
  let shuttingDown = false;
  let currentRender: Promise<void> | null = null;

  const getHealth = (): HealthSnapshot => ({
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    lastPollAt,
    clipsRendered,
    lastError,
  });

  async function pollOnce(): Promise<void> {
    if (pollInFlight || shuttingDown) return;
    pollInFlight = true;
    lastPollAt = new Date().toISOString();

    try {
      const claimed = await claimNextClip(supabase);
      if (!claimed) return;

      const renderPromise = processClaimedClip({
        supabase,
        config,
        clip: claimed,
        renderClip,
      }).then((success) => {
        if (success) clipsRendered += 1;
      });

      currentRender = renderPromise.then(() => undefined);
      await currentRender;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Poll cycle failed";
      console.error(`[poll] ${lastError}`);
    } finally {
      currentRender = null;
      pollInFlight = false;
    }
  }

  function requestPoll(): void {
    void pollOnce();
  }

  createHealthServer({
    port: config.port,
    getHealth,
    onWake: requestPoll,
    wakeSecret: config.workerWakeSecret,
  });

  const pollTimer = setInterval(() => {
    void pollOnce();
  }, config.pollIntervalMs);

  const lifecycleTimer = setInterval(() => {
    runLifecycleSweep(supabase, config).catch((err) => {
      const message = err instanceof Error ? err.message : "Lifecycle sweep failed";
      lastError = message;
      console.error(`[lifecycle] ${message}`);
    });
  }, lifecycleIntervalMs);

  runLifecycleSweep(supabase, config).catch((err) => {
    console.error(
      `[lifecycle] initial sweep failed: ${err instanceof Error ? err.message : err}`
    );
  });

  console.info(
    `[worker] started poll=${config.pollIntervalMs}ms renderTimeout=${config.renderTimeoutMs}ms lifecycle=${Math.round(lifecycleIntervalMs)}ms reclaimAfter=${reclaimRenderingAfterMs(config.renderTimeoutMs)}ms`
  );

  await pollOnce();

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`[worker] ${signal} received — finishing current render`);

    clearInterval(pollTimer);
    clearInterval(lifecycleTimer);

    if (currentRender) {
      await currentRender.catch(() => undefined);
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
