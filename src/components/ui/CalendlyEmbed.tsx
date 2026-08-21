"use client";

import { useMemo } from "react";

/**
 * Calendly scheduler, embedded as a plain iframe.
 *
 * Deliberately not Calendly's widget.js. That script runs third-party code at
 * this origin, and next.config.ts already notes that a real Content-Security
 * Policy is deferred — adding an origin-privileged script now makes that pass
 * strictly harder to land later. The widget's one genuine advantage is its
 * `calendly.event_scheduled` callback, and this success state is terminal, so
 * there is nothing to call back into. An iframe is also one element with no
 * cleanup effect, and trivially removable.
 *
 * Known cosmetic limitation: globals.css hides the native cursor everywhere
 * (`* { cursor: none !important }`) and FollowCursor can't track pointer events
 * across an iframe boundary, so there is no visible cursor over the scheduler.
 * The fix would be an overlay, which would swallow the clicks that are the whole
 * point. Accepted.
 */

type CalendlyEmbedProps = {
  /** Prefills the scheduler so the visitor doesn't retype what they just sent. */
  name?: string;
  email?: string;
};

/**
 * How far the iframe is scaled up inside its clipping wrapper, to push
 * Calendly's grey page padding past the edges where `overflow-hidden` cuts it
 * off. See the CROP note below for why this is the only lever available.
 *
 * Tune this one number. 1 disables the crop entirely (useful for checking what
 * Calendly actually renders). Raising it eats more grey but also creeps in on
 * the card's own edges and softens text, since scaling re-rasters the iframe —
 * so use the smallest value that clears the grey.
 */
const CROP_SCALE = 1.06;

export default function CalendlyEmbed({ name, email }: CalendlyEmbedProps) {
  const baseUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  const src = useMemo(() => {
    if (!baseUrl) return null;

    try {
      const url = new URL(baseUrl);
      if (name) url.searchParams.set("name", name);
      if (email) url.searchParams.set("email", email);
      url.searchParams.set("hide_gdpr_banner", "1");
      // Serves Calendly's embed layout rather than the standalone booking page,
      // which carries tighter chrome. Both params are required — Calendly's
      // documented iframe form is `?embed_domain=...&embed_type=Inline`.
      //
      // The domain is hardcoded rather than read from window.location: this
      // component prerenders, and a hostname that differs between the server
      // and client passes would change `src` after hydration and remount the
      // iframe — a visible reload right as the success state animates in.
      // Calendly only uses this value for postMessage targeting, which this
      // embed doesn't rely on (see the widget.js note above), so a fixed value
      // is honest here.
      url.searchParams.set("embed_domain", "priyanshuroy.com");
      url.searchParams.set("embed_type", "Inline");
      // Palette tokens from globals.css (cream / ink / wine). Calendly wants
      // bare hex with no leading '#'.
      //
      // These are inert on a free plan — Calendly gates embed colour
      // customisation behind a paid tier and ignores the params silently, with
      // no error and no warning. That is why the scheduler still lands as a
      // white card on grey despite `background_color` already matching
      // --color-cream exactly. Kept deliberately: they cost one query param
      // each and start working the moment the account upgrades, at which point
      // the CROP_SCALE hack below can be dropped.
      url.searchParams.set("background_color", "fffcfa");
      url.searchParams.set("text_color", "1d222e");
      url.searchParams.set("primary_color", "770000");
      return url.toString();
    } catch {
      // A malformed NEXT_PUBLIC_CALENDLY_URL shouldn't take the page down.
      return null;
    }
  }, [baseUrl, name, email]);

  if (!src) return null;

  return (
    // data-lenis-prevent stops Lenis from stealing the wheel events that belong
    // to the scheduler's own scroll area (see globals.css).
    // The height lives on the wrapper, not the iframe: this is a plain block
    // that lays out at final size on the first frame, so the box never grows
    // when the scheduler finishes loading. The success state swaps in while the
    // page is holding a scroll pin (see ContactStage), and a second, later
    // layout shift there would land outside that pin's protection.
    <div
      data-lenis-prevent
      // grid + place-items-center centres the iframe in both axes. Required,
      // not cosmetic: the iframe is deliberately smaller than this box (see the
      // CROP note), and in normal block flow it would sit against the left edge
      // — so scaling from its centre would crop unevenly, leaving grey on one
      // side while biting into the card on the other.
      className="mt-10 grid w-full place-items-center overflow-hidden rounded-2xl border border-divider/60"
      // Tall enough that Calendly's booking page fits without scrolling itself.
      // This matters more than it looks: the iframe is cross-origin, so its
      // scrollbars cannot be styled — the site-wide scrollbar-hiding rules in
      // globals.css stop at the boundary. A scrollbar here is therefore the only
      // visible one on the site, and reads as a foreign object. The fix is to
      // remove the *need* to scroll rather than to hide the bar. 820px is the
      // point where the month view clears its footer; the vh term lets short
      // viewports reclaim space, and 1040 caps it on very tall ones.
      style={{ height: "clamp(820px, 86vh, 1040px)" }}
    >
      {/* CROP: Calendly renders its scheduler as a card centred in a grey page
          background. That grey is painted inside a cross-origin iframe, so no
          parent-page CSS can reach it, and the colour params that would have
          recoloured it are paid-plan-only (see above). The only remaining lever
          is geometry: scale the iframe past the wrapper's bounds so the grey
          margin falls outside, and let the wrapper's `overflow-hidden` clip it.

          Sizing is 100%/scale rather than 100%: at plain 100% the scaled iframe
          would still be centred but its *layout* box would overflow, and the
          post-scale content would no longer align to the wrapper. Dividing
          first means the box lands at exactly 100% after the transform, so the
          scheduler stays centred and fills the frame with no gaps.

          transform-origin is the default `center`, stated explicitly because
          the whole effect depends on it — a corner origin would crop two edges
          and leave grey on the other two. */}
      <iframe
        src={src}
        title="Schedule a call"
        // Eager, not lazy: the success block often mounts below the fold, and
        // lazy would defer the fetch until the deliberate scroll arrives —
        // parking the visitor in front of an empty bordered rectangle.
        loading="eager"
        className="border-0"
        style={{
          width: `${100 / CROP_SCALE}%`,
          height: `${100 / CROP_SCALE}%`,
          transform: `scale(${CROP_SCALE})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}
