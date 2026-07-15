"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms applied when this element is revealed. */
  delayMs?: number;
  /** When true, immediate children with data-reveal are staggered individually. */
  staggerChildren?: boolean;
  staggerMs?: number;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hideForReveal(el: HTMLElement, delayMs = 0) {
  el.classList.add("reveal-pending");
  if (delayMs) el.style.transitionDelay = `${delayMs}ms`;
}

function showRevealed(el: HTMLElement) {
  el.classList.add("reveal-on");
  el.classList.remove("reveal-pending");
}

/**
 * Fail-safe scroll reveal: content is visible by default (JS-off safe).
 * On mount, elements below the viewport are hidden then observed.
 */
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
  staggerChildren = false,
  staggerMs = 80,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const targets: HTMLElement[] = staggerChildren
      ? Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
      : [root];

    const below: HTMLElement[] = [];
    const viewportBottom = window.innerHeight;

    targets.forEach((el, i) => {
      const top = el.getBoundingClientRect().top;
      if (top > viewportBottom - 8) {
        hideForReveal(el, staggerChildren ? i * staggerMs : delayMs);
        below.push(el);
      }
    });

    if (below.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          showRevealed(entry.target as HTMLElement);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );

    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [delayMs, staggerChildren, staggerMs]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
