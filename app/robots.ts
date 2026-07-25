import type { MetadataRoute } from "next";

const base =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://repurpose-one-seven.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/studio",
          "/library",
          "/bundles",
          "/account",
          "/brand-voice",
          "/onboarding",
          "/dev/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
