import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/history", destination: "/library", permanent: true },
      { source: "/history/:path*", destination: "/library/:path*", permanent: true },
      { source: "/upgrade", destination: "/billing", permanent: true },
      { source: "/new", destination: "/studio", permanent: true },
    ];
  },
};

export default nextConfig;
