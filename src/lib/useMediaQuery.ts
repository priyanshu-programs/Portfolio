"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Shared `matchMedia` subscription.
 *
 * The codebase reads media queries inline in a dozen places; this is the one
 * spot that owns the SSR-safe shape of it, so a new call site cannot
 * reintroduce the hydration bug by hand.
 */

/** The desktop fork. Mirrors Tailwind's stock `lg`, which is already the
 *  breakpoint Hero, Services, AboutStage and heroPortrait fork on. Stated once
 *  here so a fourth literal never enters the codebase — see the "do not
 *  introduce a third value" note in globals.css. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Reports `false` on the server, and the real viewport on the client.
 *
 * ── WHY `useSyncExternalStore` AND NOT `useState(false)` + AN EFFECT ──────
 * This used to start `false` on the server AND on the first client render, on
 * the reasoning that the viewport is unknowable at SSR time so agreeing on
 * `false` and correcting one tick later "is the only shape that cannot
 * mismatch". That is true of HYDRATION, but it was applied too broadly: it also
 * forced a wrong first render on renders that are not hydrating at all.
 *
 * A soft navigation is the case that matters. Arriving at `/` from `/work`
 * mounts a fresh tree with no server HTML to match, so nothing was ever at risk
 * — yet every caller still got `false` for one commit. Hero forked the hero
 * portrait's fit on that answer, so the desktop homepage painted one frame of
 * the mobile cover-crop (a scaled-up, focal-cropped portrait) on every arrival.
 *
 * `useSyncExternalStore` with a distinct `getServerSnapshot` is React's
 * sanctioned form for exactly this: React knows the two snapshots differ and
 * re-renders after hydration instead of warning. Hydration behaviour is
 * therefore UNCHANGED — a hard load still renders `false` once and corrects
 * immediately after — while a soft navigation now reads the true value on its
 * very first render, because `getSnapshot` is all there is.
 *
 * Callers on the hydration path must still treat `false` as "narrow, or not yet
 * measured". Anything that must be correct in the first painted frame of a HARD
 * load belongs in CSS, not here — see `--liquid-object-position` in globals.css
 * and `LiquidImageFitMode` for the shape that solves.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);

      /* A bfcache restore replays no effects and fires no `change` event, and
         triggers no render of its own — so without this the restored tree keeps
         whatever value it was frozen with. That value can disagree with the
         viewport it restores into: a document frozen before this hook had
         settled comes back claiming "narrow" on a desktop window. Callers fork
         layout on that answer — Hero picks the marquee's phone offset from it.

         Reachable on the 404 round-trip specifically, because arriving at an
         unknown route is an MPA navigation (Next's router sees the non-200 RSC
         response and calls `location.assign`), which makes the Back that follows
         a cross-document traversal rather than a route change. Nothing in React
         re-runs on the way back.

         Unconditional here, unlike the `persisted` guard this replaced: waking
         the store is idempotent (React re-reads `getSnapshot` and bails if the
         value is unchanged), so a non-persisted `pageshow` costs nothing. */
      window.addEventListener("pageshow", onStoreChange);

      return () => {
        mq.removeEventListener("change", onStoreChange);
        window.removeEventListener("pageshow", onStoreChange);
      };
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * `useMediaQuery(DESKTOP_QUERY)` plus a ScrollTrigger refresh on every change.
 *
 * The refresh is not optional. Callers use this to mount and unmount whole
 * sections, and a section entering or leaving changes the document's height —
 * including, for a pinned trigger, the height its own .pin-spacer contributes.
 * Every other trigger on the page has start/end values cached against the old
 * height, so without this they keep firing at stale scroll positions until
 * something else happens to refresh them. Hero does the same thing on the same
 * query for the same reason.
 */
export function useIsDesktop(): boolean {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const settled = useRef(false);

  useEffect(() => {
    /* Skipped on the first run: that pass is this hook settling, not the
       viewport crossing the breakpoint, and nothing has mounted or unmounted
       yet to invalidate. Refreshing there would only add a full re-measure of
       every trigger to initial load, racing the setup the sections are doing in
       their own effects.

       This guard used to under-deliver. While `useMediaQuery` always opened at
       `false`, a desktop SOFT navigation still transitioned `false → true`, so
       the effect ran a second time with `settled` already set and fired a real
       refresh on every arrival at `/`. Now that the hook reads the true value on
       a non-hydrating first render there is no transition to chase, and the
       guard finally means what it says. The hydration path still transitions
       once, which is the case it was written for. */
    if (!settled.current) {
      settled.current = true;
      return;
    }

    /* Deferred a frame rather than run inline. Child effects do run before the
       parent's, so the DOM is already in its new shape by the time this fires -
       but "already reshaped" is not the same as "done being reshaped". React is
       still inside the commit that deletes the outgoing section's host nodes,
       and a refresh here re-measures every live trigger, which for a pinned one
       means touching the DOM around a node React is midway through removing.
       A frame later the commit is closed and the measurement is just as correct. */
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [isDesktop]);

  return isDesktop;
}
