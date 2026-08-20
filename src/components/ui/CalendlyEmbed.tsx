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

export default function CalendlyEmbed({ name, email }: CalendlyEmbedProps) {
  const baseUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  const src = useMemo(() => {
    if (!baseUrl) return null;

    try {
      const url = new URL(baseUrl);
      if (name) url.searchParams.set("name", name);
      if (email) url.searchParams.set("email", email);
      url.searchParams.set("hide_gdpr_banner", "1");
      // Palette tokens from globals.css (cream / ink / wine). Calendly wants
      // bare hex with no leading '#'; this is what stops the scheduler landing
      // as a white-and-blue foreign object in the middle of the page.
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
      className="mt-10 w-full overflow-hidden rounded-2xl border border-divider/60"
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
      <iframe
        src={src}
        title="Schedule a call"
        // Eager, not lazy: the success block often mounts below the fold, and
        // lazy would defer the fetch until the deliberate scroll arrives —
        // parking the visitor in front of an empty bordered rectangle.
        loading="eager"
        className="h-full w-full border-0"
      />
    </div>
  );
}
