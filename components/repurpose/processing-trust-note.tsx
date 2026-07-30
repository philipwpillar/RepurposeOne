import Link from "next/link";

/**
 * Path A trust note - only claims already backed by /privacy.
 * Do not add US hosting / ZDR / region claims until Path B updates the policy.
 */
export function ProcessingTrustNote() {
  return (
    <p className="mb-6 px-1 text-xs text-muted-foreground">
      Content you submit (including photo uploads) is processed by a third-party
      AI provider and stored in your Library while your account is active.{" "}
      <Link
        href="/privacy"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Privacy policy
      </Link>
    </p>
  );
}
