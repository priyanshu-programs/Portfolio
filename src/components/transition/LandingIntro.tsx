"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import {
  LIQUID_IMAGE_READY_ATTR,
  LIQUID_IMAGE_READY_EVENT,
} from "@/components/ui/LiquidImage";
import { INTRO_ARMED_CLASS } from "@/lib/landingIntroArm";

gsap.registerPlugin(ScrollTrigger, Flip, CustomEase);

/** Fires (on `window`) when the intro's handoff begins — or was skipped — so
 *  the hero can play its entrance alongside the wipe. */
export const LANDING_INTRO_DONE_EVENT = "landing-intro:done";

/** Attribute on the hero's portrait wrapper. The centre panel is fitted to this
 *  element's box at the end of the sequence, so the intro resolves into the
 *  hero rather than cutting to it. Kept as a data attribute (not the existing
 *  `transition-hero-image` class) so the coupling is explicit and greppable. */
export const HERO_PORTRAIT_ATTR = "data-hero-portrait";

/* ── Easing ───────────────────────────────────────────────────────────────
   Three curves rather than one. A single aggressive ease (the old
   "0.9, 0, 0.1, 1") is near-instant through the middle and dead at both ends,
   which makes a multi-beat sequence read as a series of discrete steps. None
   of these overshoot: an overshoot on the final fit would push the panel past
   the portrait and read as a bounce rather than a resolve. */

/** Big moves — a long, soft decelerate. */
const GLIDE = CustomEase.create("intro-glide", "0.22, 1, 0.36, 1");

/** The fit: an even longer tail, so the panel arrives rather than stops. */
const SETTLE = CustomEase.create("intro-settle", "0.16, 1, 0.3, 1");

/** Entrance: a slight in-ramp so the panels don't appear at full speed. */
const RISE = CustomEase.create("intro-rise", "0.33, 0, 0.1, 1");

/* ── Fitting the centre panel onto the painted portrait ───────────────────
   The hero portrait's wrapper is a plain box, but LiquidImage paints the
   picture `object-contain object-bottom` inside it — as an <img> in the
   fallback, and identically in WebGL (its resize() computes the same contain
   mapping and the shader bottom-aligns). So one contain computation is correct
   for both render paths, and the canvas — which always fills the wrapper —
   never needs measuring directly. */

/** Aspect ratio of the portrait art, used only if the DOM can't supply one.
 *  The local asset (hero-portrait.webp) is 1086×1448 and the optimized file
 *  750×1000 — both 0.75. */
const PORTRAIT_FALLBACK_ASPECT = 0.75;

const readPortraitAspect = (wrapper: HTMLElement): number => {
  const img = wrapper.querySelector<HTMLImageElement>("img");
  if (img?.naturalWidth && img.naturalHeight) {
    return img.naturalWidth / img.naturalHeight;
  }
  return PORTRAIT_FALLBACK_ASPECT;
};

/**
 * The rect the portrait is actually *painted* in — not its wrapper's box.
 *
 * Deliberately the general `object-contain` form rather than assuming the
 * height-constrained case: a differently-shaped portrait from the CMS, or a
 * wrapper narrower than `height × aspect`, flips which axis constrains.
 */
const getPaintedPortraitRect = (wrapper: HTMLElement) => {
  const box = wrapper.getBoundingClientRect();
  const aspect = readPortraitAspect(wrapper);

  let width = box.height * aspect;
  let height = box.height;
  if (width > box.width) {
    width = box.width;
    height = box.width / aspect;
  }

  return {
    width,
    height,
    // object-position: centre horizontally, bottom vertically.
    x: box.left + (box.width - width) / 2,
    y: box.top + (box.height - height),
  };
};

/**
 * Whether the intro sequence should run for this mount.
 *
 * Both this component and the hero have to reach the same verdict — the hero
 * pre-hides itself only when the intro is going to play, and would otherwise
 * wait forever for an event that never fires. Keeping the rule in one place is
 * what stops the two from drifting apart.
 *
 * It plays on every genuine load of `/` — reload included — and never under
 * reduced motion. What it deliberately does *not* do is replay on a soft
 * navigation back to home, which would drop a 5.6s scroll-locked sequence on
 * top of the 0.9s view-transition the click already triggered.
 *
 * ── HAS A PRE-PAINT TWIN ─────────────────────────────────────────────────
 * This is the authoritative rule, but it runs too late to raise the intro's
 * cover: it lives in a client bundle, so the earliest it can fire is the effect
 * below — after the browser has already painted the homepage. `ARM_SCRIPT` in
 * src/lib/landingIntroArm.ts is a hand-copied version of this predicate that a
 * parser-blocking script runs before first paint. Change one, change the other;
 * that file explains why sharing code between them is impossible.
 */
export function shouldPlayLandingIntro(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  if (window.location.pathname !== "/") return false;

  try {
    const [entry] = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    if (entry) {
      // `back_forward` is excluded deliberately: a restored page should come
      // back as the reader left it, not replay a preloader.
      if (entry.type !== "navigate" && entry.type !== "reload") return false;

      // `entry.type` alone is not enough. It describes the document load, and
      // Next's client router never creates a new navigation entry — so after
      // /work → / it still reads "navigate", describing the load of /work.
      // Comparing the entry's URL against the current path is what actually
      // distinguishes "this document loaded at /" from "we soft-navigated here".
      if (new URL(entry.name, window.location.origin).pathname !== "/") {
        return false;
      }
    }
  } catch {}

  return true;
}

/** Five panels, centre last-standing. Only the centre is CMS-driven — it has to
 *  be, because the fit at the end lands on whatever the hero is about to show.
 *  The four outer panels are a fixed local set (see `panels` below); they are on
 *  screen ~1.5s and collapse first, so they are set dressing rather than
 *  content. This fallback covers the centre when Sanity is unreachable. */
const FALLBACK_CENTRE = "/images/hero-portrait.webp";
const PANEL_COUNT = 5;
const CENTRE_INDEX = 2;

/* ── Beat 1's wave ────────────────────────────────────────────────────────
   The entrance used to be one tween with a flat `stagger: { each: 0.14 }`: five
   identical arcs offset by a constant. Evenly-spaced starts on identical motion
   read as five separate entrances keeping time, which is exactly what a wave is
   not.

   Two things make it read as one swell instead, both keyed on a panel's ring —
   its distance from the centre (0, 1, or 2):

   - Starts are spaced *sub-linearly*, so the gap between ring 0 and ring 1 is
     wider than between ring 1 and ring 2. Constant spacing is a metronome; a
     closing gap is a curve.
   - Travel grows with the ring, so the outer panels cover more ground in the
     same window. They are still moving while the centre is already settling,
     and the crest visibly propagates outward rather than the row arriving in
     tiers.

   The scale spread is deliberately tiny — it stops the outer panels from
   reading as flat cards sliding up, and is not meant to be individually
   noticeable.

   ── MIRRORED IN CSS ──────────────────────────────────────────────────────
   `html.intro-armed .landing-intro-panel:nth-child(...)` in globals.css hard-
   codes these same y/scale values per ring, so the pre-paint cover's first
   frame matches what `gsap.set` writes below. Change these, change those. */

/** A panel's distance from the centre: 0 for the centre, 2 for the edges. */
const panelRing = (index: number) => Math.abs(index - CENTRE_INDEX);

/** Start offset per ring, in px. Values duplicated in globals.css. */
const PANEL_RISE_Y = [56, 66, 76];

/** Start scale per ring. Values duplicated in globals.css. */
const PANEL_RISE_SCALE = [0.94, 0.932, 0.925];

/**
 * When each ring begins its rise, in seconds.
 *
 * The total spread is what keeps this inside beat 1's existing window: the last
 * panel starts at 0.31 and runs 1.5s, landing at ~1.81 — while the gather at
 * 1.35 is a 1.5s tween of its own, so the two overlap rather than queue. Widen
 * this and the edges are still arriving after the row has started to close.
 */
const PANEL_RISE_DELAY = [0, 0.19, 0.31];

/** Longest we'll hold the sequence waiting on image decode before starting
 *  anyway. A preloader that waits on a slow network is worse than one that
 *  fades in a frame late. */
const DECODE_TIMEOUT_MS = 1200;

/** Longest the handoff will wait on the hero portrait to paint before swapping
 *  anyway. Generous, because the swap is what ends the sequence — but bounded,
 *  because a stalled texture must never strand the page under a locked stage. */
const PORTRAIT_READY_TIMEOUT_MS = 2000;

/**
 * Resolves once the hero portrait has real pixels on screen.
 *
 * The portrait renders through LiquidImage, which hides its fallback <img> as
 * soon as the WebGL context is *constructed* — but the canvas stays transparent
 * until its texture (a separate fetch, proxied for Sanity URLs) loads and a
 * frame is drawn. Revealing on mount alone can therefore hand off to an empty
 * box. This waits for the paint, and never longer than the timeout.
 */
const waitForPortraitPaint = (wrapper: HTMLElement, timeoutMs: number) =>
  new Promise<void>((resolve) => {
    const target =
      wrapper.querySelector<HTMLElement>(`[${LIQUID_IMAGE_READY_ATTR}]`) ??
      wrapper.querySelector<HTMLElement>("[role='img']");

    // Already painted (attribute set before we started listening), or there is
    // no LiquidImage here at all — nothing to wait for either way.
    if (!target || target.hasAttribute(LIQUID_IMAGE_READY_ATTR)) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      target.removeEventListener(LIQUID_IMAGE_READY_EVENT, finish);
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    target.addEventListener(LIQUID_IMAGE_READY_EVENT, finish, { once: true });
  });

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
 * First-visit-only home intro: five tall panels fade in, tighten together,
 * collapse to the centre one, and that panel is then fitted onto the hero
 * portrait's box so the reveal resolves into the page instead of cutting to it.
 *
 * Runs on every genuine load of `/`, reload included. It is skipped on soft
 * navigation back to home, on back/forward restores, and under reduced motion.
 * Dispatches LANDING_INTRO_DONE_EVENT when the handoff begins so the hero can animate
 * everything *except* the portrait — which this component now owns.
 */
export default function LandingIntro() {
  const content = useSiteContent();

  /** Same source and fallback the hero uses, so the intro's label and the nav's
   *  can never disagree. */
  const name = content?.settings?.name ?? "Priyanshu Roy";

  const stageRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const counterTextRef = useRef<HTMLParagraphElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const wordmarkTextRef = useRef<HTMLParagraphElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** Centre is the hero portrait itself, so the fit at the end lands on the
   *  same picture the hero is about to show. */
  const centreSrc = content?.hero?.portrait ?? FALLBACK_CENTRE;

  /** Outer slots are local art, not CMS content: four fixed files for four
   *  slots, read 0,1,_,2,3 around the centre. The modulo is defensive only —
   *  with PANEL_COUNT at 5 the index can never run past the pool. */
  const panels = useMemo(() => {
    const preloaderImages = [
      "/images/preloader-1.jpg",
      "/images/preloader-2.jpg",
      "/images/preloader-4.jpg",
      "/images/preloader-5.jpg",
    ];

    return Array.from({ length: PANEL_COUNT }, (_, i) => {
      if (i === CENTRE_INDEX) return centreSrc;
      const outerIndex = i > CENTRE_INDEX ? i - 1 : i;
      return preloaderImages[outerIndex % preloaderImages.length];
    });
  }, [centreSrc]);

  useEffect(() => {
    const announceDone = () => {
      window.dispatchEvent(new CustomEvent(LANDING_INTRO_DONE_EVENT));
    };

    /** Lowers the pre-paint cover raised by ARM_SCRIPT.
     *
     *  Safe to call when the class was never stamped, which is the common case:
     *  the script and `shouldPlayLandingIntro()` are two copies of one rule, so
     *  on every skip path below the class is already absent. Calling it anyway
     *  is the cheap half of the drift insurance — if the two ever disagree, the
     *  authoritative predicate wins on this frame instead of the page sitting
     *  dark until the script's failsafe timeout fires. */
    const disarmCover = () => {
      document.documentElement.classList.remove(INTRO_ARMED_CLASS);
    };

    // Skip the intro (soft nav, back/forward, or reduced motion): let the hero
    // reveal immediately.
    if (!shouldPlayLandingIntro()) {
      disarmCover();
      requestAnimationFrame(announceDone);
      return;
    }

    const stage = stageRef.current;
    const veil = veilRef.current;
    const row = rowRef.current;
    const counter = counterRef.current;
    const counterText = counterTextRef.current;
    const wordmark = wordmarkRef.current;
    const wordmarkText = wordmarkTextRef.current;
    const panelEls = panelRefs.current.filter(
      (el): el is HTMLDivElement => Boolean(el)
    );

    if (
      !stage ||
      !veil ||
      !row ||
      !counter ||
      !counterText ||
      !wordmark ||
      !wordmarkText ||
      panelEls.length === 0
    ) {
      // Nothing here can animate, so the cover must not stay up waiting on a
      // sequence that will never run.
      disarmCover();
      requestAnimationFrame(announceDone);
      return;
    }

    const centreEl = panelEls[CENTRE_INDEX] ?? panelEls[panelEls.length - 1];
    const outerEls = panelEls.filter((el) => el !== centreEl);

    const count = { value: 0 };
    let didAnnounce = false;
    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;
    /** The transient element the final fit targets; tracked so an unmount
     *  mid-flight can't leave it behind in the DOM. */
    let fitProxy: HTMLElement | null = null;

    const announceOnce = () => {
      if (didAnnounce) return;
      didAnnounce = true;
      announceDone();
    };

    lockViewport();

    // Paint the initial state before anything is visible, so the stage can be
    // shown without a flash of un-positioned panels.
    gsap.set(stage, { autoAlpha: 1, pointerEvents: "auto" });
    // Down at rest, covering. Explicit so a re-run of this effect can never
    // start with the veil still lifted from the previous pass.
    gsap.set(veil, { yPercent: 0 });
    // Further travel and a shallower scale than a quick entrance would use:
    // more distance covered more slowly is what reads as weight. Per-ring, so
    // the edges start lower and further back — see the wave constants above.
    //
    // Indexed off `panelEls`, not the original render order: a null ref would
    // shift every subsequent panel's ring by one. In practice the filter above
    // drops nothing (all five refs are set by the time the effect runs), which
    // is also what keeps these indices aligned with the CSS `:nth-child` mirror.
    gsap.set(panelEls, {
      y: (i: number) => PANEL_RISE_Y[panelRing(i)],
      scale: (i: number) => PANEL_RISE_SCALE[panelRing(i)],
      opacity: 0,
      /* Hand every property the late beats overwrite back to the stylesheet.

         This effect re-runs: `panels` is a dependency, and `centreSrc` changes
         the moment CMS content arrives, so the second pass is the normal case
         on a cold load rather than an edge case. Nothing in `finishIntro` or the
         teardown restores these — the stage just goes `autoAlpha: 0` with the
         inline styles still on it — so without this a re-run would start with
         the outer panels still `display: none` from beat 7, the centre backing
         already transparent, and its layer promotion already dropped. The intro
         would replay against a half-finished stage.

         Empty strings, not concrete values: these are all CSS-declared, and
         removing the inline property is what lets the stylesheet speak again. */
      display: "",
      overflow: "",
      backgroundColor: "",
      willChange: "",
      backfaceVisibility: "",
    });
    gsap.set(counter, { autoAlpha: 1 });
    gsap.set(counterText, { yPercent: 0, opacity: 1 });
    counterText.textContent = "0%";
    gsap.set(wordmark, { autoAlpha: 1 });
    gsap.set(wordmarkText, { yPercent: 110, opacity: 0 });

    /* Ownership of the dark cover transfers here, from CSS to GSAP.

       The `html.intro-armed` rules and the `gsap.set`s above write identical
       values, and inline styles outrank a class rule — so by this line the
       composited result is already GSAP's and the class is inert. Dropping it
       now cannot expose a frame (`gsap.set` is synchronous, so nothing has
       painted since), whereas dropping it any earlier would revert the stage to
       `visibility: hidden` for a frame and flash the white page through: the
       original bug, inverted.

       Disarming *here* rather than in `finishIntro` is also what keeps the
       arming script's failsafe timeout out of the way. That timeout is shorter
       than this timeline, so leaving the class up for the whole sequence would
       let it tear the cover out mid-flight. Released at t≈0, the failsafe goes
       back to being purely a JS-never-arrived escape hatch. */
    disarmCover();

    /* Hide the real hero portrait for the duration of the intro.

       It sits at opacity 1 underneath (Hero deliberately does not animate it on
       this path — the intro owns its entrance). That was invisible while the
       dark stage covered it, but the stage now goes transparent *before* the
       expansion, which would leave the full-size hero portrait showing through
       beneath the intro's still-small centre panel — two copies of the same
       figure at once. It is cross-faded back in as the panel retires. */
    const heroPortrait = document.querySelector<HTMLElement>(
      `[${HERO_PORTRAIT_ATTR}]`
    );
    if (heroPortrait) gsap.set(heroPortrait, { opacity: 0 });

    /** Wait for the panel images to decode so they never fade in half-painted,
     *  but never let that wait become the bottleneck.
     *
     *  This wait used to be visible as a second step — a beat of dark stage
     *  before anything moved — because the stage itself only appeared once the
     *  bundle had hydrated. With the pre-paint cover it is just a dark hold at
     *  the front of a preloader, which is what a preloader is supposed to look
     *  like. The panels are `opacity: 0` throughout it under
     *  `html.intro-armed .landing-intro-panel`, matching what the `gsap.set`
     *  above writes, so the hold is seamless at both ends. Nothing to shorten
     *  here. */
    const waitForImages = () => {
      const imgs = Array.from(stage.querySelectorAll("img"));
      const decodes = imgs.map((img) =>
        img.decode?.().catch(() => undefined) ?? Promise.resolve()
      );
      return Promise.race([
        Promise.all(decodes),
        new Promise((resolve) => setTimeout(resolve, DECODE_TIMEOUT_MS)),
      ]);
    };

    const build = () => {
      if (cancelled) return;

      /* Retiring the stage is deliberately *not* the timeline's `onComplete`.
         The final swap waits on the hero portrait's paint, which can resolve a
         few frames after the last tween — and hiding the stage before the swap
         lands would take the panel away while the portrait is still invisible,
         dropping the figure entirely. So the swap calls this when it is done,
         and `onComplete` is only a fallback for the paths that never reach it. */
      let didFinish = false;
      const finishIntro = () => {
        if (didFinish || cancelled) return;
        didFinish = true;
        // Retiring the stage takes the panel away, so the real portrait must be
        // visible by now no matter which path got here — including the fallback
        // `onComplete` firing while a slow paint is still pending.
        if (heroPortrait) gsap.set(heroPortrait, { opacity: 1 });
        // No `disarmCover()` here on purpose: the pre-paint class was released
        // back at the handoff, thousands of frames ago, so this `autoAlpha: 0`
        // is uncontested and the stage retires normally.
        gsap.set(stage, { autoAlpha: 0, pointerEvents: "none" });
        unlockViewport();
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
          ScrollTrigger.refresh();
        });
      };

      tl = gsap.timeline({
        defaults: { ease: GLIDE },
        onComplete: finishIntro,
      });

      /* Beats are placed at absolute times rather than chained with relative
         offsets: the whole point of this sequence is the overlap between them,
         and absolute positions make that legible and tunable. */

      /* 1 — Panels rise centre-out as a wave. The centre leading quietly
         foreshadows which panel survives the collapse.

         `stagger` as a function rather than `{ each, from: "center" }`: the
         built-in form can only space starts evenly, and even spacing is the
         thing that made this read as five entrances instead of one swell. The
         per-ring delays close up as they go outward — see PANEL_RISE_DELAY.

         The panels start from per-ring y/scale (set above), so a single shared
         end state here is what actually produces the wave: everything converges
         on y:0 scale:1 in the same 1.5s, and the panels with further to travel
         are the ones still moving at the end. */
      tl.to(
        panelEls,
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 1.5,
          ease: RISE,
          stagger: (i: number) => PANEL_RISE_DELAY[panelRing(i)],
        },
        0
      );

      /* 1b — Wordmark rises with the panels, masked by its own wrapper's
         overflow exactly as the counter is. */
      tl.to(
        wordmarkText,
        { yPercent: 0, opacity: 1, duration: 1.0, ease: RISE },
        0.15
      );

      /* 2 — Counter, landing before the collapse starts so the two don't
         compete. `power1.inOut` keeps the digits moving at a confident rate;
         easing out hard would make it look stalled around 80. */
      tl.to(
        count,
        {
          value: 100,
          duration: 3.0,
          ease: "power1.inOut",
          snap: { value: 1 },
          onUpdate: () => {
            counterText.textContent = `${Math.round(count.value)}%`;
          },
        },
        0
      );

      /* 3 — The row gathers, starting inside beat 1's tail so there is no dead
         frame between them.

         Target and start value are a pair: `.landing-intro-row` opens wide at
         14.79vw (~213px at 1440px, the value that puts the row edge-to-edge)
         and closes to 2.5vw (~36px). Both are vw, so the gather covers
         proportionally the same ground on every viewport.

         This is now the sequence's biggest move by far — the row travels from
         spanning the full viewport down to a tight filmstrip, rather than the
         ~11px nudge it made when the panels opened close together. Retune the
         target whenever that start value changes; they are one pair, and a
         target near the start makes the beat a silent no-op. */
      tl.to(row, { gap: "2.5vw", duration: 1.5 }, 1.35);

      /* 5 — Outer panels collapse from the edges inward.

         Finishes at ~3.89, just before the veil starts its wipe at 3.95, so the
         panels close against the dark field they belong to. The margin matters:
         a collapse still running once the dark begins to leave reads as stray
         photo slivers on cream rather than as part of the composition.

         That margin is now 0.06s rather than the ~1.1s it had when the wipe ran
         at 5.0 — ordered, but no longer comfortable. It tightened because the
         wipe moved earlier to stay ahead of beat 7b (see there). If the last
         slivers ever read as sitting on cream, push the wipe to 4.05 rather
         than dragging this collapse earlier — beat 7's fit is measured off it. */
      tl.to(
        outerEls,
        {
          clipPath: "inset(50% 0% 50% 0%)",
          duration: 0.75,
          stagger: { each: 0.07, from: "edges" },
        },
        3.0
      );

      /* 6 — Counter leaves on its own beat, clearing the stage before the
         main event rather than riding the collapse out. */
      tl.to(
        counterText,
        { yPercent: -115, opacity: 0, duration: 0.6, ease: "power2.in" },
        3.02
      );

      /* 6b — Wordmark leaves on the same beat, so the two corners clear
         together and the stage is empty before the fit begins. */
      tl.to(
        wordmarkText,
        { yPercent: -115, opacity: 0, duration: 0.6, ease: "power2.in" },
        3.02
      );

      /* 7 — The centre panel is fitted onto the portrait's *painted* rect.
         Measured here rather than up front because fonts and images can still
         shift layout until this moment. */
      tl.add(() => {
        const wrapper = document.querySelector<HTMLElement>(
          `[${HERO_PORTRAIT_ATTR}]`
        );
        if (!wrapper) return;

        const rect = getPaintedPortraitRect(wrapper);

        // Flip.fit only accepts a real element, so this proxy *is* the rect.
        const proxy = document.createElement("div");
        proxy.className = "landing-intro-fit-proxy";
        proxy.style.width = `${rect.width}px`;
        proxy.style.height = `${rect.height}px`;
        proxy.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
        document.body.appendChild(proxy);
        fitProxy = proxy;

        const removeProxy = () => {
          proxy.remove();
          if (fitProxy === proxy) fitProxy = null;
        };

        // Take the outer panels out of the flex flow first, so the centre
        // panel's own box doesn't shift mid-fit.
        gsap.set(outerEls, { display: "none" });

        /* Release the panel's `overflow: hidden` before the fit.

           That clip is wanted for beats 1-6, where it keeps the portrait inside
           the panel's box as the panels rise and gather. It is fatal from here
           on: Flip grows the panel past those bounds, and a clip would shear the
           portrait off at its own edges mid-flight. Paired with
           `.landing-intro-stage` having no `contain` for the same reason — see
           globals.css. */
        gsap.set(centreEl, { overflow: "visible" });

        /* Drop the panel's layer-promotion hints before it flies.

           `will-change: transform, opacity, clip-path` and
           `backface-visibility: hidden` (globals.css) earned their keep through
           beats 1-6, where the panel rises, gathers and clips. They are wrong
           from here on: they pin the panel to its own compositor layer at the
           size it had when promoted, and that stale layer painted over the
           expansion — the same-size rectangle that appeared to mask the
           scale-up. `willChange: "auto"` is the load-bearing line.

           The backgroundColor set is belt-and-braces against beat 7b having
           silently no-opped (see the shorthand warning there), and is
           idempotent when it hasn't. */
        gsap.set(centreEl, {
          backgroundColor: "rgba(255,252,250,0)",
          willChange: "auto",
          backfaceVisibility: "visible",
        });

        const fit = Flip.fit(centreEl, proxy, {
          duration: 1.25,
          ease: "power2.inOut",
          absolute: true,
          scale: true,
          onComplete: removeProxy,
        });

        // Flip.fit returns null when there is nothing to animate; without this
        // the proxy would linger in the DOM.
        if (!fit) removeProxy();
      }, 3.8);

      /* 7b — Retire the centre panel's cream backing as it grows.

         ── PAIRED WITH THE CSS PROPERTY ──────────────────────────────────
         This animates the `backgroundColor` longhand, so
         `.landing-intro-panel--centre` must declare `background-color`, not the
         `background` shorthand. A shorthand there re-asserts itself over the
         inline value GSAP writes and the tween becomes a silent no-op — it runs
         to completion while the box stays fully opaque, which is exactly the
         bug this beat existed to prevent and showed as a white rectangle behind
         the portrait all the way onto the hero. Change one, check the other.

         The backing exists so the transparent portrait reads as a framed panel
         beside its solid neighbours. But the hero it is expanding into is not a
         flat cream field: the script marquee sits at z-20, *above* the
         portrait's z-10, and is meant to cross in front of the figure. At full
         size an opaque box would occlude it — leaving a visible rectangular
         seam and slicing through the marquee text.

         Its ordering against beat 8 is the safety property: the backing must
         never clear ahead of the dark, or the cutout is briefly exposed against
         a still-dark field — the exact look the backing exists to prevent.

         That test used to be a simple one, because the dark left by fading:
         a single global opacity, so "is the dark gone yet" had one answer
         everywhere on screen. Beat 8 is now a wipe, which makes it POSITIONAL —
         the dark clears at the top of the viewport long before the bottom, and
         this box sits at screen centre. The restated invariant is geometric:

           the veil's bottom edge must be above the centre panel's top edge
           before this backing finishes clearing.

         This runs *before* the expansion, not across it. The backing fades out
         while the outer panels are still collapsing (beat 5, 3.0 → 3.89), so
         the frame reads as: the neighbours pull back, the centre panel sheds
         its box, and only then does the bare portrait start to grow. Running it
         during the expansion made the box linger into the scale-up; running it
         after made it pop out once the panel had already landed.

         3.35 → 3.75 puts the whole dissolve inside the collapse window and
         finishes it 0.05s before beat 7 measures and fires at 3.8.

         The safety property still holds, and it is the reason this cannot move
         much earlier. The portrait is a transparent cutout — with the backing
         gone it reads as a figure floating on whatever is behind it, so the
         dark must be leaving by the time the box does. Beat 8's veil starts its
         wipe at 3.95, and the panel is small and centred here (its top edge is
         around 0.4H at this point in the sequence, before any scale-up), so the
         veil is still fully covering when this finishes.

         That is deliberate: the cutout sits against *dark* for the 0.2s between
         this dissolve ending and the wipe starting, which is correct — a bare
         figure on the dark field is the intended look at that instant. What must
         never happen is the reverse ordering at the *bottom* of the wipe, where
         a half-lifted veil would leave the figure straddling dark and cream.
         Keep this tween finishing before 3.95 and that cannot arise. */
      tl.fromTo(
        centreEl,
        { backgroundColor: "rgba(255,252,250,1)" },
        {
          backgroundColor: "rgba(255,252,250,0)",
          duration: 0.4,
          ease: "power2.out",
        },
        3.35
      );

      /* 8 — Handoff. The hero reveal and the wipe now start together, on the
         same frame as beat 7b's dissolve is getting underway, so the dark
         leaves *while* the portrait is still growing into place rather than
         after it has arrived. The hero's own stagger still brings its elements
         up from below into the newly uncovered page.

         The dark leaves as a shutter, not a fade: the veil's bottom edge
         travels straight up and off the top of the screen, revealing the cream
         page beneath. `yPercent: -100` on a full-bleed layer is exactly that
         motion, and the stage's `overflow: hidden` clips it on the way out.

         It is the VEIL that moves, never the stage. The stage also hosts the
         panels, and the centre one is mid-Flip toward the hero portrait at this
         moment — wiping the stage would carry the portrait off the top with it.
         That separation is the whole reason `.landing-intro-veil` exists as its
         own element rather than as a `background` on the stage.

         Transform only, deliberately. Animating `top`, `height` or `clip-path`
         here would drop a full-screen layer off the compositor and onto the
         main thread mid-sequence, alongside the Flip.

         0.9s, starting at 3.95 and landing at 4.85. Long enough that the wipe
         still reads as travel rather than a cut, short enough that the veil
         clears the centre panel's top edge before beat 7b's dissolve has taken
         the backing away. That second constraint is the binding one: beat 7b
         derives its safety margin from this exact start and duration, so
         retiming either without re-checking the table over there reintroduces
         the bare-cutout-on-dark bug it exists to prevent.

         `power3.out` front-loads the travel, so the page is uncovered early and
         the tail is a long settle — the shutter reads as fast and heavy rather
         than linear. Whatever ease sits here, it must not overshoot: an
         overshooting curve would dip the veil back down and briefly re-cover
         the page it had just revealed. */
      // Start the hero reveal as the wipe begins, partway into the centre
      // panel's scale-up: the hero's small internal offsets then bring the
      // marquee in around the middle of that fit rather than before it starts
      // or after it settles.
      tl.add(announceOnce, 3.95);
      tl.to(veil, { yPercent: -100, duration: 0.9, ease: "power3.out" }, 3.95);
      /* 9 — Handing the figure back: an instant swap, not a cross-fade.

         These two layers hold the *same* transparent cutout, stacked over a
         stage that has already gone clear. Cross-fading them on opacity looks
         correct in the timeline but isn't: through the overlap the composite
         alpha is 1-(1-a)(1-b), which never reaches 1. For a cutout that dip
         reads as the figure washing out — the flash this beat used to produce.
         No pair of opacity tweens avoids it; only ever having one copy visible
         does.

         An instant swap is invisible here because the two layers already
         match on both axes that could give it away.

         Geometry: the fit lands at 5.05 onto the portrait's *painted* rect,
         with the same `object-contain object-bottom` mapping on both sides.

         Resolution: the centre panel is requested at the hero's own `sizes`, so
         the right FILE is downloaded. That is all it can do, and it is not
         enough on its own — raster size is layout box × layer scale, so a large
         file painted into a ~100px panel is still a ~100px texture magnified
         ~6x by the fit. Expect some softness across this frame.

         A 750x1000 wrapper scaled down by CSS used to sit here to fix exactly
         that, making the fit a minification instead. It was removed because its
         scale factor is not expressible in CSS — see the note on
         `.landing-intro-panel` in globals.css. Reinstating it means computing
         the scale in JS; that is the fix if this seam ever reads too soft.

         Placed at 5.15, just after the fit settles. It used to sit at 6.5,
         which left ~1.3s of nothing at the end once the wipe and the dissolve
         moved earlier — the sequence had visibly finished but the stage was
         still up and the viewport still locked. */

      /* It is gated on the portrait having actually painted, because the hero's
         WebGL canvas is transparent until its texture loads — swapping to an
         unpainted canvas is the other half of the same flash. */
      tl.call(
        () => {
          if (!heroPortrait) {
            gsap.set(centreEl, { opacity: 0 });
            finishIntro();
            return;
          }

          waitForPortraitPaint(heroPortrait, PORTRAIT_READY_TIMEOUT_MS).then(
            () => {
              if (cancelled) return;
              // Order within the frame is the safety property: the portrait is
              // on before the panel is off, so no frame shows neither.
              gsap.set(heroPortrait, { opacity: 1 });
              gsap.set(centreEl, { opacity: 0 });
              finishIntro();
            }
          );
        },
        undefined,
        5.15
      );

      /* Hold the timeline open past the swap so its own `onComplete` can't fire
         first and retire the stage mid-handoff. The swap normally resolves well
         inside this window and calls `finishIntro` itself; this only bounds the
         wait. */
      tl.to({}, { duration: 0.5 }, 5.15);
    };

    waitForImages().then(build);

    return () => {
      cancelled = true;
      tl?.kill();
      fitProxy?.remove();
      // Never leave the page under a cover that nothing is animating. Normally
      // already released at the handoff above; this covers a teardown that
      // happened before the effect ever got that far.
      disarmCover();
      // Never leave the hero's own portrait hidden if the intro is torn down
      // mid-flight — otherwise an unmount during the sequence would strand the
      // page with an invisible portrait.
      if (heroPortrait) gsap.set(heroPortrait, { opacity: 1 });
      unlockViewport();
    };
  }, [panels]);

  return (
    <div ref={stageRef} className="landing-intro-stage" aria-hidden="true">
      {/* The dark field itself. First child and lowest z-index, so the panels
          and labels below paint over it; beat 8 wipes it up and away. */}
      <div ref={veilRef} className="landing-intro-veil" />

      <div ref={wordmarkRef} className="landing-intro-wordmark">
        <p ref={wordmarkTextRef}>© {name}</p>
      </div>

      <div ref={rowRef} className="landing-intro-row">
        {panels.map((src, i) => {
          const isCentre = i === CENTRE_INDEX;

          const image = (
            <Image
              src={src}
              alt=""
              fill
              priority
              /* The centre panel ends the sequence at the hero portrait's
                 painted size (~603px wide at desktop), so it must be requested
                 at the hero's own sizes — a 20vw hint resolves to ~284px and
                 goes visibly soft as it grows.

                 This governs which FILE is downloaded, and that is all it can
                 do. It is not on its own enough to keep the portrait sharp
                 through beat 7: raster size is layout box × layer scale, not
                 the decoded bitmap's size, so a large file painted into a
                 ~100px box still gets magnified ~6x as a ~100px texture.
                 Requesting the large file is still correct and costs nothing —
                 it is just not sufficient. See beat 9 for the rest. */
              sizes={
                isCentre
                  ? "(max-width: 640px) 95vw, (max-width: 1024px) 80vw, 750px"
                  : "(max-width: 640px) 34vw, 20vw"
              }
              /* Centre matches the hero's own object-fit so the crop is
                 identical at the seam; the panel's own 3/4 box holds the
                 intended portrait ratio, so this looks no different during the
                 earlier beats. Outer panels hold arbitrary aspects and still
                 need to fill their boxes.

                 ── `contain` HERE IS PAIRED WITH getPaintedPortraitRect ───────
                 Tempting to switch to `object-cover` so an off-ratio CMS
                 portrait can't letterbox inside the box. Don't. That function
                 computes beat 7's Flip target as the hero's CONTAIN rect,
                 because LiquidImage paints contain. Painting cover here and
                 contain there makes the two rects disagree for any portrait that
                 isn't 3:4, and beat 9's instant swap turns into a visible jump.

                 It is only ever a silent no-op or a bug, never a fix: at 3:4
                 contain and cover are the same picture. And `buildImageUrl`
                 (src/lib/sanity/image.ts) constrains WIDTH only — no crop — so
                 the CMS is free to serve a different ratio one day. Contain
                 degrades to a letterbox then; cover would desync the seam. */
              className={isCentre ? "object-contain object-bottom" : "object-cover"}
              aria-hidden="true"
            />
          );

          return (
            <div
              key={i}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className={`landing-intro-panel${
                isCentre ? " landing-intro-panel--centre" : ""
              }`}
            >
              {image}
            </div>
          );
        })}
      </div>

      <div ref={counterRef} className="landing-intro-counter">
        <p ref={counterTextRef}>0</p>
      </div>
    </div>
  );
}
