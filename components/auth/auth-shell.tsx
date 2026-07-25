import Link from "next/link";
import { VoLogoMark, VoMarkDefs } from "@/components/landing/vo-logo-mark";
import "@/app/landing.css";

interface AuthShellProps {
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}

/** Shared aurora/ink chrome for sign-in, sign-up, and onboarding. */
export function AuthShell({ children, footerNote }: AuthShellProps) {
  return (
    <div className="vo-auth relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <VoMarkDefs />
      <div className="vo-auth-glow" aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aur-1,#818CF8)]"
        >
          <VoLogoMark size={28} />
          <span className="font-display text-xl font-semibold tracking-tight text-[var(--text-hi,#F4F4F5)]">
            Voiceora
          </span>
        </Link>
        {children}
        {footerNote ? (
          <p className="text-center text-xs text-[var(--text-lo,#A1A1AA)]">
            {footerNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
