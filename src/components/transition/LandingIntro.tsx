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

gsap.registerPlugin(ScrollTrigger, Flip, CustomEase);

/** Fires (on `window`) once the intro has finished — or was skipped — so the
 *  hero knows it may play its entrance. */
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
 *  The local asset is 1086×1448 and the optimized file 750×1000 — both 0.75. */
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

/** Five panels, centre last-standing. Outer panels are on screen ~1.5s and
 *  collapse first, so a repeated source at the edge reads as texture, not as a
 *  duplicate. Falls back to local art when Sanity is unreachable. */
const FALLBACK_CENTRE = "/images/hero-portrait.png";
const FALLBACK_OUTER = "/images/about 1.jpg";
const PANEL_COUNT = 5;
const CENTRE_INDEX = 2;

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
 * Dispatches LANDING_INTRO_DONE_EVENT when finished so the hero can animate
 * everything *except* the portrait — which this component now owns.
 */
export default function LandingIntro() {
  const content = useSiteContent();

  /** Same source and fallback the hero uses, so the intro's label and the nav's
   *  can never disagree. */
  const name = content?.settings?.name ?? "Priyanshu Roy";

  const stageRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const counterTextRef = useRef<HTMLParagraphElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const wordmarkTextRef = useRef<HTMLParagraphElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** Centre is the hero portrait itself, so the fit at the end lands on the
   *  same picture the hero is about to show. Outer slots draw from the about
   *  page's photos — the only other tall, full-resolution art in the CMS —
   *  cycling if there are fewer than four. */
  const centreSrc = content?.hero?.portrait ?? FALLBACK_CENTRE;
  /** Joined rather than kept as an array so the memo below is keyed on the URLs
   *  themselves. `content` gets a new identity on every revalidation, and the
   *  sequence runs off a `[panels]` effect — so keying on the object would tear
   *  down and restart a running intro (stranding the hero portrait visible via
   *  the cleanup's restore) whenever the CMS content merely re-resolved to the
   *  same images. */
  const outerKey = (content?.about?.slots ?? [])
    .map((slot) => slot.image)
    .filter((src): src is string => Boolean(src))
    .join("|");

  const panels = useMemo(() => {
    const pool = outerKey ? outerKey.split("|") : [];

    return Array.from({ length: PANEL_COUNT }, (_, i) => {
      if (i === CENTRE_INDEX) return centreSrc;
      // Outer slots read 0,1,_,2,3 into the pool.
      const outerIndex = i > CENTRE_INDEX ? i - 1 : i;
      return pool.length
        ? pool[outerIndex % pool.length]
        : FALLBACK_OUTER;
    });
  }, [centreSrc, outerKey]);

  useEffect(() => {
    const announceDone = () => {
      window.dispatchEvent(new CustomEvent(LANDING_INTRO_DONE_EVENT));
    };

    // Skip the intro (soft nav, back/forward, or reduced motion): let the hero
    // reveal immediately.
    if (!shouldPlayLandingIntro()) {
      requestAnimationFrame(announceDone);
      return;
    }

    const stage = stageRef.current;
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
      !row ||
      !counter ||
      !counterText ||
      !wordmark ||
      !wordmarkText ||
      panelEls.length === 0
    ) {
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
    // Further travel and a shallower scale than a quick entrance would use:
    // more distance covered more slowly is what reads as weight.
    gsap.set(panelEls, { y: 56, scale: 0.94, opacity: 0 });
    gsap.set(counter, { autoAlpha: 1 });
    gsap.set(counterText, { yPercent: 0, opacity: 1 });
    counterText.textContent = "0%";
    gsap.set(wordmark, { autoAlpha: 1 });
    gsap.set(wordmarkText, { yPercent: 110, opacity: 0 });

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
     *  but never let that wait become the bottleneck. */
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

      /* 1 — Panels rise, centre-out. The centre leading quietly foreshadows
         which panel survives the collapse. */
      tl.to(
        panelEls,
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 1.5,
          ease: RISE,
          stagger: { each: 0.14, from: "center" },
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
          duration: 2.5,
          ease: "power1.inOut",
          snap: { value: 1 },
          onUpdate: () => {
            counterText.textContent = `${Math.round(count.value)}%`;
          },
        },
        0
      );

      /* 3 + 4 — The row gathers and the panels breathe up together, starting
         inside beat 1's tail so there is no dead frame between them. */
      tl.to(row, { gap: "0.4vw", duration: 1.5 }, 1.35)
        .to(panelEls, { scale: 1.06, duration: 1.5 }, "<");

      /* 4b — A whisper of a settle so the gather relaxes instead of stopping
         dead at its peak. Meant to be felt, not seen. */
      tl.to(panelEls, { scale: 1.045, duration: 0.9, ease: "sine.inOut" }, 2.7);

      /* 5 — Outer panels collapse from the edges inward.

         Tightened and pulled earlier (was 2.95, dur 0.95, stagger 0.11) so the
         collapse is essentially finished before the stage starts to lighten at
         3.30. Otherwise the last panels are still closing against an
         already-cream background — they read as stray photo slivers rather than
         as part of the dark composition. */
      tl.to(
        outerEls,
        {
          clipPath: "inset(50% 0% 50% 0%)",
          duration: 0.75,
          stagger: { each: 0.07, from: "edges" },
        },
        2.7
      );

      /* 6 — Counter leaves on its own beat, clearing the stage before the
         main event rather than riding the collapse out. */
      tl.to(
        counterText,
        { yPercent: -115, opacity: 0, duration: 0.6, ease: "power2.in" },
        2.72
      );

      /* 6b — Wordmark leaves on the same beat, so the two corners clear
         together and the stage is empty before the fit begins. */
      tl.to(
        wordmarkText,
        { yPercent: -115, opacity: 0, duration: 0.6, ease: "power2.in" },
        2.72
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

        const fit = Flip.fit(centreEl, proxy, {
          duration: 1.25,
          ease: SETTLE,
          absolute: true,
          scale: true,
          onComplete: removeProxy,
        });

        // Flip.fit returns null when there is nothing to animate; without this
        // the proxy would linger in the DOM.
        if (!fit) removeProxy();
      }, 3.95);

      /* 7b — Retire the centre panel's cream backing as it grows.

         The backing exists so the transparent portrait reads as a framed panel
         beside its solid neighbours. But the hero it is expanding into is not a
         flat cream field: the script marquee sits at z-20, *above* the
         portrait's z-10, and is meant to cross in front of the figure. At full
         size an opaque box would occlude it — leaving a visible rectangular
         seam and slicing through the marquee text.

         So the backing dissolves *before* the expansion, finishing as beat 7
         begins — the panel grows as a bare portrait, never as a moving box.

         It runs on the same curve as the stage's own dissolve and starts 0.05s
         after it. That ordering is the safety property: the backing must never
         clear ahead of the dark, or the cutout is briefly exposed against a
         still-dark stage — the exact look the backing exists to prevent.
         Modelled across the window, max(stageDark − backing) is 0. */
      tl.to(
        centreEl,
        {
          backgroundColor: "rgba(255,252,250,0)",
          duration: 0.6,
          ease: "power2.out",
        },
        3.35
      );

      /* 8 — Handoff. The hero starts while the panel is still travelling, so
         nav and text arrive *around* the settling portrait rather than after
         it.

         The stage dissolves early — paired with the backing above rather than
         held until the end. Retiring the two together is what lets the backing
         go before the expansion without ever exposing the cutout against a dark
         field: the background lightens in step with the box, so the panel
         expands onto an already-light stage.

         `power2.out` front-loads the change, so the darkness clears quickly and
         the tail is a long soft settle — a slow dissolve that costs no extra
         time. It also means the veil is fully gone (0.000) by the time the
         hero's vertical text motion runs at ~5.03, which strengthens rather
         than risks the wipe-reads-as-fade fix. */
      tl.add(announceOnce, 4.55);
      tl.to(
        stage,
        {
          backgroundColor: "rgba(26,26,26,0)",
          duration: 0.65,
          ease: "power2.out",
        },
        3.3
      );
      /* 9 — Handing the figure back: an instant swap, not a cross-fade.

         These two layers hold the *same* transparent cutout, stacked over a
         stage that has already gone clear. Cross-fading them on opacity looks
         correct in the timeline but isn't: through the overlap the composite
         alpha is 1-(1-a)(1-b), which never reaches 1. For a cutout that dip
         reads as the figure washing out — the flash this beat used to produce.
         No pair of opacity tweens avoids it; only ever having one copy visible
         does.

         An instant swap is invisible here because the two rects are already
         pixel-identical: the fit lands at 5.20 onto the portrait's *painted*
         rect, and the centre panel is requested at the hero's own `sizes` with
         the same `object-contain object-bottom` mapping.

         It is gated on the portrait having actually painted, because the hero's
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
        5.2
      );

      /* Hold the timeline open past the swap so its own `onComplete` can't fire
         first and retire the stage mid-handoff. The swap normally resolves well
         inside this window and calls `finishIntro` itself; this only bounds the
         wait. */
      tl.to({}, { duration: 0.5 }, 5.2);
    };

    waitForImages().then(build);

    return () => {
      cancelled = true;
      tl?.kill();
      fitProxy?.remove();
      // Never leave the hero's own portrait hidden if the intro is torn down
      // mid-flight — otherwise an unmount during the sequence would strand the
      // page with an invisible portrait.
      if (heroPortrait) gsap.set(heroPortrait, { opacity: 1 });
      unlockViewport();
    };
  }, [panels]);

  return (
    <div ref={stageRef} className="landing-intro-stage" aria-hidden="true">
      <div ref={wordmarkRef} className="landing-intro-wordmark">
        <p ref={wordmarkTextRef}>© {name}</p>
      </div>

      <div ref={rowRef} className="landing-intro-row">
        {panels.map((src, i) => (
          <div
            key={i}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className={`landing-intro-panel${
              i === CENTRE_INDEX ? " landing-intro-panel--centre" : ""
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              priority
              /* The centre panel ends the sequence at the hero portrait's
                 painted size (~603px wide at desktop), so it must be requested
                 at the hero's own sizes — a 20vw hint resolves to ~284px and
                 goes visibly soft as it grows. */
              sizes={
                i === CENTRE_INDEX
                  ? "(max-width: 640px) 95vw, (max-width: 1024px) 80vw, 750px"
                  : "(max-width: 640px) 34vw, 20vw"
              }
              /* Centre matches the hero's own object-fit so the crop is
                 identical at the seam; the panel is already 3:4, so this looks
                 no different during the earlier beats. Outer panels hold
                 arbitrary aspects and still need to fill their boxes. */
              className={
                i === CENTRE_INDEX
                  ? "object-contain object-bottom"
                  : "object-cover"
              }
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      <div ref={counterRef} className="landing-intro-counter">
        <p ref={counterTextRef}>0</p>
      </div>
    </div>
  );
}
