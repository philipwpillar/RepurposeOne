import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/landing/vo-logo-mark";

export const metadata: Metadata = {
  title: {
    absolute: "Privacy Policy - Voiceora",
  },
  robots: {
    index: true,
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLockup size={26} wordmarkClassName="text-lg" />
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 30 July 2026
        </p>

        <div className="mt-10 space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">Who we are</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Voiceora is an AI content repurposing service operated from the
              United Kingdom. If you have questions about this policy, contact us
              at{" "}
              <a
                href="mailto:support@voiceora.io"
                className="text-foreground underline underline-offset-4"
              >
                support@voiceora.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">What we collect</h2>
            <ul className="mt-3 list-disc space-y-3 pl-6 leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">
                  Account data:
                </strong>{" "}
                your email address, name (if provided), and authentication
                identifiers. We use Supabase for authentication; if you sign in
                with Google, your Google account email is shared with us.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Content you submit:
                </strong>{" "}
                text you paste or upload for repurposing, brand-voice samples,
                and the generated outputs. We store this so your history and
                library work as expected.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Payment data:
                </strong>{" "}
                handled by Stripe. We never see or store your card details. We
                store your subscription status and Stripe customer ID.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Usage data:
                </strong>{" "}
                generation counts (used to enforce plan limits) and basic
                technical logs via our hosting provider, Vercel.
              </li>
            </ul>
          </section>


          <section>
            <h2 className="text-xl font-semibold">Landing page demo</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Visitors without an account can try the Voice Lab demo on our
              homepage. Text they paste is sent to our AI provider via
              OpenRouter (DeepInfra, United States) solely to generate a sample
              X thread in a preset voice. We do not store the pasted text or
              the generated output.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              To prevent abuse, we record a salted hash of the visitor&apos;s IP
              address and a timestamp for rate limiting. These records are
              deleted after 48 hours. Our legal basis for this processing is
              legitimate interest (demonstrating the product and preventing
              abuse). This involves a transfer of personal data to the United
              States; we rely on appropriate safeguards for international
              transfers.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We also use Cloudflare Turnstile on the Voice Lab demo to reduce
              bot abuse. Turnstile may run an invisible check and process
              technical signals such as IP address, TLS fingerprint, and
              browser characteristics. Cloudflare acts as a processor for bot
              protection on our behalf and may also process signals as a
              controller to improve Turnstile. See{" "}
              <a
                href="https://www.cloudflare.com/en-gb/turnstile-privacy-policy/"
                className="text-foreground underline underline-offset-4"
                rel="noopener noreferrer"
                target="_blank"
              >
                Cloudflare&apos;s Turnstile Privacy Addendum
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              How we use your content with AI providers
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Content you submit for generation is sent to third-party AI model
              providers via OpenRouter solely to produce your outputs. We do not
              use your content to train models. Please do not submit content
              containing sensitive personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Legal basis (UK GDPR)</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We process your personal data on the following bases: contract
              performance (providing the service you signed up for), legitimate
              interests (security, abuse prevention, and service improvement),
              and consent where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Data retention</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We retain your account and content data while your account is
              active, including text sources, brand-voice samples, generated
              outputs in your Library, and photos or pack assets you upload for
              generation.{" "}
              <strong className="font-medium text-foreground">
                Rendered video clips:
              </strong>{" "}
              media files are deleted 30 days after render. Clip metadata
              (caption, overlay text, tags, timing) is retained until account
              deletion, at which point it is removed by cascade. Metadata is not
              sufficient to reconstruct the video. You can delete your account
              in-app from{" "}
              <a
                href="/account#danger"
                className="text-foreground underline underline-offset-4"
              >
                Account settings
              </a>
              . That cancels any active subscription, deletes your app data, and
              removes your login. Stripe may retain payment records required by
              law. If you cannot access your account, email{" "}
              <a
                href="mailto:support@voiceora.io"
                className="text-foreground underline underline-offset-4"
              >
                support@voiceora.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Your rights (UK GDPR)</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Under UK GDPR, you have the right to access, rectify, erase, and
              port your personal data, and to object to certain processing. You
              may also lodge a complaint with the Information Commissioner&apos;s
              Office (ICO) at{" "}
              <a
                href="https://ico.org.uk"
                className="text-foreground underline underline-offset-4"
                rel="noopener noreferrer"
                target="_blank"
              >
                ico.org.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Third parties / processors</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">Supabase</strong>
                : authentication and database hosting.
              </li>
              <li>
                <strong className="font-medium text-foreground">Stripe</strong>:
                payment processing.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  OpenRouter
                </strong>
                : routing content to AI model providers for generation.
              </li>
              <li>
                <strong className="font-medium text-foreground">Vercel</strong>:
                application hosting and operational logs.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Cloudflare
                </strong>
                : Turnstile bot protection on the Voice Lab demo (see Landing
                page demo above).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Cookies</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We use essential cookies only, such as those required for
              authentication and session management. We do not use advertising
              or tracking cookies. Cloudflare Turnstile on the Voice Lab demo
              may use strictly necessary cookies or similar technologies for
              bot detection; see{" "}
              <a
                href="https://www.cloudflare.com/en-gb/turnstile-privacy-policy/"
                className="text-foreground underline underline-offset-4"
                rel="noopener noreferrer"
                target="_blank"
              >
                Cloudflare&apos;s Turnstile Privacy Addendum
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Children</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Voiceora is not directed at anyone under 18, and we do not
              knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Changes</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We may update this privacy policy from time to time. When we do, we
              will revise the &ldquo;Last updated&rdquo; date at the top of
              this page.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
