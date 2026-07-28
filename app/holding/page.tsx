import type { Metadata } from "next";
import { VoLogoMark, VoMarkDefs } from "@/components/landing/vo-logo-mark";
import "@/app/landing.css";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function HoldingPage() {
  return (
    <main className="chrome-dark vo-auth relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <VoMarkDefs />
      <div className="vo-auth-glow" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <div className="inline-flex items-center gap-2.5">
          <VoLogoMark size={32} />
          <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Voiceora
          </span>
        </div>
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
