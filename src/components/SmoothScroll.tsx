"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { settleCaseStudyAdvance } from "@/lib/caseStudyAdvance";

gsap.registerPlugin(ScrollTrigger);

/**
 * Duration of the view-transition reveal, in ms, per breakpoint.
 *
 * Mirrors `::view-transition-new(root)` in globals.css — keep the three values
 * (both durations and the breakpoint) in step with it. ScrollTrigger
 * measurement is deferred by this long so the reflow it forces lands after the
 * reveal has finished compositing rather than during it.
 *
 * Mobile runs a different, shorter animation (fade + scale, no clip-path), so
 * waiting the desktop 900ms there would idle for 520ms after the reveal is
 * already over — leaving the arriving page's pins unmeasured well into the
 * time the reader can scroll it.
 */
const REVEAL_MS = 900;
const REVEAL_MS_MOBILE = 380;
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Slack between the reveal ending and the reflow starting, in ms.
 *
 * The timer below is anchored to a painted frame, not to the animation's own
 * start, so the two can still drift by a frame or two. Enough margin that the
 * refresh lands *after* the final frame rather than on it.
 */
const SETTLE_BUFFER_MS = 80;

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    // Sync Lenis scroll position with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Use GSAP ticker to drive Lenis
    const tickHandler = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickHandler);

    // Disable GSAP's default lag smoothing so Lenis stays in control
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickHandler);
      lenis.destroy();
      lenisRef.current = null;
      if (window.__lenis === lenis) {
        window.__lenis = undefined;
      }
    };
  }, []);

  // OS sleep/wake (and bfcache restores) simply stop rAF for the duration —
  // Lenis's scroll state and ScrollTrigger's cached pin/scrub geometry go
  // stale relative to the real viewport. A pinned+scrubbed section (e.g.
  // Services' flip-card deck) can then render at a stuck, wrong progress
  // value on resume. Re-measure both once the tab has actually repainted.
  useEffect(() => {
    let raf = 0;

    const resync = () => {
      raf = requestAnimationFrame(() => {
        lenisRef.current?.resize();
        ScrollTrigger.refresh();
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") resync();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", resync);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", resync);
    };
  }, []);

  // Reset scroll to the top on route change. The native view transition swaps
  // the page, so we snap Lenis + native scroll and re-sync ScrollTrigger for
  // the incoming page's pinned/scrubbed sections.
  useEffect(() => {
    // Settle the outgoing page's advance, if it had one. Its unlock is scheduled
    // on the page that started it and deliberately outlives that component — but
    // this effect runs first and would otherwise cancel it, which left Lenis
    // stopped with no one to restart it and the arriving page completely frozen.
    // Settling both cancels the timer and completes its job, so ownership of the
    // lock can't fall between the two. Idempotent: safe on every route change,
    // advance or not.
    settleCaseStudyAdvance();

    // `force` is required, not cosmetic: Lenis ignores scrollTo while stopped,
    // and an advance may have stopped it. (settleCaseStudyAdvance has already
    // started it again by here, but this stays correct either way.)
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);

    // Refresh only after the settle above has cleared `lenis-stopped`. That
    // class carries `overflow: hidden` on <html>, and measuring the document
    // through it reports the scrollable extent as roughly one viewport —
    // ScrollTrigger would then cache maxScroll and every pin's start/end from a
    // collapsed page, leaving the arriving case study scrollable but with its
    // pins mis-triggering.
    //
    // Both passes are still needed, but neither may run *during* the page
    // reveal. A refresh forces synchronous layout of every trigger, and
    // `invalidateOnRefresh` pins (AboutStage's is +=250%) re-run their
    // function-based start/end values, each reading offsetWidth/offsetHeight.
    // Landing that reflow batch on top of the compositing view transition is
    // what made arriving at a pinned route stutter. So: wait for the transition
    // to finish, then measure.
    let cancelled = false;
    let startRaf = 0;
    let raf1 = 0;
    let raf2 = 0;
    let settleTimer = 0;

    const refreshAfterPaint = () => {
      if (cancelled) return;
      raf1 = requestAnimationFrame(() => {
        if (cancelled) return;
        ScrollTrigger.refresh();
        // The second pass catches a late layout settle (images resolving) that
        // would otherwise leave those metrics stale. Given a frame of its own
        // rather than chained back-to-back, so the two reflows don't land in
        // one long block.
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });
      });
    };

    // next-view-transitions owns the ViewTransition object and never hands it
    // out (it exposes only Link/ViewTransitions/useTransitionRouter), so there
    // is no `finished` promise to await here. Wait out the reveal by its known
    // duration instead — the REVEAL_MS constants mirror the animations in
    // globals.css and must be kept in step with them.
    //
    // When the API is unavailable (Firefox/Safari without view transitions) or
    // the user prefers reduced motion, globals.css runs no reveal, so measuring
    // immediately is both safe and better.
    const skipsReveal =
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (skipsReveal) {
      refreshAfterPaint();
    } else {
      const revealMs = window.matchMedia(MOBILE_QUERY).matches
        ? REVEAL_MS_MOBILE
        : REVEAL_MS;

      // Anchored to a painted frame, not to this effect body. The effect runs
      // when React commits the route, which is *before* the browser starts the
      // reveal — starting the clock here charges the wait for commit-to-animation
      // latency against the animation's own duration, and on a phone that
      // latency is large enough to land both reflows inside the reveal. Which is
      // precisely what the deferral exists to prevent.
      //
      // rAF fires on the next frame the browser paints, by which point the
      // pseudo-element tree is up and the animation is running, so the timeout
      // measures from something much closer to the true start.
      startRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        settleTimer = window.setTimeout(
          refreshAfterPaint,
          revealMs + SETTLE_BUFFER_MS,
        );
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(startRaf);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(settleTimer);
    };
  }, [pathname]);

  /*
   * A real host node, not a fragment.
   *
   * As a fragment this component contributed no element, which made <body> the
   * direct React parent of a flat sibling list: the arming <script>, the whole
   * route tree, SiteFooter, and the overlay hosts. Browser extensions inject
   * their own nodes as direct children of <body>, and React tracks siblings by
   * position in that list — an injected node between them is what turns an
   * unmount into "removeChild: the node to be removed is not a child of this
   * node". Anything appended to <body> now lands outside the subtree React
   * reconciles.
   *
   * Layout-neutral on purpose: <body> is `min-h-full flex flex-col`, so this
   * div is a flex child that needs to grow, and .page-wrapper inside it already
   * owns width and min-height. `display: contents` would NOT do — it removes
   * the box from layout but leaves the node in the tree, which is the one thing
   * that has to stay real here.
   *
   * Lenis is unaffected: it is constructed with no `wrapper`/`content`, so it
   * scrolls window/documentElement regardless of this element.
   */
  return (
    <div id="scroll-root" className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
