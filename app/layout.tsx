import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepurposeOne",
  description: "AI-powered content repurposing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
