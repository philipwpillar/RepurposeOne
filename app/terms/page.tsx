import type { Metadata } from "next";
import Link from "next/link";
import { VoLogoMark, VoMarkDefs } from "@/components/landing/vo-logo-mark";

export const metadata: Metadata = {
  title: {
    absolute: "Terms of Service - Voiceora",
  },
  robots: {
    index: true,
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <VoMarkDefs />
      <header className="border-b border-border px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <VoLogoMark size={26} />
          <span className="font-display text-lg font-semibold tracking-tight">
            Voiceora
          </span>
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 25 July 2026
        </p>

        <div className="mt-10 space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">The service</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Voiceora provides AI-assisted content repurposing tools. You
              retain ownership of content you submit and outputs generated for
              you, subject to these terms and our{" "}
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Accounts &amp; plans</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              You must provide accurate account information and keep your
              credentials secure. Free and paid plans include monthly generation
              limits described in the product. Paid subscriptions renew until
              cancelled via the billing portal. Fees are non-refundable except
              where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Acceptable use</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Do not use Voiceora to generate unlawful, harmful, or infringing
              content; abuse the service; attempt to bypass plan limits; or
              submit sensitive personal data you are not authorised to process.
              We may suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">AI processing</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Content you submit is processed by third-party AI providers to
              produce outputs. Outputs may be imperfect - review before
              publishing. We do not guarantee uniqueness, accuracy, or fitness
              for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Limitation of liability</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              To the fullest extent permitted by law, Voiceora is provided
              &ldquo;as is&rdquo; and we are not liable for indirect or
              consequential loss arising from use of the service. Nothing in
              these terms excludes liability that cannot be excluded under UK
              law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Questions about these terms:{" "}
              <a
                href="mailto:support@voiceora.io"
                className="text-foreground underline underline-offset-4"
              >
                support@voiceora.io
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
