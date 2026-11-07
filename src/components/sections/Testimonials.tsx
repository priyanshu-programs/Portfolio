"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSiteContent } from "@/components/ContentProvider";
import type { TestimonialItem } from "@/lib/sanity/types";

gsap.registerPlugin(ScrollTrigger);

/**
 * Home-page testimonials, between the Services deck and the CTA collage.
 *
 * ── Layout ──────────────────────────────────────────────────────────────────
 * A header row on the page gutter: the heading at the
 * Services heading size (Manrope Light, muted emphasis) with a "Start a project" link on
 * the right, then a full-bleed row of big cards. The cards carry the section's
 * scale, not the heading, so the card text stays a clear step below it
 * (heading ≈41px : quote ≈23px at 1600). Each card pairs a text panel with a
 * duotone portrait. The panel reads top to bottom: company wordmark, quote,
 * name and role straight under it, and "Watch video" pinned to the bottom.
 *
 * ── Marquee ─────────────────────────────────────────────────────────────────
 * The row drifts left forever: the track holds two identical copies of the
 * list and the `marquee` keyframes (globals.css) translate it by -50%. Each copy
 * carries its own trailing gap, so the loop point has no seam. The second copy
 * is `inert` + `aria-hidden`, so assistive tech and the keyboard meet each
 * testimonial once. Hover, keyboard focus and a playing video pause it; reduced
 * motion stops it and makes the row scroll by hand instead. Duration scales
 * with the number of cards, so the speed stays the same as testimonials grow.
 * A mask on the row (globals.css) fades the cards out across the page gutter
 * at both edges, so they're only fully visible within the heading's margins.
 *
 * ── Duotone ─────────────────────────────────────────────────────────────────
 * Done in CSS, not in the image: a grayscale photo, a tint layer blended with
 * `mix-blend-mode: color`, and a pale lift so shadows don't go muddy. Real
 * photos drop in as-is. Tints cycle through TINTS by index.
 *
 * ── Media ───────────────────────────────────────────────────────────────────
 * An entry is an image or a video. Every card shows the play badge and
 * "Watch video", as in the reference. On a video entry they are buttons:
 * pressing one mounts a <video> over the portrait and pauses the row until it
 * ends or is closed. On an image entry they are plain, non-interactive marks,
 * so there are no dead controls. Upload a video file on the entry in Sanity
 * and they become live.
 *
 * ── Content ─────────────────────────────────────────────────────────────────
 * Entries come from the Sanity "Testimonials Section" singleton
 * (sanity/schemas/testimonials.ts), in Studio order, minus any marked hidden.
 * No visible entries means no section. A short list is repeated inside each
 * marquee copy (see MIN_PER_COPY) so the loop never shows a gap; the repeats
 * are inert and hidden in strip mode, where each person appears once.
 */

type Media =
  | { type: "image"; src: string }
  | { type: "video"; src: string; poster: string };

type Tint = { wash: string; ink: string };

type Testimonial = {
  key: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  media: Media;
};

/* Soft tints that sit on the page's #FFFCFA: `wash` is the card, `ink` is what
   the photo is coloured with. */
const TINTS: Tint[] = [
  { wash: "#FBEEE8", ink: "#E9967A" }, // peach
  { wash: "#E8F4F1", ink: "#6FC2B0" }, // teal
  { wash: "#EFEDF9", ink: "#A89FE0" }, // lavender
  { wash: "#F8F1E4", ink: "#D9B26A" }, // sand
];

/* A marquee copy narrower than the viewport leaves a gap at the loop point.
   Six cards clear a wide desktop, so shorter lists are repeated up to it. */
const MIN_PER_COPY = 6;

const toTestimonial = (t: TestimonialItem): Testimonial => ({
  key: t.key,
  name: t.name,
  role: t.role ?? "",
  company: t.company ?? "",
  quote: t.quote,
  media: t.video
    ? { type: "video", src: t.video, poster: t.photo }
    : { type: "image", src: t.photo },
});

const SECONDS_PER_CARD = 7;

const MANROPE_LIGHT = { fontFamily: "var(--font-manrope-stack)", fontWeight: 300 } as const;
const MANROPE_REGULAR = { fontFamily: "var(--font-manrope-stack)", fontWeight: 400 } as const;
const MANROPE_MEDIUM = { fontFamily: "var(--font-manrope-stack)", fontWeight: 500 } as const;

const MUTED = "text-[#858EA3]";

/* Heading words, so each can rise out of its own mask. `muted` is the site's
   emphasis colour; `br` breaks the line after (at every width: "I'll stop talking." fits
   on one line even on phones). */
const HEADING: { w: string; br?: boolean; muted?: boolean }[] = [
  { w: "I'll" },
  { w: "stop" },
  { w: "talking.", br: true },
  { w: "They'll", muted: true },
  { w: "take", muted: true },
  { w: "it", muted: true },
  // One span, so phones wrap "They'll take it / from here." instead of
  // leaving "here." alone on a third line.
  { w: "from here.", muted: true },
];

/* Same side margins as Recent work (AboutWork), for the header only; the row
   bleeds to the viewport edges. */
const GUTTER = "clamp(1.5rem, 11.67vw, 13rem)";
const GAP = "clamp(12px, 1.25vw, 20px)";

const posterOf = (m: Media) => (m.type === "video" ? m.poster : m.src);

/* The round play mark at the portrait's bottom-left: a button on video
   entries, a plain mark on image entries. */
const PLAY_BADGE =
  "absolute bottom-[clamp(12px,1.2vw,20px)] left-[clamp(12px,1.2vw,20px)] z-10 grid size-[clamp(44px,3.75vw,60px)] place-items-center rounded-full bg-[#1D222E] text-white";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  );
}

export default function Testimonials() {
  const [playing, setPlaying] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const items = useSiteContent()?.testimonials ?? [];
  const testimonials = items.map(toTestimonial);
  const N = testimonials.length;

  /* One marquee copy: every entry once, then repeats (fill) until the copy is
     wide enough. `i` is the source index, so a repeat keeps its tint. */
  const slots: { t: Testimonial; i: number; fill: boolean }[] = [];
  for (let n = 0; N > 0 && (n < N || n < MIN_PER_COPY); n++) {
    slots.push({ t: testimonials[n % N], i: n % N, fill: n >= N });
  }

  /* ── Scroll-in reveal ──────────────────────────────────────────────────── */
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      gsap
        .timeline({ scrollTrigger: { trigger: root, start: "top 72%" } })
        .fromTo(
          q(".tm-word-inner"),
          { yPercent: 110, opacity: 0, filter: "blur(6px)" },
          {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.75,
            stagger: 0.04,
            ease: "power3.out",
          },
          0
        )
        // The wrapper, never the animated track: GSAP's transform would fight
        // the CSS marquee's.
        .fromTo(
          q(".tm-track"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", clearProps: "transform" },
          0.3
        );
    }, root);

    return () => ctx.revert();
  }, []);

  if (N === 0) return null;

  const renderCard = (
    t: Testimonial,
    i: number,
    interactive: boolean,
    key: string,
    fill: boolean
  ) => {
    const tint = TINTS[i % TINTS.length];
    const isVideo = t.media.type === "video";
    const isPlaying = interactive && playing === i;

    return (
      <li
        key={key}
        // Fill repeats: hidden in strip mode (globals.css) and from AT/keyboard.
        aria-hidden={fill || undefined}
        inert={fill}
        // Phones: stacked (photo on top), ~78% of the screen, snapping in a
        // swipeable strip. md and up: side by side, drifting in the marquee.
        className={`${fill ? "tm-fill " : ""}flex w-[78vw] max-w-[340px] shrink-0 snap-start flex-col gap-[clamp(12px,1.25vw,20px)] rounded-[10px] p-[clamp(10px,0.9vw,14px)] shadow-[0_24px_48px_-32px_rgba(29,34,46,0.28)] md:w-auto md:max-w-none md:flex-row`}
        style={{ backgroundImage: `linear-gradient(135deg, #FFFCFA 0%, ${tint.wash} 100%)` }}
      >
        {/* Text panel: wordmark → quote → name/role, with Watch video pinned
            to the bottom. */}
        <div className="flex w-full flex-col px-2 pb-3 pt-1 md:w-[clamp(220px,17vw,calc(280px*var(--fluid-scale)))] md:px-0 md:py-[clamp(16px,1.8vw,28px)] md:pl-[clamp(12px,1.3vw,20px)]">
          <p
            className="text-[clamp(17px,1.25vw,calc(22px*var(--fluid-scale)))] leading-none tracking-[-0.02em]"
            style={MANROPE_MEDIUM}
          >
            {t.company}
          </p>
          <blockquote className="mt-[clamp(20px,2vw,32px)]">
            <p
              className="text-[clamp(20px,1.45vw,calc(26px*var(--fluid-scale)))] leading-[1.2] tracking-[-0.01em]"
              style={MANROPE_REGULAR}
            >
              {t.quote}
            </p>
          </blockquote>
          <div className="mt-[clamp(20px,1.9vw,30px)] text-[13px] leading-[1.45]" style={MANROPE_REGULAR}>
            <p>{t.name}</p>
            <p className="text-[#858EA3]">{t.role}</p>
          </div>
          <div
            className="mt-auto pt-6 text-[clamp(15px,1.15vw,18px)] leading-none"
            style={MANROPE_MEDIUM}
          >
            {isVideo ? (
              <button
                type="button"
                onClick={() => setPlaying(i)}
                className="group inline-flex items-center gap-2 text-[#1D222E] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#1D222E]"
              >
                Watch video
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>
            ) : (
              <span aria-hidden className="inline-flex items-center gap-2">
                Watch video <span>→</span>
              </span>
            )}
          </div>
        </div>

        {/* Portrait */}
        <div className="relative isolate order-first aspect-[5/4] w-full overflow-hidden rounded-[8px] bg-[#E9E6E2] md:order-none md:aspect-[4/5] md:w-[clamp(200px,20vw,calc(320px*var(--fluid-scale)))]">
          <Image
            src={posterOf(t.media)}
            alt={interactive ? t.name : ""}
            fill
            // Lazy loading gets almost no look-ahead inside the clipped,
            // drifting row, so cards arrived blank and the photo popped in.
            // The first copy loads eagerly; the duplicate shares its URLs and
            // hits the cache.
            loading={interactive ? "eager" : "lazy"}
            sizes="(max-width: 767px) 78vw, (max-width: 1024px) 200px, 20vw"
            className="object-cover grayscale contrast-[1.1]"
          />
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-color"
            style={{ backgroundColor: tint.ink }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-40 mix-blend-lighten"
            style={{ backgroundColor: tint.wash }}
          />

          {t.media.type === "video" && isPlaying && (
            <>
              <video
                src={t.media.src}
                poster={t.media.poster}
                playsInline
                autoPlay
                controls
                onEnded={() => setPlaying(null)}
                className="absolute inset-0 z-10 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPlaying(null)}
                aria-label={`Close ${t.name}'s video`}
                className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full bg-[#1D222E] text-[#FFFCFA] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-3.5">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          )}

          {!isPlaying &&
            (isVideo ? (
              <button
                type="button"
                onClick={() => setPlaying(i)}
                aria-label={`Play ${t.name}'s video testimonial`}
                className={`${PLAY_BADGE} transition-transform duration-300 hover:scale-105 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#1D222E]`}
              >
                <PlayIcon className="ml-[8%] size-[38%]" />
              </button>
            ) : (
              <span aria-hidden className={PLAY_BADGE}>
                <PlayIcon className="ml-[8%] size-[38%]" />
              </span>
            ))}
        </div>
      </li>
    );
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="testimonials-heading"
      // The track's own bottom padding (for the card shadow) adds to pb.
      className="relative w-full overflow-hidden bg-[#FFFCFA] pb-[clamp(48px,5vw,96px)] pt-[clamp(80px,8vw,144px)] text-[#1D222E]"
      // Read by the strip-mode rules in globals.css (phones, reduced motion).
      style={{ "--tm-gutter": GUTTER, "--tm-gap": GAP } as React.CSSProperties}
    >
      {/* Header row: heading on the gutter, "Start a project" link on the
          right. Exactly the Services heading size (Services.tsx). */}
      <div
        className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 text-[31px] leading-[1.3] sm:text-[42px] lg:text-[clamp(28px,2.55vw,calc(48px*var(--fluid-scale)))]"
        style={{ ...MANROPE_LIGHT, paddingLeft: GUTTER, paddingRight: GUTTER }}
      >
        {/* Medium, not the Services Light: the owner wanted this line bolder. */}
        <h2 id="testimonials-heading" className="text-left tracking-[-0.01em]" style={MANROPE_MEDIUM}>
          {HEADING.map(({ w, br, muted }, i) => (
            <React.Fragment key={i}>
              {/* The trailing {" "} is for copy, crawlers and screen readers:
                  the gap is a margin, so without it the text reads
                  "I'llstoptalking.They'll…". It sits inside the inline-block,
                  where trailing whitespace adds no width (same as Hero.tsx). */}
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom mr-[0.25em]">
                <span className={`tm-word-inner inline-block will-change-transform ${muted ? MUTED : ""}`}>
                  {w}
                </span>{" "}
              </span>
              {br && <br />}
            </React.Fragment>
          ))}
        </h2>
        {/* Smaller than the heading so the heading still leads; styled like
            the cards' "Watch video". */}
        <span className="inline-block shrink-0 overflow-hidden pb-[0.3em]">
          <Link
            href="/contact"
            className="tm-word-inner group inline-flex items-center gap-2 text-[clamp(15px,1.15vw,18px)] leading-none text-[#1D222E] will-change-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#1D222E]"
            style={MANROPE_MEDIUM}
          >
            Start a project
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </span>
      </div>

      {/* Row */}
      <div
        role="region"
        aria-label="Testimonials"
        // The vertical padding keeps overflow-hidden from clipping the card
        // shadows; the margin above is reduced by the same amount.
        className="tm-track tm-marquee-wrap mt-[clamp(24px,2.5vw,48px)] overflow-hidden pb-[clamp(40px,3.5vw,56px)] pt-[clamp(16px,2vw,32px)]"
      >
        <div
          className="tm-marquee flex w-max"
          data-paused={playing !== null ? "" : undefined}
          style={{ "--tm-duration": `${slots.length * SECONDS_PER_CARD}s` } as React.CSSProperties}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              // Padding lives in CSS (.tm-copy): trailing gap in the marquee,
              // gutters on both sides in strip mode.
              className={`tm-copy flex shrink-0 ${copy === 1 ? "tm-copy-dup" : ""}`}
              style={{ gap: GAP }}
              aria-hidden={copy === 1 || undefined}
              inert={copy === 1}
            >
              {slots.map(({ t, i, fill }, n) =>
                renderCard(t, i, copy === 0 && !fill, `${t.key}-${n}`, fill)
              )}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
