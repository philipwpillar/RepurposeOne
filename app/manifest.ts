import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voiceora",
    short_name: "Voiceora",
    description:
      "Turn one piece of content into platform-native drafts in your brand voice.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0D14",
    theme_color: "#2DD4BF",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/brand/app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
