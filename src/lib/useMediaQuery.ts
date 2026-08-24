"use client";

import { useEffect, useRef, useState } from "react";
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
 * Starts `false` on the server AND on the first client render, then syncs in an
 * effect. The viewport is not knowable at SSR time, so any guess would risk a
 * hydration mismatch; agreeing on `false` and correcting one tick later is the
 * only shape that cannot mismatch. Callers must therefore treat `false` as
 * "narrow, or not yet measured" — fine for gating a mount, wrong for anything
 * that must be correct during the very first paint.
 *
 * Also re-syncs on a bfcache restore, where no effect re-runs and no `change`
 * event fires — see the comment on the `pageshow` listener below for why the
 * restored value can otherwise be wrong for the restored viewport.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);

    sync();
    mq.addEventListener("change", sync);

    /* A bfcache restore replays no effects and fires no `change` event, but the
       value it restores can disagree with the viewport it restores into: the
       initial `false` above is a construction, not a measurement, so a document
       frozen before this hook had settled comes back claiming "narrow" on a
       desktop window. Callers fork layout on that answer — Hero picks the
       portrait's `fit`/`focus` from it, so a stale `false` renders the desktop
       hero with a mobile cover-crop and the marquee at its phone offset.

       Reachable on the 404 round-trip specifically, because arriving at an
       unknown route is an MPA navigation (Next's router sees the non-200 RSC
       response and calls `location.assign`), which makes the Back that follows a
       cross-document traversal rather than a route change. Nothing in React
       re-runs on the way back.

       Guarded on `persisted` so an ordinary load does not pay for a second
       setState: on a fresh document the effect body has already just synced. */
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) sync();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [query]);

  return matches;
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
    /* Skipped on the first run. The initial value is always `false` by
       construction, so the first pass is the hook settling rather than the
       viewport crossing the breakpoint, and nothing has mounted or unmounted
       yet to invalidate. Refreshing here would only add a full re-measure of
       every trigger to initial load, racing the setup the sections are doing
       in their own effects. */
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
