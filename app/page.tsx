import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormatPreviews } from "@/components/landing/format-previews";
import {
  FormatsGlyph,
  InputGlyph,
  VoiceGlyph,
} from "@/components/landing/how-step-glyphs";
import {
  EmailGlyph,
  InstagramMark,
  LinkedInMark,
  XMark,
} from "@/components/landing/platform-marks";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { ProofOutputs } from "@/components/landing/proof-outputs";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { VoiceLab } from "@/components/landing/voice-lab";
import { VoLogoMark } from "@/components/landing/vo-logo-mark";
import { PLAN_LIMITS } from "@/lib/config";
import { isNativeRequest } from "@/lib/native-request";
import "./landing.css";

export const metadata: Metadata = {
  title: "Voiceora - One Piece of Content. Every Platform. Your Voice.",
  description:
    "Turn a blog post, transcript, or photo into an X thread, a LinkedIn post with carousel ideas, an Instagram caption, and an email draft - written in your brand voice. Free plan, no card required.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const native = await isNativeRequest();

  return (
    <main className="vo-landing">
      <section className="hero">
        <div className="aurora-glow" aria-hidden="true" />
        <div className="wrap">
          <nav>
            <div className="nav-inner">
              <div className="brand">
                <VoLogoMark size={30} priority />
                <span className="name">Voiceora</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {user ? (
                  <Link href="/dashboard" className="navbtn solid">
                    Go to dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-in" className="navbtn">
                      Sign in
                    </Link>
                    <Link href="/sign-up" className="navbtn solid">
                      Start free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>

          <div className="hero-grid">
            <div>
              <p className="eyebrow">
                <span className="dot" aria-hidden="true" />
                Content repurposing
              </p>
              <h1 className="head">
                One Piece of Content.
                <br />
                Every Platform.
                <br />
                <span className="grad">Your Voice.</span>
              </h1>
              <p className="sub">
                Paste a post, a transcript, or a photo. Voiceora turns it into an
                X thread, a LinkedIn post with carousel ideas, an Instagram
                caption, and an email draft - each one written the way you write.
              </p>
              <div className="cta-row">
                {user ? (
                  <Link href="/studio" className="btn-primary">
                    Create a repurpose
                  </Link>
                ) : (
                  <Link href="/sign-up" className="btn-primary">
                    Start free
                  </Link>
                )}
                <Link href="#voice-lab" className="btn-secondary">
                  Hear the difference
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
              <p className="trust-line">
                Free plan · {PLAN_LIMITS.free} generations/month · no card ·
                voice from 2-3 samples
              </p>
            </div>

            <div className="fan">
              <div className="source">
                <div className="tag">Your content</div>
                <div className="title">How I built my SaaS in 30 days</div>
                <div className="meta">1,240 words · blog post</div>
              </div>
              <div className="stem" aria-hidden="true" />
              <div className="outs">
                <div
                  className="out"
                  style={{ ["--pl" as string]: "var(--platform-x)" }}
                >
                  <div className="row">
                    <span className="glyph">
                      <XMark />
                    </span>
                    <span className="pname">X / Twitter</span>
                  </div>
                  <div className="pmeta">Thread with a hook</div>
                  <span className="voice">your voice</span>
                </div>
                <div
                  className="out"
                  style={{ ["--pl" as string]: "var(--platform-linkedin)" }}
                >
                  <div className="row">
                    <span className="glyph">
                      <LinkedInMark />
                    </span>
                    <span className="pname">LinkedIn</span>
                  </div>
                  <div className="pmeta">Post + carousel ideas</div>
                  <span className="voice">your voice</span>
                </div>
                <div
                  className="out"
                  style={{ ["--pl" as string]: "var(--platform-instagram)" }}
                >
                  <div className="row">
                    <span className="glyph">
                      <InstagramMark />
                    </span>
                    <span className="pname">Instagram</span>
                  </div>
                  <div className="pmeta">Caption + hooks</div>
                  <span className="voice">your voice</span>
                </div>
                <div
                  className="out"
                  style={{ ["--pl" as string]: "var(--platform-email)" }}
                >
                  <div className="row">
                    <span className="glyph glyph-teal">
                      <EmailGlyph />
                    </span>
                    <span className="pname">Email</span>
                  </div>
                  <div className="pmeta">Newsletter draft</div>
                  <span className="voice">your voice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="wrap">
          <h2>How it works</h2>
          <ScrollReveal className="steps" staggerChildren staggerMs={80}>
            <div className="step" data-reveal>
              <div className="n">01</div>
              <span className="glyph">
                <VoiceGlyph />
              </span>
              <div className="st">Teach your voice</div>
              <p className="sd">
                Add 2-3 writing samples or a short description. Your voice is
                the first thing Voiceora asks for - everything is written from
                it.
              </p>
            </div>
            <div className="step" data-reveal>
              <div className="n">02</div>
              <span className="glyph">
                <InputGlyph />
              </span>
              <div className="st">Add your content</div>
              <p className="sd">
                Paste a blog post, article, or transcript - or upload a photo
                with a line of context.
              </p>
              <span className="tiertag">Photo input · Creator plan</span>
            </div>
            <div className="step" data-reveal>
              <div className="n grad">03</div>
              <span className="glyph">
                <FormatsGlyph />
              </span>
              <div className="st">Generate everywhere</div>
              <p className="sd">
                One generation produces all four formats, ready to copy or
                export.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="formats">
        <div className="wrap">
          <ScrollReveal>
            <h2 className="zone-title">What one input becomes</h2>
          </ScrollReveal>
          <ScrollReveal>
            <p className="formats-sub">
              Four platform-native drafts from a single source. The coloured bar
              in each preview is the part Voiceora sweats hardest: the hook.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <FormatPreviews />
          </ScrollReveal>
        </div>
      </section>

      <ScrollReveal>
        <VoiceLab />
      </ScrollReveal>

      <section className="proof">
        <div className="wrap">
          <ScrollReveal>
            <h2 className="zone-title">Proof over promises</h2>
          </ScrollReveal>
          <ScrollReveal>
            <p className="proof-sub">
              Voiceora is new, so you won&apos;t find invented user counts or
              stock-photo testimonials here. What you will find: real Studio
              outputs about the product itself - every post about Voiceora is
              written with Voiceora.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <ProofOutputs />
          </ScrollReveal>
        </div>
      </section>

      {!native ? (
        <ScrollReveal>
          <LandingPricing signedIn={Boolean(user)} />
        </ScrollReveal>
      ) : null}

      <section className="final-cta">
        <div className="aurora-glow" aria-hidden="true" />
        <div className="wrap">
          <ScrollReveal>
            <h2>Try it on your own content.</h2>
          </ScrollReveal>
          <ScrollReveal>
            <p>
              Free plan includes {PLAN_LIMITS.free} generations a month. No
              card, cancel anytime.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            {user ? (
              <Link href="/studio" className="btn-primary">
                Go to studio
              </Link>
            ) : (
              <Link href="/sign-up" className="btn-primary">
                Start free
              </Link>
            )}
          </ScrollReveal>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-inner">
          <div className="brand">
            <VoLogoMark size={26} />
            <span className="name">Voiceora</span>
          </div>
          <div>
            <Link href="#how">How it works</Link>
            {!native ? (
              <>
                <span className="sep">·</span>
                <Link href="#pricing">Pricing</Link>
              </>
            ) : null}
            <span className="sep">·</span>
            <Link href="/privacy">Privacy</Link>
            <span className="sep">·</span>
            <Link href="/terms">Terms</Link>
            <span className="sep">·</span>
            <a href="mailto:support@voiceora.io">Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
