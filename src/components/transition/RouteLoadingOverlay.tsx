"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { COVER_CLASS, FLATTEN_CLASS } from "@/lib/caseStudyAdvance";
import TopProgressBar, { type TopProgressBarHandle } from "./TopProgressBar";
import { endRouteLoading, subscribeRouteLoading } from "@/lib/routeLoading";

/** Once shown, hold long enough to read as a deliberate beat, not a glitch. */
const MIN_VISIBLE_MS = 700;
/** Hard stop. A permanently stuck overlay is worse than the freeze it replaces. */
const MAX_VISIBLE_MS = 12000;
/** Matches the opacity transition applied to the stage on exit. */
const FADE_MS = 300;

type Phase = "idle" | "visible" | "exiting";

/**
 * Shows a top-of-viewport progress bar for the length of every route change.
 *
 * This is a transition beat, not a slow-route fallback. It used to be the
 * latter: the bar was gated behind a 150ms appear delay, on the theory that a
 * navigation faster than that needs no indicator. But every route here is
 * prerendered and prefetched, so the pathname almost always commits inside that
 * window and the bar never painted — worst of all unevenly, since the heavier
 * routes sometimes lost the race and the lighter ones (/contact especially)
 * never did. A page that appears out of nowhere on one link and fades in behind
 * a progress bar on the next reads as broken rather than fast.
 *
 * So the delay is gone: arming and painting are the same instant, and
 * MIN_VISIBLE_MS below is what gives the beat its length. The route itself
 * commits whenever it commits — usually within a frame or two — and the bar
 * plays out over the top of the page that already swapped in beneath it.
 *
 * This window used to be narrower still: the site ran a view transition, whose
 * snapshot froze the screen from the moment of the click, so nothing this
 * overlay did could be seen past that point (no z-index beats the
 * ::view-transition pseudo-element tree). Route changes are a plain swap now,
 * so the overlay is visible for the whole pending window.
 *
 * There used to be route-level `loading.tsx` files here too. They were removed
 * because committing to a Suspense fallback made the page-reveal animation land
 * on the loader instead of the page. That specific conflict is gone with the
 * transition, so they could be reconsidered — but check how a fallback
 * interacts with this overlay first, since the two now cover the same window.
 */
export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");

  const loaderRef = useRef<TopProgressBarHandle | null>(null);
  const shownAtRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  /** Mirrors `phase` so callbacks can branch without a stale closure. */
  const phaseRef = useRef<Phase>("idle");
  const mountedRef = useRef(false);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  /**
   * Run the bar to 100% *while still fully opaque* — so completion is
   * actually seen — and only then start the fade and unmount.
   */
  const exit = useCallback(() => {
    const finish = loaderRef.current?.finish() ?? Promise.resolve();
    finish.finally(() => {
      setPhaseSafe("exiting");
      addTimer(() => setPhaseSafe("idle"), FADE_MS);
    });
  }, [addTimer, setPhaseSafe]);

  /**
   * A route committed (or was abandoned) — wind down from wherever we are.
   *
   * Branches on `phaseRef` rather than inside a `setPhase` updater: React may
   * invoke an updater twice in StrictMode, which would double-schedule the
   * exit tween and its timer.
   */
  const settle = useCallback(() => {
    clearTimers();
    const current = phaseRef.current;

    if (current !== "visible") return;

    const elapsed = performance.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (remaining === 0) exit();
    else addTimer(exit, remaining);
  }, [addTimer, clearTimers, exit]);

  // Subscribe to navigation intent published by SmartLink.
  useEffect(() => {
    return subscribeRouteLoading((href) => {
      if (href === null) {
        settle();
        return;
      }

      clearTimers();

      // beginCaseStudyAdvance() sets these classes immediately before its
      // router.push, so they are already on <html> by the time this runs. The
      // scroll-driven case-study advance is a deliberate covered hard cut and
      // must not grow a progress bar on top of itself.
      const classes = document.documentElement.classList;
      if (classes.contains(COVER_CLASS) || classes.contains(FLATTEN_CLASS)) {
        setPhaseSafe("idle");
        return;
      }

      // Painted synchronously, in the same tick the click published: waiting
      // even a timeout of 0 hands React a chance to process the pathname flip
      // first, and on a prefetched route that is a real race the bar loses.
      shownAtRef.current = performance.now();
      setPhaseSafe("visible");
      addTimer(() => endRouteLoading(), MAX_VISIBLE_MS);
    });
  }, [addTimer, clearTimers, settle, setPhaseSafe]);

  // The authoritative clear: pathname flips when the real route commits.
  //
  // Skipped on mount, or a first paint would clear a navigation that a click
  // handler had just published — and this effect running on mount is not the
  // same event as the pathname changing.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    endRouteLoading();
  }, [pathname]);

  // Safety nets. endRouteLoading is idempotent, so these can overlap freely.
  useEffect(() => {
    const onPopState = () => endRouteLoading();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") endRouteLoading();
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  if (phase === "idle") return null;

  return (
    <div
      className="route-progress-overlay"
      data-visible={phase === "visible" || phase === "exiting" ? "true" : "false"}
      style={{ transition: `opacity ${FADE_MS}ms ease` }}
    >
      <TopProgressBar handleRef={loaderRef} />
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
