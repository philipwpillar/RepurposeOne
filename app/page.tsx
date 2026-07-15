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
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { VoiceLab } from "@/components/landing/voice-lab";
import { VoLogoMark, VoMarkDefs } from "@/components/landing/vo-logo-mark";
import "./landing.css";

export const metadata: Metadata = {
  title: "Voiceora — one piece of content, every platform, your voice",
  description:
    "Turn a blog post, transcript, or photo into an X thread, a LinkedIn post with carousel ideas, an Instagram caption, and an email draft — written in your brand voice. Free plan, no card required.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="vo-landing">
      <VoMarkDefs />

      <section className="hero">
        <div className="aurora-glow" aria-hidden="true" />
        <div className="wrap">
          <nav>
            <div className="nav-inner">
              <div className="brand">
                <VoLogoMark />
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
                One piece of content.
                <br />
                Every platform.
                <br />
                <span className="grad">Your voice.</span>
              </h1>
              <p className="sub">
                Paste a post, a transcript, or a photo. Voiceora turns it into an
                X thread, a LinkedIn post with carousel ideas, an Instagram
                caption, and an email draft — each one written the way you write.
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
                Free plan, no card · Four formats per run · Voice learned from
                2–3 samples
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
                  style={{ ["--pl" as string]: "#E7E7EC" }}
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
                  style={{ ["--pl" as string]: "#3B82F6" }}
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
                  style={{ ["--pl" as string]: "#E24BC4" }}
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
                  style={{ ["--pl" as string]: "#2DD4BF" }}
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
                Add 2–3 writing samples or a short description. Your voice is
                the first thing Voiceora asks for — everything is written from
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
                Paste a blog post, article, or transcript — or upload a photo
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
                One click produces all four formats, ready to copy or export.
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
              stock-photo testimonials here. What you will find: real outputs
              from the live product — every post about Voiceora is written with
              Voiceora, and we publish the results as they happen.
            </p>
          </ScrollReveal>
          <div className="proof-grid">
            <ScrollReveal>
              <div className="proof-card slot">
                <p>
                  REAL OUTPUT SLOT
                  <br />— populated with a genuine generation from the live app
                  after the launch smoke test —
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="proof-card slot">
                <p>
                  REAL OUTPUT SLOT
                  <br />— second genuine output, different format, with a link
                  to the published post —
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="aurora-glow" aria-hidden="true" />
        <div className="wrap">
          <ScrollReveal>
            <h2>Try it on your own content.</h2>
          </ScrollReveal>
          <ScrollReveal>
            <p>
              The free plan takes about a minute to set up. No card, cancel
              anytime.
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
            <Link href="/privacy">Privacy Policy</Link>
            <span className="sep">·</span>
            <a href="mailto:support@voiceora.io">support@voiceora.io</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
