import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RepurposeOne",
    template: "%s | RepurposeOne",
  },
  description:
    "Turn one piece of content into platform-native outputs in your brand voice — X threads, LinkedIn, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
