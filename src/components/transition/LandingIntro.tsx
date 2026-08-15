"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/** Fires (on `window`) once the first-visit intro has finished — or was
 *  skipped — so the hero knows it may play its entrance. */
export const LANDING_INTRO_DONE_EVENT = "landing-intro:done";
export const LANDING_INTRO_STORAGE_KEY = "pr-home-landing-intro-seen";

/* ── Wipe geometry (ported verbatim from the old engine so the intro looks
      identical, but with no dependency on it) ──────────────────────────── */
const REFERENCE_WIDTH = 1920;
const REFERENCE_CLIP = 90;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const sample = (a1: number, a2: number, t: number) => {
    const inverse = 1 - t;
    return 3 * inverse * inverse * t * a1 + 3 * inverse * t * t * a2 + t * t * t;
  };

  return (progress: number) => {
    const x = clamp01(progress);
    let lower = 0;
    let upper = 1;
    let t = x;

    for (let i = 0; i < 24; i++) {
      t = (lower + upper) / 2;
      if (sample(x1, x2, t) < x) {
        lower = t;
      } else {
        upper = t;
      }
    }

    return sample(y1, y2, t);
  };
};

const zajnoIo6 = cubicBezier(0.16, 1, 0.3, 1);

type StageMetrics = { viewportWidth: number; viewportHeight: number; clip: number };
type WipeFrame = { top: number; side: number; height: number };

const getStageMetrics = (): StageMetrics => {
  const viewportWidth =
    document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clip = (REFERENCE_CLIP * viewportWidth) / REFERENCE_WIDTH;
  return { viewportWidth, viewportHeight, clip };
};

const getWipeFrame = (metrics: StageMetrics, rawProgress: number): WipeFrame => {
  const progress = clamp01(rawProgress);
  const grow = zajnoIo6(progress / 0.8);
  const travel = zajnoIo6((progress - 0.2) / 0.8);
  const startInset = metrics.clip * 2;
  const side =
    lerp(startInset, metrics.clip, grow) + lerp(0, -metrics.clip, travel);
  const top =
    lerp(metrics.viewportHeight - startInset, metrics.clip, grow) +
    lerp(0, -metrics.clip, travel);
  const closingBottom = lerp(metrics.clip, metrics.viewportHeight, travel);
  const bottom = Math.max(closingBottom, side);

  return {
    top: Math.max(0, top),
    side: Math.max(0, side),
    height: Math.max(0, metrics.viewportHeight - top - bottom),
  };
};

const getRevealTop = (
  metrics: StageMetrics,
  wipeFrame: WipeFrame,
  progress: number
) =>
  progress > 0.985
    ? 0
    : Math.min(
        metrics.viewportHeight,
        Math.max(0, wipeFrame.top + wipeFrame.height)
      );

/* ── Scroll lock while the intro runs ──────────────────────────────────── */
const SCROLL_KEYS = new Set([
  " ",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);
const preventScroll = (event: Event) => event.preventDefault();
const preventKeyScroll = (event: KeyboardEvent) => {
  if (SCROLL_KEYS.has(event.key)) event.preventDefault();
};

const lockViewport = () => {
  window.addEventListener("wheel", preventScroll, { passive: false });
  window.addEventListener("touchmove", preventScroll, { passive: false });
  window.addEventListener("keydown", preventKeyScroll);
  document.documentElement.classList.add("is-transitioning");
  document.body.classList.add("is-transitioning");
};

const unlockViewport = () => {
  document.documentElement.classList.remove("is-transitioning");
  document.body.classList.remove("is-transitioning");
  window.removeEventListener("wheel", preventScroll);
  window.removeEventListener("touchmove", preventScroll);
  window.removeEventListener("keydown", preventKeyScroll);
};

/**
 * First-visit-only home intro: a 0→100 counter that slides away and reveals
 * the page with a wipe. Runs once per session (sessionStorage-gated) and is
 * fully self-contained — it drives its own overlay DOM and dispatches
 * LANDING_INTRO_DONE_EVENT when finished so the hero can take over.
 */
export default function LandingIntro() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const counterTextRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const announceDone = () => {
      window.dispatchEvent(new CustomEvent(LANDING_INTRO_DONE_EVENT));
    };

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let alreadySeen = false;
    try {
      alreadySeen =
        window.sessionStorage.getItem(LANDING_INTRO_STORAGE_KEY) === "true";
    } catch {
      alreadySeen = true;
    }

    // Skip the intro (repeat visit or reduced motion): mark seen and let the
    // hero reveal immediately.
    if (alreadySeen || reduceMotion) {
      try {
        window.sessionStorage.setItem(LANDING_INTRO_STORAGE_KEY, "true");
      } catch {}
      requestAnimationFrame(announceDone);
      return;
    }

    const stage = stageRef.current;
    const sheet = sheetRef.current;
    const band = bandRef.current;
    const counter = counterRef.current;
    const counterText = counterTextRef.current;

    if (!stage || !sheet || !band || !counter || !counterText) {
      requestAnimationFrame(announceDone);
      return;
    }

    try {
      window.sessionStorage.setItem(LANDING_INTRO_STORAGE_KEY, "true");
    } catch {}

    const metrics = getStageMetrics();
    const count = { value: 0 };
    const wipe = { value: 0 };
    let didAnnounce = false;

    const announceOnce = () => {
      if (didAnnounce) return;
      didAnnounce = true;
      announceDone();
    };

    const setBandFrame = (frame: WipeFrame, progress: number) => {
      const hairline =
        progress < 0.025
          ? Math.max(2, Math.round(metrics.viewportHeight * 0.003))
          : 0;
      const height = Math.max(frame.height, hairline);
      const width = Math.max(0, metrics.viewportWidth - frame.side * 2);
      gsap.set(band, {
        x: frame.side,
        y: frame.top,
        scaleX: width / metrics.viewportWidth,
        scaleY: height / metrics.viewportHeight,
        transformOrigin: "top left",
      });
    };

    const renderWipe = () => {
      const frame = getWipeFrame(metrics, wipe.value);
      const revealTop = getRevealTop(metrics, frame, wipe.value);
      setBandFrame(frame, wipe.value);
      gsap.set(sheet, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: revealTop / metrics.viewportHeight,
        transformOrigin: "top left",
      });
    };

    lockViewport();

    gsap.set(stage, { autoAlpha: 1, pointerEvents: "auto" });
    gsap.set(sheet, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      transformOrigin: "top left",
    });
    gsap.set(band, { scaleX: 0, scaleY: 0, transformOrigin: "top left" });
    gsap.set(counter, { autoAlpha: 1 });
    gsap.set(counterText, { yPercent: 0, opacity: 1 });
    counterText.textContent = "0";

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(stage, { autoAlpha: 0, pointerEvents: "none" });
        unlockViewport();
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
          ScrollTrigger.refresh();
        });
      },
    });

    tl.to(count, {
      value: 100,
      duration: 1.08,
      ease: "power2.out",
      snap: { value: 1 },
      onUpdate: () => {
        counterText.textContent = Math.round(count.value).toString();
      },
    })
      .to(counterText, {
        yPercent: -115,
        opacity: 0,
        duration: 0.42,
        ease: "power3.in",
      })
      .call(announceOnce, [], "<0.12")
      .to(
        wipe,
        {
          value: 1,
          duration: 1.55,
          ease: "none",
          onStart: announceOnce,
          onUpdate: renderWipe,
        },
        "<"
      );

    return () => {
      tl.kill();
      unlockViewport();
    };
  }, []);

  return (
    <div ref={stageRef} className="landing-intro-stage" aria-hidden="true">
      <div ref={counterRef} className="landing-intro-counter">
        <p ref={counterTextRef}>0</p>
      </div>
      <div ref={sheetRef} className="landing-intro-sheet" />
      <div ref={bandRef} className="landing-intro-band" />
    </div>
  );
}
