import type { Metadata } from "next";
import { BrandLockup } from "@/components/landing/vo-logo-mark";
import "@/app/landing.css";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function HoldingPage() {
  return (
    <main className="chrome-dark vo-auth relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="vo-auth-glow" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <BrandLockup size={32} wordmarkClassName="text-2xl" />
        <p className="text-base text-muted-foreground">
          Voiceora is coming soon
        </p>
        <a
          href="mailto:support@voiceora.io"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          support@voiceora.io
        </a>
      </div>
    </main>
  );
}
