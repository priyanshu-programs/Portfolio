"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSiteContent } from "@/components/ContentProvider";
import type { AboutParagraph, AboutSlot } from "@/lib/sanity/types";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_TITLE = "About";
const DEFAULT_EMAIL = "priyanshuroy.official19@gmail.com";

const DEFAULT_PARAGRAPHS: AboutParagraph[] = [];

const DEFAULT_SOCIALS = [
  { label: "GitHub", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Behance", href: "#" },
];

/**
 * The copy the page shipped with, kept as the fallback for when Sanity is
 * unreachable or the About document has no slots yet.
 */
const DEFAULT_SLOTS: AboutSlot[] = [
  {
    image: "/images/about.png",
    blurb: {
      text: "Looking for an apprenticeship starting September. Eager to join an innovative team and contribute to ambitious projects.",
      accents: ["apprenticeship"],
    },
  },
  {
    image: "/images/about.png",
    blurb: {
      text: "I'm available for freelance missions worldwide, on your ambitious projects and international collaborations.",
      accents: ["freelance missions", "worldwide", "your", "ambitious projects"],
    },
  },
  {
    image: "/images/about.png",
    blurb: {
      text: "Driven by craft and curiosity, always looking to push each project a little further.",
      accents: ["craft"],
    },
  },
];

/**
 * The three masked slots, stacked in the right column's normal document flow.
 * `rate` is how far the image inside travels as a fraction of its own
 * overflow; deliberately unequal, because equal rates read as one flat
 * picture sliding, which is exactly what stops it looking like parallax.
 */
const SLOTS = [
  { rate: 0.85, width: "385px" },
  { rate: 1.3, width: "385px" },
  { rate: 1.0, width: "385px" },
] as const;

/**
 * Per-slot blurb placement. The leading class name matters beyond styling: the
 * entrance timeline and the reduced-motion branch both select these three
 * elements individually, so each slot keeps its own hook.
 */
const BLURB_POSITIONS = [
  "about-apprenticeship lg:absolute lg:right-[calc(100%+6rem)] lg:top-1/2 lg:-translate-y-1/2 lg:w-[260px]",
  "about-availability lg:absolute lg:left-[calc(100%+5.4rem)] lg:top-[-3.5rem] lg:w-[220px]",
  "about-thirdslot lg:absolute lg:right-[calc(100%+6rem)] lg:top-1/2 lg:-translate-y-1/2 lg:w-[260px]",
] as const;

const BLURB_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-hanken)",
  lineHeight: 1.25,
  fontWeight: 400,
  textAlign: "justify",
  opacity: 0,
};

const BLURB_ACCENT_STYLE: React.CSSProperties = {
  fontSize: "1.25em",
  letterSpacing: "-0.02em",
};

/**
 * Splits a paragraph into words wrapped for the reveal, marking any word that
 * falls inside one of the accent phrases so it can be styled as italic script.
 *
 * Accents are matched against the raw text rather than word-by-word so a phrase
 * like "brand identities" stays a single accented run. Each match is
 * reduced to the index range of the words it covers.
 */
function splitWithAccents(text: string, accents: string[] = []) {
  const words = text.split(/\s+/).filter(Boolean);
  const accented = new Set<number>();

  for (const phrase of accents) {
    const needle = phrase.trim();
    if (!needle) continue;
    const start = text.indexOf(needle);
    if (start === -1) continue;

    // Walk the word list, tracking each word's offset in the source string, and
    // flag every word that overlaps the matched range.
    const end = start + needle.length;
    let cursor = 0;
    words.forEach((word, i) => {
      const at = text.indexOf(word, cursor);
      if (at === -1) return;
      cursor = at + word.length;
      if (at < end && cursor > start) accented.add(i);
    });
  }

  return words.map((word, i) => ({ word, accent: accented.has(i) }));
}

const Reveal = ({ text, accents }: { text: string; accents?: string[] }) => (
  <>
    {splitWithAccents(text, accents).map(({ word, accent }, i) => (
      <span
        key={i}
        className="reveal-word inline-block overflow-hidden align-bottom mr-[0.25em]"
      >
        <span
          className={`reveal-inner inline-block will-change-transform ${accent ? "italic font-script" : ""
            }`}
        >
          {word}
        </span>
      </span>
    ))}
  </>
);

/**
 * The blurbs' accent renderer. Deliberately not `Reveal`: the blurbs animate as
 * whole elements, while `Reveal` emits the `.reveal-inner` spans that the
 * entrance timeline picks up root-wide for the paragraph word-stagger. Reusing
 * it here would enrol blurb words in that timeline and animate them twice, so
 * this shares `splitWithAccents` for identical accent semantics and stops there.
 *
 * Consecutive accented words are emitted as one span, so a phrase like
 * "freelance missions" is styled as a run rather than two separately-tracked
 * words.
 */
const BlurbText = ({ text, accents }: { text: string; accents?: string[] }) => {
  const runs: { text: string; accent: boolean }[] = [];

  for (const { word, accent } of splitWithAccents(text, accents)) {
    const last = runs[runs.length - 1];
    if (last && last.accent === accent) last.text += ` ${word}`;
    else runs.push({ text: word, accent });
  }

  return (
    <>
      {runs.map((run, i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          {run.accent ? (
            <span className="italic font-script" style={BLURB_ACCENT_STYLE}>
              {run.text}
            </span>
          ) : (
            run.text
          )}
        </React.Fragment>
      ))}
    </>
  );
};



export default function AboutStage() {
  const content = useSiteContent();
  const about = content?.about;

  const title = about?.title ?? DEFAULT_TITLE;
  const paragraphs = about?.paragraphs?.length
    ? about.paragraphs
    : DEFAULT_PARAGRAPHS;
  const slots = about?.slots?.length ? about.slots : DEFAULT_SLOTS;
  const socials = about?.socials?.length
    ? about.socials
    : content?.settings?.socials?.length
      ? content.settings.socials
      : DEFAULT_SOCIALS;
  const email = about?.email ?? content?.settings?.email ?? DEFAULT_EMAIL;

  const containerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const paras = gsap.utils.toArray<HTMLElement>(".about-para", root);
    const frameEls = gsap.utils.toArray<HTMLElement>(".about-frame", root);
    const words = gsap.utils.toArray<HTMLElement>(".reveal-inner", root);


    const metaItems = bottomRef.current
      ? gsap.utils.toArray<HTMLElement>(".about-meta-inner", bottomRef.current)
      : [];

    const heading = headingRef.current;

    // Reduced motion: land everything in its rest state and register no
    // ScrollTriggers at all, so the section is a plain static layout.
    if (reduceMotion) {
      const ctx = gsap.context(() => {
        gsap.set(heading, { opacity: 1 });
        gsap.set([...paras, ...frameEls, ...metaItems], { opacity: 1, y: 0 });
        gsap.set(words, { y: 0, opacity: 1 });

        // Images park at their natural offset rather than mid-throw, so a
        // no-motion reader sees a composed frame, not a half-scrolled crop.
        gsap.set(".about-slot-img-inner", { y: 0, scale: 1 });

        const apprenticeshipText = root?.querySelector(".about-apprenticeship");
        if (apprenticeshipText) {
          gsap.set(apprenticeshipText, { opacity: 1, y: 0, filter: "none" });
        }

        const availabilityText = root?.querySelector(".about-availability");
        if (availabilityText) {
          gsap.set(availabilityText, { opacity: 1, y: 0, filter: "none" });
        }

        const thirdslotText = root?.querySelector(".about-thirdslot");
        if (thirdslotText) {
          gsap.set(thirdslotText, { opacity: 1, y: 0, filter: "none" });
        }
      }, containerRef);
      return () => ctx.revert();
    }

    /* ── The entrance: on mount, at every width ───────────────────────────
       Plays once on load and parks — heading, body copy, socials, and the
       three photos fading/sliding into place. No ScrollTrigger owns this. */
    let entranceTl: gsap.core.Timeline | null = null;
    let disposed = false;

    const playEntrance = () => {
      if (disposed) return;

      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.1 });
      entranceTl = tl;

      if (heading) {
        tl.fromTo(
          heading,
          { yPercent: 110, opacity: 0, filter: "blur(6px)" },
          { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.75, ease: "power3.out" },
          0,
        );
      }

      if (words.length) {
        tl.fromTo(
          words,
          { y: "120%", opacity: 0, rotateZ: 5 },
          {
            y: "0%",
            opacity: 1,
            rotateZ: 0,
            duration: 1.5,
            stagger: 0.02,
          },
          0.2,
        );
      }

      if (metaItems.length) {
        tl.fromTo(
          metaItems,
          { yPercent: 110, opacity: 0, filter: "blur(6px)" },
          {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.75,
            ease: "power3.out",
            stagger: 0.04,
          },
          0.6,
        );
      }

      const apprenticeshipText = containerRef.current?.querySelector(".about-apprenticeship");
      if (apprenticeshipText) {
        tl.fromTo(
          apprenticeshipText,
          { opacity: 0, y: 30, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power3.out" },
          0.5
        );
      }

      const availabilityText = containerRef.current?.querySelector(".about-availability");
      if (availabilityText) {
        tl.fromTo(
          availabilityText,
          { opacity: 0, y: 30, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power3.out" },
          0.65
        );
      }

      const thirdslotText = containerRef.current?.querySelector(".about-thirdslot");
      if (thirdslotText) {
        tl.fromTo(
          thirdslotText,
          { opacity: 0, y: 30, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power3.out" },
          0.8
        );
      }

      frameEls.forEach((frame, i) => {
        tl.fromTo(
          frame,
          {
            y: 100,
            opacity: 0,
            clipPath: "inset(100% 0% 0% 0%)",
            scale: 0.95
          },
          {
            y: 0,
            opacity: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            duration: 2,
          },
          0.3 + i * 0.15,
        );
      });
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(playEntrance);
    } else {
      playEntrance();
    }

    // matchMedia owns its own cleanup and must not be nested inside a
    // gsap.context — the context's return value is treated as its cleanup
    // function, which reverts the media query before its triggers register.
    const mm = gsap.matchMedia();

    /* ── Scroll-linked parallax on the stacked frames, all widths ─────────
       No pin at any width now — the left column sticks natively via CSS on
       desktop, and mobile has no sticky column at all, just this parallax
       rig on top of the plain stacked flow. Desktop gets a stronger throw
       than mobile: the sticky left column gives the right column a long,
       uninterrupted scroll runway to play the effect out over. */
    mm.add("all", () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const frameWrappers = gsap.utils.toArray<HTMLElement>(".about-frame-wrapper", root);

      // boxThrow: the frame's own drift, now a subtle secondary depth cue.
      // innerThrow: the window's contents — a 1.19x-scaled, still fully
      // uncropped (object-contain) image — sliding inside the fixed frame,
      // capped so the scaled overflow never runs out and shows a gap.
      const boxThrow = isDesktop ? 84 : 34;
      const innerThrow = isDesktop ? 39 : 20;
      const scrub = 0.35;

      frameWrappers.forEach((wrapper, i) => {
        const slot = SLOTS[i] ?? SLOTS[0];
        const inner = wrapper.querySelector<HTMLElement>(".about-slot-img-inner");

        // Box parallax: the frame itself drifts, each slot at its own rate.
        gsap.fromTo(
          wrapper,
          { y: boxThrow * slot.rate },
          {
            y: -boxThrow * slot.rate,
            ease: "none",
            scrollTrigger: {
              trigger: wrapper,
              start: "top bottom",
              end: "bottom top",
              scrub,
            },
          }
        );

        // Window parallax: the scaled-up image slides inside the frame at
        // its own rate, revealing previously off-screen portions of itself —
        // the actual "window into a larger image" effect. Scale is held
        // constant across the tween so it doesn't reset to 1.
        if (inner) {
          gsap.fromTo(
            inner,
            { y: innerThrow * slot.rate, scale: 1.19 },
            {
              y: -innerThrow * slot.rate,
              scale: 1.19,
              ease: "none",
              scrollTrigger: {
                trigger: wrapper,
                start: "top bottom",
                end: "bottom top",
                scrub,
              },
            }
          );
        }
      });
    });

    return () => {
      // Guards a route change landing mid-entrance: the fonts.ready callback
      // is already queued and cannot be unsubscribed, so it checks the flag.
      disposed = true;
      entranceTl?.kill();
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="no-overflow relative w-full bg-cream"
    >
      <div className="relative mx-auto w-full max-w-[1700px] px-6 py-[clamp(5rem,12vh,8rem)] md:px-[40px] lg:flex lg:gap-12 lg:py-0">
        {/* ── Left column: heading, copy, socials/email ──────────────────
            Sticky on desktop so it holds its position in the viewport while
            the taller right column of photos scrolls past it. Mobile stays
            plain stacked flow — sticky sidebars are a desktop pattern. */}
        <div className="lg:sticky lg:top-0 lg:flex lg:aspect-[381/731] lg:w-[42%] lg:max-h-screen lg:flex-none lg:flex-col lg:justify-between lg:py-[14vh]">
          <div>
            <h1
              className="font-medium leading-[0.9] tracking-[-0.04em] text-ink"
              style={{
                fontSize: "clamp(3.9rem, 11.7vw, 11.62rem)",
                marginTop: "clamp(2.5rem, 6vw, 6rem)",
                marginLeft: "clamp(1.5rem, 6.2vw, 6.19rem)",
              }}
            >
              <span className="inline-block overflow-hidden align-bottom">
                <span ref={headingRef} className="inline-block will-change-transform">
                  {title}
                </span>
              </span>
            </h1>

            <div
              className="flex flex-col gap-8 lg:max-w-[30vw]"
              style={{
                marginTop: "clamp(1.5rem, 4vw, 4.19rem)",
                marginLeft: "clamp(1.5rem, 6.2vw, 6.19rem)",
              }}
            >
              {paragraphs.map((para, i) =>
                para?.text ? (
                  <div
                    key={i}
                    className="about-para max-w-[38ch] text-ink will-change-transform"
                    style={{
                      fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                      lineHeight: 1.5,
                      textAlign: "justify",
                    }}
                  >
                    <Reveal text={para.text} accents={para.accents} />
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {/* Socials + mail. Each line is a direct child of this row because
              the stagger animates the row's children — nesting the socials
              inside a <ul> would make them one stagger step, not three. */}
          <div
            ref={bottomRef}
            className="flex flex-col gap-1 lg:mt-0"
            style={{
              marginTop: "clamp(1.5rem, 5vw, 5.06rem)",
              marginLeft: "clamp(1.5rem, 6.2vw, 6.19rem)",
            }}
          >
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="inline-block w-fit font-medium text-ink transition-opacity duration-300 hover:opacity-60"
                style={{ fontSize: "clamp(1.1rem, 1.7vw, 1.6rem)" }}
              >
                <span className="inline-block overflow-hidden align-bottom">
                  <span className="about-meta-inner inline-block will-change-transform">
                    {s.label}
                  </span>
                </span>
              </a>
            ))}
            <a
              href={`mailto:${email}`}
              className="mt-5 inline-block w-fit text-ink underline-offset-4 transition-opacity duration-300 hover:opacity-60 hover:underline"
              style={{ fontSize: "clamp(1rem, 1.35vw, 1.35rem)" }}
            >
              <span className="inline-block overflow-hidden align-bottom pb-[2px]">
                <span className="about-meta-inner inline-block will-change-transform">
                  {email}
                </span>
              </span>
            </a>
          </div>
        </div>

        {/* ── Right column: the three photo slots ──────────────────────────
            Stacked in normal flow with generous gaps so the column is
            taller than one viewport — that extra height is what the page
            scrolls through while the left column stays sticky. Each slot is
            a fixed-size, clipped window (.about-slot-img); the image inside
            renders uncropped via object-contain but is scaled up 1.19x
            (.about-slot-img-inner) so it slides behind the window on scroll,
            revealing itself rather than being fully static (see the parallax
            rig above). The frame also drifts slightly, each slot at its own
            rate, as a secondary depth cue. */}
        <div className="mt-14 flex flex-col items-end gap-16 lg:mt-0 lg:flex-1 lg:items-stretch lg:gap-24 lg:pb-[14vh] lg:pt-[calc(14vh+clamp(2.5rem,6vw,6rem))] lg:mr-[calc(50%-50vw)]">
          {slots.slice(0, 3).map((entry, i) => {
            const slot = SLOTS[i] ?? SLOTS[0];
            const src = entry.image;
            const blurb = entry.blurb?.text?.trim();
            if (!src) return null;
            return (
              <div
                key={`${src}-${i}`}
                className={`about-frame-wrapper relative w-full will-change-transform lg:w-auto ${i % 2 === 0 ? "lg:self-end" : "lg:self-start"
                  }`}
                style={{
                  aspectRatio: "385 / 575",
                  width: slot.width,
                }}
              >
                <div className="about-frame relative h-full w-full will-change-transform">
                  <div className="relative h-full w-full">
                    <div className="about-slot-img relative h-full w-full overflow-hidden">
                      <div
                        className="about-slot-img-inner absolute inset-0 will-change-transform"
                        style={{ transform: "scale(1.19)", transformOrigin: "center center" }}
                      >
                        <Image
                          src={src}
                          alt={entry.alt ?? ""}
                          fill
                          sizes="(max-width: 1023px) 33vw, 27vw"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {blurb && (
                  <div
                    className={`${BLURB_POSITIONS[i] ?? BLURB_POSITIONS[0]} text-ink text-about-blurb max-lg:mt-4`}
                    style={BLURB_STYLE}
                  >
                    <BlurbText text={blurb} accents={entry.blurb?.accents} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
