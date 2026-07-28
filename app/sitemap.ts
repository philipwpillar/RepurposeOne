import type { MetadataRoute } from "next";

const base = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://voiceora.io"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/privacy", "/terms", "/sign-in", "/sign-up"];
  return routes.map((route) => ({
    url: `${base}${route || "/"}`,
    lastModified: new Date(),
  }));
}
