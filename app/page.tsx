import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./landing.css";

function VoLogoMark() {
  return (
    <svg
      viewBox="0 4.4 32 32"
      fill="none"
      aria-hidden="true"
      width="30"
      height="30"
    >
      <path
        d="M6 20.5c3.2-9 16.6-9 19.8 0"
        stroke="url(#voMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10 22.5c2-5.4 10-5.4 12 0"
        stroke="url(#voMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="16" cy="24.5" r="2.6" fill="url(#voMark)" />
    </svg>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="vo-landing">
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <linearGradient
            id="voMark"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#2DD4BF" />
            <stop offset="0.55" stopColor="#6366F1" />
            <stop offset="1" stopColor="#E24BC4" />
          </linearGradient>
        </defs>
      </svg>

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
                      Get started
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
                Paste a blog post, transcript, or article. Voiceora turns it
                into platform-native outputs for X, LinkedIn, Instagram, and
                email — written in your voice.
              </p>
              <div className="cta-row">
                {user ? (
                  <Link href="/new" className="btn-primary">
                    Create a repurpose
                  </Link>
                ) : (
                  <Link href="/sign-up" className="btn-primary">
                    Start free
                  </Link>
                )}
                <Link href="#how" className="btn-secondary">
                  See how it works
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
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
                    <span className="pdot" aria-hidden="true" />
                    <span className="pname">X / Twitter</span>
                  </div>
                  <div className="pmeta">12-tweet thread</div>
                  <span className="voice">your voice</span>
                </div>
                <div
                  className="out"
                  style={{ ["--pl" as string]: "#3B82F6" }}
                >
                  <div className="row">
                    <span className="pdot" aria-hidden="true" />
                    <span className="pname">LinkedIn</span>
                  </div>
                  <div className="pmeta">Post + 6 slides</div>
                  <span className="voice">your voice</span>
                </div>
                <div
                  className="out"
                  style={{ ["--pl" as string]: "#E24BC4" }}
                >
                  <div className="row">
                    <span className="pdot" aria-hidden="true" />
                    <span className="pname">Instagram</span>
                  </div>
                  <div className="pmeta">Caption + 5 hooks</div>
                  <span className="voice">your voice</span>
                </div>
                <div
                  className="out"
                  style={{ ["--pl" as string]: "#2DD4BF" }}
                >
                  <div className="row">
                    <span className="pdot" aria-hidden="true" />
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
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <div className="st">Add your content</div>
              <p className="sd">
                Paste a blog post, article, or transcript — that&apos;s your
                single source.
              </p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <div className="st">Teach your voice</div>
              <p className="sd">
                Add 2–3 writing samples or a short description. Voiceora learns
                how you sound.
              </p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <div className="st">Generate everywhere</div>
              <p className="sd">
                One click produces X threads, LinkedIn posts, Instagram captions,
                and email drafts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-inner">
          <div className="brand">
            <VoLogoMark />
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
