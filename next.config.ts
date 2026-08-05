import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Soft start on custom domain — short max-age, no includeSubDomains/preload
          // until cutover is stable. Raise and add preload later deliberately.
          {
            key: "Strict-Transport-Security",
            value: "max-age=300",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/history", destination: "/library", permanent: true },
      { source: "/history/:path*", destination: "/library/:path*", permanent: true },
      { source: "/upgrade", destination: "/account", permanent: true },
      { source: "/billing", destination: "/account", permanent: true },
      {
        source: "/settings/account",
        destination: "/account#danger",
        permanent: true,
      },
      { source: "/new", destination: "/studio", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Source-map upload only when auth token is present (local/CI without Sentry stays green).
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});
