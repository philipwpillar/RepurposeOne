import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  // Avoid sending PII (emails, tokens) by default.
  sendDefaultPii: false,
});

// Mirrors `onRequestError` in instrumentation.ts. Required for the SDK to
// instrument client-side route transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
