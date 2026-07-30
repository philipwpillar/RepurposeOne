import Link from "next/link";
import { BrandLockup } from "@/components/landing/vo-logo-mark";
import { NativeOAuthListener } from "@/components/auth/native-oauth-listener";
import "@/app/landing.css";

interface AuthShellProps {
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}

/** Shared aurora/ink chrome for sign-in, sign-up, and onboarding. */
export function AuthShell({ children, footerNote }: AuthShellProps) {
  return (
    <div className="chrome-dark vo-auth relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <NativeOAuthListener />
      <div className="vo-auth-glow" aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLockup size={28} wordmarkClassName="text-xl" priority />
        </Link>
        {children}
        {footerNote ? (
          <p className="text-center text-xs text-muted-foreground">
            {footerNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
