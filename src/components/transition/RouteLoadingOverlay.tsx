"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { COVER_CLASS, FLATTEN_CLASS } from "@/lib/caseStudyAdvance";
import TopProgressBar, { type TopProgressBarHandle } from "./TopProgressBar";
import {
  endRouteLoading,
  getPendingStartedAt,
  subscribeRouteLoading,
} from "@/lib/routeLoading";

/** Below this, the navigation was fast enough that showing anything is noise. */
const APPEAR_DELAY_MS = 150;
/** Once shown, hold long enough to read as a deliberate beat, not a glitch. */
const MIN_VISIBLE_MS = 700;
/** Hard stop. A permanently stuck overlay is worse than the freeze it replaces. */
const MAX_VISIBLE_MS = 12000;
/** Matches the opacity transition applied to the stage on exit. */
const FADE_MS = 300;

type Phase = "idle" | "armed" | "visible" | "exiting";

/**
 * Shows a top-of-viewport progress bar when a navigation is taking too long.
 *
 * Its coverage window is narrower than it looks, and worth being precise about:
 * `startViewTransition` screenshots the DOM synchronously inside the click
 * handler, and while that snapshot is on screen no live DOM change paints. So
 * this overlay cannot be seen once the transition has started, and no z-index
 * beats the ::view-transition pseudo-element tree.
 *
 * What it actually covers is the *pre-snapshot* wait — from click+150ms until
 * the route commits and the transition begins. On this site every route is
 * prerendered and prefetched, so that window is normally zero and the overlay
 * never paints. It exists for the genuinely cold case.
 *
 * There used to be route-level `loading.tsx` files here too. They were removed:
 * committing to a Suspense fallback made the 0.9s `pr-page-reveal` zoom land on
 * the loader instead of the page, and the real content then cut in unanimated
 * because nothing starts a second view transition. Do not reintroduce them
 * without solving that.
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

    if (current === "armed") {
      setPhaseSafe("idle"); // never painted; nothing to unwind
      return;
    }
    if (current !== "visible") return;

    const elapsed = performance.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (remaining === 0) exit();
    else addTimer(exit, remaining);
  }, [addTimer, clearTimers, exit, setPhaseSafe]);

  // Subscribe to navigation intent published by SmartLink.
  useEffect(() => {
    return subscribeRouteLoading((href) => {
      if (href === null) {
        settle();
        return;
      }

      clearTimers();
      setPhaseSafe("armed");

      addTimer(() => {
        // Checked here rather than at arm time: beginCaseStudyAdvance() sets
        // these classes immediately before its router.push, and the case-study
        // advance is a deliberate covered hard cut that must not be fought.
        const classes = document.documentElement.classList;
        if (classes.contains(COVER_CLASS) || classes.contains(FLATTEN_CLASS)) {
          setPhaseSafe("idle");
          return;
        }
        shownAtRef.current = performance.now();
        setPhaseSafe("visible");
        addTimer(() => endRouteLoading(), MAX_VISIBLE_MS);
        // Measured from when the click published, not from this subscriber
        // callback, so a slow handler can't push the loader in late.
      }, Math.max(0, APPEAR_DELAY_MS - (performance.now() - getPendingStartedAt())));
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

  if (phase === "idle" || phase === "armed") return null;

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
