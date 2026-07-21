export interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  workerWakeSecret: string;
  pollIntervalMs: number;
  renderTimeoutMs: number;
  sourceGraceHours: number;
  port: number;
  fontPath: string;
  bucket: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function loadConfig(): WorkerConfig {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    workerWakeSecret: requireEnv("WORKER_WAKE_SECRET"),
    pollIntervalMs: parseIntEnv("POLL_INTERVAL_MS", 5000),
    renderTimeoutMs: parseIntEnv("RENDER_TIMEOUT_MS", 300000),
    sourceGraceHours: parseIntEnv("SOURCE_GRACE_HOURS", 24),
    port: parseIntEnv("PORT", 8080),
    fontPath:
      process.env.FONT_PATH?.trim() ||
      `${__dirname}/../fonts/SpaceGrotesk-SemiBold.ttf`,
    bucket: "bundle-media",
  };
}
