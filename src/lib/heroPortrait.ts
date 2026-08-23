/**
 * Geometry shared between the hero portrait and the landing intro that resolves
 * into it.
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
 * `y` stays at the default bottom anchor (0), which keeps the figure standing
 * on the section's floor. Only consulted below `lg`, where the portrait covers.
 */
export const PORTRAIT_FOCUS = { x: 0.27 } as const;

/** Mirrors the `lg:` breakpoint the hero uses to pick the portrait's fit mode.
 *  Below it the hero's box is a full 100dvh and the portrait COVERS it, cropped
 *  around the face. At and above `lg` the original contain layout applies. */
export const isPortraitCovering = () =>
  typeof window !== "undefined" &&
  !window.matchMedia("(min-width: 1024px)").matches;
