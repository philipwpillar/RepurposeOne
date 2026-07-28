import type { NextConfig } from "next";
import path from "path";

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
          // voiceora.io cutover (Phase 6): include preload for HSTS.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
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

export default nextConfig;
