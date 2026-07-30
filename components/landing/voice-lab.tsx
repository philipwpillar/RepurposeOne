"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_LAB_DEFAULT_INPUT,
  VOICE_LAB_LABELS,
  VOICE_LAB_MAX_CHARS,
  VOICE_LAB_MIN_CHARS,
} from "@/lib/landing/voice-lab-config";
import { VOICE_LAB_LENGTH_PRESETS } from "@/lib/repurpose/length-presets";
import { VOICE_VARIANTS } from "@/lib/ai/voice-variants";
import type { VoiceVariantId } from "@/types";

const LIVE_LABEL = "Generated live · sample voice, your text";
const IDLE_LABEL = "Live demo · sample voice, your text";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          size?: "invisible" | "normal";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function errorMessageForStatus(status: number): string {
  if (status === 429) {
    return "You've had a few goes. Sign up free to keep going.";
  }
  if (status === 403) {
    return "Couldn't verify. Refresh and try again.";
  }
  if (status === 503) {
    return "Demo is temporarily unavailable. Please try again shortly.";
  }
  return "Couldn't generate from that text. Please try again.";
}

export function VoiceLab() {
  const [inputText, setInputText] = useState(VOICE_LAB_DEFAULT_INPUT);
  const [currentVoice, setCurrentVoice] = useState(0);
  const [targetWords, setTargetWords] = useState(50);
  const [voiceVariant, setVoiceVariant] =
    useState<VoiceVariantId>("signature");
  const [display, setDisplay] = useState("");
  const [statusLabel, setStatusLabel] = useState(IDLE_LABEL);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [reduced, setReduced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(!TURNSTILE_SITE_KEY);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const pendingRunRef = useRef(false);

  const clearTypeTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const typeText = useCallback((str: string, skipAnim: boolean) => {
    clearTypeTimer();
    if (skipAnim) {
      setDisplay(str);
      return;
    }
    setDisplay("");
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 2;
      setDisplay(str.slice(0, i));
      if (i >= str.length) clearTypeTimer();
    }, 14);
  }, []);

  const failGeneration = useCallback((message: string) => {
    clearTypeTimer();
    setDisplay("");
    setLiveAnnouncement("");
    setStatusLabel(IDLE_LABEL);
    setStatusMessage(message);
  }, []);

  const runGeneration = useCallback(
    async (turnstileToken?: string) => {
      const trimmed = inputText.trim();
      if (trimmed.length < VOICE_LAB_MIN_CHARS) {
        setStatusMessage(
          `Add at least ${VOICE_LAB_MIN_CHARS} characters to try the demo.`
        );
        return;
      }

      setLoading(true);
      setStatusMessage(null);
      setStatusLabel(IDLE_LABEL);

      try {
        const response = await fetch("/api/voice-lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed.slice(0, VOICE_LAB_MAX_CHARS),
            voice: currentVoice,
            target_words: targetWords,
            voice_variant: voiceVariant,
            turnstileToken,
          }),
        });

        if (!response.ok) {
          failGeneration(errorMessageForStatus(response.status));
          return;
        }

        const data = (await response.json()) as { text?: string };
        if (!data.text?.trim()) {
          failGeneration("Couldn't generate from that text. Please try again.");
          return;
        }

        typeText(data.text, reduced);
        setLiveAnnouncement(data.text);
        setStatusLabel(LIVE_LABEL);
      } catch {
        failGeneration(
          "Couldn't reach the demo. Check your connection and try again."
        );
      } finally {
        setLoading(false);
        pendingRunRef.current = false;
        if (TURNSTILE_SITE_KEY && turnstileWidgetIdRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
      }
    },
    [
      currentVoice,
      failGeneration,
      inputText,
      reduced,
      targetWords,
      typeText,
      voiceVariant,
    ]
  );

  const handleTryIt = () => {
    if (loading) return;

    if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetIdRef.current) {
      pendingRunRef.current = true;
      window.turnstile.execute(turnstileWidgetIdRef.current);
      return;
    }

    void runGeneration();
  };

  useEffect(() => {
    setReduced(prefersReducedMotion());
    return clearTypeTimer;
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileReady || !turnstileContainerRef.current) {
      return;
    }

    if (!window.turnstile || turnstileWidgetIdRef.current) return;

    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        size: "invisible",
        callback: (token: string) => {
          if (pendingRunRef.current) {
            void runGeneration(token);
          }
        },
        "error-callback": () => {
          if (pendingRunRef.current) {
            pendingRunRef.current = false;
            setLoading(false);
            failGeneration("Couldn't verify. Refresh and try again.");
          }
        },
      }
    );

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [failGeneration, runGeneration, turnstileReady]);

  return (
    <section className="voice-lab" id="voice-lab">
      {TURNSTILE_SITE_KEY ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="lazyOnload"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}

      <div className="glow2" aria-hidden="true" />
      <div className="wrap">
        <p className="zone-title">The part other tools skip</p>
        <h2 className="big">
          Same Idea. <span className="grad">Different Voice.</span>
        </h2>
        <p className="lab-sub">
          Most AI content sounds like the same person wrote all of it. Paste your
          own writing, pick a sample voice, and watch it become an X thread.
        </p>

        <div className="lab-frame">
          <div className="lab-head">
            <label className="lab-input-label" htmlFor="voice-lab-input">
              Your text
            </label>
            <div
              className="chip-row"
              role="group"
              aria-label="Choose a demo voice"
            >
              {VOICE_LAB_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className="chip"
                  aria-pressed={currentVoice === i}
                  onClick={() => setCurrentVoice(i)}
                  disabled={loading}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="chip-row"
            role="group"
            aria-label="Choose a delivery variant"
          >
            {VOICE_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className="chip"
                aria-pressed={voiceVariant === variant.id}
                onClick={() => setVoiceVariant(variant.id)}
                disabled={loading}
                title={variant.description}
              >
                {variant.label}
              </button>
            ))}
          </div>

          <div className="lab-input-wrap">
            <textarea
              id="voice-lab-input"
              className="lab-input"
              value={inputText}
              maxLength={VOICE_LAB_MAX_CHARS}
              rows={4}
              disabled={loading}
              onChange={(event) => setInputText(event.target.value)}
            />
            <p className="lab-privacy">
              Your text is sent to our AI provider (DeepInfra, US) to generate
              the demo. We don&apos;t store it.
            </p>
          </div>

          <div className="lab-actions">
            <div
              className="chip-row"
              role="group"
              aria-label="Choose output length"
            >
              {VOICE_LAB_LENGTH_PRESETS.map((words) => (
                <button
                  key={words}
                  type="button"
                  className="chip"
                  aria-pressed={targetWords === words}
                  onClick={() => setTargetWords(words)}
                  disabled={loading}
                >
                  ~{words} words
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary lab-try"
              onClick={handleTryIt}
              disabled={loading}
            >
              {loading ? "Generating…" : "Try it"}
            </button>
            {TURNSTILE_SITE_KEY ? (
              <div ref={turnstileContainerRef} className="lab-turnstile" />
            ) : null}
          </div>

          {statusMessage ? (
            <p className="lab-status" role="status">
              {statusMessage}
            </p>
          ) : null}

          {display ? (
            <div className="lab-body">
              <p className="out-text">
                {display}
                {!reduced && loading === false && display.length > 0 ? (
                  <span className="caret" aria-hidden="true" />
                ) : null}
              </p>
              <span className="sr-only" aria-live="polite">
                {liveAnnouncement}
              </span>
            </div>
          ) : null}

          <div className="lab-foot">
            <span className="demo-note">{statusLabel}</span>
            <span className="fmt">Format: X thread</span>
          </div>
        </div>

        <p className="lab-cta">
          That&apos;s one format in a sample voice.{" "}
          <Link href="/sign-up">Sign up free</Link> to get all four: X,
          LinkedIn, Instagram and email, in <strong>your</strong> voice, trained
          on your own writing.
        </p>
      </div>
    </section>
  );
}
