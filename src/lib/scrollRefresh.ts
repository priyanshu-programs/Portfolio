/**
 * Coalesced `ScrollTrigger.refresh()`.
 *
 * Several components mount together on one route — a case study mounts both
 * CaseStudyGallery and NextProject, each of which used to refresh on its own
 * frame, on top of SmoothScroll's own two passes. A refresh is a full
 * synchronous re-measure of every registered trigger, and `invalidateOnRefresh`
 * pins re-run their function-based start/end on top of that. Running it once
 * instead of N times is a real saving.
 *
 * Module scope rather than React state, mirroring routeLoading.ts: the callers
 * are independent components that never see each other, and the pending frame
 * has to be shared between them.
 */

import { ScrollTrigger } from "gsap/ScrollTrigger";

let pendingRefresh = 0;

/**
 * Schedule a refresh on the next frame, folding into one already scheduled.
 *
 * Returns a cancel handle for effect cleanup. Cancelling only drops *this*
 * caller's claim, and only while it is still the one holding the frame: a
 * refresh another caller has since claimed stands, which is correct — it was
 * going to measure this component's triggers too.
 */
export function coalescedRefresh(): () => void {
  if (pendingRefresh === 0) {
    pendingRefresh = requestAnimationFrame(() => {
      pendingRefresh = 0;
      ScrollTrigger.refresh();
    });
  }

  const scheduled = pendingRefresh;
  return () => {
    if (pendingRefresh === scheduled && pendingRefresh !== 0) {
      cancelAnimationFrame(pendingRefresh);
      pendingRefresh = 0;
    }
  };
}
