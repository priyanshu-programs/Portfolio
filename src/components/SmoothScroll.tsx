"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { settleCaseStudyAdvance } from "@/lib/caseStudyAdvance";

gsap.registerPlugin(ScrollTrigger);

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
      // Settle any advance the document was frozen mid-way through, for the same
      // reason the route effect below does it: a bfcache restore replays no
      // effects, so nothing else would ever release the lock. Lenis's `isStopped`
      // discards all input and `.lenis-stopped` puts `overflow: hidden` on
      // <html>, which would restore the page completely dead — and would also
      // make the refresh below measure the document through a collapsed extent.
      // Idempotent, so it is safe on every wake, advance or not.
      settleCaseStudyAdvance();

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

  // Reset scroll to the top on route change: snap Lenis + native scroll, then
  // re-sync ScrollTrigger for the incoming page's pinned/scrubbed sections.
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
    // Both passes force synchronous layout of every trigger, and
    // `invalidateOnRefresh` pins (AboutStage's is +=250%) re-run their
    // function-based start/end values, each reading offsetWidth/offsetHeight.
    // They used to be deferred past the page-transition reveal so that reflow
    // batch didn't land on the compositing animation; with route changes now an
    // instant swap there is nothing to wait for, and measuring immediately is
    // strictly better — a deferral would leave the arriving page's pins
    // unmeasured while the reader can already scroll.
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;

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

    refreshAfterPaint();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
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
