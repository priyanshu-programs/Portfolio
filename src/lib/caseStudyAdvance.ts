/**
 * Shared contract for the "scroll into the next case study" navigation.
 *
 * Three places need to agree on it: NextProject starts the advance, globals.css
 * keys the flattened view-transition off the class, and SmoothScroll settles a
 * still-running advance when the route change it caused arrives.
 *
 * Two classes, not one, because the two jobs have different lifetimes:
 *
 * - `cs-cover` gates the *scroll lock*, and must be releasable by whoever
 *   handles the route change (see `settleCaseStudyAdvance`).
 * - `cs-flatten` suppresses the *view transition*, and must survive until the
 *   animation ends — which is strictly later than the route change.
 *
 * They used to be the same class, which silently broke the suppression:
 * `next-view-transitions` resolves the transition's promise from its own
 * `[pathname]` effect, so the pathname change lands while the 0.9s
 * pseudo-element animation is still running. SmoothScroll's `[pathname]` effect
 * called `settleCaseStudyAdvance()` and removed the class about a frame in, and
 * because view-transition pseudo-element rules are matched against the *live*
 * <html> classList for the whole animation — not just at snapshot time — the
 * zoom reveal played anyway. Releasing the lock must not un-suppress the
 * transition, hence the split.
 */

/**
 * Set on <html> for the length of the route push that follows scrolling
 * through the foot-of-page sneak peek. Gates the scroll lock only.
 */
export const COVER_CLASS = "cs-cover";

/**
 * Set on <html> to swap the site's clip-path zoom reveal for a short crossfade
 * (see globals.css).
 *
 * Scroll position already carries the reader straight into the destination's
 * top by the time this fires, so the zoom would be a second, unrelated motion
 * layered on a gesture that already reads as arrival — but the outgoing stage
 * deliberately mirrors the incoming page's own top, and cutting between two
 * near-identical frames snaps rather than reads as continuous. The crossfade
 * absorbs the mismatch.
 *
 * Named "flatten" from when it did produce a hard cut. Kept because it is the
 * public contract shared with globals.css and CaseStudy's intro-skip probe, and
 * the meaning it still carries — "this navigation came from the scroll gesture,
 * not a click" — is what all three consumers actually key off.
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
 * How long the flatten class stays on, measured from the push rather than from
 * the transition becoming ready.
 *
 * Must outlast the navigation plus the `pr-cs-fade-out` crossfade it selects
 * (320ms in globals.css) — not just the crossfade, since the class goes on
 * *before* `router.push` and the route change itself can take a few hundred ms
 * on a cold-ish route. Kept generous for that reason: overshooting is harmless,
 * because a stale `cs-flatten` can only affect a transition this same gesture
 * would have crossfaded anyway, whereas undershooting drops the override
 * mid-animation and lets the clip-path zoom play — the original bug.
 *
 * Not derived from the CSS duration: there is no shared source of truth for it.
 * If `pr-cs-fade-out` is ever lengthened past ~1s, raise this too.
 */
const FLATTEN_DURATION_MS = 1600;

/**
 * Handle for the in-flight advance's scroll lock.
 *
 * The unlock has to outlive NextProject: the component unmounts *during* the
 * navigation it starts, so a cleanup-owned timer would leave <html> flattened
 * and scrolling dead forever. But "outlives the component" was previously
 * implemented as "cannot be cancelled", which meant a click navigation landing
 * inside the 900ms window got its scroll snapped to 0 by the previous page's
 * orphaned timer — scrollTo's `force: true` defeats the usual stopped-Lenis
 * guard, so nothing else stood in the way. Parking the handle at module scope
 * keeps the timer alive across the unmount while still giving a later
 * navigation a way to disown it.
 */
let unlockTimer: number | null = null;

/**
 * Handle for the in-flight advance's flatten flag, at module scope for the same
 * reason as `unlockTimer` — NextProject unmounts during the navigation, so a
 * cleanup-owned timer would leave <html> flattened forever.
 *
 * Deliberately *not* touched by `abandonCaseStudyAdvance` or
 * `settleCaseStudyAdvance`: those run on the route change, which happens while
 * the animation being suppressed is still playing.
 */
let flattenTimer: number | null = null;

/**
 * Take the lock: freeze scroll, flatten the transition, and schedule the
 * unlock. The caller pushes the route itself.
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
  // change cannot cut the suppression short mid-animation.
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
 * Leaves `cs-flatten` alone — that flag answers to the view transition's
 * lifetime, not the lock's.
 */
function abandonCaseStudyAdvance() {
  if (unlockTimer === null) return;
  window.clearTimeout(unlockTimer);
  unlockTimer = null;
  document.documentElement.classList.remove(COVER_CLASS);
}

/**
 * Finish an advance now instead of on its timer: clear the cover and hand scroll
 * back. Does not clear `cs-flatten` — the animation it suppresses is still
 * running at the moment this is called.
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
