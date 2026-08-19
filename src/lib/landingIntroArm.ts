/**
 * The pre-paint half of the landing-intro gate.
 *
 * `shouldPlayLandingIntro()` in LandingIntro.tsx is the authoritative rule, but
 * it cannot run early enough to matter on its own: it lives in a client bundle,
 * so the earliest it can fire is a post-hydration effect — by which point the
 * browser has already painted the finished white homepage. That paint, followed
 * by the dark stage appearing, is the flash this module exists to remove.
 *
 * So the rule is deliberately duplicated as a source string executed by a raw
 * inline <script> in the root layout, which the HTML parser runs before it has
 * built the page's DOM, let alone laid it out. Being a duplicate is the whole
 * point — nothing that needs a module loader can be early enough.
 *
 * ── KEEPING THE TWO IN STEP ──────────────────────────────────────────────
 * These are two expressions of ONE rule. If you change either, change both:
 *   - `shouldPlayLandingIntro()` — src/components/transition/LandingIntro.tsx
 *   - `ARM_SCRIPT` below         — this file
 * Both sides carry a comment pointing at the other. The predicate's inputs are
 * all synchronously available to a parser-blocking script (matchMedia,
 * location.pathname, performance.getEntriesByType("navigation")), which is why
 * a faithful copy is possible at all — if a future condition ever needs
 * anything async or React-derived, this approach is dead and the gate has to
 * move rather than be quietly half-updated here.
 *
 * A disagreement is not catastrophic in either direction, which is deliberate:
 *   - script armed, predicate false → LandingIntro's effect strips the class on
 *     mount; a brief dark frame, not a stuck page.
 *   - script not armed, predicate true → the old flash returns. No lock-up.
 */

/** Class stamped on <html> while the pre-paint cover is up. Exported so the CSS
 *  selector, the arming script, and the teardown all name the same string. */
export const INTRO_ARMED_CLASS = "intro-armed";

/**
 * How long the cover may survive without JS taking ownership of it.
 *
 * The safety escape hatch. Everything after this script — the Next bundle,
 * GSAP, Lenis, OGL, LandingIntro's own mount — can fail, 404, or throw, and
 * none of it is required for the page to become usable: this timeout, set by
 * the same blocking script that raised the cover, always fires and always
 * lowers it. Chosen longer than the point where LandingIntro's effect normally
 * takes ownership (well under a second on a warm load, at which point the class
 * is removed and this timer becomes a no-op) and shorter than a reader's
 * patience with a dark screen.
 */
const ARM_FAILSAFE_MS = 4000;

/**
 * Source of the parser-blocking script.
 *
 * Kept as a single-quoted, newline-free string so it needs no escaping when
 * inlined and cannot be broken by a stray `</script>` sequence.
 *
 * The try/catch is a hard requirement, not defensiveness: this runs before
 * React exists and before any error boundary, so an uncaught throw would leave
 * the class stamped with no code alive to remove it — the one way this feature
 * could permanently black-screen the site.
 *
 * Mirrors `shouldPlayLandingIntro()` condition-for-condition and in the same
 * order. The `typeof window === "undefined"` guard it opens with is omitted
 * here for the obvious reason: a parser-blocking script cannot run on the
 * server. The `entry.name` path comparison at the end is what stops the intro
 * replaying on a soft navigation from /work back to / — do not drop it.
 */
export const ARM_SCRIPT = `(function(){try{` +
  `if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;` +
  `if(window.location.pathname!=='/')return;` +
  `var e=performance.getEntriesByType('navigation')[0];` +
  `if(e){` +
  `if(e.type!=='navigate'&&e.type!=='reload')return;` +
  `if(new URL(e.name,window.location.origin).pathname!=='/')return;` +
  `}` +
  `var d=document.documentElement;` +
  `d.classList.add('${INTRO_ARMED_CLASS}');` +
  `setTimeout(function(){d.classList.remove('${INTRO_ARMED_CLASS}');},${ARM_FAILSAFE_MS});` +
  `}catch(err){document.documentElement.classList.remove('${INTRO_ARMED_CLASS}');}})();`;
