/**
 * Geometry shared between the hero portrait's image and the landing intro that
 * resolves into it.
 *
 * It lives here rather than in either component because both need it and they
 * cannot import from each other: Hero already imports LandingIntro's constants,
 * so a return import would be a cycle. Duplicating the numbers instead is the
 * failure this module exists to prevent — the intro fits its centre panel onto
 * the rect the hero paints, so any drift between the two desyncs the seam and
 * shows as a jump at the handoff.
 */

/**
 * Focal point for the mobile crop: the subject's face, not the frame's centre.
 *
 * Solved rather than eyeballed. The head's centre sits at x≈0.41 of the source
 * art, and for a visible window of width `s` the anchor that puts a source
 * point `p` at mid-screen is `(p - s/2) / (1 - s)`. At phone aspects s≈0.60,
 * which lands this at ≈0.27 — and it is flat across 360-414px wide viewports,
 * so one constant serves them all (head at ~50% of screen, fully in frame).
 *
 * Note it is NOT simply the head's own coordinate: the anchor is the fixed
 * point of the crop, so it moves further from centre than the feature it is
 * centring. Using 0.41 directly would leave the head at ~41%.
 *
 * `y` is the bottom anchor (1), which keeps the figure standing on the
 * section's floor. Only consulted below `lg`, where the portrait covers — and
 * only while the viewport is TALLER than the art's 3:4, so the crop is the
 * horizontal one this `x` was solved for. See PORTRAIT_FOCUS_SHORT otherwise.
 *
 * Both axes are anchors in the CSS `object-position` sense: 0 holds the art's
 * leading edge against the box, 1 its trailing edge.
 */
export const PORTRAIT_FOCUS = { x: 0.27, y: 1 } as const;

/**
 * Focal point once the viewport is WIDER than the art's own 3:4 — a landscape
 * phone, a short desktop window, a split-screen tablet pane.
 *
 * The crop has flipped axes there, and that is what makes PORTRAIT_FOCUS wrong
 * rather than merely imprecise: its `y: 1` throws the surplus height off the
 * top of the frame, which is where the head is. At 747x645 that left the chest
 * filling the hero and the face gone entirely.
 *
 * `x` is 0.5 because above 3:4 nothing is cropped horizontally at all (the
 * visible x fraction is 1), so the anchor multiplies a zero overflow. 0.5 is
 * the honest no-op; carrying 0.27 here would only imply a crop that isn't
 * happening.
 *
 * `y` is 0 by the same solve as PORTRAIT_FOCUS: the head's centre sits at
 * p≈0.18 of the source, and for a visible fraction `s` the anchor that centres
 * `p` is `(p - s/2) / (1 - s)`. At 747x645, s_y≈0.648 gives ≈-0.41, and it
 * stays negative across this entire band — the head simply cannot be centred
 * once the viewport is this short. Clamped to the frame that is the top anchor,
 * which keeps the whole head in view and spends the crop on the legs instead.
 */
export const PORTRAIT_FOCUS_SHORT = { x: 0.5, y: 0 } as const;

/** Viewports at or wider than the portrait art's own 3:4 aspect, where the
 *  cover crop runs vertically rather than horizontally.
 *
 *  ── MIRRORED IN CSS — change together ────────────────────────────────────
 *  Paired with the `min-aspect-ratio: 3 / 4` media query that forks
 *  `--hero-portrait-object-position` in src/app/globals.css. The intro fits its
 *  centre panel onto the rect the hero paints, so a drift between the two
 *  desyncs the seam at the handoff. */
export const SHORT_VIEWPORT_QUERY = "(min-aspect-ratio: 3 / 4)";

/** The live focal point for the cover crop. Only meaningful while
 *  `isPortraitCovering()` holds; above `lg` the art letterboxes and there is no
 *  crop to steer. */
export const resolvePortraitFocus = () =>
  typeof window !== "undefined" &&
  window.matchMedia(SHORT_VIEWPORT_QUERY).matches
    ? PORTRAIT_FOCUS_SHORT
    : PORTRAIT_FOCUS;

/** Mirrors the `lg:` breakpoint the hero uses to pick the portrait's fit mode.
 *  Below it the hero's box is a full 100dvh and the portrait COVERS it, cropped
 *  around the face. At and above `lg` the original contain layout applies. */
export const isPortraitCovering = () =>
  typeof window !== "undefined" &&
  !window.matchMedia("(min-width: 1024px)").matches;
