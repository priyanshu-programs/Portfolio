/**
 * Shared contract for the "scroll into the next case study" navigation.
 *
 * Three places need to agree on it: NextProject starts the advance, CaseStudy
 * reads the marker to skip its intro, and SmoothScroll settles a still-running
 * advance when the route change it caused arrives.
 *
 * Two classes, not one, because the two jobs have different lifetimes:
 *
 * - `cs-cover` gates the *scroll lock*, and must be releasable by whoever
 *   handles the route change (see `settleCaseStudyAdvance`).
 * - `cs-flatten` marks *how the reader got here* — by the scroll gesture rather
 *   than a click — and must outlive the route change so the arriving page can
 *   still read it on mount.
 *
 * They used to be the same class, and the collapse was a real bug: SmoothScroll's
 * `[pathname]` effect calls `settleCaseStudyAdvance()` and removes the class
 * about a frame into the navigation, which is *before* the arriving CaseStudy
 * mounts and probes it. Releasing the lock must not erase the marker, hence the
 * split. Do not fold them back together.
 *
 * `cs-flatten` was originally named for flattening the site's page transition to
 * a hard cut. That transition has since been removed and the class has no CSS
 * consumers left, but the name is kept: it is the public contract shared with
 * CaseStudy's probe, and the meaning it still carries — "this navigation came
 * from the scroll gesture" — is what that consumer actually keys off.
 */

/**
 * Set on <html> for the length of the route push that follows scrolling
 * through the foot-of-page sneak peek. Gates the scroll lock only.
 */
export const COVER_CLASS = "cs-cover";

/**
 * Set on <html> to mark a navigation as having come from the foot-of-page
 * scroll gesture rather than a click.
 *
 * Its only consumer is CaseStudy's intro-skip probe: scroll position already
 * carries the reader to the destination's top, so playing an entrance there
 * would pop into an already-settled scroll. Read on mount, so it has to outlive
 * the route change — which is why it is timed separately from the scroll lock.
 */
export const FLATTEN_CLASS = "cs-flatten";

/**
 * How long the cover class stays on after the push. Only needs to outlast the
 * navigation and the incoming page's first paint — there is no animation to
 * wait for — but it also gates the scroll lock, so it wants enough room for
 * layout to settle (images resolving, ScrollTrigger refreshing) before input
 * comes back at the new scroll position.
 */
export const COVER_DURATION_MS = 900;

/**
 * How long the marker stays on, measured from the push.
 *
 * Only has to outlast the navigation itself now — the class goes on *before*
 * `router.push`, and the arriving CaseStudy probes it in a mount effect, so the
 * window must cover route commit plus first render. A cold-ish route can take a
 * few hundred ms.
 *
 * Deliberately generous: overshooting is harmless, since a stale `cs-flatten`
 * can only skip an intro on a navigation this same gesture would have skipped
 * anyway, whereas undershooting drops the marker before the probe reads it and
 * the intro plays into an already-settled scroll. Was 1600ms when it also had
 * to outlive a 320ms crossfade; trimmed now that only the commit matters.
 */
const FLATTEN_DURATION_MS = 900;

/**
 * Handle for the in-flight advance's scroll lock.
 *
 * The unlock has to outlive NextProject: the component unmounts *during* the
 * navigation it starts, so a cleanup-owned timer would leave <html> locked and
 * scrolling dead forever. But "outlives the component" was previously
 * implemented as "cannot be cancelled", which meant a click navigation landing
 * inside the 900ms window got its scroll snapped to 0 by the previous page's
 * orphaned timer — scrollTo's `force: true` defeats the usual stopped-Lenis
 * guard, so nothing else stood in the way. Parking the handle at module scope
 * keeps the timer alive across the unmount while still giving a later
 * navigation a way to disown it.
 */
let unlockTimer: number | null = null;

/**
 * Handle for the in-flight advance's marker, at module scope for the same
 * reason as `unlockTimer` — NextProject unmounts during the navigation, so a
 * cleanup-owned timer would leave the marker set forever.
 *
 * Deliberately *not* touched by `abandonCaseStudyAdvance` or
 * `settleCaseStudyAdvance`: those run on the route change, which happens before
 * the arriving page has mounted and read the marker.
 */
let flattenTimer: number | null = null;

/**
 * Take the lock: freeze scroll, mark the navigation as gesture-driven, and
 * schedule the unlock. The caller pushes the route itself.
 *
 * stop() zeroes Lenis's velocity and drops the running animation, so the
 * momentum tail of the gesture that got here dies rather than carrying into the
 * incoming page; it also sets `lenis-stopped` (overflow: hidden), closing the
 * native scroll route too.
 */
export function beginCaseStudyAdvance() {
  // Supersede rather than stack: two timers racing on the same <html> would
  // have the first one's unlock cut the second one's cover short. Abandon, not
  // settle — the lock we're about to take would undo an intervening start().
  abandonCaseStudyAdvance();

  const root = document.documentElement;
  root.classList.add(COVER_CLASS);
  root.classList.add(FLATTEN_CLASS);
  window.__lenis?.stop();

  // Released on its own timer, independent of the scroll lock, so the route
  // change cannot clear the marker before the arriving page reads it.
  if (flattenTimer !== null) window.clearTimeout(flattenTimer);
  flattenTimer = window.setTimeout(() => {
    flattenTimer = null;
    root.classList.remove(FLATTEN_CLASS);
  }, FLATTEN_DURATION_MS);

  unlockTimer = window.setTimeout(() => {
    unlockTimer = null;
    root.classList.remove(COVER_CLASS);
    // Re-assert the top before handing input back: the incoming page's layout
    // settles while this is still running (images resolving, ScrollTrigger
    // refreshing). Position first, then start(), so there is no frame where
    // scrolling is live at the wrong offset.
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    window.__lenis?.start();
  }, COVER_DURATION_MS);
}

/**
 * Drop the scroll lock without restoring scroll, for one advance superseding
 * another.
 *
 * Only `beginCaseStudyAdvance` should need this: the incoming advance
 * immediately re-stops and re-schedules, so unfreezing in between would be a
 * visible flicker. Anything else ending an advance wants
 * `settleCaseStudyAdvance`.
 *
 * Leaves `cs-flatten` alone — that marker answers to the arriving page's mount,
 * not the lock's lifetime.
 */
function abandonCaseStudyAdvance() {
  if (unlockTimer === null) return;
  window.clearTimeout(unlockTimer);
  unlockTimer = null;
  document.documentElement.classList.remove(COVER_CLASS);
}

/**
 * Finish an advance now instead of on its timer: clear the cover and hand scroll
 * back. Does not clear `cs-flatten` — the arriving page has not mounted and read
 * that marker yet at the moment this is called.
 *
 * This exists because the advance's unlock is scheduled on the page that starts
 * it, but the route change it triggers lands ~16-150ms later — far inside the
 * 900ms window. Whatever handles that route change therefore *destroys* the only
 * scheduled `start()`, so it has to complete the handoff itself. Cancelling
 * without doing so left Lenis stopped forever: `isStopped` discards all
 * wheel/touch input, and the `lenis-stopped` class puts `overflow: hidden` on
 * <html>, so the page was completely dead on arrival. Note `scrollTo`'s
 * `force: true` does *not* rescue that — it bypasses the stopped-check for one
 * call and never clears `isStopped`.
 *
 * `start()` runs unconditionally rather than only when a timer was pending:
 * Lenis's `start()` is idempotent (it sets `isStopped = false` and updates the
 * class), so this is a plain "ensure scroll is live" primitive. That removes the
 * question of who currently owns the lock, which is precisely what went wrong
 * before.
 */
export function settleCaseStudyAdvance() {
  abandonCaseStudyAdvance();
  // Position before start, so no frame is ever live at the wrong offset.
  window.__lenis?.scrollTo(0, { immediate: true, force: true });
  window.__lenis?.start();
}
