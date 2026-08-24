"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GalleryItem } from "@/lib/sanity/types";
import { caseStudyTheme } from "@/lib/color";

gsap.registerPlugin(ScrollTrigger);

interface CaseStudyGalleryProps {
  items: GalleryItem[];
  heading?: string;
  subheading?: string;
  /** Editor-chosen hex for just this section; empty inherits the page background. */
  bg?: string;
}

const DEFAULT_HEADING = "Pixels with Purpose";
const DEFAULT_SUBHEADING = "Explore the screens that bring the experience to life.";

// Matches the desktop-only pin breakpoint used elsewhere (Services.tsx).
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Desktop (>=1024px): the section pins to the viewport and vertical scroll
 * is translated into horizontal motion — one image slides out left while
 * the next pushes in from the right — via a scrubbed GSAP ScrollTrigger
 * timeline, same pin/scrub/anticipatePin pattern as CtaCollage/Services.
 *
 * Mobile: falls back to the original native `overflow-x-auto` + scroll-snap
 * track with pointer-drag (no requestAnimationFrame loop, to avoid the frame
 * drops that caused problems elsewhere on this site). `data-lenis-prevent`
 * stops the smooth-scroll wrapper from swallowing that drag gesture — it's
 * only applied on the mobile track, since the desktop pin needs Lenis-driven
 * vertical scroll to reach ScrollTrigger.
 */
export default function CaseStudyGallery({
  items,
  heading,
  subheading,
  bg,
}: CaseStudyGalleryProps) {
  const sectionTheme = bg ? caseStudyTheme(bg) : null;
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Pointer-drag state lives in a ref: it changes every move event and must not
  // trigger a re-render.
  const drag = useRef({ startX: 0, startScroll: 0, pointerId: -1 });
  const lastIndexRef = useRef(0);

  const total = items.length;

  const syncActive = useCallback(() => {
    const track = mobileTrackRef.current;
    if (!track) return;
    const cards = Array.from(
      track.querySelectorAll<HTMLElement>("[data-gallery-card]")
    );
    if (!cards.length) return;

    // Whichever card's centre sits closest to the viewport centre of the track.
    const trackCentre = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let smallest = Infinity;
    cards.forEach((card, i) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - trackCentre);
      if (distance < smallest) {
        smallest = distance;
        closest = i;
      }
    });
    setActive(closest);
  }, []);

  useEffect(() => {
    const track = mobileTrackRef.current;
    if (!track) return;

    track.addEventListener("scroll", syncActive, { passive: true });
    syncActive();
    return () => track.removeEventListener("scroll", syncActive);
  }, [syncActive, total]);

  useEffect(() => {
    if (!pinRef.current || !trackRef.current || total < 2) return;

    const mm = gsap.matchMedia();

    mm.add(DESKTOP_QUERY, () => {
      const ctx = gsap.context(() => {
        const figures = () =>
          Array.from(
            trackRef.current?.querySelectorAll<HTMLElement>(":scope > figure") ?? []
          );

        // Breathing room so the last slide doesn't sit hard against the screen
        // edge, which reads as the image being cropped. Matches the slide gap.
        const endInset = () => {
          const track = trackRef.current;
          if (!track) return 0;
          const gap = parseFloat(getComputedStyle(track).columnGap);
          return Number.isFinite(gap) ? gap : 0;
        };

        // Lead-in padding so slide 01 starts centred. Measured rather than
        // expressed as a calc(): slide width comes from `height: var(--slide-h)`
        // plus aspect-ratio, which the engine rounds at layout time, and 100vw
        // vs window.innerWidth disagree by the scrollbar width on some
        // platforms. Measuring keeps the padding and the travel distance
        // derived from the same numbers.
        const applyPadding = () => {
          const track = trackRef.current;
          const cards = figures();
          if (!track || !cards.length) return;
          track.style.paddingLeft = `${Math.max(
            0,
            (window.innerWidth - cards[0].offsetWidth) / 2
          )}px`;
          track.style.paddingRight = `${endInset()}px`;
        };

        // Translate until the LAST slide's right edge sits `endInset` short of
        // the viewport's right edge. Deliberately not `scrollWidth -
        // innerWidth`: scrollWidth's treatment of padding on an overflowing
        // flex row is engine-dependent, whereas offsetLeft already accounts for
        // the leading padding and the gaps.
        const distance = () => {
          const cards = figures();
          if (!cards.length) return 0;
          const last = cards[cards.length - 1];
          return Math.max(
            0,
            last.offsetLeft + last.offsetWidth + endInset() - window.innerWidth
          );
        };

        // Padding must be in the DOM before ScrollTrigger's first measurement.
        applyPadding();

        const tl = gsap.timeline({
          scrollTrigger: {
            // Pin the whole stage (heading + track + counter). Pinning only the
            // track made the pin engage after the heading had already scrolled
            // away, which read as the section sticking ~halfway through.
            trigger: pinRef.current,
            start: "top top",
            // Scroll distance matches travel distance 1:1.
            end: () => `+=${distance()}`,
            pin: true,
            /* No spacer, and pinned by transform. Same correctness fix as
               Services and CtaCollage: the default `pinSpacing` moves the
               pinned element into an injected .pin-spacer that React does not
               know about, and this pin sits inside the DESKTOP_QUERY branch
               below, so it is built going wide and unwound going narrow —
               re-parenting a React-owned node during the same breakpoint
               crossing that reshapes the page. The pinned element already
               carries `h-screen`, so it reserves its own height.

               Note this genuinely reduces document height, which the priority
               note below cares about: the spacer no longer pads the page, so
               NextProject's foot-of-page runway is measured against a shorter
               document. Its `end` is an explicit +=180% chosen for exactly that
               reason, so it does not depend on this spacer — but this is the
               coupling to check first if the handoff ever stalls again. */
            pinSpacing: false,
            pinType: "transform",
            scrub: 0.2,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Measured before anything downstream reads maxScroll or
            // document-space offsets — NextProject's foot-of-page handoff does
            // exactly that. The default sort is by start position, itself
            // computed from the *un-pinned* layout on the first pass, so
            // ordering was luck. Higher priority refreshes first.
            refreshPriority: 1,
            // onRefreshInit, not onRefresh: refresh order is onRefreshInit ->
            // recalc start/end -> onRefresh, so the padding has to be applied
            // here for `end` and the function-based `x` to read the same layout.
            onRefreshInit: applyPadding,
            onUpdate: (self) => {
              const idx = Math.round(self.progress * (total - 1));
              if (idx !== lastIndexRef.current) {
                lastIndexRef.current = idx;
                setActive(idx);
              }
            },
          },
        });

        tl.to(trackRef.current, {
          x: () => -distance(),
          ease: "none",
        });

        return () => {
          const track = trackRef.current;
          if (track) {
            track.style.removeProperty("padding-left");
            track.style.removeProperty("padding-right");
          }
        };
      }, pinRef);

      return () => ctx.revert();
    });

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      mm.revert();
      cancelAnimationFrame(refreshId);
    };
  }, [total]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Let touch use the browser's own (better) momentum scrolling.
    if (event.pointerType === "touch") return;
    const track = mobileTrackRef.current;
    if (!track) return;

    drag.current = {
      startX: event.clientX,
      startScroll: track.scrollLeft,
      pointerId: event.pointerId,
    };
    track.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = mobileTrackRef.current;
    if (!track || drag.current.pointerId !== event.pointerId) return;
    track.scrollLeft = drag.current.startScroll - (event.clientX - drag.current.startX);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = mobileTrackRef.current;
    if (!track || drag.current.pointerId !== event.pointerId) return;
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
    drag.current.pointerId = -1;
    setDragging(false);
  };

  if (!total) return null;

  return (
    <section
      ref={sectionRef}
      className="mt-[clamp(5rem,11vw,10rem)] pt-[clamp(5rem,10vw,9rem)] pb-[clamp(4rem,7vw,6rem)] lg:mt-[clamp(7rem,12vw,12rem)] lg:py-0"
      style={
        {
          // Full-bleed: cancel the page gutter from CaseStudy's wrapper so the
          // background paints edge to edge, then put the gutter back as padding
          // so the heading/mobile content keep the page's text alignment.
          // Negative margin + padding (not width: 100vw) keeps the border box
          // exactly viewport-wide, so no horizontal scrollbar appears.
          marginInline: "calc(var(--cs-gutter) * -1)",
          paddingInline: "var(--cs-gutter)",
          ...(sectionTheme
            ? {
                "--cs-bg": sectionTheme.bg,
                "--cs-ink": sectionTheme.ink,
                "--cs-line": sectionTheme.line,
                "--cs-muted": sectionTheme.muted,
                backgroundColor: "var(--cs-bg)",
                color: "var(--cs-ink)",
              }
            : {}),
        } as React.CSSProperties
      }
    >
      {/* Mobile heading. On desktop the heading lives inside the pinned stage
          so it stays on screen for the whole sequence. */}
      <div className="fade-in-up text-center lg:hidden">
        <h2
          className="font-medium tracking-[-0.03em]"
          style={{ fontSize: "clamp(2.4rem, 5vw, 4.25rem)", lineHeight: 1.05 }}
        >
          {heading || DEFAULT_HEADING}
        </h2>
        {(subheading || DEFAULT_SUBHEADING) && (
          <p
            className="mx-auto mt-4 max-w-xl text-[clamp(0.95rem,1.1vw,1.0625rem)] font-medium"
            style={{
              color: "var(--cs-muted)",
              fontFamily: "'Helvetica Neue 65 Medium', sans-serif",
            }}
          >
            {subheading || DEFAULT_SUBHEADING}
          </p>
        )}
      </div>

      {/* Desktop: pinned, scroll-driven horizontal reveal. The stage is a full
          viewport-height column so the pin engages the moment the section
          lands, not partway through it. It bleeds past the page gutter so the
          images trail edge to edge.

          The full-bleed negative margin lives on this OUTER div rather than
          on the element GSAP pins: ScrollTrigger's `pin` wraps the pinned
          element in a generated `.pin-spacer` and hoists the pinned
          element's own inline margin onto that spacer, leaving the pinned
          element itself sized to `100% of its (gutter-padded) parent` and
          flush against the spacer's left edge — which read as the heading
          and counter both being shifted left of centre. Keeping the
          negative margin here, one level up, means the spacer GSAP inserts
          wraps a div that's already full-bleed, so nothing gets stripped. */}
      <div
        className="hidden lg:block"
        style={{ marginInline: "calc(var(--cs-gutter) * -1)" }}
      >
        <div
          ref={pinRef}
          className="flex h-screen w-full flex-col items-stretch justify-center overflow-hidden"
          style={
            {
              // Slides are sized from this height; their width follows from
              // the 735:425 ratio. Sizing by width instead is what previously
              // forced an ~1100px-tall frame and overflowed the stage.
              "--slide-h": "min(52vh, 460px)",
              "--slide-gap": "clamp(1rem, 2vw, 1.75rem)",
            } as React.CSSProperties
          }
        >
        <div className="shrink-0 px-[var(--cs-gutter)] text-center">
          <h2
            className="font-medium tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.4rem, 5vw, 4.25rem)", lineHeight: 1.05 }}
          >
            {heading || DEFAULT_HEADING}
          </h2>
          {(subheading || DEFAULT_SUBHEADING) && (
            <p
              className="mx-auto mt-4 max-w-xl text-[clamp(0.95rem,1.1vw,1.0625rem)] font-medium"
              style={{
                color: "var(--cs-muted)",
                fontFamily: "'Helvetica Neue 65 Medium', sans-serif",
              }}
            >
              {subheading || DEFAULT_SUBHEADING}
            </p>
          )}
        </div>

        {/* Viewport-width viewport onto the track. The track itself is wider
            than the screen, so it needs a full-width parent that owns the
            overflow — otherwise it stretches the flex column and knocks the
            centred heading and counter off-centre. */}
        <div className="w-full shrink-0 overflow-hidden">
          {/* padding-left is set from JS by the ScrollTrigger effect above —
              enough to centre the first slide at progress 0. It can't be a
              calc() because the slide width is derived from `--slide-h` plus
              aspect-ratio at layout time. padding-right leaves the last slide
              a gap's breathing room off the viewport's right edge. */}
          <div
            ref={trackRef}
            className="mt-[clamp(2rem,4vw,3.5rem)] flex w-max will-change-transform"
            style={{ gap: "var(--slide-gap)" }}
          >
            {items.map((item, i) => (
              <figure key={`${item.image}-${i}`} className="shrink-0">
                <div
                  className="relative overflow-hidden rounded-[clamp(0.5rem,1vw,0.875rem)]"
                  style={{
                    backgroundColor: "var(--cs-line)",
                    // Height is the fixed dimension; width derives from it.
                    height: "var(--slide-h)",
                    aspectRatio: "735 / 425",
                  }}
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.caption ?? ""}
                      fill
                      sizes="50vw"
                      className="object-cover"
                    />
                  )}
                </div>
                {item.caption && (
                  <figcaption
                    className="mt-4 text-[0.8125rem] uppercase tracking-[0.14em]"
                    style={{ color: "var(--cs-muted)" }}
                  >
                    {item.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>

        {/* Only the current index, per the requested single-number counter. */}
        <div
          className="mt-[clamp(1.25rem,2.5vw,2rem)] shrink-0 px-[var(--cs-gutter)] text-center text-[0.89375rem] font-medium tabular-nums tracking-[0.14em]"
          style={{ color: "var(--cs-ink)", fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}
          aria-live="polite"
        >
          {String(active + 1).padStart(2, "0")}
        </div>
        </div>
      </div>

      {/* Mobile: native drag/swipe scroll-snap track. */}
      <div
        ref={mobileTrackRef}
        data-lenis-prevent
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="fade-in-up mt-[clamp(2.5rem,5vw,4rem)] flex snap-x snap-mandatory gap-[clamp(1rem,2vw,1.75rem)] overflow-x-auto pb-6 lg:hidden"
        style={{
          // Vertical page scroll must still work over the track.
          touchAction: "pan-y",
          cursor: dragging ? "grabbing" : "grab",
          scrollbarWidth: "none",
          // Bleed to the viewport edges, like the reference, while keeping the
          // first and last card aligned with the page's text column.
          marginInline: "calc(var(--cs-gutter) * -1)",
          paddingInline: "var(--cs-gutter)",
          scrollPaddingInline: "var(--cs-gutter)",
        }}
      >
        {items.map((item, i) => (
          <figure
            key={`${item.image}-${i}`}
            data-gallery-card
            className="relative shrink-0 snap-center"
            style={{ width: "min(85vw, 735px)" }}
          >
            <div
              className="relative w-full overflow-hidden rounded-[clamp(0.5rem,1vw,0.875rem)]"
              style={{ backgroundColor: "var(--cs-line)", aspectRatio: "735 / 425" }}
            >
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.caption ?? ""}
                  fill
                  sizes="85vw"
                  className="object-cover select-none"
                  // Otherwise the browser's native image drag hijacks the gesture.
                  draggable={false}
                />
              )}
            </div>
            {item.caption && (
              <figcaption
                className="mt-4 text-[0.8125rem] uppercase tracking-[0.14em]"
                style={{ color: "var(--cs-muted)" }}
              >
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {/* Mobile counter — desktop has its own inside the pinned stage. */}
      <div
        className="fade-in-up mt-2 text-center text-[0.89375rem] font-medium tabular-nums tracking-[0.14em] lg:hidden"
        style={{ color: "var(--cs-ink)", fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}
        aria-live="polite"
      >
        {String(active + 1).padStart(2, "0")}
      </div>
    </section>
  );
}
