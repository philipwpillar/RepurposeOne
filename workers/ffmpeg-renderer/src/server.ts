import { timingSafeEqual } from "node:crypto";
import http from "node:http";
import type { HealthSnapshot } from "./types";

function authorizeWakeSecret(
  provided: string | string[] | undefined,
  expectedSecret: string
): boolean {
  if (typeof provided !== "string" || !expectedSecret) return false;
  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function createHealthServer(params: {
  port: number;
  getHealth: () => HealthSnapshot;
  onWake: () => void;
  wakeSecret: string;
}): http.Server {
  const { port, getHealth, onWake, wakeSecret } = params;

  const server = http.createServer((req, res) => {
    const url = req.url?.split("?")[0] ?? "";

    if (req.method === "GET" && url === "/health") {
      const health = getHealth();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          uptimeSeconds: health.uptimeSeconds,
          lastPollAt: health.lastPollAt,
          clipsRendered: health.clipsRendered,
          lastError: health.lastError,
        })
      );
      return;
    }

    if (req.method === "POST" && url === "/wake") {
      if (!authorizeWakeSecret(req.headers["x-wake-secret"], wakeSecret)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      onWake();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Wake accepted" }));
      return;
    }

    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  });

  server.listen(port, () => {
    console.info(`[server] listening on :${port}`);
  });

  return server;
}
