"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { settleCaseStudyAdvance } from "@/lib/caseStudyAdvance";

gsap.registerPlugin(ScrollTrigger);

/**
 * Duration of the `pr-page-reveal` view-transition animation, in ms.
 *
 * Mirrors `::view-transition-new(root)` in globals.css — keep the two in step.
 * ScrollTrigger measurement is deferred by this long so the reflow it forces
 * lands after the reveal has finished compositing rather than during it.
 */
const REVEAL_MS = 900;

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
    // duration instead — REVEAL_MS mirrors the `pr-page-reveal` animation in
    // globals.css and must be kept in step with it.
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
      settleTimer = window.setTimeout(refreshAfterPaint, REVEAL_MS);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(settleTimer);
    };
  }, [pathname]);

  return <>{children}</>;
}
