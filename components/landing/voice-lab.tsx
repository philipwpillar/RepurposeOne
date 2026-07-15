"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// PLACEHOLDER COPY — Phil sign-off required before merge (see brief §5)
const VOICE_LAB_COPY = [
  "Photos are content now. Upload one, add a line of context, and Voiceora writes the posts. Four formats, one pass — done before your coffee cools.",
  "Some ideas start as a picture — the whiteboard after a good meeting, the desk on launch morning. Now you can hand Voiceora that photo, tell it what mattered, and get posts that sound like you were there. Because you were.",
  "Photo input is live on the Creator plan. One image plus a short context note produces platform-native drafts for X, LinkedIn, Instagram and email. Your context leads; the image adds specificity.",
] as const;

const VOICE_LABELS = [
  "Punchy founder",
  "Warm storyteller",
  "Precise analyst",
] as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VoiceLab() {
  const [current, setCurrent] = useState(0);
  const [display, setDisplay] = useState<string>(VOICE_LAB_COPY[0]);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [userTouched, setUserTouched] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    const isReduced = prefersReducedMotion();
    setReduced(isReduced);
    typeText(VOICE_LAB_COPY[0], isReduced);
    return clearTypeTimer;
  }, [typeText]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || userTouched || !inView) return;
    const auto = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % VOICE_LAB_COPY.length;
        typeText(VOICE_LAB_COPY[next], false);
        return next;
      });
    }, 7000);
    return () => clearInterval(auto);
  }, [inView, userTouched, reduced, typeText]);

  const onChipClick = (idx: number) => {
    setUserTouched(true);
    setCurrent(idx);
    typeText(VOICE_LAB_COPY[idx], reduced);
    setLiveAnnouncement(VOICE_LAB_COPY[idx]);
  };

  return (
    <section className="voice-lab" id="voice-lab">
      <div className="glow2" aria-hidden="true" />
      <div className="wrap">
        <p className="zone-title">The part other tools skip</p>
        <h2 className="big">
          Same idea. <span className="grad">Different voice.</span>
        </h2>
        <p className="lab-sub">
          Most AI content sounds like the same person wrote all of it. Voiceora
          writes from a voice profile it learns from you. Tap a voice below and
          watch one announcement re-write itself.
        </p>

        <div className="lab-frame" ref={frameRef}>
          <div className="lab-head">
            <div className="src">
              Source idea:{" "}
              <strong>&quot;We just shipped photo input.&quot;</strong>
            </div>
            <div
              className="chip-row"
              role="group"
              aria-label="Choose a demo voice"
            >
              {VOICE_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className="chip"
                  aria-pressed={current === i}
                  onClick={() => onChipClick(i)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-body">
            <p className="out-text">
              {display}
              {!reduced && <span className="caret" aria-hidden="true" />}
            </p>
            <span className="sr-only" aria-live="polite">
              {liveAnnouncement}
            </span>
          </div>
          <div className="lab-foot">
            <span className="demo-note">
              Illustrative demo · sample voices, sample copy
            </span>
            <span className="fmt">Format: LinkedIn post</span>
          </div>
        </div>
      </div>
    </section>
  );
}
